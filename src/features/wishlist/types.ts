import type { PageMeta } from "@/features/festivals/types";

export interface WishlistToggleResponse {
  /** 백엔드 JSON 키는 festivalPublicId다 — api.ts에서 받는 시점에 id로 매핑한다. */
  id: string;
  wishlisted: boolean;
}

export interface MyWishlistFestivalResponse {
  /** 백엔드 JSON 키는 festivalPublicId다 — api.ts에서 받는 시점에 id로 매핑한다. */
  id: string;
  name: string;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  wishlistedAt: string;
}

export interface MyWishlistPageResponse extends PageMeta {
  items: MyWishlistFestivalResponse[];
}
