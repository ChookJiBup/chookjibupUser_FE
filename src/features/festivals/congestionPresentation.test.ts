import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveOverallLevel } from "./congestionPresentation";
import type {
  BoothCongestionLevel,
  BoothCongestionResponse,
  FestivalCongestionResponse,
} from "./types";

function booth(overrides: Partial<BoothCongestionResponse> = {}): BoothCongestionResponse {
  return {
    boothId: 1,
    boothName: "커피",
    roadmapNodePublicId: null,
    congestionLevel: null,
    waitMinutes: null,
    updatedAt: null,
    queueTailLatitude: null,
    queueTailLongitude: null,
    queueTailMeters: null,
    queuePath: null,
    queueUpdatedAt: null,
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
