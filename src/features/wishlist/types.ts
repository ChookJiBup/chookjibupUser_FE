import type { FestivalProgressStatus, PageMeta } from "@/features/festivals/types";

export interface WishlistToggleResponse {
  id: string;
  wishlisted: boolean;
}

export interface MyWishlistFestivalResponse {
  id: string;
  name: string;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  progressStatus: FestivalProgressStatus | null;
  wishlistCount: number;
  reviewCount: number;
  wishlistedAt: string;
}

export interface MyWishlistPageResponse extends PageMeta {
  items: MyWishlistFestivalResponse[];
}
