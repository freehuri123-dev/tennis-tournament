import { MemberForm } from "@/components/MemberForm";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { isKnownClubSlug } from "@/lib/domain/club";

export default async function NewClubMemberPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  return <MemberForm clubSlug={clubSlug} />;
}
