import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            "Slack webhook is not configured. Set SLACK_WEBHOOK_URL to enable sharing.",
        },
        { status: 400 }
      )
    }

    const body = (await req.json()) as {
      projectName?: string
      reportUrl?: string
      score?: number
      status?: string
      reason?: string
      counts?: {
        critical: number
        high: number
        medium: number
        low: number
      }
      blockers?: string[]
    }

    const projectName = body.projectName?.trim() || "LaunchGuard Report"
    const status = body.status?.trim() || "Unknown"
    const reason = body.reason?.trim() || "No reason provided."
    const score = Number.isFinite(body.score) ? body.score : null
    const counts = body.counts ?? { critical: 0, high: 0, medium: 0, low: 0 }
    const blockers = (body.blockers ?? []).slice(0, 3)
    const reportUrl = body.reportUrl?.trim()

    const payload = {
      text: `LaunchGuard: ${projectName} · ${status}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `LaunchGuard · ${projectName}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Decision*\n${status}`,
            },
            {
              type: "mrkdwn",
              text: `*Launch Score*\n${score !== null ? `${score}/100` : "N/A"}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Reason*\n${reason}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Critical*\n${counts.critical}`,
            },
            {
              type: "mrkdwn",
              text: `*High*\n${counts.high}`,
            },
            {
              type: "mrkdwn",
              text: `*Medium*\n${counts.medium}`,
            },
            {
              type: "mrkdwn",
              text: `*Low*\n${counts.low}`,
            },
          ],
        },
        ...(blockers.length > 0
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Top Blockers*\n${blockers
                    .map((blocker, index) => `${index + 1}. ${blocker}`)
                    .join("\n")}`,
                },
              },
            ]
          : []),
        ...(reportUrl
          ? [
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "Open Report",
                    },
                    url: reportUrl,
                  },
                ],
              },
            ]
          : []),
      ],
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseText = await response.text()
      return NextResponse.json(
        {
          error: "Slack webhook request failed.",
          details: responseText,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to share report to Slack.", details: String(error) },
      { status: 500 }
    )
  }
}
