import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { createClientAction, archiveClientAction, unarchiveClientAction } from "@/lib/actions/clients";
import { publishResourceAction, syncClientDriveResourcesAction, syncDriveResourcesAction } from "@/lib/actions/resources";
import { listCoachClients } from "@/lib/starship-data";
import { query } from "@/lib/db";

export default async function CoachPage() {
  const session = await auth();
  if (session?.user?.role !== "coach") redirect("/login");
  const clients = await listCoachClients();
  const active = clients.filter((client) => client.status === "active");
  const archived = clients.filter((client) => client.status === "archived");
  const resources = await query<{
    id: string;
    title: string;
    status: string;
    visibility: string;
    clientName: string;
    fileUrl: string | null;
  }>(
    `select r.id, r.title, r.status, r.visibility, c.display_name as "clientName", r.file_url as "fileUrl"
     from resources r
     join clients c on c.id = r.owner_id
     where r.owner_type = 'client'
     order by r.created_at desc
     limit 20`,
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Starship</p>
          <h1>Coach command center</h1>
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
          <h2>Add Client</h2>
          <form className="form-grid" action={createClientAction}>
            <label>Name<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Phone<input name="phone" /></label>
            <label>Current focus<input name="currentFocus" /></label>
            <label>Next call date<input name="nextCallAt" type="date" /></label>
            <label>Google Drive folder<input name="driveFolderUrl" type="url" /></label>
            <label>Resources folder<input name="resourcesFolderUrl" type="url" /></label>
            <button type="submit">Create client</button>
          </form>
        </article>

        <article className="panel">
          <h2>Active roster</h2>
          {active.length ? active.map((client) => (
            <div className="row" key={client.id}>
              <strong>{client.displayName}</strong>
              <span className="pill active-pill">active</span>
              <p className="empty">{client.currentFocus || "No current focus yet."}</p>
              <form className="button-row" action={archiveClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button className="danger">Archive</button>
              </form>
              <form className="button-row" action={syncClientDriveResourcesAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button className="secondary">Sync Drive resources</button>
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
              <form className="button-row" action={unarchiveClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button>Unarchive</button>
              </form>
            </div>
          )) : <p className="empty">No archived clients.</p>}
        </article>

        <article className="panel">
          <h2>Manual resources sync</h2>
          <form className="form-grid" action={syncDriveResourcesAction}>
            <label>Client<select name="clientId">{active.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}</select></label>
            <label>Google Drive file ID<input name="googleDriveFileId" /></label>
            <label>Resource title<input name="title" required /></label>
            <label>File URL<input name="fileUrl" type="url" /></label>
            <button type="submit">Import as needs review</button>
          </form>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2>Resource review</h2>
        {resources.rows.length ? resources.rows.map((resource) => (
          <div className="row" key={resource.id}>
            <strong>{resource.title}</strong>
            <span>{resource.clientName}</span>
            <span className="pill">{resource.status} · {resource.visibility}</span>
            <form className="button-row" action={publishResourceAction}>
              <input type="hidden" name="resourceId" value={resource.id} />
              {resource.fileUrl ? <a href={resource.fileUrl}>Open file</a> : null}
              <button>Publish to client</button>
            </form>
          </div>
        )) : <p className="empty">No resources imported yet.</p>}
      </section>
    </main>
  );
}
