import type { PageMeta } from "@/features/festivals/types";

export interface ReviewCreateRequest {
  rating: number;
  content: string;
}

export interface ReviewResponse {
  reviewId: number;
  rating: number;
  content: string;
  createdAt: string;
}

export interface ReviewPageResponse extends PageMeta {
  items: ReviewResponse[];
}
