"use client"

import { type FormEvent, useMemo, useState } from "react"
import { Sparkles } from "lucide-react"
import type { Issue } from "@/components/issue-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ReportFollowUpPanelProps {
  issues: Issue[]
  decision?: {
    status: string
    reason: string
  } | null
}

function buildAnswer(question: string, issues: Issue[], decision?: { status: string; reason: string } | null) {
  const q = question.toLowerCase()

  const criticalIssues = issues.filter((issue) => issue.severity === "critical")
  const highConfidence = issues.filter((issue) => issue.confidence === "high")

  if (q.includes("why") && (q.includes("block") || q.includes("score") || q.includes("launch"))) {
    const topReasons = criticalIssues.slice(0, 2).map((issue) => issue.title)
    if (topReasons.length > 0) {
      return `${decision?.reason ?? "The release is blocked due to critical gaps."} Top blockers: ${topReasons.join("; ")}.`
    }
    return decision?.reason ?? "Launch risk remains due to unresolved issues."
  }

  if (q.includes("critical")) {
    if (criticalIssues.length === 0) {
      return "No critical issues are currently flagged."
    }
    return `Critical findings (${criticalIssues.length}): ${criticalIssues.map((issue) => issue.title).join("; ")}.`
  }

  if (q.includes("confidence")) {
    if (highConfidence.length === 0) {
      return "No findings are tagged high confidence in this run."
    }
    return `High-confidence findings: ${highConfidence.map((issue) => issue.title).join("; ")}.`
  }

  if (q.includes("fix") || q.includes("next")) {
    const topFixes = issues
      .slice(0, 3)
      .map(
        (issue) =>
          `${issue.title}: ${issue.recommendedFix ?? "Implement spec-compliant behavior and re-run analysis."}`
      )
    return topFixes.join(" ")
  }

  const fallbackList = issues.slice(0, 2).map((issue) => issue.title).join("; ")
  return `Current decision is "${decision?.status ?? "Pending"}". Highest-priority findings: ${fallbackList || "none yet"}.`
}

export function ReportFollowUpPanel({ issues, decision }: ReportFollowUpPanelProps) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)

  const quickPrompts = useMemo(
    () => ["Why is launch blocked?", "Show critical findings", "What should we fix first?"],
    []
  )

  const handleAsk = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) {
      return
    }
    setAnswer(buildAnswer(trimmed, issues, decision))
  }

  return (
    <Card className="border-border/75 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">Ask LaunchGuard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-2" onSubmit={handleAsk}>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why is this score low?"
          />
          <Button size="sm" variant="outline" type="submit">
            <Sparkles className="size-4" />
            Ask Follow-up
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuestion(prompt)
                setAnswer(buildAnswer(prompt, issues, decision))
              }}
              className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>

        {answer ? (
          <div className="rounded-lg border border-border/70 bg-background/45 p-3 text-sm text-foreground/90">
            {answer}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Secondary report chat surface for quick follow-up questions.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
