"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getReportsByUser } from "@/lib/reports"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, FileText, Calendar, ShieldCheck } from "lucide-react"

import { supabase } from "@/lib/supabase"

export default function HistoryPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial session
    getSession().then((user) => {
      // If no user but we just returned from OAuth, give Supabase a moment to parse the url hash
      if (!user && (window.location.hash.includes("access_token") || window.location.search.includes("code="))) {
        return
      }
      
      if (!user) {
        window.location.href = "/" // Redirect to home if completely unauthenticated
        return
      }
      getReportsByUser(user.id).then((data) => {
        setReports(data || [])
        setLoading(false)
      })
    })

    // Listen for the actual OAuth token processing
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, activeSession) => {
        if (activeSession?.user) {
          const userObj = { id: activeSession.user.id, email: activeSession.user.email || "" }
          getReportsByUser(userObj.id).then((data) => {
            setReports(data || [])
            setLoading(false)
          })
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading history...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Launch History</h1>
        <p className="text-muted-foreground text-sm">Review your past product launch analyses.</p>
      </div>

      {reports.length === 0 ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <FileText className="mb-4 size-10 opacity-30" />
            <p>No reports found yet.</p>
            <Link href="/dashboard" className="mt-4 text-sm text-cyan-400 hover:underline">
              Run your first analysis
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Link key={report.id} href={`/analyze/${report.id}`} className="group">
              <Card className="flex h-full flex-col border-border/70 bg-card/50 transition-colors hover:border-cyan-400/50 hover:bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-medium">{report.project_name || "Untitled Project"}</CardTitle>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Score
                    </span>
                    <span className="font-mono font-medium text-foreground">{report.score}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      Date
                    </span>
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="rounded-full bg-border/50 px-2 py-1 uppercase tracking-wider">{report.decision}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
