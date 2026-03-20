"use client"

import { useState } from "react"
import { InputPanel } from "@/components/input-panel"
import { ResultsPanel } from "@/components/results-panel"
import type { Issue } from "@/components/issue-card"
import { Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock data for demonstration
const mockIssues: Issue[] = [
  {
    id: "1",
    title: "Missing Error State for Form Submission",
    severity: "critical",
    description:
      "The sign-up form lacks visible error handling. Users won't see feedback when their submission fails, which could lead to confusion and form abandonment.",
    screenshotRef: "screenshot-1.png",
  },
  {
    id: "2",
    title: "Inconsistent Button Styling",
    severity: "medium",
    description:
      "Primary CTA buttons use different border-radius values across pages. The homepage uses 8px while the pricing page uses 4px.",
    screenshotRef: "screenshot-2.png",
  },
  {
    id: "3",
    title: "Low Contrast Text on Hero Section",
    severity: "medium",
    description:
      "The subtitle text in the hero section has a contrast ratio of 3.2:1, below the WCAG AA standard of 4.5:1 for normal text.",
    screenshotRef: "screenshot-1.png",
  },
  {
    id: "4",
    title: "Missing Alt Text on Feature Images",
    severity: "low",
    description:
      "Three feature section images are missing alt attributes, which impacts accessibility for screen reader users.",
  },
]

export default function LaunchGuardPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const { toast } = useToast()

  const handleAnalyze = async (spec: string, screenshots: File[]) => {
    setIsAnalyzing(true)
    setHasAnalyzed(false)
    setIssues([])

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 6000))

    setIssues(mockIssues)
    setIsAnalyzing(false)
    setHasAnalyzed(true)

    toast({
      title: "Analysis Complete",
      description: `Found ${mockIssues.length} potential issues in your product.`,
    })
  }

  const handleReAnalyze = () => {
    setHasAnalyzed(false)
    setIssues([])
    toast({
      title: "Ready for Analysis",
      description: "Modify your inputs and click Analyze to start a new scan.",
    })
  }

  const handleCreateIssue = (issue: Issue) => {
    toast({
      title: "Issue Created",
      description: `"${issue.title}" has been added to your issue tracker.`,
    })
  }

  const handleDismiss = (issue: Issue) => {
    toast({
      title: "Issue Dismissed",
      description: `"${issue.title}" has been removed from the list.`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="size-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              LaunchGuard
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Product Analysis
          </h2>
          <p className="mt-1 text-muted-foreground">
            Upload your product spec and screenshots to catch issues before
            launch.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Panel - Inputs */}
          <div>
            <InputPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>

          {/* Right Panel - Results */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-6 text-lg font-medium text-foreground">
              Analysis Results
            </h3>
            <ResultsPanel
              issues={issues}
              isLoading={isAnalyzing}
              hasAnalyzed={hasAnalyzed}
              onCreateIssue={handleCreateIssue}
              onDismiss={handleDismiss}
              onReAnalyze={handleReAnalyze}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
