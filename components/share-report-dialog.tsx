"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Loader2, Send, Share2 } from "lucide-react"
import type { ExtendedSeverity, Issue } from "@/components/issue-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface ShareReportDialogProps {
  issues: Issue[]
  projectName?: string
  reportId?: string
  scoreValue?: number | null
  decision?: {
    status: string
    reason: string
  } | null
}

const severityPenalty: Record<ExtendedSeverity, number> = {
  critical: 24,
  high: 12,
  medium: 6,
  low: 2,
}

export function ShareReportDialog({
  issues,
  projectName,
  reportId,
  scoreValue,
  decision,
}: ShareReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCopyingSummary, setIsCopyingSummary] = useState(false)
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false)
  const [isSharingSlack, setIsSharingSlack] = useState(false)
  const { toast } = useToast()

  const summary = useMemo(() => {
    const counts = {
      critical: issues.filter((i) => i.severity === "critical").length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
    }
    const fallbackScore = Math.max(
      0,
      Math.round(
        100 - issues.reduce((total, issue) => total + severityPenalty[issue.severity], 0)
      )
    )
    const score = scoreValue ?? fallbackScore
    const status =
      decision?.status ??
      (score >= 90 ? "Launch-Ready" : score >= 70 ? "Launch With Caution" : "Not Launch-Ready")

    const topBlockers = [...issues]
      .sort((a, b) => severityPenalty[b.severity] - severityPenalty[a.severity])
      .slice(0, 3)
      .map((issue, index) => `${index + 1}. ${issue.title} (${issue.severity})`)
      .join("\n")

    return {
      score,
      status,
      counts,
      topBlockers,
    }
  }, [decision?.status, issues, scoreValue])

  const reason = decision?.reason ?? "Generated from current launch readiness analysis."
  const reportUrl =
    typeof window !== "undefined" && reportId
      ? `${window.location.origin}/analyze/${reportId}`
      : undefined

  const summaryText = `LaunchSmart report
Project: ${projectName ?? "Release Candidate"}
Launch score: ${summary.score}/100 (${summary.status})
Decision: ${summary.status}
Reason: ${reason}
Issues: ${issues.length} total | ${summary.counts.critical} critical, ${summary.counts.high} high, ${summary.counts.medium} medium, ${summary.counts.low} low
Top blockers:
${summary.topBlockers || "No blockers detected."}
${reportUrl ? `Report: ${reportUrl}` : ""}`

  const markdownReport = `## LaunchSmart Report
- **Project:** ${projectName ?? "Release Candidate"}
- **Launch Score:** ${summary.score}/100
- **Status:** ${summary.status}
- **Reason:** ${reason}
- **Issues:** ${issues.length}

### Severity Breakdown
- Critical: ${summary.counts.critical}
- High: ${summary.counts.high}
- Medium: ${summary.counts.medium}
- Low: ${summary.counts.low}

### Top Blockers
${summary.topBlockers || "No blockers detected."}`

  const copyText = async (text: string, mode: "summary" | "markdown") => {
    try {
      if (mode === "summary") {
        setIsCopyingSummary(true)
      } else {
        setIsCopyingMarkdown(true)
      }
      await navigator.clipboard.writeText(text)
      toast({
        title: mode === "summary" ? "Summary copied" : "Markdown copied",
        description: "Ready to paste into Slack, Notion, or your standup update.",
      })
    } catch {
      toast({
        title: "Clipboard blocked",
        description: "Your browser blocked clipboard access. Try again from a secure context.",
      })
    } finally {
      if (mode === "summary") {
        setIsCopyingSummary(false)
      } else {
        setIsCopyingMarkdown(false)
      }
    }
  }

  const shareToSlack = async () => {
    try {
      setIsSharingSlack(true)
      const blockers = [...issues]
        .sort((a, b) => severityPenalty[b.severity] - severityPenalty[a.severity])
        .slice(0, 3)
        .map((issue) => issue.title)

      const response = await fetch("/api/integrations/slack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: projectName ?? "Release Candidate",
          reportUrl,
          score: summary.score,
          status: summary.status,
          reason,
          counts: summary.counts,
          blockers,
        }),
      })

      if (!response.ok) {
        throw new Error("Slack share failed")
      }
      toast({
        title: "Shared to Slack",
        description: "Report summary posted to your configured Slack channel.",
      })
      setOpen(false)
    } catch {
      try {
        await navigator.clipboard.writeText(summaryText)
      } catch {
        // Ignore clipboard failures and still surface actionable toast.
      }
      toast({
        title: "Slack unavailable",
        description: "Webhook missing or failed. Summary copied so you can paste to Slack.",
      })
    } finally {
      setIsSharingSlack(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="size-4" />
          Share Report
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/80 bg-card/95 backdrop-blur-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Launch Report</DialogTitle>
          <DialogDescription>
            Package this analysis into a clear update for judges, teammates, or release chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
            <p className="font-medium text-foreground">
              Score {summary.score}/100 · {summary.status}
            </p>
            <p className="mt-1 text-muted-foreground">
              {issues.length} issues total ({summary.counts.critical} critical, {summary.counts.high} high,{" "}
              {summary.counts.medium} medium, {summary.counts.low} low)
            </p>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
            {issues.slice(0, 6).map((issue) => (
              <div key={issue.id} className="rounded border border-border/60 bg-background/70 px-2.5 py-2">
                <p className="font-medium text-foreground">{issue.title}</p>
                <p className="text-xs text-muted-foreground">{issue.severity.toUpperCase()}</p>
              </div>
            ))}
            {issues.length > 6 && (
              <p className="text-xs text-muted-foreground">
                +{issues.length - 6} more findings in the full report
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={() => copyText(summaryText, "summary")}
              disabled={isCopyingSummary}
            >
              {isCopyingSummary ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Copying
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Summary
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => copyText(markdownReport, "markdown")}
              disabled={isCopyingMarkdown}
            >
              {isCopyingMarkdown ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Copying
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Copy Markdown
                </>
              )}
            </Button>
          </div>

          <Button onClick={shareToSlack} disabled={isSharingSlack}>
            {isSharingSlack ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sharing
              </>
            ) : (
              <>
                <Send className="size-4" />
                Share to Slack
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
