import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_RECENT_SEARCHES,
  addRecentSearch,
  normalizeRecentSearches,
  removeRecentSearch,
} from "./recentSearches";

describe("addRecentSearch", () => {
  it("방금 검색한 말을 맨 앞에 둔다", () => {
    assert.deepEqual(addRecentSearch(["불꽃축제"], "벚꽃축제"), ["벚꽃축제", "불꽃축제"]);
  });

  it("같은 말을 다시 검색하면 개수가 늘지 않고 자리만 앞으로 옮긴다", () => {
    assert.deepEqual(addRecentSearch(["벚꽃축제", "불꽃축제"], "불꽃축제"), [
      "불꽃축제",
      "벚꽃축제",
    ]);
  });

  it("대소문자만 다른 말은 같은 검색어로 보고 마지막 표기를 남긴다", () => {
    assert.deepEqual(addRecentSearch(["Seoul"], "seoul"), ["seoul"]);
  });

  it("앞뒤 공백은 지우고 저장한다", () => {
    assert.deepEqual(addRecentSearch([], "  벚꽃축제 "), ["벚꽃축제"]);
  });

  it("공백만 입력하면 목록을 바꾸지 않는다", () => {
    const list = ["벚꽃축제"];
    assert.equal(addRecentSearch(list, "   "), list);
  });

  it("상한을 넘으면 가장 오래된 것부터 버린다", () => {
    const full = Array.from({ length: MAX_RECENT_SEARCHES }, (_, index) => `검색어${index}`);
    const next = addRecentSearch(full, "새검색어");
    assert.equal(next.length, MAX_RECENT_SEARCHES);
    assert.equal(next[0], "새검색어");
    assert.ok(!next.includes(`검색어${MAX_RECENT_SEARCHES - 1}`));
  });
});

describe("removeRecentSearch", () => {
  it("지정한 검색어만 지운다", () => {
    assert.deepEqual(removeRecentSearch(["벚꽃축제", "불꽃축제"], "벚꽃축제"), ["불꽃축제"]);
  });

  it("대소문자만 다른 말도 같은 검색어로 보고 지운다", () => {
    assert.deepEqual(removeRecentSearch(["Seoul"], "seoul"), []);
  });

  it("없는 검색어를 지우라고 해도 목록은 그대로다", () => {
    assert.deepEqual(removeRecentSearch(["벚꽃축제"], "불꽃축제"), ["벚꽃축제"]);
  });
});

describe("normalizeRecentSearches", () => {
  it("배열이 아니면 빈 목록으로 본다", () => {
    assert.deepEqual(normalizeRecentSearches(null), []);
    assert.deepEqual(normalizeRecentSearches("벚꽃축제"), []);
    assert.deepEqual(normalizeRecentSearches({ 0: "벚꽃축제" }), []);
  });

  it("문자열이 아닌 값과 빈 값은 버린다", () => {
    assert.deepEqual(normalizeRecentSearches(["벚꽃축제", 1, null, "  ", "불꽃축제"]), [
      "벚꽃축제",
      "불꽃축제",
    ]);
  });

  it("저장된 값에 중복이 섞여 있어도 한 번만 남긴다", () => {
    assert.deepEqual(normalizeRecentSearches(["벚꽃축제", "벚꽃축제", "Seoul", "seoul"]), [
      "벚꽃축제",
      "Seoul",
    ]);
  });

  it("저장된 값이 상한보다 많으면 앞에서부터 상한만큼만 읽는다", () => {
    const stored = Array.from({ length: MAX_RECENT_SEARCHES + 5 }, (_, index) => `검색어${index}`);
    assert.equal(normalizeRecentSearches(stored).length, MAX_RECENT_SEARCHES);
  });
});
