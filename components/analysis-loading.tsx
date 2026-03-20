"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  "Parsing spec...",
  "Analyzing UI...",
  "Comparing...",
  "Generating issues...",
]

export function AnalysisLoading() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-xl border border-border/70 bg-background/45 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-t-cyan-300 border-r-transparent border-b-transparent border-l-transparent" />
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-200 uppercase">
            Launch Scan In Progress
          </p>
          <p className="text-xs text-muted-foreground">
            Parsing spec, reading screenshots, ranking risk...
          </p>
        </div>
      </div>

      <div className="w-full space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 transition-all duration-300",
                isComplete && "text-success",
                isCurrent && "text-foreground",
                !isComplete && !isCurrent && "text-muted-foreground/50"
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="size-5 text-success shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="size-5 animate-spin shrink-0" />
              ) : (
                <Circle className="size-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
