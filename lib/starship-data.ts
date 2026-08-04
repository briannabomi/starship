import "server-only";
import { cache } from "react";
import { query } from "./db";

export type SessionProfile = {
  profileId: string;
  role: "coach" | "client" | "admin";
  displayName: string;
  clientId: string | null;
  clientStatus: "active" | "archived" | null;
};

function coachEmails() {
  return new Set(
    String(process.env.STARSHIP_COACH_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isInvitedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (coachEmails().has(normalized)) return true;
  const result = await query<{ id: string }>(
    "select id from clients where lower(email) = $1 limit 1",
    [normalized],
  );
  return Boolean(result.rowCount);
}

export async function ensureProfileForEmail(userId: string, email: string, name: string | null) {
  const normalized = email.trim().toLowerCase();
  if (coachEmails().has(normalized)) {
    await query(
      `insert into profiles (user_id, role, display_name)
       values ($1, 'coach', $2)
       on conflict (user_id) do update set role = 'coach', display_name = excluded.display_name, updated_at = now()`,
      [userId, name || "Bri"],
    );
    return;
  }

  const client = await query<{ id: string; display_name: string }>(
    "select id, display_name from clients where lower(email) = $1 limit 1",
    [normalized],
  );
  if (!client.rowCount) return;

  await query(
    `insert into profiles (user_id, role, display_name)
     values ($1, 'client', $2)
     on conflict (user_id) do update set role = 'client', display_name = excluded.display_name, updated_at = now()`,
    [userId, client.rows[0].display_name || name || normalized],
  );
  await query(
    `insert into client_users (client_id, user_id, status, accepted_at)
     values ($1, $2, 'active', now())
     on conflict (client_id, user_id) do update set status = 'active', accepted_at = coalesce(client_users.accepted_at, now())`,
    [client.rows[0].id, userId],
  );
}

export const getSessionProfileByUserId = cache(async (userId: string): Promise<SessionProfile | null> => {
  const result = await query<SessionProfile>(
    `select
       p.id as "profileId",
       p.role,
       p.display_name as "displayName",
       cu.client_id as "clientId",
       c.status as "clientStatus"
     from profiles p
     left join client_users cu on cu.user_id = p.user_id and cu.status != 'disabled'
     left join clients c on c.id = cu.client_id
     where p.user_id = $1
     limit 1`,
    [userId],
  );
  return result.rows[0] || null;
});

export const listCoachClients = cache(async () => {
  const result = await query<{
    id: string;
    displayName: string;
    email: string;
    phone: string | null;
    status: "active" | "archived";
    currentFocus: string | null;
    nextCallAt: string | null;
    driveFolderUrl: string | null;
    resourcesFolderUrl: string | null;
  }>(
    `select
       id,
       display_name as "displayName",
       email,
       phone,
       status,
       current_focus as "currentFocus",
       next_call_at as "nextCallAt",
       drive_folder_url as "driveFolderUrl",
       resources_folder_url as "resourcesFolderUrl"
     from clients
     order by status, display_name`,
  );
  return result.rows;
});

export const getClientPortal = cache(async (clientId: string) => {
  const client = await query<{
    id: string;
    displayName: string;
    status: "active" | "archived";
    currentFocus: string | null;
    nextCallAt: string | null;
  }>(
    `select id, display_name as "displayName", status, current_focus as "currentFocus", next_call_at as "nextCallAt"
     from clients
     where id = $1
     limit 1`,
    [clientId],
  );
  if (!client.rowCount) return null;

  const resources = await query<{ id: string; title: string; fileUrl: string | null; category: string | null }>(
    `select id, title, file_url as "fileUrl", category
     from resources
     where owner_type = 'client'
       and owner_id = $1
       and status = 'published'
       and visibility = 'client_visible'
     order by published_at desc nulls last, title`,
    [clientId],
  );

  return { client: client.rows[0], resources: resources.rows };
});
