import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatServerDate, toIsoDateString } from "./serverTime";

/**
 * 서버 값을 «한국에서 본 날짜»로 읽는 게 맞는지 보려면 실행 시간대가 고정돼야 한다.
 * 테스트 러너에 TZ를 걸 수 없으므로, 시간대에 영향받는 단언은 KST일 때만 확인한다.
 */
const isKoreaTimeZone = new Date("2026-09-20T00:00:00Z").getTimezoneOffset() === -540;

describe("toIsoDateString", () => {
  it("한 자리 월·일도 두 자리로 0을 채운다", () => {
    assert.equal(toIsoDateString(new Date(2026, 8, 5)), "2026-09-05");
    assert.equal(toIsoDateString(new Date(2026, 0, 1)), "2026-01-01");
  });

  it("자정 경계에서도 그날 날짜를 유지한다", () => {
    assert.equal(toIsoDateString(new Date(2026, 8, 20, 0, 0, 0)), "2026-09-20");
    assert.equal(toIsoDateString(new Date(2026, 8, 20, 23, 59, 59)), "2026-09-20");
  });
});

describe("formatServerDate", () => {
  it("잘못된 값은 null로 돌려준다", () => {
    assert.equal(formatServerDate(null), null);
    assert.equal(formatServerDate(undefined), null);
    assert.equal(formatServerDate(""), null);
    assert.equal(formatServerDate("어제"), null);
  });

  it("타임존 표기가 없는 서버 값을 한국 날짜로 읽는다", { skip: !isKoreaTimeZone }, () => {
    assert.equal(formatServerDate("2026-09-20T05:06:37"), "2026-09-20");
    // UTC 16:30은 한국시간으로 다음 날 새벽 1시 30분이다. 앞 10글자만 자르면 하루 전으로 밀린다.
    assert.equal(formatServerDate("2026-09-20T16:30:00"), "2026-09-21");
  });

  it("타임존이 붙어 있으면 그 값을 믿는다", { skip: !isKoreaTimeZone }, () => {
    assert.equal(formatServerDate("2026-09-20T23:30:00+09:00"), "2026-09-20");
  });
});
