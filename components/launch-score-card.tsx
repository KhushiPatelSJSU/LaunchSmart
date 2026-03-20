'use client'

import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import type { Issue, ExtendedSeverity } from '@/components/issue-card'
import { cn } from '@/lib/utils'

interface LaunchScoreCardProps {
  issues: Issue[]
  score?: {
    value: number
    bucket?: string
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    uncoveredCriticalCount?: number
  } | null
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
      label: 'Launch-Ready 🚀',
      className: 'text-emerald-300',
      ringColor: 'stroke-emerald-400',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
    }
  }
  if (score >= 70) {
    return {
      label: 'Launch With Caution ⚠️',
      className: 'text-amber-300',
      ringColor: 'stroke-amber-400',
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
    }
  }
  return {
    label: 'Not Launch-Ready ✋',
    className: 'text-red-300',
    ringColor: 'stroke-red-400',
    icon: ShieldX,
    iconColor: 'text-red-400',
  }
}

export function LaunchScoreCard({ issues, score: backendScore }: LaunchScoreCardProps) {
  const fallbackCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  }

  const fallbackDeduction = issues.reduce((acc, issue) => acc + severityPenalty[issue.severity], 0)
  const fallbackScore = Math.max(0, Math.round(100 - fallbackDeduction))

  const score = backendScore?.value ?? fallbackScore
  const counts = backendScore
    ? {
        critical: backendScore.criticalCount,
        high: backendScore.highCount,
        medium: backendScore.mediumCount,
        low: backendScore.lowCount,
      }
    : fallbackCounts
  const bucket = bucketFromScore(score)
  const Icon = bucket.icon

  // Circular progress math
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_50%)]" />

      <div className="relative flex flex-col items-center gap-4">

        {/* Title */}
        <div className="flex items-center gap-2 self-start">
          <Icon className={cn('size-5', bucket.iconColor)} />
          <p className="font-mono text-sm tracking-[0.24em] text-foreground/75 uppercase">
            Launch Score
          </p>
        </div>

        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg width="160" height="160" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              strokeLinecap="round"
              className={cn('transition-all duration-700', bucket.ringColor)}
            />
          </svg>

          {/* Score in center */}
          <div className="absolute flex flex-col items-center">
            <span className={cn('font-mono text-5xl font-semibold leading-none tabular-nums', bucket.className)}>
              {score}
            </span>
            <span className="font-mono text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Verdict */}
        <p className={cn('font-mono text-xl font-semibold', bucket.className)}>
          {bucket.label}
        </p>

        {/* Issue breakdown */}
        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 font-mono text-base mt-2">
          <p className="text-red-300">● {counts.critical} Critical</p>
          <p className="text-amber-300">● {counts.high} High</p>
          <p className="text-orange-300">● {counts.medium} Medium</p>
          <p className="text-emerald-300">● {counts.low} Low</p>
        </div>

      </div>
    </div>
  )
}
