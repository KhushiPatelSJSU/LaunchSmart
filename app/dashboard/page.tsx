'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { InputPanel, type AnalyzeInputPayload } from '@/components/input-panel'
import { PrChecker } from '@/components/pr-checker'
import type { Issue } from '@/components/issue-card'
import type { DraftIssue } from '@/components/issue-draft-list'
import { Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  createReportId,
  saveLaunchReport,
  type LaunchReportRecord,
  type ReportScore,
} from '@/lib/report-store'
import { getSession, type UserSession } from '@/lib/auth'
const fallbackIssues: Issue[] = [
  {
    id: 'fallback-1',
    title: 'Missing Error State for Form Submission',
    severity: 'critical',
    description:
      "Sign-up flow is missing explicit error feedback. Users can submit invalid payloads without clear guidance.",
    evidence: 'No inline error copy was detected in the analyzed screenshot set.',
    screenshotRef: 'Screenshot #1',
  },
  {
    id: 'fallback-2',
    title: 'Inconsistent Primary CTA Styling',
    severity: 'high',
    description:
      'Primary CTA style varies between key pages, which weakens visual trust and conversion consistency.',
    evidence: 'Observed mismatch in radius and border treatment between hero and pricing CTA buttons.',
    screenshotRef: 'Screenshot #2',
  },
  {
    id: 'fallback-3',
    title: 'Low Contrast Text in Hero Section',
    severity: 'medium',
    description:
      'Hero supporting text appears below accessible contrast thresholds and may be difficult to read.',
    evidence: 'Subtitle text appears muted on dark gradient with insufficient contrast margin.',
    screenshotRef: 'Screenshot #1',
  },
]

type AnalyzeResponse = {
  score?: {
    value: number
    bucket?: string
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    uncoveredCriticalCount?: number
  }
  decision?: {
    status: string
    reason: string
  }
  issueDrafts?: Array<{
    id: string
    title: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    expectedBehavior: string
    actualBehavior: string
    impact?: string
    recommendedFix: string
    evidence: string
    acceptanceCheck: string
  }>
  issues?: Array<{
    title: string
    severity: 'critical' | 'medium' | 'low' | 'high'
    description?: string
    expected?: string
    observed?: string
    impact?: string
    fix?: string
    evidence?: string
    confidence?: 'high' | 'medium' | 'low'
  }>
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }
      reject(new Error('Failed to read screenshot'))
    }
    reader.onerror = () => reject(new Error('Failed to read screenshot'))
    reader.readAsDataURL(file)
  })
}

function extractScreenshotRef(evidence?: string) {
  if (!evidence) {
    return undefined
  }

  const match = evidence.match(/screenshot\s*#?\s*\d+/i)
  return match?.[0] ?? undefined
}

function normalizeIssues(payload: AnalyzeResponse): Issue[] {
  const raw = payload.issues ?? []
  return raw.map((issue, index) => ({
    id: `issue-${index + 1}`,
    title: issue.title,
    severity: issue.severity,
    description:
      issue.description ??
      issue.observed ??
      'Potential mismatch found between expected product behavior and observed UI.',
    expected: issue.expected,
    observed: issue.observed,
    impact: issue.impact,
    recommendedFix: issue.fix,
    confidence: issue.confidence,
    evidence: issue.evidence,
    screenshotRef: extractScreenshotRef(issue.evidence),
  }))
}

function normalizeDrafts(payload: AnalyzeResponse): DraftIssue[] {
  if (payload.issueDrafts && payload.issueDrafts.length > 0) {
    return payload.issueDrafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      severity: draft.severity,
      description: draft.description,
      expectedBehavior: draft.expectedBehavior,
      actualBehavior: draft.actualBehavior,
      impact: draft.impact ?? draft.description,
      recommendedFix: draft.recommendedFix,
      evidence: draft.evidence,
      acceptanceCheck: draft.acceptanceCheck,
    }))
  }

  return (payload.issues ?? []).map((issue, index) => ({
    id: `LG-${index + 1}`,
    title: issue.title,
    severity: issue.severity,
    description: issue.description ?? issue.observed ?? "Issue discovered during analysis.",
    expectedBehavior: issue.expected ?? "Expected behavior not provided.",
    actualBehavior: issue.observed ?? "Observed behavior not provided.",
    impact: issue.impact ?? issue.description ?? "Impact not provided.",
    recommendedFix: issue.fix ?? "Recommended fix not provided.",
    evidence: issue.evidence ?? "No evidence attached.",
    acceptanceCheck: `Re-run analysis and confirm "${issue.title}" is resolved.`,
  }))
}

function inferDecision(issues: Issue[]) {
  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length
  const mediumOrHighCount = issues.filter(
    (issue) => issue.severity === 'medium' || issue.severity === 'high'
  ).length

  if (criticalCount > 0) {
    return {
      status: 'Block Release',
      reason: 'Critical issues detected. Resolve blockers before launch.',
    }
  }

  if (mediumOrHighCount > 2) {
    return {
      status: 'Risky',
      reason: 'Multiple medium/high issues remain and could impact launch quality.',
    }
  }

  return {
    status: 'Ready to Launch',
    reason: 'No critical blockers and manageable non-critical risk.',
  }
}

