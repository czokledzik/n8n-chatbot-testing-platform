import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleAlert, Loader2, Clock } from "lucide-react";

export function RunStatusBadge({
  status,
  verdict,
}: {
  status: string;
  verdict?: string | null;
}) {
  if (status === "running") {
    return (
      <Badge
        variant="outline"
        className="gap-1 backdrop-blur-sm bg-primary/10 text-primary border-primary/30"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className="gap-1 backdrop-blur-sm bg-muted/60 border-border/60"
      >
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="gap-1 verdict-fail backdrop-blur-sm">
        <CircleAlert className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  if (status === "done") {
    if (verdict === "pass") {
      return (
        <Badge variant="outline" className="gap-1 verdict-pass backdrop-blur-sm">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </Badge>
      );
    }
    if (verdict === "fail") {
      return (
        <Badge variant="outline" className="gap-1 verdict-fail backdrop-blur-sm">
          <CircleAlert className="h-3 w-3" />
          Fail
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="gap-1 backdrop-blur-sm bg-muted/50 border-border/60"
      >
        <CheckCircle2 className="h-3 w-3" />
        Done
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="backdrop-blur-sm bg-muted/50 border-border/60"
    >
      {status}
    </Badge>
  );
}
