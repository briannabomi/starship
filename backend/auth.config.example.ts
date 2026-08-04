import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
// Pick the adapter that matches the final database layer.
// For Neon + Drizzle, use DrizzleAdapter. For direct Postgres, use the Auth.js Postgres adapter.
// import { DrizzleAdapter } from "@auth/drizzle-adapter";
// import { db } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: DrizzleAdapter(db),
  providers: [
    Email({
      server: process.env.AUTH_EMAIL_SERVER,
      from: process.env.AUTH_EMAIL_FROM,
      maxAge: 15 * 60,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  session: {
    strategy: "database",
    maxAge: 14 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      // Invite-only MVP: only allow emails already created by Bri.
      // Implement this query in the app database layer:
      // const invitedUser = await getInvitedUserByEmail(user.email);
      // return Boolean(invitedUser);
      return Boolean(user.email);
    },
    async session({ session, user }) {
      // Attach profile role and clientId server-side before returning the session.
      // session.user.role = profile.role;
      // session.user.clientId = profile.clientId;
      session.user.id = user.id;
      return session;
    },
  },
});
