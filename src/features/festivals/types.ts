export type FestivalProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export interface UserFestivalResponse {
  festivalId: number;
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
  festivalId: number;
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
