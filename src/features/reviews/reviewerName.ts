import { maskPersonName } from "@/lib/maskName";

/**
 * 익명(현장 QR) 리뷰에 백엔드가 붙이는 고정 표시명.
 *
 * <p>`ReviewResponse.from`이 로그인하지 않은 작성자에게 이 문구를 그대로 넣어 준다.
 * 사람 이름이 아니라서 가리면 「현* 방*자」처럼 뜻 없는 글자가 되므로 마스킹에서 뺀다.</p>
 */
const ANONYMOUS_REVIEWER_NAME = "현장 방문자";

/**
 * 리뷰 목록에 보여 줄 작성자 이름.
 *
 * <p>닉네임이 그대로 노출되던 자리라 가운데 글자를 `*`로 가린다. 마스킹은 화면에
 * 그릴 때만 적용하고, 서버에서 받은 원본이나 API로 보내는 값은 건드리지 않는다.</p>
 */
export function toDisplayReviewerName(reviewerName: string): string {
  return reviewerName === ANONYMOUS_REVIEWER_NAME ? reviewerName : maskPersonName(reviewerName);
}
