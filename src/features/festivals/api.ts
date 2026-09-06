import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  FestivalCongestionResponse,
  FestivalProgressStatus,
  FestivalSort,
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

export interface GetFestivalsParams {
  page?: number;
  size?: number;
  /** 축제명 부분 일치 검색(대소문자 무시). status/sort와 동시에 줄 수 없다(백엔드 제약). */
  name?: string;
  /** 진행 상태 필터. name/sort와 동시에 줄 수 없다. */
  status?: FestivalProgressStatus;
  /** 찜/리뷰 많은 순 정렬. name/status와 동시에 줄 수 없다. 없으면 시작일순(기본). */
  sort?: FestivalSort;
}

export async function getFestivals(
  params: GetFestivalsParams = {},
): Promise<UserFestivalPageResponse> {
  const { page = 0, size = 20, name, status, sort } = params;
  const { data } = await userApiClient.get<
    ApiResponse<
      Omit<UserFestivalPageResponse, "items"> & { items: FestivalWire<UserFestivalResponse>[] }
    >
  >("/festivals", {
    params: {
      page,
      size,
      name: name && name.trim() !== "" ? name.trim() : undefined,
      status,
      sort,
    },
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

/**
 * 축제 현재 혼잡도를 조회한다. 관리자/스태프가 갱신한 값을 그대로 읽는다 —
 * 아직 한 번도 갱신 안 된 부스는 congestionLevel/waitMinutes가 null로 온다.
 */
export async function getFestivalCongestion(
  festivalId: string,
): Promise<FestivalCongestionResponse> {
  const { data } = await userApiClient.get<ApiResponse<FestivalCongestionResponse>>(
    `/festivals/${festivalId}/congestion`,
  );
  return data.data;
}
