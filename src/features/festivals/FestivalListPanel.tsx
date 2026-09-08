"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getMyWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { FestivalImage } from "./FestivalImage";
import { WishlistHeart } from "./FestivalCard";
import { getFestivals } from "./api";
import { REGIONS } from "./regions";
import type { FestivalProgressStatus, FestivalSort, UserFestivalResponse } from "./types";

type FilterTab = "ALL" | Exclude<FestivalProgressStatus, "COMPLETED"> | "WISHLIST";
const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "ONGOING", label: "진행중" },
  { value: "UPCOMING", label: "진행예정" },
  { value: "WISHLIST", label: "내가 저장한 축제" },
];

/**
 * 홈에 노출할 축제 상태. 백엔드에는 "종료 제외" 필터가 없고 status 파라미터도 값을 하나만
 * 받으므로, 전체 탭에서는 두 상태를 각각 조회해 이어 붙인다. 상태 필터 없이 받아서
 * 클라이언트에서 종료 축제를 걸러내면, 목록이 시작일 오름차순이라 옛날 축제 수백 페이지를
 * 전부 훑고 나서야 첫 화면이 그려진다.
 */
const ACTIVE_STATUSES: Exclude<FestivalProgressStatus, "COMPLETED">[] = ["ONGOING", "UPCOMING"];
const FEED_PAGE_SIZE = 6;
const RANKING_SIZE = 8;
/** 한 번의 조회에서 이어 읽을 최대 페이지 수. 요청이 무한정 늘어나지 않게 막는 안전장치다. */
const MAX_PAGES_PER_FETCH = 4;

