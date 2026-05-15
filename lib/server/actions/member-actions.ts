"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "../auth/admin-session";
import { softDeleteMember, upsertMember } from "../repositories/tournament-repository";
import { clubSlugSchema, memberInputSchema } from "../validation";

const deleteMemberInputSchema = z.object({
  id: z.string().trim().min(1),
  clubSlug: clubSlugSchema
});

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function formBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value === null) return undefined;
  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "off" || value === "0") return false;
  return value;
}

export async function saveMemberAction(formData: FormData) {
  await requireAdmin();

  const input = memberInputSchema.parse({
    id: formString(formData, "id"),
    clubSlug: formString(formData, "clubSlug"),
    name: formString(formData, "name"),
    gender: formString(formData, "gender"),
    level: formString(formData, "level"),
    phone: formString(formData, "phone"),
    notes: formString(formData, "notes"),
    active: formBoolean(formData, "active")
  });

  await upsertMember(input);
  revalidatePath(`/${input.clubSlug}/members`);
  redirect(`/${input.clubSlug}/members`);
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();

  const input = deleteMemberInputSchema.parse({
    id: formString(formData, "id"),
    clubSlug: formString(formData, "clubSlug")
  });

  await softDeleteMember(input.clubSlug, input.id);
  revalidatePath(`/${input.clubSlug}/members`);
  redirect(`/${input.clubSlug}/members`);
}
