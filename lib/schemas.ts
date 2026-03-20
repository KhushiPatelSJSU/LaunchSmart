import { z } from "zod";

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const CriterionCategorySchema = z.enum([
  "visual",
  "copy",
  "interaction",
  "error-state",
  "trust",
  "accessibility",
]);

export const ReleaseSpecSchema = z.object({
  productName: z.string(),
  goal: z.string(),
  userFlows: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      priority: PrioritySchema,
      screens: z.array(z.string()),
    })
  ),
  criteria: z.array(
    z.object({
      id: z.string(),
      flowId: z.string().nullable(),
      statement: z.string(),
      category: CriterionCategorySchema,
      priority: PrioritySchema,
      expectedEvidence: z.array(z.string()),
    })
  ),
  trustSignals: z.array(z.string()),
});

export type ReleaseSpec = z.infer<typeof ReleaseSpecSchema>;

export const FindingStatusSchema = z.enum(["pass", "partial", "fail", "unknown"]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const FindingSchema = z.object({
  criterionId: z.string(),
  status: FindingStatusSchema,
  severity: PrioritySchema,
  title: z.string(),
  evidence: z.string(),
  whyItMatters: z.string(),
  recommendedFix: z.string(),
  screenshotRef: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type Finding = z.infer<typeof FindingSchema>;

export const AnalysisAssetKindSchema = z.enum([
  "spec_pdf",
  "screenshot",
  "crawl_shot",
  "report_json",
]);

export type AnalysisAssetKind = z.infer<typeof AnalysisAssetKindSchema>;

export const AnalysisAssetSchema = z.object({
  id: z.string(),
  kind: AnalysisAssetKindSchema,
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  url: z.string(),
});

export type AnalysisAsset = z.infer<typeof AnalysisAssetSchema>;

export const IssueDraftSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: PrioritySchema,
  description: z.string(),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  recommendedFix: z.string(),
  screenshotRef: z.string().nullable(),
  acceptanceCheck: z.string(),
});

export type IssueDraft = z.infer<typeof IssueDraftSchema>;

export const LaunchReadinessBucketSchema = z.enum([
  "ready",
  "launch_with_caution",
  "not_launch_ready",
]);

export type LaunchReadinessBucket = z.infer<typeof LaunchReadinessBucketSchema>;

export const LaunchScoreSchema = z.object({
  value: z.number().int().min(0).max(100),
  bucket: LaunchReadinessBucketSchema,
  criticalCount: z.number().int().nonnegative(),
  highCount: z.number().int().nonnegative(),
  mediumCount: z.number().int().nonnegative(),
  uncoveredCriticalCount: z.number().int().nonnegative(),
});

export type LaunchScore = z.infer<typeof LaunchScoreSchema>;

export const AnalysisStatusSchema = z.enum([
  "queued",
  "extracting",
  "capturing",
  "comparing",
  "scored",
  "done",
  "failed",
]);

export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const LaunchAnalysisReportSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  status: AnalysisStatusSchema,
  createdAt: z.string().datetime(),
  summary: z.string(),
  inputs: z.object({
    stagingUrl: z.string().url().nullable(),
    routes: z.array(z.string()),
    notes: z.string().nullable(),
  }),
  assets: z.object({
    specPdf: AnalysisAssetSchema,
    screenshots: z.array(AnalysisAssetSchema),
  }),
  spec: ReleaseSpecSchema,
  findings: z.array(FindingSchema),
  topBlockers: z.array(FindingSchema).max(3),
  issueDrafts: z.array(IssueDraftSchema),
  score: LaunchScoreSchema,
});

export type LaunchAnalysisReport = z.infer<typeof LaunchAnalysisReportSchema>;
