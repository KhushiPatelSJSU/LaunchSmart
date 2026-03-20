"use client"

import { useState } from "react"
import {
  IssueCard,
  type ExtendedSeverity,
  type Issue,
} from "@/components/issue-card"
import { LaunchScoreCard } from "@/components/launch-score-card"
import { AnalysisLoading } from "@/components/analysis-loading"
import { EvidenceGallery } from "@/components/evidence-gallery"
import { IssueDraftList } from "@/components/issue-draft-list"
import { ReportFollowUpPanel } from "@/components/report-follow-up-panel"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Filter,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ShareReportDialog } from "@/components/share-report-dialog"

interface ResultsPanelProps {
  issues: Issue[]
  screenshotUrls: string[]
  decision?: {
    status: string
    reason: string
  } | null
  isLoading: boolean
  hasAnalyzed: boolean
  onCreateIssue: (issue: Issue) => void | Promise<void>
  onDismiss?: (issue: Issue) => void | Promise<void>
  onReAnalyze?: () => void
}

type FilterType = "all" | ExtendedSeverity

export function ResultsPanel({
  issues,
  screenshotUrls,
  decision,
  isLoading,
  hasAnalyzed,
  onCreateIssue,
  onDismiss,
  onReAnalyze,
}: ResultsPanelProps) {
  const [filter, setFilter] = useState<FilterType>("all")
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  const handleDismiss = async (issue: Issue) => {
    setDismissedIds((prev) => new Set(prev).add(issue.id))
    await onDismiss?.(issue)
  }

  const handleResolve = async (issue: Issue) => {
    setResolvedIds((prev) => new Set(prev).add(issue.id))
  }

  if (isLoading) {
    return <AnalysisLoading />
  }

  if (!hasAnalyzed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FileSearch className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Ready to Analyze
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Upload your product spec and screenshots to find potential issues
          before launch.
        </p>
      </div>
    )
  }

  // Filter out dismissed issues
  const visibleIssues = issues.filter((i) => !dismissedIds.has(i.id))

  if (visibleIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-success/10 p-4">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h3 className="text-lg font-medium text-foreground">All Clear!</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {dismissedIds.size > 0
            ? "All issues have been addressed or dismissed."
            : "No issues found. Your product looks ready to ship."}
        </p>
        {onReAnalyze && (
          <Button variant="outline" onClick={onReAnalyze} className="mt-4">
            <RefreshCw className="size-4" />
            Analyze Again
          </Button>
        )}
      </div>
    )
  }

  // Apply severity filter
  const filteredIssues =
    filter === "all"
      ? visibleIssues
      : visibleIssues.filter((i) => i.severity === filter)

  const criticalCount = visibleIssues.filter((i) => i.severity === "critical").length
  const highCount = visibleIssues.filter((i) => i.severity === "high").length
  const mediumCount = visibleIssues.filter((i) => i.severity === "medium").length
  const lowCount = visibleIssues.filter((i) => i.severity === "low").length
  const resolvedCount = resolvedIds.size

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "All", count: visibleIssues.length },
    { value: "critical", label: "Critical", count: criticalCount },
    { value: "high", label: "High", count: highCount },
    { value: "medium", label: "Medium", count: mediumCount },
    { value: "low", label: "Low", count: lowCount },
  ]

  const decisionTone =
    decision?.status === "Ready to Launch"
      ? {
          className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
          Icon: CheckCircle2,
        }
      : decision?.status === "Risky"
      ? {
          className: "border-amber-400/35 bg-amber-500/10 text-amber-100",
          Icon: AlertTriangle,
        }
      : {
          className: "border-red-400/35 bg-red-500/10 text-red-100",
          Icon: XCircle,
        }

  return (
    <div className="space-y-6">
      {decision && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            decisionTone.className
          )}
        >
          <div className="flex items-start gap-3">
            <decisionTone.Icon className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Release Decision: {decision.status}</p>
              <p className="mt-1 text-xs opacity-90">{decision.reason}</p>
            </div>
          </div>
        </div>
      )}

      <LaunchScoreCard issues={visibleIssues} />

      {/* Summary */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-warning" />
          <span className="text-sm text-foreground">
            <strong>{visibleIssues.length}</strong> issue
            {visibleIssues.length !== 1 && "s"}
            {resolvedCount > 0 && (
              <span className="text-success ml-1">
                ({resolvedCount} resolved)
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShareReportDialog issues={visibleIssues} />
          {onReAnalyze && (
            <Button variant="ghost" size="sm" onClick={onReAnalyze}>
              <RefreshCw className="size-4" />
              Re-analyze
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex gap-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                filter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {option.label}
              {option.count > 0 && (
                <span className="ml-1 opacity-70">({option.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Issue Cards */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {filter} issues found.
          </div>
        ) : (
          filteredIssues.map((issue, index) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              className="animate-rise-in"
              style={{ animationDelay: `${index * 90}ms` }}
              onCreateIssue={onCreateIssue}
              onDismiss={handleDismiss}
              onResolve={handleResolve}
            />
          ))
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <EvidenceGallery issues={visibleIssues} screenshotUrls={screenshotUrls} />
        <ReportFollowUpPanel issues={visibleIssues} decision={decision} />
      </div>

      <IssueDraftList issues={visibleIssues} />
    </div>
  )
}
