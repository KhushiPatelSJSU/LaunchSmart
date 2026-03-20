"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarClock, LinkIcon } from "lucide-react"
import { ResultsPanel } from "@/components/results-panel"
import type { Issue } from "@/components/issue-card"
import type { DraftIssue } from "@/components/issue-draft-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getLaunchReport, type LaunchReportRecord } from "@/lib/report-store"

export default function AnalyzeReportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const reportId = useMemo(() => {
    const raw = params?.id
    if (!raw) {
      return ""
    }
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [isLoading, setIsLoading] = useState(true)
  const [report, setReport] = useState<LaunchReportRecord | null>(null)

  useEffect(() => {
    if (!reportId) {
      setIsLoading(false)
      setReport(null)
      return
    }
    const loaded = getLaunchReport(reportId)
    setReport(loaded)
    setIsLoading(false)
  }, [reportId])

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading report...</p>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
        <Card className="w-full border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This report is not available on the current device. Run a fresh
              analysis to generate a new report artifact.
            </p>
            <Link href="/">
              <Button>
                <ArrowLeft className="size-4" />
                Back to Upload
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const issues = report.issues as Issue[]
  const issueDrafts = report.issueDrafts as DraftIssue[]

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            LaunchGuard Report
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{report.projectName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Run Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarClock className="size-3.5" />
              {new Date(report.createdAt).toLocaleString()}
            </p>
            {report.stagingUrl ? (
              <p className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 size-3.5 shrink-0" />
                <span className="break-all">{report.stagingUrl}</span>
              </p>
            ) : (
              <p>No staging URL provided.</p>
            )}
            <p>{report.screenshots.length} screenshot(s) analyzed.</p>
            {report.routes.length > 0 && (
              <p>Routes: {report.routes.join(", ")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spec Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            {report.specFileName && <p>Source file: {report.specFileName}</p>}
            <p className="line-clamp-6 whitespace-pre-wrap">
              {report.spec || "No spec text retained in this report."}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/50 p-5 md:p-6">
        <h2 className="mb-5 text-lg font-medium tracking-tight">Analysis Results</h2>
        <ResultsPanel
          issues={issues}
          screenshotUrls={report.screenshots}
          score={report.score}
          issueDrafts={issueDrafts}
          decision={report.decision}
          isLoading={false}
          hasAnalyzed
          onCreateIssue={async (issue) => {
            toast({
              title: "Issue Drafted",
              description: `"${issue.title}" is ready to send to GitHub/Linear.`,
            })
          }}
          onDismiss={async (issue) => {
            toast({
              title: "Issue Dismissed",
              description: `"${issue.title}" removed from this report view.`,
            })
          }}
          onReAnalyze={() => {
            router.push("/")
          }}
        />
      </Card>
    </main>
  )
}
