export type ClubSlug = "stc" | "otc" | "joogo" | "army" | "queensday";

export type Club = {
  slug: ClubSlug;
  name: string;
  shortName: string;
  organizationLabel: "클럽" | "모임";
  tournamentLabel: "클럽대회" | "모임대회";
  seedSampleData?: boolean;
};

export const clubs: Club[] = [
  { slug: "stc", name: "STC 테니스 클럽", shortName: "STC", organizationLabel: "클럽", tournamentLabel: "클럽대회" },
  { slug: "otc", name: "OTC 테니스 클럽", shortName: "OTC", organizationLabel: "클럽", tournamentLabel: "클럽대회" },
  { slug: "joogo", name: "주고받고", shortName: "주고받고", organizationLabel: "모임", tournamentLabel: "모임대회", seedSampleData: false },
  { slug: "army", name: "천하제일1사단", shortName: "천하제일1사단", organizationLabel: "모임", tournamentLabel: "모임대회", seedSampleData: false },
  { slug: "queensday", name: "퀸즈데이", shortName: "퀸즈데이", organizationLabel: "모임", tournamentLabel: "모임대회", seedSampleData: false }
];

export function isKnownClubSlug(slug: string | undefined): slug is ClubSlug {
  return Boolean(slug && clubs.some((club) => club.slug === slug));
}

export function getClubBySlug(slug: string | undefined) {
  return clubs.find((club) => club.slug === slug);
}

export function buildClubPath(clubSlug: ClubSlug, path = "") {
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath ? `/${clubSlug}/${normalizedPath}` : `/${clubSlug}`;
}
