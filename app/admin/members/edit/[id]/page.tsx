import { MemberForm } from "@/components/MemberForm";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberForm memberId={id} />;
}
