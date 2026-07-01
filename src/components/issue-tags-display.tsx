import { Badge } from "@/components/ui/badge";
import { labelForTag } from "@/lib/constants";

export function IssueTagsDisplay({
  tags,
  size = "sm",
}: {
  tags: string[];
  size?: "xs" | "sm";
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Badge
          key={t}
          variant="outline"
          className={
            size === "xs"
              ? "text-[10px] h-4 px-1.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 backdrop-blur-sm"
              : "text-xs border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 backdrop-blur-sm"
          }
        >
          {labelForTag(t)}
        </Badge>
      ))}
    </div>
  );
}

export function ClientVerdictBadge({
  verdict,
}: {
  verdict: string | null | undefined;
}) {
  if (!verdict) return null;
  const map: Record<string, string> = {
    pass: "verdict-pass backdrop-blur-sm",
    fail: "verdict-fail backdrop-blur-sm",
    "needs-review": "verdict-review backdrop-blur-sm",
  };
  const label =
    verdict === "needs-review"
      ? "Needs review"
      : verdict.charAt(0).toUpperCase() + verdict.slice(1);
  return (
    <Badge variant="outline" className={map[verdict] ?? ""}>
      {label}
    </Badge>
  );
}
