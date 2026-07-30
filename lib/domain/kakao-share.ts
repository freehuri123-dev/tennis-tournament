type KakaoShareLink = {
  mobileWebUrl: string;
  webUrl: string;
};

type KakaoFeedShareOptions = {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: KakaoShareLink;
  };
  buttons: Array<{
    title: string;
    link: KakaoShareLink;
  }>;
};

type KakaoJavaScriptSdk = {
  init: (javascriptKey: string) => void;
  isInitialized: () => boolean;
  Share?: {
    sendDefault: (options: KakaoFeedShareOptions) => unknown;
  };
};

type OpenKakaoTournamentShareInput = {
  javascriptKey: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  sdk?: KakaoJavaScriptSdk;
  userAgent?: string;
  maxTouchPoints?: number;
};

function browserKakaoSdk() {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { Kakao?: KakaoJavaScriptSdk }).Kakao;
}

function browserUserAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

function browserMaxTouchPoints() {
  return typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints;
}

export function isMobileBrowser(userAgent: string, maxTouchPoints = 0) {
  return /Android|webOS|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export async function openKakaoTournamentShare({
  javascriptKey,
  title,
  description,
  url,
  imageUrl,
  sdk = browserKakaoSdk(),
  userAgent = browserUserAgent(),
  maxTouchPoints = browserMaxTouchPoints()
}: OpenKakaoTournamentShareInput) {
  if (!isMobileBrowser(userAgent, maxTouchPoints) || !javascriptKey || !sdk) return false;

  try {
    if (!sdk.isInitialized()) sdk.init(javascriptKey);
    if (!sdk.Share) return false;

    const link = {
      mobileWebUrl: url,
      webUrl: url
    };

    await sdk.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl,
        link
      },
      buttons: [
        {
          title: "대진표 확인하기",
          link
        }
      ]
    });
    return true;
  } catch {
    return false;
  }
}
