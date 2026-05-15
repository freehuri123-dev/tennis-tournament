import { MemberForm } from "@/components/MemberForm";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { getMemberById } from "@/lib/server/repositories/tournament-repository";
import { notFound } from "next/navigation";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const member = await getMemberById("stc", id);
  if (!member) notFound();
  return <MemberForm member={member} />;
}
