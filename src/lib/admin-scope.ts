import "server-only";
import { cookies } from "next/headers";

export const SCOPE_COOKIE = "admin_scoped_client";

/**
 * Resolve which client the admin is currently working on.
 * URL searchParam ?client=... wins over cookie (temporary override).
 * Returns null when unscoped ("All clients").
 */
export async function getScopedClientId(
  searchParams?: Record<string, string | undefined> | null,
): Promise<string | null> {
  const urlValue = searchParams?.client;
  if (urlValue !== undefined) return urlValue || null;
  const jar = await cookies();
  const raw = jar.get(SCOPE_COOKIE)?.value;
  return raw && raw !== "__all__" ? raw : null;
}
