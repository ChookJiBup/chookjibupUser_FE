export type FestivalProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export interface UserFestivalResponse {
  /**
   * 상세/찜/리뷰 API 호출에 쓰는 값. 백엔드 응답의 실제 JSON 키는 여전히 `publicId`다 —
   * `api.ts`의 fetch 함수가 받는 시점에 `id`로 매핑해서 돌려준다.
   */
  id: string;
  name: string;
  /** 공개 포스터 URL. 구버전 API/이미지 미등록 시 생략 또는 null. */
  imageUrl?: string | null;
  eventPlace: string | null;
  address: string | null;
  detailAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  operationStartTime: string | null;
  operationEndTime: string | null;
  phoneNumber: string | null;
  homepageUrl: string | null;
  /** 지도(HOME02) 마커용. 공공데이터 API로 적재된 축제만 값이 있다. */
  latitude: number | null;
  longitude: number | null;
  progressStatus: FestivalProgressStatus | null;
  wishlisted: boolean;
  wishlistCount: number;
  reviewCount: number;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserFestivalPageResponse extends PageMeta {
  items: UserFestivalResponse[];
}

/** 관리자 백엔드(chookjibupAdmin_BE)의 NodeType과 동일하다. */
export type RoadmapNodeType =
  | "BOOTH"
  | "STAGE"
  | "RESTROOM"
  | "ENTRANCE"
  | "EXIT"
  | "PATH"
  | "BUILDING"
  | "OPEN_SPACE"
  | "PARKING"
  | "INFORMATION"
  | "QUEUE"
  | "OTHER";

export type RoadmapGeometryType = "RECTANGLE" | "POINT" | "POLYGON" | "POLYLINE";

export interface RoadmapNodeResponse {
  publicId: string;
  nodeType: RoadmapNodeType;
  name: string | null;
  geometryType: RoadmapGeometryType | null;
  /** 도형 좌표가 담긴 JSON 원문. 프론트에서 직접 파싱해서 지도 위에 그린다. */
  geometryData: string | null;
  sortOrder: number;
}

export interface RoadmapZoneResponse {
  zoneId: string;
  name: string;
  sortOrder: number;
  booths: RoadmapNodeResponse[];
}

/**
 * 축제 배치도(로드맵) 응답. 관리자가 로드맵을 발행(PUBLISHED)해둔 경우에만 값이 오고,
 * 아직 작업 중이거나 등록 안 됐으면 상세 응답의 roadmap 자체가 null이다.
 *
 * 실시간 대기시간/혼잡도는 포함하지 않는다 — 관리자 백엔드에 그 데이터를 갱신하는
 * 기능 자체가 없다(리포트용 사후 집계만 있음).
 */
export interface RoadmapResponse {
  roadmapPublicId: string;
  /** S3/CDN 접근 URL. 관리자 쪽 base URL 설정이 안 돼 있으면 null. */
  mapImageUrl: string | null;
  zones: RoadmapZoneResponse[];
  /** 부스가 아닌 것들(화장실/입구/무대 등 — 구역에 안 속함). */
  otherNodes: RoadmapNodeResponse[];
}

export interface UserFestivalDetailResponse {
  /**
   * 찜/리뷰 API 호출에 쓰는 값. 백엔드 응답의 실제 JSON 키는 여전히 `publicId`다 —
   * `api.ts`의 fetch 함수가 받는 시점에 `id`로 매핑해서 돌려준다.
   */
  id: string;
  name: string;
  /** 공개 포스터 URL. 구버전 API/이미지 미등록 시 생략 또는 null. */
  imageUrl?: string | null;
  eventPlace: string | null;
  address: string | null;
  detailAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  operationStartTime: string | null;
  operationEndTime: string | null;
  content: string | null;
  phoneNumber: string | null;
  homepageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  progressStatus: FestivalProgressStatus | null;
  wishlisted: boolean;
  roadmap: RoadmapResponse | null;
  wishlistCount: number;
  reviewCount: number;
}

/** 목록 정렬 기준. name/status 필터와 동시에 쓸 수 없다(백엔드 제약). */
export type FestivalSort = "WISHLIST_COUNT" | "REVIEW_COUNT";

export type BoothCongestionLevel = "LOW" | "MEDIUM" | "HIGH";

export interface BoothCongestionResponse {
  boothId: number;
  boothName: string;
  congestionLevel: BoothCongestionLevel | null;
  waitMinutes: number | null;
  updatedAt: string | null;
}

/**
 * 축제 혼잡도 응답. ranking은 대기시간 긴 순(대기시간 정보 없는 부스는 제외),
 * booths는 전체 부스(혼잡도 없는 부스 포함).
 */
export interface FestivalCongestionResponse {
  updatedAt: string | null;
  activeQueueCount: number | null;
  averageWaitMinutes: number | null;
  ranking: BoothCongestionResponse[];
  booths: BoothCongestionResponse[];
}
