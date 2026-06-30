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
              ? "text-[10px] h-4 px-1.5"
              : "text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
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
    pass: "bg-green-600 text-white hover:bg-green-700",
    fail: "bg-red-600 text-white hover:bg-red-700",
    "needs-review": "bg-amber-500 text-white hover:bg-amber-600",
  };
  const label =
    verdict === "needs-review"
      ? "Needs review"
      : verdict.charAt(0).toUpperCase() + verdict.slice(1);
  return <Badge className={map[verdict] ?? ""}>{label}</Badge>;
}
