import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LaunchAnalysisReport } from "@/lib/schemas";

const bucketCopy: Record<
  LaunchAnalysisReport["score"]["bucket"],
  { label: string; className: string }
> = {
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-900",
  },
  launch_with_caution: {
    label: "Launch With Caution",
    className: "bg-amber-100 text-amber-900",
  },
  not_launch_ready: {
    label: "Not Launch-Ready",
    className: "bg-rose-100 text-rose-900",
  },
};

export function ScoreCard({ report }: { report: LaunchAnalysisReport }) {
  const bucket = bucketCopy[report.score.bucket];

  return (
    <Card className="overflow-hidden border-zinc-200">
      <CardHeader className="bg-gradient-to-r from-zinc-900 to-zinc-700 text-zinc-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">{report.projectName}</CardTitle>
          <Badge className={bucket.className}>{bucket.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <div>
          <p className="font-semibold text-5xl leading-none">{report.score.value}</p>
          <p className="mt-2 text-muted-foreground text-sm">Launch score</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm">{report.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">
              {report.score.criticalCount} critical fails
            </Badge>
            <Badge variant="secondary">{report.score.highCount} high fails</Badge>
            <Badge variant="secondary">
              {report.score.mediumCount} medium fails
            </Badge>
            <Badge variant="secondary">
              {report.score.uncoveredCriticalCount} uncovered critical
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
