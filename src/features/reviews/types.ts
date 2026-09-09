import type { PageMeta } from "@/features/festivals/types";

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
