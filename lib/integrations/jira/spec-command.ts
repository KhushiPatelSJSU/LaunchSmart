import { isValidJiraKey } from "./jira-key";

export type SpecCommandResult = {
  ok: boolean;
  jiraKey?: string;
  message: string;
  status: "validation_error" | "not_implemented";
};

export async function handleSpecCommand(rawText: string): Promise<SpecCommandResult> {
  const jiraKey = rawText.trim();

  if (!isValidJiraKey(jiraKey)) {
    return {
      ok: false,
      message: "Invalid Jira key. Use format like LS-142.",
      status: "validation_error",
    };
  }

  return {
    ok: true,
    jiraKey,
    message: `Received ${jiraKey}. Jira spec fetch is not implemented in this dummy branch.`,
    status: "not_implemented",
  };
}

