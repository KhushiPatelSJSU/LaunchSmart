import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const token = process.env.JIRA_API_TOKEN
    const email = process.env.JIRA_EMAIL
    const domain = process.env.JIRA_DOMAIN
    const defaultProject = process.env.JIRA_PROJECT_KEY

    if (!token || !email || !domain) {
      return NextResponse.json(
        { error: "Jira credentials not configured." },
        { status: 400 }
      )
    }

    const { issues, projectKey } = await req.json()
    const project = projectKey || defaultProject

    if (!issues || issues.length === 0) {
      return NextResponse.json(
        { error: "No issues provided." },
        { status: 400 }
      )
    }

    const created = []
    const failed = []
    const skipped = []

    // Check existing tickets to prevent duplicates
    const existingRes = await fetch(
      `https://${domain}/rest/api/3/search?jql=project=${project}+AND+summary~"LaunchGuard"&maxResults=100`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    )
    const existingData = await existingRes.json()
    const existingTitles = new Set(
      (existingData.issues || []).map((i: any) => i.fields.summary.toLowerCase())
    )

    for (const issue of issues) {
      const summary = `[LaunchGuard][${issue.severity.toUpperCase()}] ${issue.title}`

      // Skip duplicates
      if (existingTitles.has(summary.toLowerCase())) {
        skipped.push({ title: issue.title, reason: "Already exists in Jira" })
        continue
      }

      try {
        const response = await fetch(
          `https://${domain}/rest/api/3/issue`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                project: { key: project },
                summary,
                description: {
                  type: "doc",
                  version: 1,
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: `Severity: ${issue.severity}` }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: `Expected: ${issue.expectedBehavior || ""}` }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: `Observed: ${issue.actualBehavior || issue.description}` }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: `Recommended Fix: ${issue.recommendedFix || ""}` }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: `Evidence: ${issue.evidence || ""}` }],
                    },
                  ],
                },
                issuetype: { name: "Bug" },
                priority: {
                  name:
                    issue.severity === "critical"
                      ? "Highest"
                      : issue.severity === "high"
                      ? "High"
                      : issue.severity === "medium"
                      ? "Medium"
                      : "Low",
                },
                labels: ["launchguard"],
              },
            }),
          }
        )

        if (!response.ok) {
          const error = await response.text()
          failed.push({ title: issue.title, error })
          continue
        }

        const data = await response.json()
        created.push({
          id: data.id,
          key: data.key,
          url: `https://${domain}/browse/${data.key}`,
          title: issue.title,
        })
      } catch (error) {
        failed.push({ title: issue.title, error: String(error) })
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      created,
      failed,
      skipped,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Jira tickets.", details: String(error) },
      { status: 500 }
    )
  }
}