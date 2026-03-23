"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, type UserSession } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Eye, EyeOff, Save, Loader2, CheckCircle2, Github, ExternalLink } from "lucide-react"

type KeysState = {
  github_token: string
  jira_email: string
  jira_api_token: string
  jira_domain: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [hasJiraToken, setHasJiraToken] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [keys, setKeys] = useState<KeysState>({
    github_token: "",
    jira_email: "",
    jira_api_token: "",
    jira_domain: "",
  })

  const [showGithubToken, setShowGithubToken] = useState(false)
  const [showJiraToken, setShowJiraToken] = useState(false)

  useEffect(() => {
    let mounted = true
    getSession().then((s) => {
      if (!mounted) return
      if (!s) {
        router.replace("/")
        return
      }
      setSession(s)
      fetchKeys(s.id)
    })
    return () => { mounted = false }
  }, [router])

  const fetchKeys = async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/keys?userId=${uid}`)
      if (!res.ok) throw new Error("Failed to fetch keys")
      const data = await res.json()
      setKeys({
        github_token: data.github_token || "",
        jira_email: data.jira_email || "",
        jira_api_token: data.jira_api_token || "",
        jira_domain: data.jira_domain || "",
      })
      setHasGithubToken(data.has_github_token || false)
      setHasJiraToken(data.has_jira_token || false)
      setLastUpdated(data.updated_at || null)
    } catch {
      // No saved keys yet, that's fine
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...keys, userId: session?.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }
      toast({
        title: "Keys saved",
        description: "Your API keys have been securely stored.",
      })
      // Re-fetch to get masked versions
      if (session) await fetchKeys(session.id)
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || "Could not save your API keys.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof KeysState, value: string) => {
    setKeys((prev) => ({ ...prev, [field]: value }))
  }

  if (!session || loading) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center px-6">
        <p className="animate-pulse text-sm text-muted-foreground">Loading settings...</p>
      </main>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.09),transparent_33%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />

      <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-8">
        {/* Header */}
        <section
          className="animate-rise-in rounded-2xl border border-border/70 bg-card/45 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-[11px] tracking-[0.22em] text-cyan-200/85 uppercase">
                Account Settings
              </p>
              <h2 className="max-w-3xl text-balance font-semibold text-3xl tracking-tight text-foreground md:text-4xl">
                API Integrations
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Connect your own GitHub and Jira accounts so LaunchSmart can read PRs and create tickets on your behalf.
              </p>
            </div>
            <Settings className="mt-1 hidden size-5 text-cyan-200 md:block" />
          </div>
        </section>

        {/* GitHub Section */}
        <section
          className="animate-rise-in rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm md:p-6"
          style={{ animationDelay: "170ms" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-card/60">
              <Github className="size-4 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">GitHub</h3>
              <p className="text-xs text-muted-foreground">Personal Access Token for PR analysis & issue creation</p>
            </div>
            {hasGithubToken && (
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="size-3.5" />
                Connected
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="github-token" className="text-xs text-muted-foreground">
                GitHub Personal Access Token
              </Label>
              <div className="relative">
                <Input
                  id="github-token"
                  type={showGithubToken ? "text" : "password"}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={keys.github_token}
                  onChange={(e) => handleChange("github_token", e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showGithubToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate one at{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
              >
                github.com/settings/tokens <ExternalLink className="size-3" />
              </a>
              {" "}with <code className="rounded bg-muted px-1 py-0.5 text-[11px]">repo</code> scope.
            </p>
          </div>
        </section>

        {/* Jira Section */}
        <section
          className="animate-rise-in rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm md:p-6"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-card/60">
              <svg className="size-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 00-.84-.84H11.53zM6.77 6.8a4.36 4.36 0 004.34 4.34h1.78v1.72a4.36 4.36 0 004.34 4.34V7.63a.84.84 0 00-.83-.83H6.77zM2 11.6a4.35 4.35 0 004.34 4.34h1.78v1.72c0 2.4 1.94 4.34 4.34 4.34v-9.56a.84.84 0 00-.84-.84H2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Jira</h3>
              <p className="text-xs text-muted-foreground">Atlassian credentials for ticket fetching & bug creation</p>
            </div>
            {hasJiraToken && (
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="size-3.5" />
                Connected
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jira-email" className="text-xs text-muted-foreground">
                  Jira Email
                </Label>
                <Input
                  id="jira-email"
                  type="email"
                  placeholder="you@company.com"
                  value={keys.jira_email}
                  onChange={(e) => handleChange("jira_email", e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jira-domain" className="text-xs text-muted-foreground">
                  Jira Domain
                </Label>
                <Input
                  id="jira-domain"
                  type="text"
                  placeholder="yourcompany.atlassian.net"
                  value={keys.jira_domain}
                  onChange={(e) => handleChange("jira_domain", e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jira-token" className="text-xs text-muted-foreground">
                Jira API Token
              </Label>
              <div className="relative">
                <Input
                  id="jira-token"
                  type={showJiraToken ? "text" : "password"}
                  placeholder="ATATT3xxxxxxxxxxx"
                  value={keys.jira_api_token}
                  onChange={(e) => handleChange("jira_api_token", e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowJiraToken(!showJiraToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showJiraToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Generate a token at{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
              >
                id.atlassian.com <ExternalLink className="size-3" />
              </a>
            </p>
          </div>
        </section>

        {/* Save Button */}
        <section
          className="animate-rise-in flex items-center justify-between gap-4"
          style={{ animationDelay: "350ms" }}
        >
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last saved: {new Date(lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {!lastUpdated && <div />}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[140px] gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Keys
              </>
            )}
          </Button>
        </section>

        {/* Info note */}
        <section className="animate-rise-in rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3" style={{ animationDelay: "440ms" }}>
          <p className="text-xs text-amber-200/80">
            <strong>Note:</strong> Your keys are stored securely in your account and are never shared.
            They are used server-side only when you trigger an analysis, PR check, or issue creation.
            If no user keys are saved, LaunchSmart will fall back to the server&apos;s default credentials (if configured).
          </p>
        </section>
      </main>
    </div>
  )
}
