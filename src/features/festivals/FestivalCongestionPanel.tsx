"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  Cross1Icon,
  Cross2Icon,
  ListBulletIcon,
  MixerHorizontalIcon,
  QuestionMarkCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";

import { MapIcon } from "@/components/icons/MapIcon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { API_ERROR_CODE, getApiErrorCode, getApiErrorMessage } from "@/lib/api/httpError";
import { formatTimeAgo } from "@/lib/relativeTime";
import { getFestivalCongestion, getFestivalDetail } from "./api";
import { StatusBadge } from "./FestivalCard";
import { CongestionMapView } from "./CongestionMapView";
import {
  CONGESTION_LABEL,
  CONGESTION_LEVELS,
  CONGESTION_PILL_CLASS,
  CONGESTION_TEXT_CLASS,
  buildZoneByBoothName,
  collectZoneNames,
  formatZoneChipLabel,
  pickOverallLevel,
} from "./congestionPresentation";
import { collectRoadmapPins } from "./mapPresentation";
import type {
  BoothCongestionLevel,
  BoothCongestionResponse,
  FestivalCongestionResponse,
  UserFestivalDetailResponse,
} from "./types";

type ViewMode = "LIST" | "MAP";

const OVERALL_HINT = "부스별 혼잡도 중 가장 높은 등급을 축제 전체 혼잡도로 보여줘요.";
const BUSIEST_HINT = "예상 대기시간이 가장 긴 부스예요.";

/** 하단 시트 위쪽에 지는 그림자. 색은 토큰에서 섞어 쓴다(팔레트 밖 색을 새로 만들지 않는다). */
const SHEET_SHADOW = "0 -4px 6px color-mix(in srgb, var(--color-zinc-950) 9%, transparent)";

const CHIP_BASE =
  "body-small flex h-9 shrink-0 items-center gap-1 rounded-full border px-4 transition-colors";
const CHIP_OFF = "border-zinc-200 bg-white text-zinc-800";
const CHIP_ON = "border-point-600 bg-point-600 text-white";

/**
 * 「축제 실시간 현황」(목록 뷰 · 지도 뷰).
 *
 * <p>축제 상세의 실시간 요약에서 「전체 보기」로 들어오는 화면이다. 상세는 상위 3개만
 * 보여주는 자리라 전체 부스와 필터는 여기서만 다룬다.</p>
 */
