export const MAX_TURNS = 6;
export const RUN_POLL_INTERVAL_MS = 2000;
export const N8N_TIMEOUT_MS = 60_000;

export const BATCH_ANALYSIS_MAX = 30;

export const ISSUE_TAGS = [
  { value: "hallucination", label: "Hallucination" },
  { value: "no-answer", label: "Doesn't know" },
  { value: "wrong-tone", label: "Wrong tone" },
  { value: "incomplete", label: "Incomplete answer" },
  { value: "off-topic", label: "Off-topic" },
  { value: "format-issue", label: "Bad format" },
  { value: "language", label: "Wrong language" },
] as const;

export type IssueTag = (typeof ISSUE_TAGS)[number]["value"];

export const ISSUE_TAG_VALUES = ISSUE_TAGS.map((t) => t.value) as IssueTag[];

export function labelForTag(value: string) {
  return ISSUE_TAGS.find((t) => t.value === value)?.label ?? value;
}

export const CLIENT_VERDICTS = ["pass", "fail", "needs-review"] as const;
export type ClientVerdict = (typeof CLIENT_VERDICTS)[number];

export const IMPROVEMENT_VERDICTS = ["improved", "regressed", "neutral"] as const;
export type ImprovementVerdict = (typeof IMPROVEMENT_VERDICTS)[number];
