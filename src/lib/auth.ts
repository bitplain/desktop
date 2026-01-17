import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPrisma } from "./db";
import { loadRuntimeConfig } from "./runtimeConfig";
import { consumeRateLimit } from "./rateLimit";
import { getRequestIp } from "./requestIp";

loadRuntimeConfig();

const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
const useSecureCookies = nextAuthUrl.startsWith("https://");

export const authOptions: NextAuthOptions = {
  useSecureCookies,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const email = String(credentials.email).toLowerCase();
        const ip = getRequestIp(req?.headers ?? new Headers());
        const rateLimitKey = `login|${ip}|${email}`;
        const rateLimit = await consumeRateLimit(rateLimitKey, {
          limit: 5,
          windowMs: 5 * 60 * 1000,
        });
        if (!rateLimit.allowed) {
          return null;
        }
        const prisma = getPrisma();
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
