"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ReportFollowUp({ analysisId }: { analysisId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      toast.error("Ask a follow-up question first.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/analyze/${analysisId}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "Could not answer this follow-up.");
      }

      setAnswer(payload.answer);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not answer this follow-up."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ask LaunchSmart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why is this below 70?"
            value={question}
          />
          <Button disabled={isLoading} size="sm" type="submit" variant="outline">
            {isLoading ? (
              <>
                <Loader2Icon className="animate-spin" />
                Thinking
              </>
            ) : (
              <>
                <SparklesIcon />
                Ask Follow-up
              </>
            )}
          </Button>
        </form>

        {answer ? (
          <div className="rounded-lg border bg-zinc-50 p-3 text-sm">{answer}</div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Secondary surface for report Q&A. Try asking about score, blockers, or
            issue priority.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
