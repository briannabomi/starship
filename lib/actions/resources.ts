"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { query } from "@/lib/db";

async function requireCoach() {
  const session = await auth();
  if (session?.user?.role !== "coach") redirect("/login");
}

export async function syncDriveResourcesAction(formData: FormData) {
  await requireCoach();
  const clientId = String(formData.get("clientId") || "");
  const title = String(formData.get("title") || "").trim();
  const fileUrl = String(formData.get("fileUrl") || "").trim();
  const googleDriveFileId = String(formData.get("googleDriveFileId") || `manual-${Date.now()}`).trim();
  if (!clientId || !title) return;

  await query(
    `insert into resources (owner_type, owner_id, google_drive_file_id, title, file_url, status, visibility, category)
     values ('client', $1, $2, $3, $4, 'needs_review', 'coach_only', 'resources')
     on conflict (google_drive_file_id) do update set
       title = excluded.title,
       file_url = excluded.file_url,
       status = 'needs_review',
       visibility = 'coach_only',
       updated_at = now()`,
    [clientId, googleDriveFileId, title, fileUrl || null],
  );
  revalidatePath("/coach");
}

function driveFolderIdFromUrl(value: string | null) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{12,}$/.test(text)) return text;
  return "";
}

export async function syncClientDriveResourcesAction(formData: FormData) {
  await requireCoach();
  const clientId = String(formData.get("clientId") || "");
  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  if (!clientId || !accessToken) return;

  const client = await query<{
    resourcesFolderId: string | null;
    resourcesFolderUrl: string | null;
    driveFolderId: string | null;
    driveFolderUrl: string | null;
  }>(
    `select
       resources_folder_id as "resourcesFolderId",
       resources_folder_url as "resourcesFolderUrl",
       drive_folder_id as "driveFolderId",
       drive_folder_url as "driveFolderUrl"
     from clients
     where id = $1 and status = 'active'
     limit 1`,
    [clientId],
  );
  const row = client.rows[0];
  if (!row) return;

  const folderId =
    row.resourcesFolderId ||
    driveFolderIdFromUrl(row.resourcesFolderUrl) ||
    row.driveFolderId ||
    driveFolderIdFromUrl(row.driveFolderUrl);
  if (!folderId) return;

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink,thumbnailLink,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return;

  const payload = await response.json() as {
    files?: Array<{
      id: string;
      name: string;
      mimeType?: string;
      webViewLink?: string;
      thumbnailLink?: string;
    }>;
  };

  for (const file of payload.files || []) {
    await query(
      `insert into resources (
         owner_type,
         owner_id,
         google_drive_file_id,
         title,
         mime_type,
         file_url,
         thumbnail_url,
         status,
         visibility,
         category
       )
       values ('client', $1, $2, $3, $4, $5, $6, 'needs_review', 'coach_only', 'resources')
       on conflict (google_drive_file_id) do update set
         title = excluded.title,
         mime_type = excluded.mime_type,
         file_url = excluded.file_url,
         thumbnail_url = excluded.thumbnail_url,
         status = case when resources.status = 'published' then resources.status else 'needs_review' end,
         visibility = case when resources.status = 'published' then resources.visibility else 'coach_only' end,
         updated_at = now()`,
      [clientId, file.id, file.name, file.mimeType || null, file.webViewLink || null, file.thumbnailLink || null],
    );
  }

  revalidatePath("/coach");
}

export async function publishResourceAction(formData: FormData) {
  await requireCoach();
  await query(
    `update resources
     set status = 'published',
         visibility = 'client_visible',
         published_at = now(),
         updated_at = now()
     where id = $1`,
    [String(formData.get("resourceId") || "")],
  );
  revalidatePath("/coach");
  revalidatePath("/portal");
}
