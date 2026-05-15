type ShareStatus = "shared" | "copied" | "cancelled" | "unavailable";

type ShareTournamentLinkInput = {
  title: string;
  text: string;
  url: string;
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  notify?: (message: string) => void;
};

const COPY_MESSAGE = "공유 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.";
const UNAVAILABLE_MESSAGE = "공유를 사용할 수 없습니다. 링크를 직접 복사해주세요.";

export async function shareTournamentLink({
  title,
  text,
  url,
  share,
  writeText,
  notify
}: ShareTournamentLinkInput): Promise<ShareStatus> {
  if (share) {
    try {
      await share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (writeText) {
    await writeText(url);
    notify?.(COPY_MESSAGE);
    return "copied";
  }

  notify?.(`${UNAVAILABLE_MESSAGE}\n${url}`);
  return "unavailable";
}
