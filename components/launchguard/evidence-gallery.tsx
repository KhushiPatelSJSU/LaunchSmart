import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisAsset, Finding } from "@/lib/schemas";

function screenshotMap(screenshots: AnalysisAsset[]): Map<string, AnalysisAsset> {
  return new Map(screenshots.map((screenshot) => [screenshot.id, screenshot]));
}

export function EvidenceGallery({
  blockers,
  screenshots,
}: {
  blockers: Finding[];
  screenshots: AnalysisAsset[];
}) {
  const screenshotById = screenshotMap(screenshots);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Screenshot-backed evidence appears here once blockers are detected.
          </p>
        ) : (
          blockers.map((blocker) => {
            const screenshot = blocker.screenshotRef
              ? screenshotById.get(blocker.screenshotRef)
              : null;

            return (
              <div className="rounded-lg border p-3" key={blocker.criterionId}>
                <p className="mb-2 font-medium text-sm">{blocker.title}</p>
                {screenshot ? (
                  <div className="overflow-hidden rounded-md border bg-zinc-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={screenshot.originalName}
                      className="h-52 w-full object-cover"
                      loading="lazy"
                      src={screenshot.url}
                    />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
                    No screenshot linked
                  </div>
                )}
                <p className="mt-2 text-muted-foreground text-xs">
                  {blocker.evidence}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
