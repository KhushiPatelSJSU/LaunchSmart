import { supabase } from "./supabase"

export type UserApiKeys = {
  github_token: string | null
  jira_email: string | null
  jira_api_token: string | null
  jira_domain: string | null
}

/**
 * Fetch a user's saved API keys from the user_api_keys table.
 * Returns null values for any keys not yet configured.
 */
export async function getUserKeys(userId: string): Promise<UserApiKeys> {
  const empty: UserApiKeys = {
    github_token: null,
    jira_email: null,
    jira_api_token: null,
    jira_domain: null,
  }

  if (!supabase || !userId) return empty

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("github_token, jira_email, jira_api_token, jira_domain")
    .eq("user_id", userId)
    .single()

  if (error || !data) return empty

  return {
    github_token: data.github_token || null,
    jira_email: data.jira_email || null,
    jira_api_token: data.jira_api_token || null,
    jira_domain: data.jira_domain || null,
  }
}

/**
 * Resolve a GitHub token: user-level key first, then fall back to process.env.
 */
export async function resolveGitHubToken(userId?: string): Promise<string | null> {
  if (userId) {
    const keys = await getUserKeys(userId)
    if (keys.github_token) return keys.github_token
  }
  return process.env.GITHUB_TOKEN || null
}

/**
 * Resolve Jira credentials: user-level keys first, then fall back to process.env.
 */
export async function resolveJiraCredentials(userId?: string): Promise<{
  email: string | null
  token: string | null
  domain: string | null
}> {
  if (userId) {
    const keys = await getUserKeys(userId)
    if (keys.jira_email && keys.jira_api_token) {
      return {
        email: keys.jira_email,
        token: keys.jira_api_token,
        domain: keys.jira_domain,
      }
    }
  }
  return {
    email: process.env.JIRA_EMAIL || null,
    token: process.env.JIRA_API_TOKEN || null,
    domain: process.env.JIRA_DOMAIN || null,
  }
}
