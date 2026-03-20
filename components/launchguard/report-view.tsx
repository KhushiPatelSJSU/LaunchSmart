import { EvidenceGallery } from "@/components/launchguard/evidence-gallery";
import { FindingsList } from "@/components/launchguard/findings-list";
import { IssueDraftList } from "@/components/launchguard/issue-draft-list";
import { ReportFollowUp } from "@/components/launchguard/report-follow-up";
import { ScoreCard } from "@/components/launchguard/score-card";
import { Badge } from "@/components/ui/badge";
import type { LaunchAnalysisReport } from "@/lib/schemas";

export function ReportView({ report }: { report: LaunchAnalysisReport }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl">Launch Report</h1>
          <p className="text-muted-foreground text-sm">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{report.assets.screenshots.length} screenshots</Badge>
        </div>
      </div>

      <ScoreCard report={report} />

      <section className="grid gap-6 xl:grid-cols-2">
        <FindingsList findings={report.topBlockers} />
        <EvidenceGallery
          blockers={report.topBlockers}
          screenshots={report.assets.screenshots}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <IssueDraftList issues={report.issueDrafts} />
        <ReportFollowUp analysisId={report.id} />
      </section>
    </main>
  );
}
