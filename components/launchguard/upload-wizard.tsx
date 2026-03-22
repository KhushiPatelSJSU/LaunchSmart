"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_SCREENSHOTS = 8;

export function UploadWizard() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("Release Candidate");
  const [specPdf, setSpecPdf] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [stagingUrl, setStagingUrl] = useState("");
  const [routes, setRoutes] = useState("/, /pricing, /signup, /dashboard");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const screenshotLabel = useMemo(() => {
    if (screenshots.length === 0) {
      return "No screenshots uploaded yet";
    }

    if (screenshots.length === 1) {
      return screenshots[0]?.name ?? "1 screenshot";
    }

    return `${screenshots.length} screenshots selected`;
  }, [screenshots]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!specPdf) {
      toast.error("Upload one PRD/spec PDF to continue.");
      return;
    }

    if (screenshots.length === 0 && !stagingUrl.trim()) {
      toast.error("Upload screenshots or provide a staging URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("projectName", projectName.trim() || "Release Candidate");
      formData.append("specPdf", specPdf);

      screenshots.forEach((file) => formData.append("screenshots", file));

      formData.append("stagingUrl", stagingUrl.trim());
      formData.append("routes", routes);
      formData.append("notes", notes);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Failed to run LaunchSmart analysis.");
      }

      router.push(`/analyze/${payload.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to run LaunchSmart analysis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="LaunchSmart Demo"
            required
            value={projectName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="staging-url">Staging URL (optional)</Label>
          <Input
            id="staging-url"
            onChange={(event) => setStagingUrl(event.target.value)}
            placeholder="https://staging.example.com"
            type="url"
            value={stagingUrl}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="spec-pdf">PRD / Spec PDF</Label>
        <Input
          accept="application/pdf"
          id="spec-pdf"
          onChange={(event) => setSpecPdf(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
        <p className="text-muted-foreground text-xs">
          Required. LaunchSmart extracts the highest-risk acceptance criteria.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="screenshots">Product Screenshots</Label>
        <Input
          accept="image/*"
          id="screenshots"
          multiple
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []).slice(
              0,
              MAX_SCREENSHOTS
            );
            setScreenshots(selected);
          }}
          type="file"
        />
        <p className="text-muted-foreground text-xs">
          {screenshotLabel}. Upload up to {MAX_SCREENSHOTS} screenshots for MVP.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="routes">Routes To Check (comma or newline separated)</Label>
        <Textarea
          id="routes"
          onChange={(event) => setRoutes(event.target.value)}
          rows={3}
          value={routes}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Release Notes / Context (optional)</Label>
        <Textarea
          id="notes"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything the reviewer should prioritize?"
          rows={4}
          value={notes}
        />
      </div>

      <Button className="h-11 w-full text-base md:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2Icon className="animate-spin" />
            Analyzing Release
          </>
        ) : (
          <>
            <UploadIcon />
            Analyze Release
          </>
        )}
      </Button>
    </form>
  );
}
