import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding } from "@/lib/schemas";

const severityClass: Record<Finding["severity"], string> = {
  critical: "bg-rose-100 text-rose-900",
  high: "bg-orange-100 text-orange-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-zinc-100 text-zinc-900",
};

const statusClass: Record<Finding["status"], string> = {
  fail: "bg-rose-100 text-rose-900",
  partial: "bg-amber-100 text-amber-900",
  pass: "bg-emerald-100 text-emerald-900",
  unknown: "bg-zinc-100 text-zinc-900",
};

export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Blockers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {findings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No blockers detected.</p>
        ) : (
          findings.map((finding) => (
            <div className="rounded-lg border p-4" key={finding.criterionId}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={severityClass[finding.severity]}>
                  {finding.severity}
                </Badge>
                <Badge className={statusClass[finding.status]}>{finding.status}</Badge>
              </div>
              <h3 className="mt-3 font-medium text-sm">{finding.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm">{finding.evidence}</p>
              <p className="mt-2 text-xs">Fix: {finding.recommendedFix}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
