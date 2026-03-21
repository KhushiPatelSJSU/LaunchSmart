import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { jiraUrl } = await req.json()

    if (!jiraUrl?.includes('atlassian.net/browse/')) {
      return NextResponse.json({ error: "Invalid Jira URL" }, { status: 400 })
    }

    const ticketKey = jiraUrl.split('/browse/')[1]
    const domain = new URL(jiraUrl).hostname

    const token = process.env.JIRA_API_TOKEN
    const email = process.env.JIRA_EMAIL

    if (!token || !email) {
      return NextResponse.json({ error: "Jira credentials not configured" }, { status: 400 })
    }

    const res = await fetch(
      `https://${domain}/rest/api/3/issue/${ticketKey}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch Jira ticket" }, { status: 400 })
    }

    const data = await res.json()

    // Build spec from Jira ticket
    const spec = `
Jira Ticket: ${data.key}
Title: ${data.fields.summary}
Priority: ${data.fields.priority?.name ?? 'Not set'}
Status: ${data.fields.status?.name ?? 'Unknown'}
Description: ${data.fields.description?.content?.[0]?.content?.[0]?.text ?? 'No description provided'}
    `.trim()

    return NextResponse.json({ spec, key: data.key, title: data.fields.summary })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Jira ticket", details: String(error) },
      { status: 500 }
    )
  }
}