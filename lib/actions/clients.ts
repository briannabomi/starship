"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { query } from "@/lib/db";

async function requireCoach() {
  const session = await auth();
  if (session?.user?.role !== "coach") redirect("/login");
  return session;
}

function text(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function createClientAction(formData: FormData) {
  const session = await requireCoach();
  const name = text(formData.get("name"));
  const email = text(formData.get("email")).toLowerCase();
  if (!name || !email) return;

  await query(
    `insert into clients (display_name, email, phone, current_focus, next_call_at, drive_folder_url, resources_folder_url, created_by_profile_id)
     values ($1, $2, $3, $4, nullif($5, '')::timestamptz, $6, $7, (
       select id from profiles where user_id = $8 limit 1
     ))
     on conflict (email) do update set
       display_name = excluded.display_name,
       phone = excluded.phone,
       current_focus = excluded.current_focus,
       next_call_at = excluded.next_call_at,
       drive_folder_url = excluded.drive_folder_url,
       resources_folder_url = excluded.resources_folder_url,
       status = 'active',
       archived_at = null,
       updated_at = now()`,
    [
      name,
      email,
      text(formData.get("phone")) || null,
      text(formData.get("currentFocus")) || null,
      text(formData.get("nextCallAt")),
      text(formData.get("driveFolderUrl")) || null,
      text(formData.get("resourcesFolderUrl")) || null,
      session.user.id,
    ],
  );
  revalidatePath("/coach");
}

export async function archiveClientAction(formData: FormData) {
  const session = await requireCoach();
  await query(
    `update clients
     set status = 'archived',
         archived_at = now(),
         archived_by_profile_id = (select id from profiles where user_id = $2 limit 1),
         updated_at = now()
     where id = $1`,
    [text(formData.get("clientId")), session.user.id],
  );
  revalidatePath("/coach");
}

export async function unarchiveClientAction(formData: FormData) {
  await requireCoach();
  await query(
    `update clients
     set status = 'active',
         archived_at = null,
         archived_by_profile_id = null,
         updated_at = now()
     where id = $1`,
    [text(formData.get("clientId"))],
  );
  revalidatePath("/coach");
}
