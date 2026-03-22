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
    issue_drafts: report.issueDrafts,
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
  const numericScore = typeof data.score === "number" ? data.score : Number(data.score) || 0
  const issues = Array.isArray(data.issues) ? data.issues : []

  const criticalCount = issues.filter((issue: any) => issue.severity === "critical").length
  const highCount = issues.filter((issue: any) => issue.severity === "high").length
  const mediumCount = issues.filter((issue: any) => issue.severity === "medium").length
  const lowCount = issues.filter((issue: any) => issue.severity === "low").length

  function bucketFromValue(score: number) {
    if (score >= 90) return "ready"
    if (score >= 70) return "launch_with_caution"
    return "not_launch_ready"
  }

  return {
    id: data.id,
    projectName: data.project_name,
    createdAt: data.created_at,
    stagingUrl: data.staging_url,
    spec: data.spec_text,
    screenshots: data.screenshots || [],
    issues,
    score: {
      value: numericScore,
      bucket: bucketFromValue(numericScore),
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      uncoveredCriticalCount: 0,
    },
    decision: { status: data.decision, reason: "" },
    routes: [], // if not in schema, default empty
    notes: "",
    issueDrafts: data.issue_drafts || [],
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
