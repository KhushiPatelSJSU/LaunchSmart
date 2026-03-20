'use client'

import { AlertTriangle } from 'lucide-react'
import type { Issue, ExtendedSeverity } from '@/components/issue-card'
import { cn } from '@/lib/utils'

interface LaunchScoreCardProps {
  issues: Issue[]
}

const severityPenalty: Record<ExtendedSeverity, number> = {
  critical: 24,
  high: 12,
  medium: 6,
  low: 2,
}

function bucketFromScore(score: number) {
  if (score >= 90) {
    return {
      label: 'Launch-Ready',
      className: 'text-emerald-300',
    }
  }

  if (score >= 70) {
    return {
      label: 'Launch With Caution',
      className: 'text-amber-300',
    }
  }

  return {
    label: 'Not Launch-Ready',
    className: 'text-red-300',
  }
}

export function LaunchScoreCard({ issues }: LaunchScoreCardProps) {
  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  }

  const deduction = issues.reduce((acc, issue) => acc + severityPenalty[issue.severity], 0)
  const score = Math.max(0, Math.round(100 - deduction))
  const bucket = bucketFromScore(score)

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_50%)]" />
      <div className="relative">
        <p className="font-mono text-sm tracking-[0.24em] text-foreground/75 uppercase">
          Launch Score
        </p>

        <div className="mt-4 flex items-end gap-3">
          <span className="font-mono text-5xl font-semibold leading-none tabular-nums">
            {score}
          </span>
          <span className="mb-1 font-mono text-xl text-muted-foreground">/ 100</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <AlertTriangle className="size-5 text-warning" />
          <p className={cn('font-mono text-2xl', bucket.className)}>{bucket.label}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xl">
          <p className="text-red-300">● {counts.critical} Critical</p>
          <p className="text-amber-300">● {counts.high} High</p>
          <p className="text-orange-300">● {counts.medium} Medium</p>
          <p className="text-emerald-300">● {counts.low} Low</p>
        </div>
      </div>
    </div>
  )
}
