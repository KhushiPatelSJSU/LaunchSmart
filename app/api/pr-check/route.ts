import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { prUrl, spec, jiraTicket, reportId } = await req.json();

    if (!prUrl || !prUrl.includes("github.com/")) {
      return NextResponse.json({ error: "Valid GitHub PR URL is required." }, { status: 400 });
    }

    // 1. Fetch Jira Context if provided
    let jiraSpec = "";
    if (jiraTicket && jiraTicket.includes("atlassian.net/browse/")) {
      try {
        const ticketKey = jiraTicket.split("/browse/")[1].split("/")[0].split("?")[0];
        const domain = new URL(jiraTicket).hostname;
        const email = process.env.JIRA_EMAIL;
        const token = process.env.JIRA_API_TOKEN;
        
        if (email && token && domain) {
          const auth = Buffer.from(`${email}:${token}`).toString("base64");
          const jiraRes = await fetch(`https://${domain}/rest/api/3/issue/${ticketKey}`, {
            headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
          });
          if (jiraRes.ok) {
            const data = await jiraRes.json();
            const summary = data.fields?.summary || "Untitled";
            const description = typeof data.fields?.description === "string" ? data.fields.description : JSON.stringify(data.fields?.description || {});
            jiraSpec = `Jira Context: ${summary}\nDescription: ${description}`;
          }
        }
      } catch (e) {
        console.error("Failed to fetch Jira ticket for PR Check:", e);
      }
    }

    // 2. Fetch GitHub PR Details
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return NextResponse.json({ error: "Could not parse GitHub PR URL. Expected format: github.com/owner/repo/pull/123" }, { status: 400 });
    }
    const [, owner, repo, pullNumber] = match;

    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "LaunchGuard-App"
    };
    if (process.env.GITHUB_TOKEN) {
      ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, { headers: ghHeaders });
    if (!prRes.ok) {
      return NextResponse.json({ error: `GitHub API error fetching PR details: ${prRes.status}` }, { status: prRes.status });
    }
    const prData = await prRes.json();
    const prTitle = prData.title || "";
    const prBody = prData.body || "";

    const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, { headers: ghHeaders });
    if (!filesRes.ok) {
      return NextResponse.json({ error: `GitHub API error fetching PR files: ${filesRes.status}` }, { status: filesRes.status });
    }
    const filesData = await filesRes.json();

    // 3. Build diff chunk (first 10 files max to save context size limits)
    const diffChunks = filesData.slice(0, 10).map((f: any) => {
      const patch = f.patch ? f.patch.slice(0, 3000) : "No patch / binary file"; 
      return `File: ${f.filename}\nStatus: ${f.status}\nChanges:\n${patch}`;
    }).join("\n\n---\n\n");

    const combinedContext = [spec, jiraSpec].filter(Boolean).join("\n\n=== JIRA CONTEXT ===\n\n");

    // 4. Send Code Diffs + Spec direct to Gemini Pro/Flash
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        decision: z.enum(["APPROVE", "BLOCK"]),
        reason: z.string(),
        implemented: z.array(z.string()),
        missing: z.array(z.string()),
        confidence: z.enum(["high", "medium", "low"]),
      }),
      prompt: `You are a senior release engineer. Your job is to statically analyze a GitHub Pull Request against a Product Specification or Jira Ticket, and determine if the code satisfies the requirements.

Specification / Jira Context Requirements:
${combinedContext || "No spec provided; review PR for general sanity."}

PR Title: ${prTitle}
PR Description: ${prBody}

Code Changes (Diffs):
${diffChunks}

Analyze the changes. Did the engineer actually implement what was asked? 
Return a strict JSON response.
- 'decision': 'APPROVE' if the code loosely but confidently fulfills the spec, 'BLOCK' if core requirements are blatantly unfulfilled or buggy logic is detected.
- 'reason': One single concise sentence summarizing your decision.
- 'implemented': Array of strings listing specific things correctly implemented in the core code logic.
- 'missing': Array of strings listing rigid requirements that are suspiciously missing from the code diffs (or generic "None").
- 'confidence': Your overarching confidence level in this isolated diff.`
    });

    const finalOutput = {
      decision: object.decision,
      reason: object.reason,
      implemented: object.implemented,
      missing: object.missing,
      confidence: object.confidence,
      prTitle,
      prUrl
    };

    // 5. Save PR Check telemetry to Supabase
    if (supabase) {
      const { error: telemetryError } = await supabase.from("pr_checks").insert([{
        analysis_id: reportId || null,
        pr_url: prUrl,
        jira_url: jiraTicket || null,
        decision: object.decision,
        reason: object.reason,
        implemented: object.implemented,
        missing: object.missing,
        confidence: object.confidence
      }]);
      if (telemetryError) console.error("Telemetry insert failed:", telemetryError);
    }

    return NextResponse.json(finalOutput);

  } catch (err: any) {
    console.error("PR Check Error:", err);
    return NextResponse.json({ error: err.message || "Failed to remotely analyze PR." }, { status: 500 });
  }
}
