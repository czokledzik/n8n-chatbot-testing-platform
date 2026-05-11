import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Connect your n8n webhook and OpenAI API key. Stored locally in SQLite.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credentials</CardTitle>
          <CardDescription>
            {settings.updatedAt
              ? `Last saved ${settings.updatedAt.toLocaleString()}`
              : "Not configured yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              n8nWebhookUrl: settings.n8nWebhookUrl,
              openaiApiKey: settings.openaiApiKey,
              language: settings.language,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
