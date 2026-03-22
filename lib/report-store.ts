export type ReportSeverity = "critical" | "high" | "medium" | "low"
export type ReportConfidence = "high" | "medium" | "low"

export interface ReportIssue {
  id: string
  title: string
  severity: ReportSeverity
  description: string
  expected?: string
  observed?: string
  impact?: string
  recommendedFix?: string
  confidence?: ReportConfidence
  evidence?: string
  screenshotRef?: string
}

export interface ReportIssueDraft {
  id: string
  title: string
  severity: ReportSeverity
  description: string
  expectedBehavior: string
  actualBehavior: string
  impact: string
  recommendedFix: string
  evidence: string
  acceptanceCheck: string
}

export interface ReportScore {
  value: number
  bucket?: string
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  uncoveredCriticalCount?: number
}

export interface ReportDecision {
  status: string
  reason: string
}

export interface LaunchReportRecord {
  id: string
  createdAt: string
  projectName: string
  spec: string
  specFileName?: string
  stagingUrl: string
  routes: string[]
  notes: string
  screenshots: string[]
  issues: ReportIssue[]
  issueDrafts: ReportIssueDraft[]
  decision: ReportDecision | null
  score: ReportScore | null
}

const REPORT_KEY_PREFIX = "launchsmart:report:"

export function createReportId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `lg_${Date.now().toString(36)}_${random}`
}

export function saveLaunchReport(report: LaunchReportRecord) {
  if (typeof window === "undefined") {
    return
  }
  localStorage.setItem(`${REPORT_KEY_PREFIX}${report.id}`, JSON.stringify(report))
}

export function getLaunchReport(id: string): LaunchReportRecord | null {
  if (typeof window === "undefined") {
    return null
  }
  const raw = localStorage.getItem(`${REPORT_KEY_PREFIX}${id}`)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as LaunchReportRecord
  } catch {
    return null
  }
}
