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
    let actualUI = "No screenshots provided or analysis failed.";
    
    if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
      try {
        const screenshotAnalyses = await Promise.all(
          screenshots.map(async (url: string, index: number) => {
            const { text } = await generateText({
              // Assuming gemini-1.5-pro as it supports multi-modal vision inputs. 
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
            description: z.string(),
            evidence: z.string(),
          })
        ).max(5),
      }),
      prompt: `Generate a list of issues based on these mismatches.

Each issue must include:
* title
* severity (critical, medium, low)
* description
* evidence (reference to screenshot or state "None")

Mismatches:
${mismatches}

Limit to max 5 issues. Keep descriptions concise.`,
    });

    return NextResponse.json(object);
    
  } catch (error) {
    console.error('API /api/analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze UI', details: String(error) },
      { status: 500 }
    );
  }
}
