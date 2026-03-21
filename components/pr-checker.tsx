"use client"

import { useState } from "react"
import { Github, ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PRCheckerProps {
  spec?: string
}

export function PRChecker({ spec }: PRCheckerProps) {
  const [prUrl, setPrUrl] = useState("")
  const [jiraTicket, setJiraTicket] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPR = async () => {
    if (!prUrl.trim()) return
    setIsChecking(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/pr-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl, spec, jiraTicket }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to check PR")
        return
      }

      setResult(data)
    } catch (err) {
      setError("Failed to check PR. Please try again.")
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Github className="size-5 text-muted-foreground" />
        <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-foreground">
          PR / Jira Checker
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Paste a GitHub PR link and optionally a Jira ticket description. 
        LaunchGuard will check if the PR implements what was required.
      </p>

      {/* Jira ticket input */}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Jira Ticket URL (optional)
        </label>
        <input
          placeholder="https://your-domain.atlassian.net/browse/KAN-1"
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          value={jiraTicket}
          onChange={(e) => setJiraTicket(e.target.value)}
        />
      </div>

      {/* PR URL input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          GitHub PR URL
        </label>
        <div className="flex gap-2">
          <input
            placeholder="https://github.com/owner/repo/pull/123"
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
          />
          <Button
            onClick={checkPR}
            disabled={!prUrl.trim() || isChecking}
            size="sm"
          >
            {isChecking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Check PR"
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn(
          "rounded-lg border p-4 space-y-3",
          result.decision === "APPROVE"
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-red-500/10 border-red-500/30"
        )}>
          {/* Decision */}
          <div className="flex items-center gap-2">
            {result.decision === "APPROVE" ? (
              <CheckCircle2 className="size-6 text-emerald-400" />
            ) : (
              <XCircle className="size-6 text-red-400" />
            )}
            <span className={cn(
              "text-xl font-bold font-mono",
              result.decision === "APPROVE" ? "text-emerald-400" : "text-red-400"
            )}>
              {result.decision === "APPROVE" ? "✅ APPROVE" : "🚫 BLOCK"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {result.confidence} confidence
            </span>
          </div>

          {/* Reason */}
          <p className="text-sm text-foreground">{result.reason}</p>

          {/* PR info */}
          {result.pr && (
            <a
              href={result.pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              PR #{result.pr.number}: {result.pr.title}
            </a>
          )}

          {/* Implemented */}
          {result.implemented?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-400 mb-1">✅ Implemented:</p>
              <ul className="space-y-1">
                {result.implemented.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing */}
          {result.missing?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-400 mb-1">❌ Missing:</p>
              <ul className="space-y-1">
                {result.missing.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}