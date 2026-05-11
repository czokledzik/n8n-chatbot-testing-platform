import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/auth";
import { ClientSidebar } from "@/components/client-sidebar";

export const dynamic = "force-dynamic";

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getCurrentClient(slug);

  if (!client) {
    const dbClient = await prisma.client.findUnique({ where: { slug } });
    if (!dbClient) notFound();

    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold">Access required</h1>
          <p className="text-muted-foreground text-sm">
            This portal is private. Ask the admin for your magic link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <ClientSidebar slug={client.slug} clientName={client.name} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `Client portal · ${slug}` };
}
