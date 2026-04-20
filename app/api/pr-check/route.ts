import { NextResponse } from "next/server";
import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { launchSmartMcpServer } from "@/lib/mcp";

export async function POST(req: Request) {
  try {
    const { prUrl, spec, jiraTicket, reportId, userId } = await req.json();

    if (!prUrl || !prUrl.includes("github.com/")) {
      return NextResponse.json({ error: "Valid GitHub PR URL is required." }, { status: 400 });
    }

    // Initialize MCP Client bridging inside the Service Route
    const transport = new InMemoryTransport();
    const serverTransport = new InMemoryTransport();
    
    // Wire the in-memory pipes to talk to our local Server
    transport.connect(serverTransport);
    launchSmartMcpServer.connect(serverTransport);
    
    const mcpClient = new Client({ name: "launchSmartClient", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);

    // AI Tools Array mapping directly to MCP Execution
    const mcpEnabledTools = {
      fetch_pr_diff: tool({
        description: "Fetches code diffs for a given GitHub Pull Request.",
        parameters: z.object({ prUrl: z.string() }),
        execute: async (args: { prUrl: string }) => {
          const res = await mcpClient.callTool({ 
            name: "fetch_pr_diff", 
            arguments: { prUrl: args.prUrl, userId } 
          });
          const content = res.content[0];
          return content?.type === "text" ? content.text : "No text returned from tool.";
        }
      }),
      fetch_jira_ticket: tool({
        description: "Fetches spec/acceptance criteria from a mapped Jira URL.",
        parameters: z.object({ jiraUrl: z.string() }),
        execute: async (args: { jiraUrl: string }) => {
          const res = await mcpClient.callTool({ 
            name: "fetch_jira_ticket", 
            arguments: { jiraUrl: args.jiraUrl, userId } 
          });
          const content = res.content[0];
          return content?.type === "text" ? content.text : "No text returned from tool.";
        }
      })
    };

    // Prompt Engineering for Autonomous Context Fetching
    const systemPrompt = `
You are an autonomous Senior Release Engineer. 
Your primary job is to statically analyze a given GitHub Pull Request against a target Specification or Jira Ticket, and determine if the implemented code fulfills the core requirements.

Given the PR: ${prUrl}
Given the Text Spec: ${spec || "None explicitly typed, rely on Jira."}
Given the Jira URL: ${jiraTicket || "None provided"}

INSTRUCTIONS:
1. First, USE your available tools to securely fetch the Pull Request diffs.
2. If a Jira URL is provided, USE your tools to fetch the ticket Acceptance Criteria context.
3. Review the code diff thoroughly in context of the fetched Jira / text specification contexts.
4. Conclude if the PR should be APPROVED or BLOCKED.

Return a strict JSON response.
- 'decision': 'APPROVE' if the code loosely but confidently fulfills requirements, 'BLOCK' if requirements are unfulfilled.
- 'reason': Concise sentence summarizing decision based strictly on the fetched data.
- 'implemented': Array of strings listing specific things correctly implemented.
- 'missing': Array of strings listing requirements that are missing from the code diffs.
- 'confidence': Your overarching confidence level ('high', 'medium', 'low').`;

    // Agentic Evaluation Stream (maxSteps lets it fetch, then reply)
    const { text: resultText } = await generateText({
      model: google("gemini-2.5-flash"),

      prompt: systemPrompt,
      tools: mcpEnabledTools,
      maxSteps: 5,
    });

    let decisionData;
    try {
      // Find the JSON block assuming the LLM wraps it in ```json ... ``` or just outputs raw JSON
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      decisionData = JSON.parse(cleaned);
    } catch {
      // Fallback if parsing fails
      decisionData = {
        decision: "BLOCK",
        reason: "Failed to parse final AI output strictly as JSON.",
        implemented: [],
        missing: [],
        confidence: "low"
      };
    }

    const finalOutput = {
      decision: decisionData.decision,
      reason: decisionData.reason,
      implemented: decisionData.implemented,
      missing: decisionData.missing,
      confidence: decisionData.confidence,
      prTitle: "Dynamic Fetch", // Simplified for demo
      prUrl
    };

    // Save Telemetry to Supabase
    if (supabase) {
      const { error: telemetryError } = await supabase.from("pr_checks").insert([{
        analysis_id: reportId || null,
        pr_url: prUrl,
        jira_url: jiraTicket || null,
        decision: decisionData.decision,
        reason: decisionData.reason,
        implemented: decisionData.implemented,
        missing: decisionData.missing,
        confidence: decisionData.confidence
      }]);
      if (telemetryError) console.error("Telemetry insert failed:", telemetryError);
    }

    return NextResponse.json(finalOutput);

  } catch (err: any) {
    console.error("Agentic PR Check Error:", err);
    return NextResponse.json({ error: err.message || "Failed to autonomously analyze PR." }, { status: 500 });
  }
}
