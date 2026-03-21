const JIRA_KEY_REGEX = /^[A-Z]+-\d+$/;

export function isValidJiraKey(input: string): boolean {
  return JIRA_KEY_REGEX.test(input.trim());
}

