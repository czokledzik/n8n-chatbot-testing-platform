import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";
import { clientCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client) {
    return new NextResponse("Unknown client", { status: 404 });
  }

  if (!verifyToken(token, client.accessTokenHash)) {
    return new NextResponse("Invalid token", { status: 403 });
  }

  const redirectUrl = new URL(`/c/${slug}`, req.nextUrl);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(clientCookieName(slug), client.accessTokenHash, {
    httpOnly: true,
    sameSite: "lax",
    path: `/c/${slug}`,
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
