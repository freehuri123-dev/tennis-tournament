import { MemberForm } from "@/components/MemberForm";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { isKnownClubSlug } from "@/lib/domain/club";
import { requireAdmin } from "@/lib/server/auth/admin-session";

export default async function NewClubMemberPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  await requireAdmin(clubSlug);
  return <MemberForm clubSlug={clubSlug} />;
}
