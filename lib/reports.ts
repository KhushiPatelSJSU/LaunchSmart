import { supabase } from "./supabase"
import type { LaunchReportRecord } from "./report-store"

export async function createReport(report: LaunchReportRecord, userId: string) {
  if (!supabase) {
    console.warn("No Supabase client, skipping report creation.")
    return null
  }

  // The 'reports' table expects a UUID. We let the DB generate it.
  const { data, error } = await supabase.from("reports").insert([{
    user_id: userId,
    project_name: report.projectName,
    staging_url: report.stagingUrl,
    spec_text: report.spec,
    screenshots: report.screenshots,
    issues: report.issues,
    score: report.score?.value || 0,
    decision: report.decision?.status || "",
  }]).select("id").single()

  if (error) {
    console.error("Supabase Error saving report:", error)
    throw new Error(error.message)
  }

  return data.id
}

export async function getReportById(id: string) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Supabase Error fetching report:", error)
    return null
  }

  // Map DB structure back to our expected shape
  return {
    id: data.id,
    projectName: data.project_name,
    createdAt: data.created_at,
    stagingUrl: data.staging_url,
    spec: data.spec_text,
    screenshots: data.screenshots || [],
    issues: data.issues || [],
    score: { value: data.score },
    decision: { status: data.decision, reason: "" },
    routes: [], // if not in schema, default empty
    notes: "",
    issueDrafts: []
  } as LaunchReportRecord
}

export async function getReportsByUser(userId: string) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from("reports")
    .select("id, project_name, score, decision, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Supabase fetch user reports error:", error)
    return []
  }
  return data
}
