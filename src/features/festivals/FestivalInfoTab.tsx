import type { ReactNode } from "react";

import {
  FestivalDateIcon,
  FestivalLinkIcon,
  FestivalLocationIcon,
  FestivalPhoneIcon,
  FestivalVenueIcon,
} from "@/components/icons/FestivalInfoIcons";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { LocationMiniMap } from "@/components/ui/LocationMiniMap";
import { formatClockTime } from "@/lib/serverTime";
import { formatKoreanDate } from "./FestivalCard";
import type { UserFestivalDetailResponse } from "./types";

export interface FestivalInfoTabProps {
  festival: UserFestivalDetailResponse;
}

const PROTECTED_PERIOD = "\uE000";

/** 날짜·소수점·URL 안의 점은 보존하면서 설명 문장을 한 줄씩 나눈다. */
export function formatSentenceBreaks(text: string) {
  const protectPeriods = (value: string) => value.replaceAll(".", PROTECTED_PERIOD);
  const protectedText = text
    .replace(/https?:\/\/\S+|www\.\S+/gi, protectPeriods)
    .replace(/\b\d{2,4}\.\s*\d{1,2}\.\s*\d{1,2}\.?/g, protectPeriods)
    .replace(/\b\d+\.\d+\b/g, protectPeriods);

  return protectedText
    .replace(/([.!?]+[\)\]}'”’"]*)[ \t]+(?=\S)/g, "$1\n")
    .replaceAll(PROTECTED_PERIOD, ".")
    .replace(/\r\n?/g, "\n");
}

/** 축제의 기본 정보와 행사장 위치를 표시하는 상세 탭. */
export function FestivalInfoTab({ festival }: FestivalInfoTabProps) {
  const address = festival.address;
  const startDate = formatKoreanDate(festival.startDate, { withWeekday: true });
  const endDate = formatKoreanDate(festival.endDate, { withWeekday: true });
  const operationHours =
    festival.operationStartTime && festival.operationEndTime
      ? `${formatClockTime(festival.operationStartTime)}~${formatClockTime(festival.operationEndTime)}`
      : null;

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-3 px-5 py-4">
        <p className="body-regular-bold text-zinc-950">기본 정보</p>
        {startDate ? (
          <InfoRow icon={<FestivalDateIcon className="size-[18px]" />}>
            {startDate}
            {endDate ? ` ~ ${endDate}` : ""}
            {operationHours ? ` (${operationHours})` : ""}
          </InfoRow>
        ) : null}
        {address ? (
          <InfoRow icon={<FestivalLocationIcon className="size-[18px]" />}>
            {address}
            <CopyTextButton value={address} ariaLabel="주소 복사" className="body-small ml-1" />
          </InfoRow>
        ) : null}
        {festival.eventPlace ? (
          <InfoRow icon={<FestivalVenueIcon className="size-[18px]" />}>
            {festival.eventPlace}
          </InfoRow>
        ) : null}
        {festival.phoneNumber ? (
          <InfoRow icon={<FestivalPhoneIcon className="size-[18px]" />}>
            {festival.phoneNumber}
          </InfoRow>
        ) : null}
        {festival.homepageUrl ? (
          <InfoRow icon={<FestivalLinkIcon className="size-[18px]" />}>
            <a
              href={festival.homepageUrl}
              target="_blank"
              rel="noreferrer"
              className="body-small text-zinc-500 underline"
            >
              홈페이지 바로가기
            </a>
          </InfoRow>
        ) : null}

        <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3">
          <p className="body-small text-zinc-950">
            <span className="block">
              본 축제 정보는{" "}
              <span className="body-small-bold text-point-600">
                문화체육관광부의 지역축제정보 API
              </span>
              를 바탕으로 제공되었습니다.
            </span>
            <span className="body-small-bold block">
              현장 상황에 따라 진행 내용은 변동될 수 있으니, 방문 전 축제 문의처를 통해 반드시 확인
              바랍니다.
            </span>
          </p>
        </div>
      </section>

      {festival.latitude !== null && festival.longitude !== null ? (
        <>
          <div className="h-2 bg-zinc-100" />
          <section className="flex flex-col gap-3 px-5 py-4">
            <p className="body-regular-bold text-zinc-800">지도</p>
            <LocationMiniMap latitude={festival.latitude} longitude={festival.longitude} />
            {address ? (
              <div className="flex items-center gap-2">
                <span className="flex w-[18px] shrink-0 items-center justify-center text-zinc-400">
                  <FestivalLocationIcon className="size-[18px]" />
                </span>
                <p className="body-small min-w-0 flex-1 text-zinc-950">
                  {address}
                  <CopyTextButton
                    value={address}
                    ariaLabel="주소 복사"
                    className="body-caption ml-1"
                  />
                </p>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {festival.content ? (
        <>
          <div className="h-2 bg-zinc-100" />
          <section className="flex flex-col gap-3 px-5 py-4">
            <p className="body-regular-bold text-zinc-950">상세 정보</p>
            <p className="body-small whitespace-pre-line text-zinc-950">
              {formatSentenceBreaks(festival.content)}
            </p>
          </section>
        </>
      ) : null}

      <div className="flex items-center justify-end gap-4 border-t border-zinc-200 px-5 py-4">
        <p className="body-caption text-zinc-400">
          제공 <span className="underline">문화체육관광부</span>
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="flex h-6 w-[18px] shrink-0 items-center justify-center text-zinc-400">
        {icon}
      </span>
      <span className="body-regular min-w-0 flex-1 text-zinc-950">{children}</span>
    </div>
  );
}
