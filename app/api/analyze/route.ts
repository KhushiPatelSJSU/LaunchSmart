import { NextRequest, NextResponse } from 'next/server';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createReport } from '@/lib/reports';

// Increase max duration for Vercel Hobby/Pro plans (if needed for 4 sequential calls)
export const maxDuration = 60; 

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Confidence = 'high' | 'medium' | 'low';

type GeneratedIssue = {
  title: string;
  severity: Severity;
  expected: string;
  observed: string;
  impact: string;
  fix: string;
  evidence: string;
  confidence: Confidence;
};

function severityWeight(severity: Severity) {
  if (severity === 'critical') return 4;
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function confidenceWeight(confidence: Confidence) {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function computeScore(issues: GeneratedIssue[]) {
  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const highCount = issues.filter((issue) => issue.severity === 'high').length;
  const mediumCount = issues.filter((issue) => issue.severity === 'medium').length;
  const lowCount = issues.filter((issue) => issue.severity === 'low').length;

  const uncoveredCriticalCount = issues.filter(
    (issue) =>
      issue.severity === 'critical' &&
      /(^none$|not visible|not provided|unknown|unable to verify)/i.test(issue.evidence)
  ).length;

  let value = 100;
  value -= criticalCount * 25;
  value -= highCount * 10;
  value -= mediumCount * 4;
  value -= uncoveredCriticalCount * 6;
  value = Math.max(0, value);

  const bucket =
    value >= 90 ? 'ready' : value >= 70 ? 'launch_with_caution' : 'not_launch_ready';

  return {
    value,
    bucket,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    uncoveredCriticalCount,
  };
}

function decisionFromScore(score: ReturnType<typeof computeScore>) {
  if (score.bucket === 'ready') {
    return {
      status: 'Ready to Launch',
      reason: 'No major blockers detected and launch risk is acceptable.',
    };
  }
  if (score.bucket === 'launch_with_caution') {
    return {
      status: 'Risky',
      reason: 'Moderate launch risk detected. Address priority issues before release.',
    };
  }
  return {
    status: 'Block Release',
    reason: 'Critical blockers or significant launch risk detected.',
  };
}

function buildIssueDrafts(issues: GeneratedIssue[]) {
  return issues.map((issue, index) => ({
    id: `LG-${index + 1}`,
    title: issue.title,
    severity: issue.severity,
    description: issue.impact,
    expectedBehavior: issue.expected,
    actualBehavior: issue.observed,
    recommendedFix: issue.fix,
    evidence: issue.evidence,
    acceptanceCheck: `Re-run LaunchGuard and confirm "${issue.title}" no longer appears as a blocker.`,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spec, screenshots, userId, projectName, stagingUrl } = body;

    if (screenshots && Array.isArray(screenshots)) {
      const totalScreenshotBytes = screenshots.reduce((sum: number, dataUrl: string) => {
        try {
          const prefix = "base64,"
          const idx = dataUrl.indexOf(prefix)
          if (idx < 0) return sum
          const base64Data = dataUrl.slice(idx + prefix.length)
          return sum + Math.ceil((base64Data.length * 3) / 4)
        } catch {
          return sum
        }
      }, 0)

      if (totalScreenshotBytes > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: 'Screenshot payload too large',
            details: 'Reduce uploaded screenshot count/size (max ~10MB of image data).',
          },
          { status: 413 }
        );
      }
    }

    if (!spec) {
      return NextResponse.json(
        { error: 'Product specification is required.' },
        { status: 400 }
      );
    }

    // --- Step 1: Extract expected features from spec ---
    const { text: expectedFeatures } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Extract the expected UI features, flows, and requirements from this product spec.
Return a structured list of expected elements such as forms, inputs, validation, buttons, and flows.

Spec:
${spec}`,
    });

    // --- Step 2: Analyze screenshots ---
    let actualUI = "No screenshots provided. Proceeding with spec-only analysis.";
    
    if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
      try {
        const screenshotAnalyses = await Promise.all(
          screenshots.map(async (url: string, index: number) => {
            const { text } = await generateText({
              // Assuming gemini-2.5-flash as it supports multi-modal vision inputs. 
              model: google('gemini-2.5-flash'),
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Analyze this UI screenshot and describe:
* visible UI components
* inputs, buttons, forms
* missing or incomplete states if obvious

Return structured observations.`,
                    },
                    {
                      type: 'image',
                      image: url.includes('base64,') 
                        ? Buffer.from(url.split('base64,')[1], 'base64') 
                        : new URL(url)
                    },
                  ],
                },
              ],
            });
            return `Screenshot ${index + 1}:\n${text}`;
          })
        );
        actualUI = screenshotAnalyses.join('\n\n---\n\n');
      } catch (err) {
        console.error('Screenshot analysis failed:', err);
        actualUI =
          'Screenshot analysis failed, likely due to payload size or model image support. Proceeding with spec-only analysis.';
      }
    }

    // --- Step 3: Compare expected vs actual ---
    const { text: mismatches } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Compare the expected UI features with the actual UI observations.
Identify missing features, incorrect implementations, or usability issues.

Expected Features:
${expectedFeatures}

Actual UI Observations:
${actualUI}`,
    });

    // --- Step 4: Generate issues ---
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        issues: z.array(
          z.object({
            title: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            expected: z.string(),
            observed: z.string(),
            impact: z.string(),
            fix: z.string(),
            evidence: z.string(),
            confidence: z.enum(['high', 'medium', 'low']),
          })
        ).max(5),
      }),
      prompt: `Generate concise, actionable issues based on the mismatches.

Each issue must include:
* title
* severity (critical, high, medium, low)
* expected (what the spec requires)
* observed (what is missing or incorrect in UI)
* impact (why this is a problem for users or business)
* fix (clear developer action to resolve it)
* evidence (reference to screenshot)
* confidence (high, medium, low based on certainty)

Return valid JSON.

Mismatches:
${mismatches}

Limit to max 5 issues.`,
    });

    // --- Step 5: Deterministic scoring and issue draft generation ---
    const score = computeScore(object.issues);
    const decision = decisionFromScore(score);
    const topBlockers = [...object.issues]
      .sort((a, b) => {
        const severityDelta = severityWeight(b.severity) - severityWeight(a.severity);
        if (severityDelta !== 0) return severityDelta;
        return confidenceWeight(b.confidence) - confidenceWeight(a.confidence);
      })
      .slice(0, 3);
    const issueDrafts = buildIssueDrafts(object.issues);

    const finalOutput = {
      decision,
      score,
      topBlockers,
      issueDrafts,
      issues: object.issues,
    };

    let reportId = undefined;
    if (userId) {
      reportId = await createReport({
        id: '',
        createdAt: new Date().toISOString(),
        projectName: projectName || 'Untitled',
        spec,
        stagingUrl: stagingUrl || '',
        routes: [],
        notes: '',
        screenshots: screenshots || [],
        issues: object.issues as any,
        issueDrafts: issueDrafts as any,
        decision,
        score
      }, userId).catch(err => {
        console.error("Failed to save report to supabase:", err);
        return undefined;
      });
    }

    return NextResponse.json({ ...finalOutput, reportId });
    
  } catch (error) {
    console.error('API /api/analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze UI', details: String(error) },
      { status: 500 }
    );
  }
}
