import type { NextAuthOptions } from "next-auth";
import type { NextRequest } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPrisma } from "./db";
import { loadRuntimeConfig } from "./runtimeConfig";

type HeaderLike = {
  get(name: string): string | null | undefined;
};

type RequestLike = { headers: HeaderLike; nextUrl?: URL };

function resolveNextAuthUrl(request?: RequestLike) {
  if (request) {
    const origin = request.nextUrl?.origin;
    if (origin) {
      return origin;
    }
    const proto =
      request.headers.get("x-forwarded-proto") ??
      request.headers.get("x-forwarded-protocol") ??
      request.nextUrl?.protocol?.replace(":", "") ??
      "http";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return process.env.NEXTAUTH_URL?.trim() ?? "";
}

export function getAuthOptions(request?: RequestLike): NextAuthOptions {
  loadRuntimeConfig();

  const nextAuthUrl = resolveNextAuthUrl(request);
  if (nextAuthUrl) {
    process.env.NEXTAUTH_URL = nextAuthUrl;
  }
  const useSecureCookies = nextAuthUrl.startsWith("https://");

  return {
    useSecureCookies,
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          const prisma = getPrisma();
          const email = String(credentials.email).toLowerCase();
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            return null;
          }
          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) {
            return null;
          }
          return { id: user.id, email: user.email, role: user.role };
        },
      }),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    callbacks: {
      async jwt({ token, user }) {
        if (user?.role) {
          token.role = user.role;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
        }
        return session;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  };
}
