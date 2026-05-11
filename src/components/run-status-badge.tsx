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
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <CircleAlert className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  if (status === "done") {
    if (verdict === "pass") {
      return (
        <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </Badge>
      );
    }
    if (verdict === "fail") {
      return (
        <Badge variant="destructive" className="gap-1">
          <CircleAlert className="h-3 w-3" />
          Fail
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Done
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}
