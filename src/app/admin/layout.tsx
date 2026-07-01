import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/db";
import { getScopedClientId } from "@/lib/admin-scope";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clients, scopedClientId] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getScopedClientId(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar clients={clients} scopedClientId={scopedClientId} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
