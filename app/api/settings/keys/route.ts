import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function mask(value: string | null): string {
  if (!value) return ""
  if (value.length <= 8) return "••••••••"
  return value.slice(0, 4) + "••••" + value.slice(-4)
}

function sanitizeDomain(raw: string): string {
  if (!raw) return ""
  // Strip protocol and trailing slashes so we store just the hostname
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { data, error } = await supabase
      .from("user_api_keys")
      .select("github_token, jira_email, jira_api_token, jira_domain, updated_at")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine for new users
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      github_token: mask(data?.github_token || null),
      jira_email: data?.jira_email || "",
      jira_api_token: mask(data?.jira_api_token || null),
      jira_domain: data?.jira_domain || "",
      updated_at: data?.updated_at || null,
      has_github_token: !!data?.github_token,
      has_jira_token: !!data?.jira_api_token,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const body = await req.json()
    const { userId, github_token, jira_email, jira_api_token, jira_domain } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Build update payload — only update fields that were explicitly provided
    // If a field value looks like our mask pattern, skip it (user didn't change it)
    const isMasked = (val: string) => /^.{4}••••.{4}$/.test(val) || val === "••••••••"

    const updatePayload: Record<string, string | null> = {}

    if (github_token !== undefined && !isMasked(github_token)) {
      updatePayload.github_token = github_token || null
    }
    if (jira_email !== undefined) {
      updatePayload.jira_email = jira_email || null
    }
    if (jira_api_token !== undefined && !isMasked(jira_api_token)) {
      updatePayload.jira_api_token = jira_api_token || null
    }
    if (jira_domain !== undefined) {
      updatePayload.jira_domain = sanitizeDomain(jira_domain) || null
    }

    // Upsert: insert if no row exists, update if it does
    const { error } = await supabase
      .from("user_api_keys")
      .upsert(
        { user_id: userId, ...updatePayload },
        { onConflict: "user_id" }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
