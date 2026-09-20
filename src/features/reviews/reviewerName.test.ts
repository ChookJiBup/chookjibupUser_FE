import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toDisplayReviewerName } from "./reviewerName";

describe("toDisplayReviewerName", () => {
  it("닉네임은 가운데 글자를 가린다", () => {
    assert.equal(toDisplayReviewerName("김은지"), "김*지");
    assert.equal(toDisplayReviewerName("남궁은지"), "남**지");
  });

  it("익명 리뷰의 고정 표시명은 사람 이름이 아니라 그대로 둔다", () => {
    assert.equal(toDisplayReviewerName("현장 방문자"), "현장 방문자");
  });

  it("빈 이름은 빈 문자열이 된다", () => {
    assert.equal(toDisplayReviewerName(""), "");
  });
});
