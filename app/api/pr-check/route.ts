import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: NextRequest) {
  try {
    const { prUrl, spec, jiraTicket } = await req.json()

    if (!prUrl) {
      return NextResponse.json(
        { error: "PR URL is required." },
        { status: 400 }
      )
    }

    // ✅ If jiraTicket is a URL, fetch from Jira API automatically
    let jiraContext = jiraTicket
    if (jiraTicket?.includes('atlassian.net/browse/')) {
      try {
        const ticketKey = jiraTicket.split('/browse/')[1]
        const domain = new URL(jiraTicket).hostname
        const jiraRes = await fetch(
          `https://${domain}/rest/api/3/issue/${ticketKey}`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
              ).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (jiraRes.ok) {
          const jiraData = await jiraRes.json()
          jiraContext = `
Jira Ticket: ${jiraData.key}
Title: ${jiraData.fields.summary}
Priority: ${jiraData.fields.priority?.name ?? 'Not set'}
Status: ${jiraData.fields.status?.name ?? 'Unknown'}
Description: ${jiraData.fields.description?.content?.[0]?.content?.[0]?.text ?? 'No description provided'}
          `.trim()
          console.log('Fetched Jira ticket:', jiraContext)
        }
      } catch (e) {
        console.error('Failed to fetch Jira ticket:', e)
      }
    }

    // Extract owner, repo, PR number from URL
    const match = prUrl.match(
      /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
    )

    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123" },
        { status: 400 }
      )
    }

    const [, owner, repo, prNumber] = match

    // Fetch PR details
    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    )

    if (!prRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PR. Make sure the PR is public." },
        { status: 400 }
      )
    }

    const pr = await prRes.json()

    // Fetch PR files/changes
    const filesRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    )

    const files = await filesRes.json()

    // Build diff summary (limit size to avoid token overflow)
    const diff = files
      .slice(0, 10)
      .map((f: any) => `File: ${f.filename}\nChanges: +${f.additions} -${f.deletions}\n${(f.patch || "").slice(0, 500)}`)
      .join("\n\n---\n\n")

    // Build context from spec and jira
    const context = [
      spec ? `Product Spec:\n${spec}` : "",
      jiraContext ? `Jira Ticket Requirements:\n${jiraContext}` : "",
    ].filter(Boolean).join("\n\n")

    if (!context) {
      return NextResponse.json(
        { error: "Please provide either a spec or a Jira ticket URL to check against." },
        { status: 400 }
      )
    }

    // Ask Gemini to review the PR
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `You are a senior release engineer doing a PR review.

${context}

PR Title: ${pr.title}
PR Description: ${pr.body || "No description provided"}
PR Author: ${pr.user?.login}

Code Changes:
${diff}

Review this PR and determine:
1. Does it implement what was required in the spec/ticket?
2. Are there any missing implementations?
3. Should this PR be APPROVED or BLOCKED?

Return ONLY a valid JSON object like this (no markdown, no backticks):
{
  "decision": "APPROVE",
  "reason": "one clear sentence explaining the decision",
  "implemented": ["thing 1 correctly implemented", "thing 2 correctly implemented"],
  "missing": ["thing that is missing or incomplete"],
  "confidence": "high"
}

decision must be exactly "APPROVE" or "BLOCK".
confidence must be exactly "high", "medium", or "low".`,
    })

    // Parse Gemini response
    const clean = text.replace(/```json|```/g, "").trim()
    const result = JSON.parse(clean)

    return NextResponse.json({
      ok: true,
      pr: {
        title: pr.title,
        number: pr.number,
        url: prUrl,
        author: pr.user?.login,
      },
      jiraTicket: jiraContext ? {
        fetched: jiraTicket?.includes('atlassian.net/browse/'),
        context: jiraContext,
      } : null,
      ...result,
    })
  } catch (error) {
    console.error("PR check error:", error)
    return NextResponse.json(
      { error: "Failed to check PR.", details: String(error) },
      { status: 500 }
    )
  }
}