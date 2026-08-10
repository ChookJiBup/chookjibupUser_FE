import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  UserFestivalDetailResponse,
  UserFestivalPageResponse,
  UserFestivalResponse,
} from "./types";

/** 백엔드가 실제로 보내는 JSON 키(publicId)를 프론트 표준 필드명(id)으로 바꾸기 전 원본 모양. */
type FestivalWire<T> = Omit<T, "id"> & { publicId: string };

/** 백엔드 publicId를 프론트 표준 id로 매핑한다 — 컴포넌트는 항상 id만 본다. */
function toFestivalResponse<T extends { id: string }>(wire: FestivalWire<T>): T {
  const { publicId, ...rest } = wire;
  return { ...rest, id: publicId } as unknown as T;
}

export async function getFestivals(page = 0, size = 20): Promise<UserFestivalPageResponse> {
  const { data } = await userApiClient.get<
    ApiResponse<
      Omit<UserFestivalPageResponse, "items"> & { items: FestivalWire<UserFestivalResponse>[] }
    >
  >("/festivals", {
    params: { page, size },
  });
  return {
    ...data.data,
    items: data.data.items.map(toFestivalResponse),
  };
}

export async function getFestivalDetail(festivalId: string): Promise<UserFestivalDetailResponse> {
  const { data } = await userApiClient.get<ApiResponse<FestivalWire<UserFestivalDetailResponse>>>(
    `/festivals/${festivalId}`,
  );
  return toFestivalResponse(data.data);
}
