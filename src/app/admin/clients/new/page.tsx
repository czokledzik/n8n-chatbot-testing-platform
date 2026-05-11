import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewClientForm } from "./new-client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">New Client</h1>
        <p className="text-muted-foreground">
          The slug becomes part of their portal URL: /c/[slug]. The webhook URL
          is hit during live chat and test runs.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client details</CardTitle>
          <CardDescription>
            A magic link will be generated and shown to you once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
