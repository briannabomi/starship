import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "coach" | "client" | "admin";
      clientId?: string | null;
      clientStatus?: "active" | "archived" | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: "coach" | "client" | "admin";
    clientId?: string | null;
    clientStatus?: "active" | "archived" | null;
  }
}
