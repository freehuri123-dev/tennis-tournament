import type { ClubSlug } from "./club";

type ClubShareContent = {
  description: string;
  imagePath: string;
};

const clubShareContent: Record<ClubSlug, ClubShareContent> = {
  stc: {
    description: "STC \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-stc.jpg"
  },
  otc: {
    description: "OTC \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-otc.jpg"
  },
  joogo: {
    description: "\uC8FC\uACE0\uBC1B\uACE0 \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-joogo.jpg"
  },
  army: {
    description: "\uCC9C\uD558\uC81C\uC77C1\uC0AC\uB2E8 \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-army.jpg"
  }
};

export function getClubShareContent(clubSlug: ClubSlug) {
  return clubShareContent[clubSlug];
}
