import { MemberForm } from "@/components/MemberForm";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { isKnownClubSlug } from "@/lib/domain/club";
import { getMemberById } from "@/lib/server/repositories/tournament-repository";
import { notFound } from "next/navigation";

export default async function EditClubMemberPage({ params }: { params: Promise<{ clubSlug: string; id: string }> }) {
  const { clubSlug, id } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const member = await getMemberById(clubSlug, id);
  if (!member) notFound();
  return <MemberForm member={member} clubSlug={clubSlug} />;
}
