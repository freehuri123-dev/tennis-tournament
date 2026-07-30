import type { ClubSlug } from "./club";

type ClubShareContent = {
  description: string;
  imagePath: string;
};

const clubShareContent: Record<ClubSlug, ClubShareContent> = {
  stc: {
    description: "STC\uC640 \uD568\uAED8\uD558\uB294 \uC990\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-stc.jpg"
  },
  otc: {
    description: "OTC\uC640 \uD568\uAED8\uD558\uB294 \uC990\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-otc.jpg"
  },
  joogo: {
    description: "\uD568\uAED8\uD558\uB294 \uD14C\uB2C8\uC2A4, \uC990\uAC70\uC6B4 \uBAA8\uC784! \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-joogo.jpg"
  },
  army: {
    description: "\uCC9C\uD558\uC81C\uC77C1\uC0AC\uB2E8\uC758 \uB728\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.",
    imagePath: "/kakao-share-army.jpg"
  }
};

export function getClubShareContent(clubSlug: ClubSlug) {
  return clubShareContent[clubSlug];
}
