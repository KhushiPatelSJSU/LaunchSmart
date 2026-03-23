"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, GitPullRequest, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

export interface PreCheckResult {
  decision: "APPROVE" | "BLOCK"
  reason: string
  implemented: string[]
  missing: string[]
  confidence: "high" | "medium" | "low"
  prTitle: string
  prUrl: string
}

export function PrChecker({ userId }: { userId?: string }) {
  const [prUrl, setPrUrl] = useState("")
  const [jiraUrl, setJiraUrl] = useState("")
  const [specStr, setSpecStr] = useState("")
  
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<PreCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!prUrl.trim()) return
    setIsChecking(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/pr-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prUrl: prUrl.trim(),
          jiraTicket: jiraUrl.trim() || undefined,
          spec: specStr.trim() || undefined,
          userId,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to analyze PR")

      setResult(data as PreCheckResult)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="border-border/75 bg-card/60 backdrop-blur-sm mt-8 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -inset-px opacity-50 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-red-500/10 mix-blend-overlay" />
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <GitPullRequest className="size-5 text-emerald-400" />
          Autonomous PR Checker
        </CardTitle>
        <CardDescription>
          Skip the staging environment entirely. Have an AI act as a Senior Release Engineer and automatically read the raw code diffs inside a GitHub PR to verify if the Jira Acceptance Criteria was logically fulfilled.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>GitHub PR Link (Required)</Label>
            <Input 
              placeholder="https://github.com/owner/repo/pull/123" 
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Jira Ticket / Spec URL (Optional)</Label>
            <Input 
              placeholder="https://your-domain.atlassian.net/browse/KAN-1" 
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
            />
          </div>
        </div>

        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all hover:shadow-[0_0_25px_rgba(52,211,153,0.25)]"
          onClick={handleCheck}
          disabled={!prUrl.trim() || isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Ingesting Code Diffs...
            </>
          ) : (
            "Run Static PR Verification"
          )}
        </Button>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-500 \${result.decision === 'APPROVE' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {result.decision === "APPROVE" ? (
                    <CheckCircle2 className="size-6 text-emerald-500" />
                  ) : (
                    <XCircle className="size-6 text-red-500" />
                  )}
                  <h3 className={`text-2xl font-bold \${result.decision === 'APPROVE' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {result.decision}
                  </h3>
                </div>
                <p className="text-foreground/90 font-medium">
                  {result.reason}
                </p>
                <div className="flex gap-2 mt-2">
                  <a href={result.prUrl} target="_blank" rel="noreferrer" className="text-xs hover:underline text-muted-foreground">
                    {result.prTitle}
                  </a>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase px-2 py-0.5 rounded bg-muted">
                    Confidence: {result.confidence}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-border/50 rounded-lg p-4 bg-card/40">
                <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center p-1 rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                  </span>
                  Verified Implementations
                </h4>
                {result.implemented.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No specific implementations explicitly verified.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.implemented.map((item, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border border-border/50 rounded-lg p-4 bg-card/40">
                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center p-1 rounded-full bg-red-500/20">
                    <XCircle className="size-3" />
                  </span>
                  Missing / Blockers
                </h4>
                {result.missing.length === 0 || (result.missing.length === 1 && result.missing[0].toLowerCase() === "none") ? (
                  <p className="text-sm text-muted-foreground italic">Model detected no outstanding missing features.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.missing.map((item, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 rounded-full bg-red-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
