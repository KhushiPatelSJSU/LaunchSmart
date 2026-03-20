import { NextRequest, NextResponse } from "next/server"

type DraftIssue = {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  description: string
  expectedBehavior: string
  actualBehavior: string
  impact: string
  recommendedFix: string
  evidence: string
  acceptanceCheck: string
}

type GitHubIssueResponse = {
  html_url: string
  number: number
  title: string
}

function resolveRepo(repo?: string) {
  const normalized = repo?.trim() || process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY
  if (!normalized) {
    return null
  }

  const [owner, name] = normalized.split("/")
  if (!owner || !name) {
    return null
  }
  return { owner, name }
}

function buildIssueBody(draft: DraftIssue, reportUrl?: string) {
  return [
    `Severity: ${draft.severity}`,
    "",
    "## Expected Behavior",
    draft.expectedBehavior,
    "",
    "## Actual Behavior",
    draft.actualBehavior,
    "",
    "## Impact",
    draft.impact || draft.description,
    "",
    "## Recommended Fix",
    draft.recommendedFix,
    "",
    "## Evidence",
    draft.evidence,
    "",
    "## Acceptance Check",
    draft.acceptanceCheck,
    ...(reportUrl ? ["", `LaunchGuard Report: ${reportUrl}`] : []),
  ].join("\n")
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return NextResponse.json(
        {
          error: "GITHUB_TOKEN is not configured.",
        },
        { status: 400 }
      )
    }

    const body = (await req.json()) as {
      repo?: string
      drafts?: DraftIssue[]
      mode?: "all" | "critical"
      reportUrl?: string
    }

    const repo = resolveRepo(body.repo)
    if (!repo) {
      return NextResponse.json(
        {
          error: 'Repository is required. Provide "owner/repo" or set GITHUB_REPO.',
        },
        { status: 400 }
      )
    }

    const incomingDrafts = body.drafts ?? []
    const selectedDrafts =
      body.mode === "critical"
        ? incomingDrafts.filter((draft) => draft.severity === "critical")
        : incomingDrafts

    if (selectedDrafts.length === 0) {
      return NextResponse.json(
        { error: "No drafts available for issue creation." },
        { status: 400 }
      )
    }

    const created: Array<{ id: string; number: number; url: string; title: string }> = []
    const failed: Array<{ id: string; title: string; error: string }> = []

    for (const draft of selectedDrafts) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo.owner}/${repo.name}/issues`,
          {
            method: "POST",
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: `[LaunchGuard][${draft.severity.toUpperCase()}] ${draft.title}`,
              body: buildIssueBody(draft, body.reportUrl),
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          failed.push({
            id: draft.id,
            title: draft.title,
            error: errorText || "GitHub issue creation failed.",
          })
          continue
        }

        const issue = (await response.json()) as GitHubIssueResponse
        created.push({
          id: draft.id,
          number: issue.number,
          url: issue.html_url,
          title: issue.title,
        })
      } catch (error) {
        failed.push({
          id: draft.id,
          title: draft.title,
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      repo: `${repo.owner}/${repo.name}`,
      created,
      failed,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create GitHub issues.", details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || null
  return NextResponse.json({ repo })
}
