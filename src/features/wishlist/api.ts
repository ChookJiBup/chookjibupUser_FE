import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { MyWishlistPageResponse, WishlistToggleResponse } from "./types";

export async function toggleWishlist(festivalId: number): Promise<WishlistToggleResponse> {
  const { data } = await userApiClient.post<ApiResponse<WishlistToggleResponse>>(
    `/wishlists/${festivalId}/toggle`,
  );
  return data.data;
}

export async function getMyWishlist(page = 0, size = 20): Promise<MyWishlistPageResponse> {
  const { data } = await userApiClient.get<ApiResponse<MyWishlistPageResponse>>("/wishlists/me", {
    params: { page, size },
  });
  return data.data;
}
