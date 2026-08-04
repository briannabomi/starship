import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getClientPortal } from "@/lib/starship-data";
import { isAuthDisabled } from "@/lib/demo-mode";
import { createSeedState } from "@/src/state.js";

type PortalResource = {
  id: string;
  title: string;
  fileUrl: string | null;
  category: string | null;
};

export default async function PortalPage() {
  const demoMode = isAuthDisabled();
  const session = demoMode ? null : await auth();
  if (!demoMode && !session?.user) redirect("/login");
  if (!demoMode && session?.user.role === "coach") redirect("/coach");
  if (!demoMode && !session?.user.clientId) redirect("/inactive");
  const portal = demoMode ? demoPortal() : await getClientPortal(session?.user.clientId || "");
  if (!portal || portal.client.status === "archived") redirect("/inactive");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Your portal</p>
          <h1>{portal.client.displayName}</h1>
          {demoMode ? <p className="notice">Demo mode: this is Client A's sample portal.</p> : null}
        </div>
        {demoMode ? <a className="button-link" href="/coach">Coach dashboard</a> : <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button className="secondary">Sign out</button>
        </form>}
      </header>

      <section className="grid two">
        <article className="panel">
          <h2>Current focus</h2>
          <p>{portal.client.currentFocus || "Bri has not set a current focus yet."}</p>
        </article>
        <article className="panel">
          <h2>Next call</h2>
          <p>{portal.client.nextCallAt ? new Date(portal.client.nextCallAt).toLocaleDateString() : "Not scheduled yet."}</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2>Resources</h2>
        {portal.resources.length ? portal.resources.map((resource: PortalResource) => (
          <div className="row" key={resource.id}>
            <strong>{resource.title}</strong>
            <span className="pill">{resource.category || "resource"}</span>
            {resource.fileUrl ? <a href={resource.fileUrl}>Open resource</a> : null}
          </div>
        )) : <p className="empty">No resources have been published to your portal yet.</p>}
      </section>
    </main>
  );
}

function demoPortal() {
  const state = createSeedState();
  const client = state.clients.find((item) => item.id === "client-a") || state.clients[0];
  return {
    client: {
      id: client.id,
      displayName: client.name,
      status: "active" as const,
      currentFocus: client.focus,
      nextCallAt: client.nextCallAt,
    },
    resources: ((state.videos || []) as Array<{ id: string; title: string; topic?: string }>).slice(0, 4).map((video) => ({
      id: video.id,
      title: video.title,
      fileUrl: null,
      category: video.topic || "video",
    })),
  };
}
