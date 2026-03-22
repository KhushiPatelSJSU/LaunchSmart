import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { drafts, projectKey, mode, reportUrl, reportId } = await req.json();

    if (!drafts || !Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json(
        { error: "No drafts provided to create Jira tickets." },
        { status: 400 }
      );
    }

    if (!projectKey) {
      return NextResponse.json(
        { error: "Jira Project Key is required." },
        { status: 400 }
      );
    }

    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    const domain = process.env.JIRA_DOMAIN;

    if (!email || !token || !domain) {
      return NextResponse.json(
        {
          error:
            "Jira credentials (JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN) are not configured.",
        },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // 1. Fetch existing LaunchGuard bugs to prevent duplication
    const searchRes = await fetch(
      `https://${domain}/rest/api/3/search?jql=project=${projectKey} AND summary~"LaunchGuard"`,
      { headers }
    );
    
    let existingIssues = new Set<string>();
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.issues) {
        existingIssues = new Set(
          searchData.issues.map((i: any) => i.fields.summary)
        );
      }
    }

    const created: Array<{ id: string; key: string; url: string }> = [];
    const failed: Array<{ id: string; error: string }> = [];
    const skipped: Array<{ id: string }> = [];

    const mapSeverityToPriority = (severity: string) => {
      const lower = severity.toLowerCase();
      if (lower === "critical") return "Highest";
      if (lower === "high") return "High";
      if (lower === "medium") return "Medium";
      return "Low";
    };

    for (const draft of drafts) {
      const summary = `[LaunchGuard][${draft.severity.toUpperCase()}] ${draft.title}`;

      // Prevent duplicate creation
      if (existingIssues.has(summary)) {
        skipped.push({ id: draft.id });
        continue;
      }

      // Atlassian Document Format (ADF) description
      const description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `Severity: ${draft.severity.toUpperCase()}` }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Expected Behavior", marks: [{ type: "strong" }] },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: draft.expectedBehavior || "N/A" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Actual Behavior / Observed", marks: [{ type: "strong" }] },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: draft.actualBehavior || draft.description || "N/A" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Recommended Fix", marks: [{ type: "strong" }] },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: draft.recommendedFix || "N/A" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Acceptance Check", marks: [{ type: "strong" }] },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: draft.acceptanceCheck || "N/A" }],
          },
        ],
      };

      if (draft.evidence) {
        description.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `Evidence: ${draft.evidence}`, marks: [{ type: "em" }] },
          ],
        });
      }

      if (reportUrl) {
        description.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `\nReport Source: `, marks: [{ type: "strong" }] },
            {
              type: "text",
              text: reportUrl,
              marks: [{ type: "link", attrs: { href: reportUrl } } as any],
            },
          ],
        });
      }

      const body = {
        fields: {
          project: { key: projectKey },
          summary,
          description,
          issuetype: { name: "Bug" },
          priority: { name: mapSeverityToPriority(draft.severity) },
          labels: ["launchguard", mode === "critical" ? "critical-blocker" : "qa-finding"],
        },
      };

      const createRes = await fetch(`https://${domain}/rest/api/3/issue`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`Jira creation failed for ${draft.id}:`, errText);
        failed.push({ id: draft.id, error: errText });
        continue;
      }

      const createData = await createRes.json();
      const ticketUrl = `https://${domain}/browse/${createData.key}`;
      
      created.push({
        id: draft.id,
        key: createData.key,
        url: ticketUrl,
      });

      // Insert record into supabase `jira_tickets_created`
      if (supabase && reportId) {
        await supabase.from("jira_tickets_created").insert([{
          analysis_id: reportId,
          jira_key: createData.key,
          jira_url: ticketUrl,
          issue_title: summary,
          severity: draft.severity,
        }]);
      }
    }

    return NextResponse.json({
      created,
      failed,
      skipped,
      message: `Created ${created.length}, skipped ${skipped.length} duplicates, failed ${failed.length}.`,
    });
  } catch (error: any) {
    console.error("Jira Integration Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Jira issues" },
      { status: 500 }
    );
  }
}
