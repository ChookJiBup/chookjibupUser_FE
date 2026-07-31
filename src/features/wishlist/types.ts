import type { PageMeta } from "@/features/festivals/types";

export interface WishlistToggleResponse {
  festivalId: number;
  wishlisted: boolean;
}

export interface MyWishlistFestivalResponse {
  festivalId: number;
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
