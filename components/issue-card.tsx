"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  PlusCircle,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type Severity = "critical" | "medium" | "low"

export interface Issue {
  id: string
  title: string
  severity: Severity
  description: string
  screenshotRef?: string
}

interface IssueCardProps {
  issue: Issue
  onCreateIssue?: (issue: Issue) => void
  onDismiss?: (issue: Issue) => void
  onResolve?: (issue: Issue) => void
}

const severityConfig: Record<
  Severity,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-destructive text-destructive-foreground",
  },
  medium: {
    label: "Medium",
    className: "bg-warning text-warning-foreground",
  },
  low: {
    label: "Low",
    className: "bg-muted text-muted-foreground",
  },
}

export function IssueCard({
  issue,
  onCreateIssue,
  onDismiss,
  onResolve,
}: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const config = severityConfig[issue.severity]

  const handleResolve = () => {
    setIsResolved(true)
    onResolve?.(issue)
  }

  return (
    <Card
      className={cn(
        "border-border bg-card transition-all duration-200",
        isResolved
          ? "opacity-50 scale-[0.98]"
          : "hover:bg-secondary/50 hover:border-muted-foreground/30"
      )}
    >
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="mt-0.5 rounded p-0.5 hover:bg-muted transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            <CardTitle
              className={cn(
                "text-base font-medium",
                isResolved ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {issue.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isResolved && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                Resolved
              </Badge>
            )}
            <Badge className={config.className}>{config.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <div
        className={cn(
          "grid transition-all duration-200",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {issue.description}
            </p>

            {issue.screenshotRef && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                <ImageIcon className="size-4" />
                <span>Referenced in: {issue.screenshotRef}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateIssue?.(issue)
                }}
                disabled={isResolved}
                className="flex-1"
              >
                <PlusCircle className="size-4" />
                Create Issue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleResolve()
                }}
                disabled={isResolved}
                className="text-success hover:text-success hover:bg-success/10 hover:border-success/30"
              >
                <Check className="size-4" />
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss?.(issue)
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
