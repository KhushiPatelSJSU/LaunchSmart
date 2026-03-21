"use client"

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Image as ImageIcon, Upload, X, Command, Link, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnalysisLoading } from "@/components/analysis-loading"

export interface AnalyzeInputPayload {
  projectName: string
  spec: string
  screenshots: File[]
  stagingUrl: string
  routes: string[]
  notes: string
  specFileName?: string
}

interface InputPanelProps {
  onAnalyze: (payload: AnalyzeInputPayload) => void
  isAnalyzing: boolean
}

const MAX_SPEC_CHARS = 10000

export function InputPanel({ onAnalyze, isAnalyzing }: InputPanelProps) {
  const [projectName, setProjectName] = useState("Release Candidate")
  const [spec, setSpec] = useState("")
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [stagingUrl, setStagingUrl] = useState("")
  const [routesInput, setRoutesInput] = useState("/, /pricing, /signup, /dashboard")
  const [notes, setNotes] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  // Jira URL
  const [jiraUrl, setJiraUrl] = useState("")
  const [isFetchingJira, setIsFetchingJira] = useState(false)
  const [jiraFetched, setJiraFetched] = useState(false)
  const [jiraSpec, setJiraSpec] = useState("")

  // PR URL
  const [prUrl, setPrUrl] = useState("")

  const specInputRef = useRef<HTMLInputElement>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const hasSpec = spec.trim() || specFile || jiraFetched
  const canAnalyze = Boolean(hasSpec || prUrl.trim()) && !isAnalyzing

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (canAnalyze) {
          e.preventDefault()
          handleAnalyze()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canAnalyze])

  // Fetch Jira ticket
  const fetchJiraTicket = async () => {
    if (!jiraUrl.trim()) return
    setIsFetchingJira(true)
    setJiraFetched(false)
    try {
      const res = await fetch("/api/jira-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jiraUrl }),
      })
      const data = await res.json()
      if (data.spec) {
        setJiraSpec(data.spec)
        setJiraFetched(true)
      }
    } catch (e) {
      console.error("Failed to fetch Jira ticket", e)
    } finally {
      setIsFetchingJira(false)
    }
  }

  const isTextLikeFile = (file: File) => {
    const textMimes = ["text/plain", "text/markdown", "application/json"]
    const lowerName = file.name.toLowerCase()
    return (
      textMimes.includes(file.type) ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".json")
    )
  }

  const handleSpecFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSpecFile(file)
      if (isTextLikeFile(file)) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          setSpec(content.slice(0, MAX_SPEC_CHARS))
        }
        reader.readAsText(file)
      }
    }
  }

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addScreenshots(files)
  }

  const addScreenshots = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    setScreenshots((prev) => [...prev, ...imageFiles].slice(0, 10))
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index))
  }

  const parseRoutes = (value: string) => {
    return value.split(/[\n,]/).map((r) => r.trim()).filter(Boolean)
  }

  const handleAnalyze = () => {
    // Combine spec text + jira spec
    const combined = [spec.trim(), jiraSpec.trim()].filter(Boolean).join("\n\n---\n\n")
    
    let effectiveSpec = combined
    if (!effectiveSpec && specFile) {
      effectiveSpec = `Uploaded spec file: ${specFile.name}. ${notes.trim() ? `Release context: ${notes.trim()}` : ""}`
    }
    if (!effectiveSpec) return

    // Add PR URL to notes if provided
    const effectiveNotes = prUrl.trim()
      ? `${notes.trim()} PR to analyze: ${prUrl.trim()}`.trim()
      : notes.trim()

    onAnalyze({
      projectName: projectName.trim() || "Release Candidate",
      spec: effectiveSpec,
      screenshots,
      stagingUrl: stagingUrl.trim(),
      routes: parseRoutes(routesInput),
      notes: effectiveNotes,
      specFileName: specFile?.name,
    })
  }

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addScreenshots(Array.from(e.dataTransfer.files))
  }

  const charCount = spec.length
  const charPercentage = (charCount / MAX_SPEC_CHARS) * 100

  return (
    <div className="space-y-6">
      {/* Project Context */}
      <Card className="border-border/75 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Project Context</CardTitle>
          <p className="font-mono text-[11px] tracking-[0.17em] text-muted-foreground uppercase">
            Name this release and optionally include staging targets
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="LaunchGuard Demo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staging-url">Staging URL (Optional)</Label>
              <Input id="staging-url" value={stagingUrl} onChange={(e) => setStagingUrl(e.target.value)} placeholder="https://staging.example.com" type="url" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="routes-input">Routes to Check (Optional)</Label>
            <Textarea id="routes-input" value={routesInput} onChange={(e) => setRoutesInput(e.target.value)} className="min-h-[88px] resize-none" placeholder="/, /pricing, /signup, /dashboard" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Release Notes (Optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[88px] resize-none" placeholder="Anything to prioritize in review? Known risky areas?" />
          </div>
        </CardContent>
      </Card>

      {/* Product Spec */}
      <Card className="border-border/75 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FileText className="size-4" />
            Product Spec
          </CardTitle>
          <p className="font-mono text-[11px] tracking-[0.17em] text-muted-foreground uppercase">
            Paste key criteria, upload a file, or import from Jira
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Text area */}
          <div className="relative">
            <Textarea
              placeholder="Paste your product specification here..."
              value={spec}
              onChange={(e) => setSpec(e.target.value.slice(0, MAX_SPEC_CHARS))}
              className="min-h-[200px] resize-none border-border/70 bg-input/70 pb-8 pr-4 text-foreground placeholder:text-muted-foreground"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300", charPercentage > 90 ? "bg-destructive" : charPercentage > 70 ? "bg-warning" : "bg-accent")}
                  style={{ width: `${Math.min(charPercentage, 100)}%` }}
                />
              </div>
              <span className={cn("text-xs tabular-nums", charPercentage > 90 ? "text-destructive" : "text-muted-foreground")}>
                {charCount.toLocaleString()}/{MAX_SPEC_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Upload file */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => specInputRef.current?.click()}>
              <Upload className="size-4" />
              Upload File
            </Button>
            {specFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                <FileText className="size-3" />
                <span className="max-w-[150px] truncate">{specFile.name}</span>
                <button onClick={() => setSpecFile(null)} className="hover:text-foreground">
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Jira URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link className="size-3" />
              Jira Ticket URL (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-domain.atlassian.net/browse/KAN-1"
                value={jiraUrl}
                onChange={(e) => { setJiraUrl(e.target.value); setJiraFetched(false); setJiraSpec("") }}
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="sm" onClick={fetchJiraTicket} disabled={!jiraUrl.trim() || isFetchingJira}>
                {isFetchingJira ? <Loader2 className="size-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>
            {jiraFetched && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Jira ticket fetched successfully!
              </div>
            )}
          </div>

          <input ref={specInputRef} type="file" accept=".pdf,.txt,.md,.json,application/pdf,text/plain,text/markdown" onChange={handleSpecFileChange} className="hidden" />
          <p className="text-xs text-muted-foreground">
            Tip: for strongest analysis, keep the most important acceptance criteria in the text box.
          </p>
        </CardContent>
      </Card>

      {/* Screenshots */}
      <Card className="border-border/75 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <ImageIcon className="size-4" />
              Screenshots
            </CardTitle>
            {screenshots.length > 0 && (
              <span className="text-xs text-muted-foreground">{screenshots.length}/10 images</span>
            )}
          </div>
          <p className="font-mono text-[11px] tracking-[0.17em] text-muted-foreground uppercase">
            Drag UI captures of your highest-risk product flows
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Upload area */}
          <div
            onClick={() => screenshotInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-all duration-200",
              isDragging ? "scale-[1.02] border-cyan-300 bg-cyan-500/10" : "border-border bg-input/35 hover:border-cyan-300/50 hover:bg-input/70"
            )}
          >
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.1),transparent_55%)]" />
            <div className={cn("rounded-full p-3 transition-colors", isDragging ? "bg-cyan-400/20" : "bg-muted")}>
              <Upload className={cn("size-6 transition-colors", isDragging ? "text-cyan-200" : "text-muted-foreground")} />
            </div>
            <p className="text-sm text-muted-foreground">{isDragging ? "Drop images here..." : "Drag & drop or click to upload"}</p>
            <p className="text-xs text-muted-foreground/60">PNG, JPG up to 10MB each (max 10 images)</p>
          </div>

          <input ref={screenshotInputRef} type="file" accept="image/*" multiple onChange={handleScreenshotChange} className="hidden" />

          {screenshots.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {screenshots.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group relative aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-border hover:ring-accent transition-all">
                  <img src={URL.createObjectURL(file)} alt={`Screenshot ${index + 1}`} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeScreenshot(index) }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                  <span className="absolute bottom-1.5 left-1.5 text-xs text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">{index + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* PR Link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link className="size-3" />
              GitHub PR Link (Optional)
            </Label>
            <Input
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="text-sm"
            />
            {prUrl.trim() && (
              <div className="flex items-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 text-xs text-cyan-400">
                <CheckCircle2 className="size-3.5" />
                PR link added — LaunchGuard will analyze the code diff
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Analyze Button */}
      <Button
        size="lg"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="group w-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 font-semibold text-slate-900 hover:from-cyan-200 hover:via-sky-300 hover:to-indigo-300"
      >
        {isAnalyzing ? (
          "Analyzing..."
        ) : (
          <span className="flex items-center gap-2">
            Analyze
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-medium text-primary-foreground/80">
              <Command className="size-3" />
              <span>Enter</span>
            </kbd>
          </span>
        )}
      </Button>

      {isAnalyzing && <AnalysisLoading />}
    </div>
  )
}