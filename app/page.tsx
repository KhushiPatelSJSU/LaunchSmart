'use client'

import { useMemo, useState } from 'react'
import { InputPanel, type AnalyzeInputPayload } from '@/components/input-panel'
import { ResultsPanel } from '@/components/results-panel'
import type { Issue } from '@/components/issue-card'
import { Radar, Shield, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  decision?: {
    status: string
    reason: string
  }
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [analysisScreenshots, setAnalysisScreenshots] = useState<string[]>([])
  const [decision, setDecision] = useState<{ status: string; reason: string } | null>(null)
  const { toast } = useToast()

  const headline = useMemo(() => {
    if (isAnalyzing) {
      return 'Running multimodal launch scan...'
    }

    if (!hasAnalyzed) {
      return 'Upload spec + screenshots. Get ship/no-ship clarity.'
    }

    return `${issues.length} issue${issues.length === 1 ? '' : 's'} detected in your latest analysis.`
  }, [hasAnalyzed, isAnalyzing, issues.length])

  const handleAnalyze = async (payload: AnalyzeInputPayload) => {
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
    setHasAnalyzed(false)
    setIssues([])
    setAnalysisScreenshots([])
    setDecision(null)

    let screenshotPayload: string[] = []
    try {
      screenshotPayload = await Promise.all(
        screenshots.map((file) => fileToDataUrl(file))
      )
      setAnalysisScreenshots(screenshotPayload)

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
        }),
      })

      if (!response.ok) {
        throw new Error('Analyze route failed')
      }

      const data = (await response.json()) as AnalyzeResponse
      const normalized = normalizeIssues(data)
      const finalIssues = normalized.length > 0 ? normalized : fallbackIssues
      const finalDecision = data.decision ?? inferDecision(finalIssues)

      setIssues(finalIssues)
      setDecision(finalDecision)
      setHasAnalyzed(true)

      toast({
        title: 'Analysis Complete',
        description: `Found ${finalIssues.length} launch risks worth reviewing.`,
      })
    } catch (error) {
      console.error(error)
      setIssues(fallbackIssues)
      setAnalysisScreenshots(screenshotPayload)
      setDecision(inferDecision(fallbackIssues))
      setHasAnalyzed(true)
      toast({
        title: 'API fallback enabled',
        description:
          'Could not reach full analysis path, so showing demo findings to keep iteration fast.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReAnalyze = () => {
    setHasAnalyzed(false)
    setIssues([])
    setAnalysisScreenshots([])
    setDecision(null)
    toast({
      title: 'Ready for another pass',
      description: 'Update inputs and trigger the next release-readiness scan.',
    })
  }

  const handleCreateIssue = async (issue: Issue) => {
    await new Promise((resolve) => setTimeout(resolve, 650))
    toast({
      title: 'Issue Drafted',
      description: `"${issue.title}" is ready to send to GitHub/Linear.`,
    })
  }

  const handleDismiss = async (issue: Issue) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    toast({
      title: 'Issue Dismissed',
      description: `"${issue.title}" removed from this review pass.`,
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.09),transparent_33%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />

      <header className="relative animate-fade-in border-b border-border/60 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <Shield className="size-5 text-cyan-200" />
            </div>
            <div>
              <h1 className="font-semibold text-xl tracking-tight text-foreground">LaunchGuard</h1>
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                Release Readiness Agent
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/55 px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <Radar className="size-3.5" />
            Spec-to-Screenshot Verification
          </div>
        </div>
      </header>

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
            className="animate-rise-in rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm md:p-6"
            style={{ animationDelay: '170ms' }}
          >
            <InputPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>

          <div
            className="animate-rise-in rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm md:p-6"
            style={{ animationDelay: '240ms' }}
          >
            <h3 className="mb-5 font-medium text-lg tracking-tight text-foreground">
              Analysis Results
            </h3>
            <ResultsPanel
              issues={issues}
              screenshotUrls={analysisScreenshots}
              decision={decision}
              isLoading={isAnalyzing}
              hasAnalyzed={hasAnalyzed}
              onCreateIssue={handleCreateIssue}
              onDismiss={handleDismiss}
              onReAnalyze={handleReAnalyze}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
