"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueDraft } from "@/lib/schemas";

function toMarkdown(issue: IssueDraft): string {
  return [
    `### ${issue.title}`,
    "",
    `**Severity:** ${issue.severity}`,
    "",
    `**Expected behavior**`,
    issue.expectedBehavior,
    "",
    `**Actual behavior**`,
    issue.actualBehavior,
    "",
    `**Why this matters**`,
    issue.description,
    "",
    `**Recommended fix**`,
    issue.recommendedFix,
    "",
    `**Acceptance check**`,
    issue.acceptanceCheck,
  ].join("\n");
}

export function IssueDraftList({ issues }: { issues: IssueDraft[] }) {
  async function copyIssue(issue: IssueDraft) {
    try {
      await navigator.clipboard.writeText(toMarkdown(issue));
      toast.success(`${issue.id} copied as markdown`);
    } catch {
      toast.error("Failed to copy issue markdown.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Draft Issues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No issue drafts yet. Blockers will auto-generate issue cards.
          </p>
        ) : (
          issues.map((issue) => (
            <div className="rounded-lg border p-4" key={issue.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-sm">{issue.id}</p>
                <Badge>{issue.severity}</Badge>
              </div>
              <p className="mt-2 text-sm">{issue.title}</p>
              <p className="mt-2 text-muted-foreground text-xs">
                {issue.description}
              </p>
              <Button
                className="mt-3"
                onClick={() => copyIssue(issue)}
                size="sm"
                type="button"
                variant="outline"
              >
                <CopyIcon />
                Copy Markdown
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
