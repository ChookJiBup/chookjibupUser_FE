import type { FestivalProgressStatus, PageMeta } from "@/features/festivals/types";

export interface ReviewCreateRequest {
  rating: number;
  content: string;
  /** 축제 현장 QR코드로 들어와서 작성하는 리뷰인지 여부. true면 비로그인도 작성 가능. */
  onsite: boolean;
}

export interface ReviewResponse {
  reviewId: number;
  /** 로그인 리뷰는 작성자 닉네임, 익명(현장) 리뷰는 "현장 방문자"로 고정된 표시명. */
  reviewerName: string;
  rating: number;
  content: string;
  onsite: boolean;
  createdAt: string;
}

export interface ReviewPageResponse extends PageMeta {
  items: ReviewResponse[];
}

/** 마이페이지 "내가 쓴 리뷰" 화면의 한 항목. */
export interface MyReviewResponse {
  reviewId: number;
  /**
   * 축제 상세 페이지로 이동할 때 쓰는 값. 백엔드 응답의 실제 JSON 키는
   * `festivalPublicId`다 — `api.ts`의 fetch 함수가 `id`로 매핑해서 돌려준다.
   */
  festivalId: string;
  festivalName: string;
  festivalImageUrl?: string | null;
  festivalStartDate: string | null;
  festivalEndDate: string | null;
  festivalProgressStatus: FestivalProgressStatus | null;
  rating: number;
  content: string;
  /** 축제 현장 QR코드로 남긴 리뷰인지. 익명(비로그인) 현장 리뷰는 애초에 이 목록에 안 잡힌다. */
  onsite: boolean;
  createdAt: string;
}

export interface MyReviewPageResponse extends PageMeta {
  items: MyReviewResponse[];
}

export interface ReviewUpdateRequest {
  rating: number;
  content: string;
}
