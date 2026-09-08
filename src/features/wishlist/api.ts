import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  MyWishlistFestivalResponse,
  MyWishlistPageResponse,
  WishlistToggleResponse,
} from "./types";

/** 백엔드가 실제로 보내는 JSON 키(festivalPublicId)를 프론트 표준 필드명(id)으로 바꾸기 전 원본 모양. */
type WishlistWire<T> = Omit<T, "id"> & { festivalPublicId: string };

/** 백엔드 festivalPublicId를 프론트 표준 id로 매핑한다 — 컴포넌트는 항상 id만 본다. */
function toWishlistResponse<T extends { id: string }>(wire: WishlistWire<T>): T {
  const { festivalPublicId, ...rest } = wire;
  return { ...rest, id: festivalPublicId } as unknown as T;
}

export async function toggleWishlist(festivalId: string): Promise<WishlistToggleResponse> {
  const { data } = await userApiClient.post<ApiResponse<WishlistWire<WishlistToggleResponse>>>(
    `/wishlists/${festivalId}/toggle`,
  );
  return toWishlistResponse(data.data);
}

export async function getMyWishlist(page = 0, size = 20): Promise<MyWishlistPageResponse> {
  const { data } = await userApiClient.get<
    ApiResponse<
      Omit<MyWishlistPageResponse, "items"> & { items: WishlistWire<MyWishlistFestivalResponse>[] }
    >
  >("/wishlists/me", {
    params: { page, size },
  });
  return {
    ...data.data,
    items: data.data.items.map(toWishlistResponse),
  };
}

/** 찜 목록 편집 모드에서 체크박스로 여러 개 선택해 한 번에 삭제할 때 쓴다. */
export async function deleteWishlists(festivalIds: string[]): Promise<void> {
  await userApiClient.delete("/wishlists", {
    params: { festivalPublicIds: festivalIds },
    // axios 기본 직렬화는 배열을 festivalPublicIds[]=a&festivalPublicIds[]=b 식으로 만드는데,
    // 백엔드(@RequestParam List<UUID>)는 festivalPublicIds=a&festivalPublicIds=b 형태를
    // 기대한다 — paramsSerializer로 대괄호 없이 반복 키로 직렬화한다.
    paramsSerializer: {
      indexes: null,
    },
  });
}
