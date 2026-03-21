"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  {
    label: "Parsing spec...",
    description: "Extracting expected features, flows & requirements",
  },
  {
    label: "Analyzing screenshots...",
    description: "Reading UI components, inputs & states",
  },
  {
    label: "Comparing expected vs actual...",
    description: "Finding mismatches between spec and product",
  },
  {
    label: "Drafting issues...",
    description: "Generating actionable findings with severity",
  },
  {
    label: "Computing launch decision...",
    description: "Calculating release-readiness score",
  },
]

export function AnalysisLoading() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const durations = [4000, 8000, 5000, 6000, 3000]
    let stepIndex = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const advance = () => {
      stepIndex += 1
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex)
        timeoutId = setTimeout(advance, durations[stepIndex])
      }
    }

    timeoutId = setTimeout(advance, durations[0])
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="rounded-xl border border-border/70 bg-background/45 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative size-10 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-t-cyan-300 border-r-transparent border-b-transparent border-l-transparent" />
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-200 uppercase">
            Launch Scan In Progress
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {steps[currentStep]?.description}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full space-y-4">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep

          return (
            <div
              key={step.label}
              className={cn(
                "flex items-start gap-3 transition-all duration-500",
                isComplete && "opacity-100",
                isCurrent && "opacity-100",
                isPending && "opacity-30"
              )}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {isComplete ? (
                  <CheckCircle2 className="size-5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="size-5 animate-spin text-cyan-300" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
              </div>

              {/* Text */}
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isComplete && "text-emerald-400",
                    isCurrent && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-700"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-right font-mono text-xs text-muted-foreground">
        Step {currentStep + 1} of {steps.length}
      </p>
    </div>
  )
}
