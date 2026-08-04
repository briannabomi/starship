import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getClientPortal } from "@/lib/starship-data";

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "coach") redirect("/coach");
  if (!session.user.clientId) redirect("/inactive");
  const portal = await getClientPortal(session.user.clientId);
  if (!portal || portal.client.status === "archived") redirect("/inactive");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Your portal</p>
          <h1>{portal.client.displayName}</h1>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button className="secondary">Sign out</button>
        </form>
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
        {portal.resources.length ? portal.resources.map((resource) => (
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
