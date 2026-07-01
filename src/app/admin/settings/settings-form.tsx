"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings, type SettingsActionState } from "./actions";

const PLACEHOLDER = "__keep__";
const initialState: SettingsActionState = { ok: false };

type Language = "en" | "pl";

type SettingsFormProps = {
  initial: {
    n8nWebhookUrl: string;
    openaiApiKey: string;
    language: Language;
  };
};

const LANGUAGES: { value: Language; label: string; hint: string }[] = [
  { value: "en", label: "English", hint: "Prompts & verdicts in English" },
  { value: "pl", label: "Polski", hint: "Prompty i werdykty po polsku" },
];

export function SettingsForm({ initial }: SettingsFormProps) {
  const hasStoredKey = Boolean(initial.openaiApiKey);
  const [state, formAction, pending] = useActionState(
    saveSettings,
    initialState,
  );
  const [keyInput, setKeyInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [language, setLanguage] = useState<Language>(initial.language);

  useEffect(() => {
    if (state.ok) {
      toast.success("Settings saved");
      setKeyInput("");
      setReveal(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const keyValueToSubmit =
    hasStoredKey && keyInput === "" ? PLACEHOLDER : keyInput;

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
        <Input
          id="n8nWebhookUrl"
          name="n8nWebhookUrl"
          type="url"
          placeholder="https://your-n8n.example.com/webhook/abc"
          defaultValue={initial.n8nWebhookUrl}
          autoComplete="off"
          required
        />
        {state.fieldErrors?.n8nWebhookUrl ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.n8nWebhookUrl}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            The Production webhook URL from your n8n workflow.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
        <div className="relative">
          <Input
            id="openaiApiKey"
            type={reveal ? "text" : "password"}
            placeholder={
              hasStoredKey ? "•••••••• (stored — leave blank to keep)" : "sk-..."
            }
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoComplete="off"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={reveal ? "Hide key" : "Reveal key"}
          >
            {reveal ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <input type="hidden" name="openaiApiKey" value={keyValueToSubmit} />
        {state.fieldErrors?.openaiApiKey ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.openaiApiKey}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {hasStoredKey
              ? "Stored locally in SQLite. Leave blank to keep current key."
              : 'Must start with "sk-". Stored locally in SQLite.'}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Language</Label>
        <input type="hidden" name="language" value={language} />
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((opt) => {
            const active = language === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={`text-left rounded-md border px-3 py-2.5 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {opt.hint}
                </div>
              </button>
            );
          })}
        </div>
        {state.fieldErrors?.language && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.language}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="chunky" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