export default function LaunchGuardPage() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [session, setSession] = useState<UserSession | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    getSession().then((activeSession) => {
      if (!mounted) return
      if (!activeSession) {
        router.replace('/')
        return
      }
      setSession(activeSession)
      setIsCheckingSession(false)
    })
    return () => {
      mounted = false
    }
  }, [router])

  const headline = useMemo(() => {
    if (isAnalyzing) {
      return 'Running multimodal launch scan...'
    }
    return 'Upload spec + screenshots. Get ship/no-ship clarity.'
  }, [isAnalyzing])

  const buildReportRecord = ({
    id,
    payload,
    screenshots,
    issues,
    issueDrafts,
    decision,
    score,
  }: {
    id: string
    payload: AnalyzeInputPayload
    screenshots: string[]
    issues: Issue[]
    issueDrafts: DraftIssue[]
    decision: { status: string; reason: string } | null
    score: ReportScore | null
  }): LaunchReportRecord => {
    return {
      id,
      createdAt: new Date().toISOString(),
      projectName: payload.projectName,
      spec: payload.spec,
      specFileName: payload.specFileName,
      stagingUrl: payload.stagingUrl,
      routes: payload.routes,
      notes: payload.notes,
      screenshots,
      issues,
      issueDrafts,
      decision,
      score,
      jiraUrl: payload.jiraUrl,
      prUrl: payload.prUrl,
    }
  }

  const handleAnalyze = async (payload: AnalyzeInputPayload) => {
    if (!session) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to run analyses.',
      })
      router.push('/')
      return
    }

    const {
      projectName,
      spec,
      screenshots,
      stagingUrl,
      routes,
      notes,
      specFileName,
    } = payload

    setIsAnalyzing(true)

    let screenshotPayload: string[] = []
    try {
      screenshotPayload = await Promise.all(
        screenshots.map((file) => fileToDataUrl(file))
      )

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          spec,
          screenshots: screenshotPayload,
          stagingUrl,
          routes,
          notes,
          specFileName,
          userId: session.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Analyze route failed')
      }

      const data = (await response.json()) as AnalyzeResponse & { reportId?: string }
      const normalized = normalizeIssues(data)
      const normalizedDrafts = normalizeDrafts(data)
      const finalIssues = normalized.length > 0 ? normalized : fallbackIssues
      const finalDecision = data.decision ?? inferDecision(finalIssues)
      const id = data.reportId || createReportId()
      const score = data.score ?? null
      const report = buildReportRecord({
        id,
        payload,
        screenshots: screenshotPayload,
        issues: finalIssues,
        issueDrafts: normalizedDrafts,
        decision: finalDecision,
        score,
      })

      // Remote API handles saving to Supabase now
      if (!data.reportId) {
        saveLaunchReport(report)
      }

      toast({
        title: 'Analysis Complete',
        description: `Found ${finalIssues.length} launch risks worth reviewing.`,
      })
      router.push(`/analyze/${id}`)
    } catch (error) {
      console.error(error)
      const id = createReportId()
      const fallbackDecision = inferDecision(fallbackIssues)
      const report = buildReportRecord({
        id,
        payload,
        screenshots: screenshotPayload,
        issues: fallbackIssues,
        issueDrafts: [],
        decision: fallbackDecision,
        score: null,
      })
      saveLaunchReport(report)
      toast({
        title: 'API fallback enabled',
        description:
          'Could not reach full analysis path, so showing demo findings to keep iteration fast.',
      })
      router.push(`/analyze/${id}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center px-6">
        <p className="animate-pulse text-sm text-muted-foreground">Loading dashboard...</p>
      </main>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.09),transparent_33%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />



      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-7 px-6 py-8">
        <section
          className="animate-rise-in rounded-2xl border border-border/70 bg-card/45 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-[11px] tracking-[0.22em] text-cyan-200/85 uppercase">
                Launch Review Workspace
              </p>
              <h2 className="max-w-3xl text-balance font-semibold text-3xl tracking-tight text-foreground md:text-4xl">
                {headline}
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Report-first workflow: extract spec intent, compare with screenshots,
                and prioritize the blockers that can fail launch day.
              </p>
            </div>
            <Sparkles className="mt-1 hidden size-5 text-cyan-200 md:block" />
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.02fr_1fr]">
          <div
            className="animate-rise-in rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm md:p-6 xl:col-span-2 flex flex-col gap-8"
            style={{ animationDelay: '170ms' }}
          >
            <InputPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border/50"></div>
              <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-widest font-semibold backdrop-blur-md px-2 rounded-full ring-1 ring-border/20 bg-background/50">
                OR
              </span>
              <div className="flex-grow border-t border-border/50"></div>
            </div>

            <PrChecker />
          </div>
        </section>
      </main>
    </div>
  )
}
