import { MemberForm } from "@/components/MemberForm";
import { requireAdmin } from "@/lib/server/auth/admin-session";

export default async function NewMemberPage() {
  await requireAdmin();
  return <MemberForm />;
}
