"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SCOPE_COOKIE } from "@/lib/admin-scope";

export async function setAdminScope(clientId: string | null) {
  const jar = await cookies();
  if (clientId) {
    jar.set(SCOPE_COOKIE, clientId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    jar.delete(SCOPE_COOKIE);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
