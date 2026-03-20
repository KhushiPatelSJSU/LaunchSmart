"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ExtendedSeverity, Issue } from "@/components/issue-card"

interface EvidenceGalleryProps {
  issues: Issue[]
  screenshotUrls: string[]
}

const severityWeight: Record<ExtendedSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function parseScreenshotIndex(issue: Issue): number | null {
  const source = `${issue.screenshotRef ?? ""} ${issue.evidence ?? ""}`.trim()
  if (!source) {
    return null
  }

  const match = source.match(/screenshot\s*#?\s*(\d+)/i)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }

  return parsed - 1
}

export function EvidenceGallery({ issues, screenshotUrls }: EvidenceGalleryProps) {
  const topBlockers = [...issues]
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    .slice(0, 3)

  return (
    <Card className="border-border/75 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">Evidence Gallery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topBlockers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Evidence cards appear here when blockers are detected.
          </p>
        ) : (
          topBlockers.map((issue) => {
            const screenshotIndex = parseScreenshotIndex(issue)
            const screenshot =
              screenshotIndex !== null ? screenshotUrls[screenshotIndex] : undefined

            return (
              <div
                key={`evidence-${issue.id}`}
                className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{issue.title}</p>
                  <Badge variant="outline" className="capitalize">
                    {issue.severity}
                  </Badge>
                </div>

                {screenshot ? (
                  <div className="overflow-hidden rounded-md border border-border/70">
                    <img
                      src={screenshot}
                      alt={issue.screenshotRef ?? "Referenced screenshot"}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">
                    No screenshot linked
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {issue.evidence ?? "Evidence not provided in this run."}
                </p>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
