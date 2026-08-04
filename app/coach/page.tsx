import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { createClientAction, archiveClientAction, unarchiveClientAction } from "@/lib/actions/clients";
import { publishResourceAction, syncClientDriveResourcesAction, syncDriveResourcesAction } from "@/lib/actions/resources";
import { listCoachClients } from "@/lib/starship-data";
import { query } from "@/lib/db";
import { isAuthDisabled } from "@/lib/demo-mode";
import { createSeedState } from "@/src/state.js";

type CoachClient = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: "active" | "archived";
  currentFocus: string | null;
  nextCallAt: string | null;
  driveFolderUrl: string | null;
  resourcesFolderUrl: string | null;
};

type ReviewResource = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  clientName: string;
  fileUrl: string | null;
};

type DemoVideo = {
  id: string;
  title: string;
  topic?: string;
  description?: string;
};

function demoClients(): CoachClient[] {
  const state = createSeedState();
  return state.clients.map((client) => {
    const source = state.googleDriveSources.find((item) => item.clientId === client.id);
    return {
      id: client.id,
      displayName: client.name,
      email: client.email,
      phone: client.phone || null,
      status: client.archivedAt ? "archived" : "active",
      currentFocus: client.focus || null,
      nextCallAt: client.nextCallAt || null,
      driveFolderUrl: source?.folderUrl || null,
      resourcesFolderUrl: source?.folderUrl || null,
    };
  });
}

function demoResources(): ReviewResource[] {
  const state = createSeedState();
  return ((state.videos || []) as DemoVideo[]).slice(0, 4).map((video) => ({
    id: video.id,
    title: video.title,
    status: "published",
    visibility: "client_visible",
    clientName: "Client A",
    fileUrl: null,
  }));
}

export default async function CoachPage() {
  const demoMode = isAuthDisabled();
  const session = demoMode ? null : await auth();
  if (!demoMode && session?.user?.role !== "coach") redirect("/login");
  const clients = demoMode ? demoClients() : await listCoachClients();
  const active = clients.filter((client) => client.status === "active");
  const archived = clients.filter((client) => client.status === "archived");
  const resources = demoMode ? demoResources() : (await query<ReviewResource>(
    `select r.id, r.title, r.status, r.visibility, c.display_name as "clientName", r.file_url as "fileUrl"
     from resources r
     join clients c on c.id = r.owner_id
     where r.owner_type = 'client'
     order by r.created_at desc
     limit 20`,
  )).rows;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Starship</p>
          <h1>Coach command center</h1>
          {demoMode ? <p className="notice">Demo mode: login is temporarily disabled so you can review the dashboard.</p> : null}
        </div>
        {demoMode ? <a className="button-link" href="/portal">View client portal</a> : <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button className="secondary">Sign out</button>
        </form>}
      </header>

      <section className="grid two">
        <article className="panel">
          <h2>Add Client</h2>
          <form className="form-grid" action={demoMode ? undefined : createClientAction}>
            <label>Name<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Phone<input name="phone" /></label>
            <label>Current focus<input name="currentFocus" /></label>
            <label>Next call date<input name="nextCallAt" type="date" /></label>
            <label>Google Drive folder<input name="driveFolderUrl" type="url" /></label>
            <label>Resources folder<input name="resourcesFolderUrl" type="url" /></label>
            <button type="submit" disabled={demoMode}>Create client</button>
            {demoMode ? <p className="empty">Client creation will be re-enabled when auth/database mode is turned back on.</p> : null}
          </form>
        </article>

        <article className="panel">
          <h2>Active roster</h2>
          {active.length ? active.map((client) => (
            <div className="row" key={client.id}>
              <strong>{client.displayName}</strong>
              <span className="pill active-pill">active</span>
              <p className="empty">{client.currentFocus || "No current focus yet."}</p>
              <form className="button-row" action={demoMode ? undefined : archiveClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button className="danger" disabled={demoMode}>Archive</button>
              </form>
              <form className="button-row" action={demoMode ? undefined : syncClientDriveResourcesAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button className="secondary" disabled={demoMode}>Sync Drive resources</button>
              </form>
            </div>
          )) : <p className="empty">No active clients yet.</p>}
        </article>
      </section>

      <section className="grid two" style={{ marginTop: 14 }}>
        <article className="panel">
          <h2>Archived clients</h2>
          {archived.length ? archived.map((client) => (
            <div className="row" key={client.id}>
              <strong>{client.displayName}</strong>
              <span className="pill archived-pill">archived</span>
              <form className="button-row" action={demoMode ? undefined : unarchiveClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button disabled={demoMode}>Unarchive</button>
              </form>
            </div>
          )) : <p className="empty">No archived clients.</p>}
        </article>

        <article className="panel">
          <h2>Manual resources sync</h2>
          <form className="form-grid" action={demoMode ? undefined : syncDriveResourcesAction}>
            <label>Client<select name="clientId">{active.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}</select></label>
            <label>Google Drive file ID<input name="googleDriveFileId" /></label>
            <label>Resource title<input name="title" required /></label>
            <label>File URL<input name="fileUrl" type="url" /></label>
            <button type="submit" disabled={demoMode}>Import as needs review</button>
          </form>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2>Resource review</h2>
        {resources.length ? resources.map((resource) => (
          <div className="row" key={resource.id}>
            <strong>{resource.title}</strong>
            <span>{resource.clientName}</span>
            <span className="pill">{resource.status} · {resource.visibility}</span>
            <form className="button-row" action={demoMode ? undefined : publishResourceAction}>
              <input type="hidden" name="resourceId" value={resource.id} />
              {resource.fileUrl ? <a href={resource.fileUrl}>Open file</a> : null}
              <button disabled={demoMode}>Publish to client</button>
            </form>
          </div>
        )) : <p className="empty">No resources imported yet.</p>}
      </section>
    </main>
  );
}
