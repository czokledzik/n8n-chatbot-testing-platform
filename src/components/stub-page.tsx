import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StubPageProps = {
  title: string;
  description: string;
  phase: string;
};

export function StubPage({ title, description, phase }: StubPageProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Coming in {phase}</CardTitle>
          <CardDescription>
            This section will be wired up once the foundation is in place.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder — no functionality yet.
        </CardContent>
      </Card>
    </div>
  );
}
