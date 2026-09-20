import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectZoneOptions,
  formatZoneChipLabel,
  resolveOverallLevel,
} from "./congestionPresentation";
import type {
  BoothCongestionLevel,
  BoothCongestionResponse,
  FestivalCongestionResponse,
} from "./types";

function booth(overrides: Partial<BoothCongestionResponse> = {}): BoothCongestionResponse {
  return {
    boothId: 1,
    boothName: "커피",
    congestionLevel: null,
    waitMinutes: null,
    updatedAt: null,
    ...overrides,
  };
}

function congestion(
  overrides: Partial<FestivalCongestionResponse> = {},
): FestivalCongestionResponse {
  return {
    updatedAt: null,
    activeQueueCount: null,
    averageWaitMinutes: null,
    ranking: [],
    booths: [],
    ...overrides,
  };
}

describe("resolveOverallLevel", () => {
  it("서버가 내려준 등급을 그대로 쓴다", () => {
    const response = congestion({
      congestionLevel: "LOW",
      // 서버 값이 있으면 부스 등급은 보지 않는다 — 파생 규칙이 서버에만 있게 하려는 것이다.
      booths: [booth({ congestionLevel: "HIGH" })],
    });
    assert.equal(resolveOverallLevel(response), "LOW");
  });

  it("서버가 등급 없음(null)이라고 하면 없음 그대로 둔다", () => {
    const response = congestion({ congestionLevel: null, booths: [booth()] });
    assert.equal(resolveOverallLevel(response), null);
  });

  it("아직 필드를 안 내려주는 서버에서는 부스 등급 중 최고값으로 대신 계산한다", () => {
    const levels: BoothCongestionLevel[] = ["LOW", "HIGH", "MEDIUM"];
    const response = congestion({
      booths: levels.map((level, index) => booth({ boothId: index, congestionLevel: level })),
    });
    assert.equal(resolveOverallLevel(response), "HIGH");
  });

  it("등급이 매겨진 부스가 하나도 없으면 없음이다", () => {
    assert.equal(
      resolveOverallLevel(congestion({ booths: [booth(), booth({ boothId: 2 })] })),
      null,
    );
  });

  it("응답 자체가 없으면 없음이다", () => {
    assert.equal(resolveOverallLevel(undefined), null);
    assert.equal(resolveOverallLevel(null), null);
  });
});

describe("collectZoneOptions", () => {
  it("부스가 달고 온 구역만 모으고 중복은 한 번만 넣는다", () => {
    const options = collectZoneOptions([
      booth({ boothId: 1, zoneId: "z1", zoneName: "먹거리존" }),
      booth({ boothId: 2, zoneId: "z2", zoneName: "체험존" }),
      booth({ boothId: 3, zoneId: "z1", zoneName: "먹거리존" }),
    ]);
    assert.deepEqual(options, [
      { zoneId: "z1", name: "먹거리존" },
      { zoneId: "z2", name: "체험존" },
    ]);
  });

  it("구역 미지정 부스는 선택지로 만들지 않는다", () => {
    assert.deepEqual(collectZoneOptions([booth({ zoneId: null, zoneName: null }), booth()]), []);
  });

  it("이름이 같아도 구역이 다르면 따로 남는다", () => {
    const options = collectZoneOptions([
      booth({ boothId: 1, zoneId: "z1", zoneName: "A존" }),
      booth({ boothId: 2, zoneId: "z2", zoneName: "A존" }),
    ]);
    assert.equal(options.length, 2);
  });
});

describe("formatZoneChipLabel", () => {
  const options = [
    { zoneId: "z1", name: "먹거리존" },
    { zoneId: "z2", name: "체험존" },
  ];

  it("고른 게 없으면 전체 구역이다", () => {
    assert.equal(formatZoneChipLabel(options, []), "전체 구역");
  });

  it("하나면 그 이름을 적는다", () => {
    assert.equal(formatZoneChipLabel(options, ["z2"]), "체험존");
  });

  it("여럿이면 첫 이름과 나머지 개수만 적는다", () => {
    assert.equal(formatZoneChipLabel(options, ["z1", "z2"]), "먹거리존 외 1");
  });
});
