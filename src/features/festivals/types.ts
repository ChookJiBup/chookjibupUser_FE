export type FestivalProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export interface UserFestivalResponse {
  /**
   * 상세/찜/리뷰 API 호출에 쓰는 값. 백엔드 응답의 실제 JSON 키는 여전히 `publicId`다 —
   * `api.ts`의 fetch 함수가 받는 시점에 `id`로 매핑해서 돌려준다.
   */
  id: string;
  name: string;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  phoneNumber: string | null;
  homepageUrl: string | null;
  progressStatus: FestivalProgressStatus | null;
  wishlisted: boolean;
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

export type BoothCongestionLevel = "crowded" | "normal" | "comfortable";

export interface BoothCongestionResponse {
  congestionLevel: BoothCongestionLevel;
  waitMinutes: number | null;
  updatedAt: string;
}

export interface BoothResponse {
  boothId: number;
  boothName: string;
  boothContent: string | null;
  boothLocation: string | null;
  congestion: BoothCongestionResponse | null;
}

export interface RoadmapIconResponse {
  placementId: number;
  iconCode: string;
  iconName: string;
  iconImageUrl: string;
  relatedBoothId: number | null;
  positionX: number;
  positionY: number;
  rotationDeg: number;
  label: string | null;
}

export type RoadmapType = "uploaded_image" | "icon_builder";

export interface RoadmapResponse {
  roadmapType: RoadmapType;
  baseImageUrl: string | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  icons: RoadmapIconResponse[];
}

export interface UserFestivalDetailResponse {
  /**
   * 찜/리뷰 API 호출에 쓰는 값. 백엔드 응답의 실제 JSON 키는 여전히 `publicId`다 —
   * `api.ts`의 fetch 함수가 받는 시점에 `id`로 매핑해서 돌려준다.
   */
  id: string;
  name: string;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  content: string | null;
  phoneNumber: string | null;
  homepageUrl: string | null;
  progressStatus: FestivalProgressStatus | null;
  wishlisted: boolean;
  roadmap: RoadmapResponse | null;
  booths: BoothResponse[];
  festivalCongestionLevel: string | null;
}
