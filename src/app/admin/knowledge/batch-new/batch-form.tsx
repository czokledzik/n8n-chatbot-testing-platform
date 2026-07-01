"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { batchCreateKnowledge, type BatchResult } from "../actions";

type ClientOption = { id: string; name: string; slug: string };

type DocState = {
  key: string;
  title: string;
  content: string;
  pdfName: string;
  cases: 0 | 3 | 5 | 10;
};

function newDoc(): DocState {
  return {
    key: crypto.randomUUID(),
    title: "",
    content: "",
    pdfName: "",
    cases: 5,
  };
}

const COUNT_OPTIONS: DocState["cases"][] = [0, 3, 5, 10];

export function BatchKnowledgeForm({
  clients,
  defaultClientId,
}: {
  clients: ClientOption[];
  defaultClientId: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId);
  const [docs, setDocs] = useState<DocState[]>([newDoc()]);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function updateDoc(key: string, patch: Partial<DocState>) {
    setDocs((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  }

  function addDoc() {
    if (docs.length >= 20) {
      toast.error("Max 20 documents per batch");
      return;
    }
    setDocs((prev) => [...prev, newDoc()]);
  }

  function removeDoc(key: string) {
    setDocs((prev) =>
      prev.length === 1 ? prev : prev.filter((d) => d.key !== key),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("docCount", String(docs.length));

    docs.forEach((doc, i) => {
      formData.append(`doc-${i}-title`, doc.title);
      formData.append(`doc-${i}-content`, doc.content);
      formData.append(`doc-${i}-cases`, String(doc.cases));
      const fileInput = formRef.current?.querySelector<HTMLInputElement>(
        `input[name="doc-${i}-pdf"]`,
      );
      const file = fileInput?.files?.[0];
      if (file) formData.append(`doc-${i}-pdf`, file);
    });

    startTransition(async () => {
      const res: BatchResult = await batchCreateKnowledge(formData);
      if (!res.ok) {
        toast.error(res.error ?? "Upload failed");
        return;
      }
      const parts: string[] = [];
      if (res.created) parts.push(`${res.created} created`);
      if (res.scheduled)
        parts.push(`${res.scheduled} test case generation${res.scheduled === 1 ? "" : "s"} started`);
      if (res.failed && res.failed.length > 0) {
        toast.error(
          `${res.failed.length} failed: ${res.failed.map((f) => f.title).join(", ")}`,
        );
      }
      if (parts.length > 0) {
        toast.success(parts.join(" · "));
        router.push("/admin/knowledge");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
          <CardDescription>
            All documents go to the same client. Change here to switch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {clients.map((c) => {
              const active = clientId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClientId(c.id)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {c.name}
                  <span className="ml-1.5 opacity-70 font-mono text-xs">
                    /c/{c.slug}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {docs.map((doc, i) => (
          <Card key={doc.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted grid place-items-center text-xs font-medium">
                  {i + 1}
                </div>
                <CardTitle className="text-sm">Document</CardTitle>
              </div>
              {docs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDoc(doc.key)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`title-${doc.key}`} className="text-xs">
                  Title
                </Label>
                <Input
                  id={`title-${doc.key}`}
                  value={doc.title}
                  onChange={(e) =>
                    updateDoc(doc.key, { title: e.target.value })
                  }
                  placeholder="Product FAQ, Return policy…"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Paste text
                  </Label>
                  <Textarea
                    value={doc.content}
                    onChange={(e) =>
                      updateDoc(doc.key, { content: e.target.value })
                    }
                    rows={5}
                    placeholder="Or leave blank if you upload a PDF"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Or upload PDF (max 15MB)
                  </Label>
                  <input
                    type="file"
                    name={`doc-${i}-pdf`}
                    accept="application/pdf,.pdf"
                    onChange={(e) =>
                      updateDoc(doc.key, {
                        pdfName: e.target.files?.[0]?.name ?? "",
                      })
                    }
                    className="text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1 file:text-xs hover:file:bg-muted"
                  />
                  {doc.pdfName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.pdfName} — will replace text above
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Test cases to generate</Label>
                <div className="flex gap-1.5">
                  {COUNT_OPTIONS.map((n) => {
                    const active = doc.cases === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateDoc(doc.key, { cases: n })}
                        className={`px-3 py-1 rounded-md border text-xs transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {n === 0 ? "none" : n}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Generation runs in the background — you don&apos;t need to
                  wait.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDoc}
          disabled={pending}
        >
          <Plus className="h-4 w-4" />
          Add another document
        </Button>
        <div className="flex gap-2">
          <Link
            href="/admin/knowledge"
            className={buttonVariants({ variant: "ghost" })}
          >
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload {docs.length} document{docs.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </form>
  );
}
