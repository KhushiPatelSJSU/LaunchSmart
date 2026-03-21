import { handleSpecCommand } from "@/lib/integrations/jira/spec-command";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  const text = body.text ?? "";

  const result = await handleSpecCommand(text);

  return Response.json(result, {
    status: result.ok ? 200 : 400,
  });
}

