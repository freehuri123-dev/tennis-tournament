export type ClubSlug = "stc" | "otc";

export type Club = {
  slug: ClubSlug;
  name: string;
  shortName: string;
};

export const clubs: Club[] = [
  { slug: "stc", name: "STC 테니스 클럽", shortName: "STC" },
  { slug: "otc", name: "OTC 테니스 클럽", shortName: "OTC" }
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
