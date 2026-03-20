import { NextRequest, NextResponse } from 'next/server';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Increase max duration for Vercel Hobby/Pro plans (if needed for 4 sequential calls)
export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spec, screenshots } = body;

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
                    { type: 'image', image: new URL(url) },
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
        actualUI = 'Screenshot analysis failed. Proceeding with spec-only analysis.';
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
            severity: z.enum(['critical', 'medium', 'low']),
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
* severity (critical, medium, low)
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

    // --- Step 5: Compute Release Decision ---
    const hasCritical = object.issues.some((i) => i.severity === 'critical');
    const mediumCount = object.issues.filter((i) => i.severity === 'medium').length;

    let decisionStatus = 'Ready to Launch';
    let decisionReason = 'No critical issues and an acceptable number of medium issues identified.';

    if (hasCritical) {
      decisionStatus = 'Block Release';
      decisionReason = 'Critical issues found that block the release.';
    } else if (mediumCount > 2) {
      decisionStatus = 'Risky';
      decisionReason = 'More than 2 medium issues found. Risky to launch without addressing them.';
    }

    const finalOutput = {
      decision: {
        status: decisionStatus,
        reason: decisionReason,
      },
      issues: object.issues,
    };

    return NextResponse.json(finalOutput);
    
  } catch (error) {
    console.error('API /api/analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze UI', details: String(error) },
      { status: 500 }
    );
  }
}
