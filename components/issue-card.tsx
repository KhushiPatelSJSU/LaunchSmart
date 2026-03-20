"use client"

import { type CSSProperties, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  ImageIcon,
  PlusCircle,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type Severity = "critical" | "medium" | "low"
export type ExtendedSeverity = Severity | "high"

export interface Issue {
  id: string
  title: string
  severity: ExtendedSeverity
  description: string
  evidence?: string
  screenshotRef?: string
}

interface IssueCardProps {
  issue: Issue
  className?: string
  style?: CSSProperties
  onCreateIssue?: (issue: Issue) => void | Promise<void>
  onDismiss?: (issue: Issue) => void | Promise<void>
  onResolve?: (issue: Issue) => void | Promise<void>
}

const severityConfig: Record<
  ExtendedSeverity,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className:
      "border border-red-500/40 bg-red-500/20 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)]",
  },
  high: {
    label: "High",
    className:
      "border border-amber-400/40 bg-amber-400/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.2)]",
  },
  medium: {
    label: "Medium",
    className:
      "border border-orange-400/40 bg-orange-400/20 text-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.2)]",
  },
  low: {
    label: "Low",
    className: "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  },
}

export function IssueCard({
  issue,
  className,
  style,
  onCreateIssue,
  onDismiss,
  onResolve,
}: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const config = severityConfig[issue.severity]

  const handleResolve = async () => {
    try {
      setIsResolving(true)
      setIsResolved(true)
      await onResolve?.(issue)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <Card
      style={style}
      className={cn(
        "border-border/80 bg-card/70 transition-all duration-200 backdrop-blur-sm",
        isResolved
          ? "scale-[0.99] opacity-55"
          : "hover:-translate-y-0.5 hover:border-accent/45 hover:bg-card",
        className
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
              <Badge
                variant="outline"
                className="border-success/40 bg-success/15 text-success"
              >
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

            {issue.evidence && (
              <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Evidence
                </p>
                <p className="mt-1 text-xs text-foreground/85">{issue.evidence}</p>
              </div>
            )}

            {issue.screenshotRef && (
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <ImageIcon className="size-4" />
                <span>Referenced in: {issue.screenshotRef}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    setIsCreating(true)
                    await onCreateIssue?.(issue)
                  } finally {
                    setIsCreating(false)
                  }
                }}
                disabled={isResolved || isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Drafting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="size-4" />
                    Create Issue
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation()
                  await handleResolve()
                }}
                disabled={isResolved || isResolving}
                className="text-success hover:text-success hover:bg-success/10 hover:border-success/30"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Resolving
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Resolve
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    setIsDismissing(true)
                    await onDismiss?.(issue)
                  } finally {
                    setIsDismissing(false)
                  }
                }}
                className="text-muted-foreground hover:text-destructive"
                disabled={isDismissing}
              >
                {isDismissing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