export function FestivalListPanel() {
  const [resetVersion, setResetVersion] = useState(0);
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [visibleCount, setVisibleCount] = useState(4);
  const [region, setRegion] = useState("ALL");
  const [sort, setSort] = useState<FestivalSort>("WISHLIST_COUNT");
  useEffect(() => {
    function resetHome() {
      setTab("ALL");
      setRegion("ALL");
      setSort("WISHLIST_COUNT");
      setVisibleCount(4);
      setResetVersion((version) => version + 1);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    window.addEventListener("festival-home-reset", resetHome);
    return () => window.removeEventListener("festival-home-reset", resetHome);
  }, []);
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;
  const regionFilter = region === "ALL" ? undefined : region;
  const statuses = tab === "ONGOING" || tab === "UPCOMING" ? [tab] : ACTIVE_STATUSES;
  const ranking = useQuery({
    queryKey: ["festivals", "ranking-active", tab, region, sort, isLoggedIn],
    queryFn: async () => {
      // 상태별 1페이지씩만 받아 합친다. 전체 상위 8개는 각 상태의 상위 8개 안에 반드시 들어 있다.
      const pages = await Promise.all(
        statuses.map((status) =>
          getFestivals({ region: regionFilter, status, sort, page: 0, size: RANKING_SIZE }),
        ),
      );
      const countOf = (festival: UserFestivalResponse) =>
        sort === "REVIEW_COUNT" ? festival.reviewCount : festival.wishlistCount;
      return pages
        .flatMap((page) => page.items)
        .sort((a, b) => countOf(b) - countOf(a))
        .slice(0, RANKING_SIZE);
    },
    enabled: tab !== "WISHLIST",
  });
  const feed = useInfiniteQuery({
    queryKey: ["festivals", "home-feed-active", tab, region, isLoggedIn],
    initialPageParam: { streamIndex: 0, page: 0 } as FeedCursor,
    queryFn: ({ pageParam }) =>
      loadFeedPage(
        tab === "WISHLIST"
          ? [
              async (page) => {
                const result = await getMyWishlist(page, FEED_PAGE_SIZE);
                return { ...result, items: result.items.map(toFestivalResponseFromWishlist) };
              },
            ]
          : statuses.map(
              (status) => (page: number) =>
                getFestivals({ region: regionFilter, status, page, size: FEED_PAGE_SIZE }),
            ),
        pageParam,
        FEED_PAGE_SIZE,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: tab !== "WISHLIST" || isLoggedIn,
  });
  const rankedItems = ranking.data ?? [];
  const cards = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="-mt-4 min-w-0">
      <h1 className="sr-only">축제 둘러보기</h1>
      <div className="sticky top-[var(--app-header-height)] z-10 -mx-5 flex h-[46px] items-center border-b border-zinc-100 bg-white px-5">
        <div className="relative mr-2 flex h-4 shrink-0 items-center border-r-[1px] border-zinc-200 pr-4">
          <div className="relative">
            <select
              aria-label="축제 지역"
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                setVisibleCount(4);
              }}
              disabled={tab === "WISHLIST"}
              className="body-small appearance-none bg-white pr-5 text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-point-600 disabled:opacity-50"
            >
              <option value="ALL">전국</option>
              {REGIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-zinc-800"
            />
          </div>
        </div>
        <div
          key={resetVersion}
          className="flex h-full min-w-0 gap-3 overflow-x-auto"
          aria-label="축제 상태 필터"
        >
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);
                setVisibleCount(4);
              }}
              className={`body-small flex h-full shrink-0 items-center gap-1.5 border-b-2 px-3 ${tab === value ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent text-zinc-400"}`}
            >
              {value === "WISHLIST" && (
                <HeartIcon filled aria-hidden className="size-4 text-red-500" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab !== "WISHLIST" && (
        <>
          <div className="-mx-5 flex h-[61px] gap-2 px-5 py-3 shadow-[inset_0_-1px_0_var(--color-zinc-100)]">
            {(
              [
                ["WISHLIST_COUNT", "저장 많은"],
                ["REVIEW_COUNT", "리뷰 많은"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
                className={`body-small inline-flex h-[37px] w-[84px] shrink-0 items-center justify-center rounded-full border ${sort === value ? "border-point-300 bg-point-300 font-semibold text-point-600" : "border-zinc-200 bg-white text-zinc-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <QueryMessage
            loading={ranking.isLoading}
            paused={ranking.fetchStatus === "paused"}
            error={ranking.error}
            empty={ranking.isSuccess && !rankedItems.length}
          />
          {rankedItems.length > 0 && (
            <div
              key={`${tab}-${region}-${sort}-${resetVersion}`}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto"
              aria-label="축제 순위, 좌우로 넘겨보기"
              tabIndex={0}
            >
              {Array.from({ length: Math.ceil(rankedItems.length / 4) }, (_, group) => (
                <ol key={group} start={group * 4 + 1} className="w-full shrink-0 snap-center">
                  {rankedItems.slice(group * 4, group * 4 + 4).map((festival, index) => (
                    <li
                      key={festival.id}
                      className="flex h-20 items-center gap-5 border-b border-zinc-200 last:border-0"
                    >
                      <span className="w-8 shrink-0 text-center text-xl font-semibold">
                        {group * 4 + index + 1}
                      </span>
                      <Link
                        href={`/festivals/${festival.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <HomeThumbnail imageUrl={festival.imageUrl} compact />
                        <FestivalSummary festival={festival} />
                      </Link>
                      <WishlistHeart festival={festival} showWhenLoggedOut />
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "WISHLIST" && !isLoggedIn ? (
        <p className="body-small py-8 text-zinc-500">
          <Link href="/login" className="underline">
            로그인
          </Link>
          하면 찜한 축제를 모아볼 수 있어요.
        </p>
      ) : (
        <section
          className="pt-4"
          aria-label={tab === "WISHLIST" ? "내가 저장한 축제" : "요즘 주목받고 있는 축제"}
        >
          {tab !== "WISHLIST" && (
            <h2 className="body-regular-bold flex h-10 items-center text-zinc-950">
              요즘 주목받고 있는 축제
            </h2>
          )}
          <QueryMessage
            loading={feed.isLoading}
            paused={feed.fetchStatus === "paused"}
            error={feed.error}
            empty={feed.isSuccess && !cards.length && !feed.hasNextPage}
          />
          <div className="grid grid-cols-2 gap-x-5">
            {cards.slice(0, visibleCount).map((festival) => (
              <FestivalGridCard key={festival.id} festival={festival} />
            ))}
          </div>
          {(feed.hasNextPage || cards.length > visibleCount) && (
            <div className="mt-2 flex justify-center pb-14">
              <button
                type="button"
                onClick={async () => {
                  if (cards.length < visibleCount + 6 && feed.hasNextPage) {
                    const result = await feed.fetchNextPage();
                    if (result.isError) return;
                  }
                  setVisibleCount((count) => count + 6);
                }}
                disabled={feed.isFetchingNextPage}
                className="body-small flex h-[37px] items-center gap-1 rounded-full bg-zinc-100 px-4 disabled:opacity-50"
              >
                {feed.isFetchingNextPage ? "불러오는 중..." : "더보기"}
                <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-zinc-800" />
              </button>
            </div>
          )}
        </section>
      )}
      <Link
        href="/map"
        className="body-regular-bold fixed bottom-[calc(16px+var(--app-safe-bottom))] left-1/2 z-20 flex w-fit -translate-x-1/2 items-center gap-1 rounded-full bg-point-600 px-4 py-2 text-white shadow-md"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5Z M9 2v17 M15 5v17" />
        </svg>
        지도보기
      </Link>
    </div>
  );
}

/** 목록을 읽어오는 곳 하나(진행중 / 진행예정 / 찜 목록)와 그 안에서의 페이지 번호. */
type FeedCursor = { streamIndex: number; page: number };
type FeedStream = (page: number) => Promise<{ items: UserFestivalResponse[]; totalPages: number }>;

/**
 * 목록 한 묶음을 읽는다. 앞 스트림을 다 읽으면 다음 스트림으로 넘어가고, 종료된 축제를 걸러낸
 * 뒤 개수가 모자라면 다음 페이지를 이어 읽는다. 다만 한 번의 호출에서 MAX_PAGES_PER_FETCH
 * 페이지까지만 본다 — 조건에 맞는 축제가 뒤쪽에 몰려 있어도 요청이 폭주하지 않게 하기 위해서다.
 * 개수를 못 채우고 끊기면 남은 커서를 그대로 돌려주므로 "더보기"로 이어서 읽을 수 있다.
 */
async function loadFeedPage(streams: FeedStream[], cursor: FeedCursor, minimumCount: number) {
  const items: UserFestivalResponse[] = [];
  let nextCursor: FeedCursor | undefined = cursor;
  for (let fetched = 0; nextCursor && fetched < MAX_PAGES_PER_FETCH; fetched += 1) {
    // 타입 표기를 붙여야 한다 — 아래에서 nextCursor를 다시 대입하기 때문에 TS가 순환 추론으로 본다.
    const { streamIndex, page }: FeedCursor = nextCursor;
    const result = await streams[streamIndex](page);
    items.push(...result.items.filter((item) => item.progressStatus !== "COMPLETED"));
    nextCursor =
      page + 1 < result.totalPages
        ? { streamIndex, page: page + 1 }
        : streamIndex + 1 < streams.length
          ? { streamIndex: streamIndex + 1, page: 0 }
          : undefined;
    if (items.length >= minimumCount) break;
  }
  return { items, nextCursor };
}

function HomeThumbnail({
  compact = false,
  imageUrl,
}: {
  compact?: boolean;
  imageUrl?: string | null;
}) {
  return (
    <FestivalImage
      imageUrl={imageUrl}
      className={compact ? "h-12 w-[72px]" : "aspect-[3/2] w-full"}
    />
  );
}

function FestivalGridCard({ festival }: { festival: UserFestivalResponse }) {
  return (
    <article className="flex min-h-[240px] min-w-0 flex-col py-4">
      <Link href={`/festivals/${festival.id}`} className="block">
        <HomeThumbnail imageUrl={festival.imageUrl} />
        <div className="mt-3">
          <FestivalSummary festival={festival} />
        </div>
      </Link>
      <div className="mt-auto flex pt-2">
        <WishlistHeart festival={festival} showWhenLoggedOut />
      </div>
    </article>
  );
}

function FestivalSummary({ festival }: { festival: UserFestivalResponse }) {
  const status = festival.progressStatus;
  return (
    <div className="min-w-0 flex-1">
      <p className="body-small-bold min-h-[21px] truncate text-zinc-950">
        {status && (
          <span
            className={`mr-1 ${status === "ONGOING" ? "text-point-600" : status === "UPCOMING" ? "text-secondary-600" : "text-zinc-400"}`}
          >
            {status === "ONGOING" ? "진행중" : status === "UPCOMING" ? "진행예정" : "진행완료"}
          </span>
        )}
        {festival.name}
      </p>
      <p className="body-caption mt-1 min-h-[18px] truncate text-zinc-800">
        {festival.address?.trim() || festival.eventPlace?.trim() || "장소 미정"}
      </p>
    </div>
  );
}

function QueryMessage({
  loading,
  paused,
  error,
  empty,
}: {
  loading: boolean;
  paused: boolean;
  error: Error | null;
  empty: boolean;
}) {
  const message = paused
    ? "네트워크 연결을 확인해 주세요."
    : loading
      ? "불러오는 중..."
      : error
        ? getApiErrorMessage(error)
        : empty
          ? "해당하는 축제가 없습니다."
          : null;
  return message ? (
    <p role={error ? "alert" : "status"} className="body-small py-6 text-zinc-500">
      {message}
    </p>
  ) : null;
}

/**
 * 찜 목록 응답엔 progressStatus/좌표/전화번호/찜·리뷰 개수 등이 없어서, 카드 표시에
 * 필요한 만큼만 채워 넣는다. wishlistCount/reviewCount는 이 탭에서만 0으로 나온다 —
 * 필요해지면 백엔드 응답에 필드를 추가해야 한다.
 */
function toFestivalResponseFromWishlist(item: {
  id: string;
  name: string;
  imageUrl?: string | null;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  progressStatus: FestivalProgressStatus | null;
  wishlistCount: number;
  reviewCount: number;
}): UserFestivalResponse {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    eventPlace: item.eventPlace,
    address: item.address,
    detailAddress: null,
    startDate: item.startDate,
    endDate: item.endDate,
    operationStartTime: null,
    operationEndTime: null,
    phoneNumber: null,
    homepageUrl: null,
    latitude: null,
    longitude: null,
    progressStatus: item.progressStatus,
    wishlisted: true,
    wishlistCount: item.wishlistCount,
    reviewCount: item.reviewCount,
  };
}
