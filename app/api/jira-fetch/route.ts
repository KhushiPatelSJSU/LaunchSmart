import { NextResponse } from "next/server";
import { resolveJiraCredentials } from "@/lib/user-keys";

export async function POST(req: Request) {
  try {
    const { jiraUrl, userId } = await req.json();
    if (!jiraUrl || !jiraUrl.includes("atlassian.net/browse/")) {
      return NextResponse.json(
        { error: "Invalid Jira URL. Must contain atlassian.net/browse/" },
        { status: 400 }
      );
    }

    const urlObj = new URL(jiraUrl);
    const domain = urlObj.hostname;
    // Extract key, handling possible query parameters or trailing paths
    const ticketKey = jiraUrl.split("/browse/")[1].split("/")[0].split("?")[0];

    const jiraCreds = await resolveJiraCredentials(userId);
    const email = jiraCreds.email;
    const token = jiraCreds.token;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Jira API credentials not configured. Add them in Settings or ask your admin." },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const response = await fetch(`https://${domain}/rest/api/3/issue/${ticketKey}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Jira API error:", text);
      return NextResponse.json(
        { error: `Jira API responded with ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const summary = data.fields?.summary || "Untitled";
    const status = data.fields?.status?.name || "Unknown";
    const priority = data.fields?.priority?.name || "None";
    
    // Jira Cloud v3 natively returns ADF (Atlassian Document Format) for description
    const description = typeof data.fields?.description === "string"
      ? data.fields.description
      : JSON.stringify(data.fields?.description || {});

    const spec = `Jira Ticket: ${ticketKey}\nTitle: ${summary}\nPriority: ${priority}\nStatus: ${status}\nDescription: ${description}`;

    return NextResponse.json({
      spec,
      key: ticketKey,
      title: summary,
    });
  } catch (error: any) {
    console.error("Jira fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

