"use client"

import { useMemo, useState } from "react"
import { Copy, Download, Loader2 } from "lucide-react"
import type { Issue } from "@/components/issue-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface IssueDraftListProps {
  issues: Issue[]
  drafts?: DraftIssue[]
}

export interface DraftIssue {
  id: string
  title: string
  severity: Issue["severity"]
  description: string
  expectedBehavior: string
  actualBehavior: string
  impact: string
  recommendedFix: string
  evidence: string
  acceptanceCheck: string
}

function toDraft(issue: Issue, index: number): DraftIssue {
  return {
    id: `LG-${index + 1}`,
    title: issue.title,
    severity: issue.severity,
    description: issue.description,
    expectedBehavior:
      issue.expected ?? "Behavior should match the launch specification criteria.",
    actualBehavior:
      issue.observed ?? issue.description ?? "Observed behavior diverges from spec.",
    impact:
      issue.impact ?? "This mismatch can reduce launch quality, trust, or conversion.",
    recommendedFix:
      issue.recommendedFix ??
      "Implement and verify spec-compliant behavior in the affected flow.",
    evidence: issue.evidence ?? "No explicit evidence attached.",
    acceptanceCheck: `Re-run LaunchGuard and confirm "${issue.title}" is no longer flagged.`,
  }
}

function toMarkdown(draft: DraftIssue) {
  return [
    `## ${draft.id}: ${draft.title}`,
    "",
    `- Severity: ${draft.severity}`,
    `- Evidence: ${draft.evidence}`,
    "",
    "### Expected Behavior",
    draft.expectedBehavior,
    "",
    "### Actual Behavior",
    draft.actualBehavior,
    "",
    "### Impact",
    draft.impact,
    "",
    "### Recommended Fix",
    draft.recommendedFix,
    "",
    "### Acceptance Check",
    draft.acceptanceCheck,
  ].join("\n")
}

export function IssueDraftList({ issues, drafts: backendDrafts }: IssueDraftListProps) {
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const { toast } = useToast()

  const drafts = useMemo(
    () => backendDrafts ?? issues.map((issue, index) => toDraft(issue, index)),
    [backendDrafts, issues]
  )

  const copyDraft = async (draft: DraftIssue) => {
    try {
      setCopyingId(draft.id)
      await navigator.clipboard.writeText(toMarkdown(draft))
      toast({
        title: "Draft copied",
        description: `${draft.id} copied as markdown.`,
      })
    } finally {
      setCopyingId(null)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(drafts, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "launchguard-issue-drafts.json"
    anchor.click()
    URL.revokeObjectURL(url)
    toast({
      title: "JSON exported",
      description: "Issue drafts downloaded for GitHub/Linear import.",
    })
  }

  return (
    <Card className="border-border/75 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Draft Issues</CardTitle>
        <Button variant="outline" size="sm" onClick={exportJson} disabled={drafts.length === 0}>
          <Download className="size-4" />
          Export JSON
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Once findings appear, launch-ready issue drafts will be generated here.
          </p>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-lg border border-border/70 bg-background/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{draft.id} · {draft.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{draft.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {draft.severity}
                </Badge>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyDraft(draft)}
                  disabled={copyingId === draft.id}
                >
                  {copyingId === draft.id ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Copying
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy Markdown
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