export function FestivalCongestionPanel({ festivalId }: { festivalId: string }) {
  const [view, setView] = useState<ViewMode>("LIST");
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<BoothCongestionLevel[]>([]);
  const [zoneSheetOpen, setZoneSheetOpen] = useState(false);
  const [selectedBoothName, setSelectedBoothName] = useState<string | null>(null);

  /*
    축제 상세와 같은 쿼리 키를 쓴다 — 상세에서 넘어오면 이미 받아 둔 응답을 그대로
    쓰게 되어 화면이 깜빡이지 않는다. 구역 이름과 부스 좌표가 이 응답(roadmap)에만
    있어서 혼잡도 API만으로는 이 화면을 그릴 수 없다.
  */
  const festivalQuery = useQuery({
    queryKey: ["festival", festivalId],
    queryFn: () => getFestivalDetail(festivalId),
  });
  const congestionQuery = useQuery({
    queryKey: ["festival-congestion", festivalId],
    queryFn: () => getFestivalCongestion(festivalId),
  });

  const festival = festivalQuery.data;
  const congestion = congestionQuery.data;
  // 배치도는 여러 곳에서 쓰므로 한 번만 꺼내 둔다(옵셔널 체이닝을 의존성에 그대로 쓰면
  // React Compiler가 메모이제이션을 포기한다).
  const roadmap = festival?.roadmap ?? null;

  const zoneByBoothName = useMemo(() => buildZoneByBoothName(roadmap), [roadmap]);
  const zoneNames = useMemo(() => collectZoneNames(roadmap), [roadmap]);

  /*
    서버가 주는 booths 순서는 부스 등록 순(boothId)이라 방문객에게는 아무 의미가 없다.
    기다림이 짧은 곳부터 보이도록 예상 대기시간 오름차순으로 다시 세우고, 아직 갱신된
    적 없는 부스는 비교할 값이 없으므로 맨 뒤로 보낸다.
  */
  const sortedBooths = useMemo(() => {
    return [...(congestion?.booths ?? [])].sort((a, b) => {
      if (a.waitMinutes === null && b.waitMinutes === null) return 0;
      if (a.waitMinutes === null) return 1;
      if (b.waitMinutes === null) return -1;
      return a.waitMinutes - b.waitMinutes;
    });
  }, [congestion]);

  const visibleBooths = useMemo(() => {
    return sortedBooths.filter((booth) => {
      if (selectedLevels.length > 0) {
        if (!booth.congestionLevel || !selectedLevels.includes(booth.congestionLevel)) return false;
      }
      if (selectedZones.length > 0) {
        const zone = zoneByBoothName.get(booth.boothName);
        if (!zone || !selectedZones.includes(zone)) return false;
      }
      return true;
    });
  }, [sortedBooths, selectedLevels, selectedZones, zoneByBoothName]);

  const levelByBoothName = useMemo(() => {
    const map = new Map<string, BoothCongestionLevel | null>();
    (congestion?.booths ?? []).forEach((booth) => {
      map.set(booth.boothName, booth.congestionLevel);
    });
    return map;
  }, [congestion]);

  const selectedBooth = useMemo(
    () =>
      selectedBoothName === null
        ? null
        : ((congestion?.booths ?? []).find((booth) => booth.boothName === selectedBoothName) ??
          null),
    [congestion, selectedBoothName],
  );

  const overallLevel = useMemo(() => pickOverallLevel(congestion?.booths ?? []), [congestion]);
  const busiestBooth = congestion?.ranking[0] ?? null;
  const hasMappedBooths = useMemo(
    () => (roadmap ? collectRoadmapPins(roadmap).some((pin) => pin.isBooth) : false),
    [roadmap],
  );

  if (festivalQuery.isLoading) {
    return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  }
  if (festivalQuery.fetchStatus === "paused") {
    return <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>;
  }
  if (festivalQuery.isError) {
    if (getApiErrorCode(festivalQuery.error) === API_ERROR_CODE.FESTIVAL_NOT_FOUND) {
      return (
        <div className="flex flex-col items-center gap-2 p-8">
          <p className="body-regular text-zinc-500">존재하지 않는 축제예요.</p>
          <Link href="/" className="body-regular-bold text-primary">
            목록으로 돌아가기
          </Link>
        </div>
      );
    }
    return <p className="body-small text-error">{getApiErrorMessage(festivalQuery.error)}</p>;
  }
  if (!festival) return null;

  const appliedFilterCount = selectedZones.length + selectedLevels.length;

  return (
    <div className="-mx-5 -my-4 flex min-h-[calc(100dvh-var(--app-header-height))] flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center gap-2 px-5">
        <Link
          href={`/festivals/${festivalId}`}
          aria-label="뒤로가기"
          className="shrink-0 text-zinc-950"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="body-large-bold text-zinc-950">축제 실시간 현황</h1>
      </div>

      <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <p className="body-large-bold truncate text-zinc-950">{festival.name}</p>
          <StatusBadge status={festival.progressStatus} />
        </div>
        <button
          type="button"
          aria-label={view === "LIST" ? "지도 보기" : "목록 보기"}
          onClick={() => {
            setView((current) => (current === "LIST" ? "MAP" : "LIST"));
            setSelectedBoothName(null);
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950"
        >
          {view === "LIST" ? <MapIcon className="size-5" /> : <ListBulletIcon className="size-5" />}
        </button>
      </div>

      <CongestionStateNotice festival={festival} query={congestionQuery} />

      {view === "LIST" ? (
        <div className="flex flex-col">
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-300 px-5 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <HelpLabel label="전체 혼잡도" hint={OVERALL_HINT} />
                <p
                  className={`body-large-bold ${overallLevel ? CONGESTION_TEXT_CLASS[overallLevel] : "text-zinc-400"}`}
                >
                  {overallLevel ? CONGESTION_LABEL[overallLevel] : "정보 없음"}
                </p>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <HelpLabel label="가장 혼잡한 부스" hint={BUSIEST_HINT} />
                <BusiestBoothText booth={busiestBooth} />
              </div>
            </div>
          </div>

          <div className="h-2 shrink-0 bg-zinc-100" />

          <div className="flex flex-col gap-3 px-5 py-4">
            <p className="body-regular-bold text-zinc-950">부스 목록</p>

            <div className="-mx-5 flex items-center gap-3 overflow-x-auto px-5">
              {/* 적용된 필터 개수만 알려 주는 표시다 — 누르는 자리가 아니다. */}
              <span
                aria-label={`적용된 필터 ${appliedFilterCount}개`}
                className={`body-small flex h-9 shrink-0 items-center justify-center rounded-full border border-zinc-100 text-zinc-800 ${
                  appliedFilterCount > 0 ? "gap-1 px-4" : "w-9"
                }`}
              >
                <MixerHorizontalIcon className="size-4" />
                {appliedFilterCount > 0 ? appliedFilterCount : null}
              </span>

              {zoneNames.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setZoneSheetOpen(true)}
                  className={`${CHIP_BASE} ${CHIP_OFF}`}
                >
                  <span className="max-w-[140px] truncate">
                    {formatZoneChipLabel(selectedZones)}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" />
                </button>
              ) : null}

              {CONGESTION_LEVELS.map((level) => {
                const on = selectedLevels.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSelectedLevels((current) =>
                        current.includes(level)
                          ? current.filter((item) => item !== level)
                          : [...current, level],
                      )
                    }
                    className={`${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`}
                  >
                    {CONGESTION_LABEL[level]}
                  </button>
                );
              })}
            </div>

            {sortedBooths.length === 0 ? (
              <p className="body-small py-6 text-center text-zinc-400">
                아직 등록된 부스가 없어요.
              </p>
            ) : visibleBooths.length === 0 ? (
              <p className="body-small py-6 text-center text-zinc-400">
                고른 조건에 맞는 부스가 없어요.
              </p>
            ) : (
              <div className="flex flex-col">
                {visibleBooths.map((booth) => (
                  <BoothRow
                    key={booth.boothId}
                    booth={booth}
                    zoneName={zoneByBoothName.get(booth.boothName) ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative min-h-[420px] flex-1">
          {roadmap && hasMappedBooths ? (
            <CongestionMapView
              roadmap={roadmap}
              levelByBoothName={levelByBoothName}
              selectedBoothName={selectedBoothName}
              onSelectBooth={setSelectedBoothName}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 px-5">
              <p className="body-small text-center text-zinc-500">
                아직 지도에 표시할 부스 위치가 없어요.
              </p>
            </div>
          )}

          {selectedBooth ? (
            <BoothDetailSheet
              booth={selectedBooth}
              isRefreshing={congestionQuery.isFetching}
              onRefresh={() => congestionQuery.refetch()}
              onClose={() => setSelectedBoothName(null)}
            />
          ) : (
            <div className="absolute inset-x-5 bottom-5 z-10 flex flex-col gap-2 rounded-lg bg-white px-4 py-3 shadow-lg">
              <p className="body-large-bold truncate text-zinc-950">{festival.name}</p>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p
                    className={`body-regular-bold ${overallLevel ? CONGESTION_TEXT_CLASS[overallLevel] : "text-zinc-400"}`}
                  >
                    {overallLevel ? CONGESTION_LABEL[overallLevel] : "정보 없음"}
                  </p>
                  <HelpLabel label="혼잡도" hint={OVERALL_HINT} />
                </div>
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <BusiestBoothText booth={busiestBooth} />
                  <HelpLabel label="가장 혼잡한 부스" hint={BUSIEST_HINT} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {zoneSheetOpen ? (
        <ZoneOptionSheet
          zoneNames={zoneNames}
          selected={selectedZones}
          onClose={() => setZoneSheetOpen(false)}
          onApply={(next) => {
            setSelectedZones(next);
            setZoneSheetOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** 혼잡도 데이터가 왜 비어 있는지 알려 주는 줄. 화면을 막지 않고 안내만 한다. */
function CongestionStateNotice({
  festival,
  query,
}: {
  festival: UserFestivalDetailResponse;
  query: ReturnType<typeof useQuery<FestivalCongestionResponse>>;
}) {
  if (festival.progressStatus === "UPCOMING") {
    return (
      <p className="body-caption px-5 pb-3 text-zinc-500">
        축제 시작 전에는 부스별 혼잡도 정보가 제공되지 않습니다.
      </p>
    );
  }
  if (festival.progressStatus === "COMPLETED") {
    return (
      <p className="body-caption px-5 pb-3 text-zinc-500">
        종료된 축제는 실시간 현황을 제공하지 않습니다.
      </p>
    );
  }
  if (query.fetchStatus === "paused") {
    return <p className="body-small px-5 pb-3 text-error">네트워크 연결을 확인해 주세요.</p>;
  }
  if (query.isError) {
    return <p className="body-small px-5 pb-3 text-error">{getApiErrorMessage(query.error)}</p>;
  }
  return null;
}

function BusiestBoothText({ booth }: { booth: BoothCongestionResponse | null }) {
  if (!booth) return <p className="body-regular text-zinc-400">정보 없음</p>;
  return (
    <p className="body-regular min-w-0 truncate text-zinc-950">
      <span className="body-regular-bold text-secondary-600">1</span> {booth.boothName}
    </p>
  );
}

/** 라벨 옆 ⓘ. 눌러야 설명이 나오게 둔 건 카드 두 칸에 설명을 늘 펼쳐 둘 자리가 없어서다. */
function HelpLabel({ label, hint }: { label: string; hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center gap-1">
      <p className="body-small whitespace-nowrap text-zinc-500">{label}</p>
      <button
        type="button"
        aria-label={`${label} 설명`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="shrink-0 text-zinc-400"
      >
        <QuestionMarkCircledIcon className="size-3" />
      </button>
      {open ? (
        <p className="body-caption absolute bottom-full left-0 z-30 mb-1 w-max max-w-[220px] rounded-md bg-zinc-800 px-2 py-1 text-white">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function BoothRow({
  booth,
  zoneName,
}: {
  booth: BoothCongestionResponse;
  zoneName: string | null;
}) {
  const timeAgo = formatTimeAgo(booth.updatedAt);
  const waitText =
    booth.waitMinutes === null ? "예상 대기 정보 없음" : `예상 대기 ${booth.waitMinutes}분`;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-b-0">
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <p className="body-regular truncate text-zinc-950">{booth.boothName}</p>
          {zoneName ? <p className="body-caption shrink-0 text-zinc-600">{zoneName}</p> : null}
        </div>
        <p className="body-caption text-zinc-500">
          {timeAgo ? `${waitText} · ${timeAgo} 업데이트` : waitText}
        </p>
      </div>
      <CongestionPill level={booth.congestionLevel} />
    </div>
  );
}

function CongestionPill({ level }: { level: BoothCongestionLevel | null }) {
  if (!level) {
    return (
      <span className="body-caption shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-zinc-500">
        정보 없음
      </span>
    );
  }
  return (
    <span className={`body-caption shrink-0 rounded-md px-2 py-1 ${CONGESTION_PILL_CLASS[level]}`}>
      {CONGESTION_LABEL[level]}
    </span>
  );
}

/** 지도에서 부스 점을 눌렀을 때 뜨는 시트. 지도를 가리지 않게 덮개(dim)는 두지 않는다. */
function BoothDetailSheet({
  booth,
  isRefreshing,
  onRefresh,
  onClose,
}: {
  booth: BoothCongestionResponse;
  isRefreshing: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const timeAgo = formatTimeAgo(booth.updatedAt);
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white"
      style={{ boxShadow: SHEET_SHADOW }}
    >
      <div className="flex items-center gap-2 px-2 py-3">
        <p className="body-large-bold min-w-0 flex-1 truncate text-center text-zinc-950">
          {booth.boothName}
        </p>
        <IconButton
          aria-label="부스 정보 닫기"
          variant="ghost"
          size="sm"
          icon={<Cross1Icon className="size-3" />}
          onClick={onClose}
        />
      </div>

      <div className="flex items-center justify-between border-y border-zinc-200 bg-zinc-50 px-4 py-1">
        <p className="body-caption text-zinc-950">실시간 혼잡도정보</p>
        <div className="flex items-center gap-1">
          <p className="body-caption text-zinc-500">{timeAgo ?? "갱신 기록 없음"}</p>
          <button
            type="button"
            aria-label="혼잡도 새로고침"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-zinc-500 disabled:text-zinc-300"
          >
            <UpdateIcon className="size-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-4 pb-[calc(16px+var(--app-safe-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <p className="body-small text-zinc-950">혼잡도</p>
          <p
            className={`body-small-bold ${booth.congestionLevel ? CONGESTION_TEXT_CLASS[booth.congestionLevel] : "text-zinc-400"}`}
          >
            {booth.congestionLevel ? CONGESTION_LABEL[booth.congestionLevel] : "정보 없음"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="body-small text-zinc-950">예상 대기시간</p>
          {booth.waitMinutes === null ? (
            <p className="body-regular text-zinc-400">정보 없음</p>
          ) : (
            <p className="body-regular text-zinc-800">
              <span className="body-regular-bold">{booth.waitMinutes}</span> 분
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 구역 옵션 시트.
 *
 * <p>고른 값은 「결과보기」를 누를 때까지 시트 안에만 둔다 — 고르는 동안 뒤 목록이
 * 계속 바뀌면 무엇을 고르는 중인지 알 수 없다.</p>
 */
function ZoneOptionSheet({
  zoneNames,
  selected,
  onClose,
  onApply,
}: {
  zoneNames: string[];
  selected: string[];
  onClose: () => void;
  onApply: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);

  function toggle(zone: string) {
    setDraft((current) =>
      current.includes(zone) ? current.filter((item) => item !== zone) : [...current, zone],
    );
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto w-full max-w-[var(--app-max-width)]">
      <button
        type="button"
        aria-label="구역 옵션 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-dimmed"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-white"
        style={{ boxShadow: SHEET_SHADOW }}
      >
        <div className="flex items-center gap-2 px-2 py-3">
          <p className="body-large-bold flex-1 text-center text-zinc-950">구역 옵션</p>
          <IconButton
            aria-label="구역 옵션 닫기"
            variant="ghost"
            size="sm"
            icon={<Cross1Icon className="size-3" />}
            onClick={onClose}
          />
        </div>

        <div className="flex flex-wrap gap-3 px-4 py-4">
          {zoneNames.map((zone) => {
            const on = draft.includes(zone);
            return (
              <button
                key={zone}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(zone)}
                className={`${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {zone}
              </button>
            );
          })}
        </div>

        {draft.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-5 pb-2">
            {draft.map((zone) => (
              <button
                key={zone}
                type="button"
                aria-label={`${zone} 선택 해제`}
                onClick={() => toggle(zone)}
                className={`${CHIP_BASE} ${CHIP_ON}`}
              >
                {zone}
                <Cross2Icon className="size-4 shrink-0" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3 px-5 pt-4 pb-[calc(17px+var(--app-safe-bottom))]">
          <Button variant="outline" className="flex-1" onClick={() => setDraft([])}>
            초기화
          </Button>
          <Button className="flex-1 bg-point-600 hover:bg-point-500" onClick={() => onApply(draft)}>
            결과보기
          </Button>
        </div>
      </div>
    </div>
  );
}
