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
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-8">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent" />
        </div>
      </div>

      <div className="space-y-3 w-full max-w-xs">
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
