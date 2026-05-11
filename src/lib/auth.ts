import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

const CLIENT_COOKIE_PREFIX = "client_session_";

export function clientCookieName(slug: string) {
  return `${CLIENT_COOKIE_PREFIX}${slug}`;
}

export async function getCurrentClient(slug: string) {
  const jar = await cookies();
  const cookie = jar.get(clientCookieName(slug));
  if (!cookie?.value) return null;

  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client) return null;
  if (cookie.value !== client.accessTokenHash) return null;
  return client;
}

export async function requireClient(slug: string) {
  const client = await getCurrentClient(slug);
  if (!client) notFound();
  return client;
}

export function getAdminCredsFromEnv() {
  return {
    user: process.env.ADMIN_USER ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin",
  };
}
