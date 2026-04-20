import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveGitHubToken, resolveJiraCredentials } from "@/lib/user-keys";

// Expose a configured MCP Server
export const launchSmartMcpServer = new McpServer({
  name: "LaunchSmart-Integrations",
  version: "1.0.0",
});

// Tool 1: Fetch a GitHub PR Diff
launchSmartMcpServer.tool(
  "fetch_pr_diff",
  "Fetches the code diffs for a given GitHub Pull Request URL.",
  {
    prUrl: z.string().describe("The full url of the GitHub PR (e.g., https://github.com/owner/repo/pull/123)"),
    userId: z.string().optional().describe("User ID to fetch BYOK configuration if applicable"),
  },
  async ({ prUrl, userId }) => {
    try {
      const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (!match) {
        return { content: [{ type: "text", text: "Error: Invalid GitHub PR URL format." }] };
      }
      const [, owner, repo, pullNumber] = match;

      const ghToken = await resolveGitHubToken(userId);
      const ghHeaders: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LaunchGuard-MCP",
      };
      if (ghToken) ghHeaders["Authorization"] = `Bearer ${ghToken}`;

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, { headers: ghHeaders });
      
      if (!res.ok) {
        return { content: [{ type: "text", text: `Error fetching from GitHub API: ${res.statusText}` }] };
      }
      
      const filesData = await res.json();
      const diffChunks = filesData.slice(0, 15).map((f: any) => {
        const patch = f.patch ? f.patch.slice(0, 3000) : "No patch available or binary file"; 
        return `File: ${f.filename}\nStatus: ${f.status}\nChanges:\n${patch}`;
      }).join("\n\n---\n\n");

      return { content: [{ type: "text", text: diffChunks || "No diffs found." }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Execution execution failed: ${e.message}` }] };
    }
  }
);

// Tool 2: Fetch a Jira Ticket Details
launchSmartMcpServer.tool(
  "fetch_jira_ticket",
  "Fetches the summary and description of a Jira Ticket containing acceptance criteria.",
  {
    jiraUrl: z.string().describe("The URL of the Jira ticket (e.g., https://company.atlassian.net/browse/PROJ-123)"),
    userId: z.string().optional().describe("User ID for Jira credentials extraction"),
  },
  async ({ jiraUrl, userId }) => {
    try {
      if (!jiraUrl.includes("atlassian.net/browse/")) {
        return { content: [{ type: "text", text: "Invalid Jira URL." }] };
      }
      
      const ticketKey = jiraUrl.split("/browse/")[1].split("/")[0].split("?")[0];
      const domain = new URL(jiraUrl).hostname;
      const { email, token } = await resolveJiraCredentials(userId);

      if (!email || !token) {
        return { content: [{ type: "text", text: "Error: No Jira credentials found." }] };
      }

      const auth = Buffer.from(`${email}:${token}`).toString("base64");
      const res = await fetch(`https://${domain}/rest/api/3/issue/${ticketKey}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
      });

      if (!res.ok) {
        return { content: [{ type: "text", text: `Error fetching from Jira API: ${res.statusText}` }] };
      }

      const data = await res.json();
      const summary = data.fields?.summary || "Untitled";
      const description = typeof data.fields?.description === "string" 
        ? data.fields.description 
        : JSON.stringify(data.fields?.description || {});

      return { content: [{ type: "text", text: `Jira Status: ${summary}\nDescription: ${description}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Jira Execution failed: ${e.message}` }] };
    }
  }
);
