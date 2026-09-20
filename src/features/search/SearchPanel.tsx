"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFestivals } from "@/features/festivals/api";
import { StatusBadge, WishlistHeart } from "@/features/festivals/FestivalCard";
import type { UserFestivalResponse } from "@/features/festivals/types";
import {
  addRecentSearch,
  loadRecentSearches,
  removeRecentSearch,
  saveRecentSearches,
} from "./recentSearches";

/** 검색 결과 한 장 크기. 백엔드 MAX_SIZE(100) 안쪽으로 잡는다. */
const SEARCH_PAGE_SIZE = 20;

/**
 * 축제 검색 화면. 부스가 아니라 "축제"를 이름으로 검색한다 —
 * 백엔드 GET /api/festivals?name= 을 그대로 쓴다(상태/지역 필터는 검색과 동시에 못 쓰는
 * 계약이라, 검색은 필터 없는 별도 화면으로 남긴다).
 */
export function SearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 서버 렌더링 시점엔 localStorage가 없어서 항상 빈 배열로 시작하고, 마운트된 뒤에만
    // 실제 값으로 갱신한다 — useState 초기값에서 바로 읽으면 서버/클라이언트 렌더 결과가
    // 달라져서 하이드레이션 경고가 난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(loadRecentSearches());
  }, []);

  /*
    한 번에 50건만 받고 끝내던 시절에는 「검색결과 799」라고 적어 놓고 50개만 보여 줘서
    나머지를 볼 방법이 아예 없었다. 한 장씩 이어 받는다.
  */
  const query = useInfiniteQuery({
    queryKey: ["festival-search", submittedKeyword],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getFestivals({ page: pageParam, size: SEARCH_PAGE_SIZE, name: submittedKeyword }),
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: submittedKeyword.trim().length > 0,
  });

  function commitSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed === "") return;
    setKeyword(trimmed);
    setSubmittedKeyword(trimmed);
    const next = addRecentSearch(recentSearches, trimmed);
    setRecentSearches(next);
    saveRecentSearches(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    commitSearch(keyword);
    // 모바일에서 키보드가 결과를 반쯤 가리므로, 검색을 확정하면 입력에서 포커스를 뗀다.
    inputRef.current?.blur();
  }

  function handleChange(value: string) {
    setKeyword(value);
    // 입력을 모두 지우면 시안의 기본 상태(최근 검색어)로 돌아가야 한다. 예전에는 결과가
    // 그대로 남아서, 빈 입력칸 아래에 지난 검색 결과가 붙어 있는 어정쩡한 화면이 나왔다.
    if (value.trim() === "") setSubmittedKeyword("");
  }

  function handleClear() {
    setKeyword("");
    setSubmittedKeyword("");
    // 지우기는 "다시 검색하겠다"는 뜻이라 입력으로 포커스를 되돌린다.
    inputRef.current?.focus();
  }

  function handleRemoveRecentSearch(target: string) {
    const next = removeRecentSearch(recentSearches, target);
    setRecentSearches(next);
    saveRecentSearches(next);
  }

  function handleClearAllRecentSearches() {
    setRecentSearches([]);
    saveRecentSearches([]);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="heading-small text-zinc-950">검색</h1>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-400 bg-white px-3 py-2 focus-within:border-point-600">
          <input
            ref={inputRef}
            value={keyword}
            onChange={(event) => handleChange(event.target.value)}
            aria-label="축제명 검색어"
            placeholder="검색어를 입력하세요"
            /*
              모바일 키보드를 검색용으로 띄운다. type="search"는 브라우저가 자체 지우기
              버튼을 덧그려 시안의 원형 ✕와 겹치므로 쓰지 않는다.
            */
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="body-regular w-full min-w-0 text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {keyword ? (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={handleClear}
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-400 text-white"
            >
              <Cross2Icon aria-hidden className="size-3" />
            </button>
          ) : (
            <button type="submit" aria-label="검색" className="shrink-0">
              <MagnifyingGlassIcon aria-hidden className="size-5 text-zinc-400" />
            </button>
          )}
        </div>
      </form>

      {submittedKeyword.trim().length === 0 ? (
        <RecentSearches
          keywords={recentSearches}
          onSelect={commitSearch}
          onRemove={handleRemoveRecentSearch}
          onClearAll={handleClearAllRecentSearches}
        />
      ) : (
        <SearchResults query={query} />
      )}
    </div>
  );
}

function RecentSearches({
  keywords,
  onSelect,
  onRemove,
  onClearAll,
}: {
  keywords: string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClearAll: () => void;
}) {
  // [case] 최근 검색어가 없을 시 영역 숨김
  if (keywords.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="최근 검색어">
      <div className="flex items-center justify-between">
        <h2 className="body-small-bold text-zinc-950">최근 검색어</h2>
        <button type="button" onClick={onClearAll} className="body-caption text-point-600">
          전체 삭제
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {keywords.map((word) => (
          <li
            key={word}
            className="body-small flex items-center gap-1 rounded-full bg-zinc-100 py-1.5 pl-3 pr-2 text-zinc-700"
          >
            <button type="button" onClick={() => onSelect(word)}>
              {word}
            </button>
            <button
              type="button"
              aria-label={`${word} 삭제`}
              onClick={() => onRemove(word)}
              className="flex size-4 shrink-0 items-center justify-center"
            >
              <Cross2Icon aria-hidden className="size-3 text-zinc-400" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 검색 결과 한 줄. 목록 화면의 FestivalCard와 달리 포스터·기간·찜수를 빼고
 * 이름·상태·주소만 남긴다 — 시안의 검색 결과는 "찾던 축제가 이건지" 고르는 자리라서
 * 한 화면에 더 많이 들어가는 쪽이 맞다.
 */
function SearchResultRow({ festival }: { festival: UserFestivalResponse }) {
  return (
    <li>
      <Link
        href={`/festivals/${festival.id}`}
        className="flex items-start gap-2 border-b border-zinc-200 py-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="body-regular-bold min-w-0 truncate text-zinc-950">{festival.name}</p>
            <StatusBadge status={festival.progressStatus} />
          </div>
          <p className="body-small truncate text-zinc-500">
            {festival.address ?? festival.eventPlace ?? ""}
          </p>
        </div>
        <WishlistHeart festival={festival} />
      </Link>
    </li>
  );
}

function SearchResults({
  query,
}: {
  query: ReturnType<typeof useInfiniteQuery<Awaited<ReturnType<typeof getFestivals>>>>;
}) {
  if (query.isLoading) {
    return <p className="body-regular text-zinc-500">검색하는 중...</p>;
  }

  if (query.fetchStatus === "paused") {
    return <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>;
  }

  if (query.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>;
  }

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return <p className="body-regular text-zinc-400">검색 결과가 없어요.</p>;
  }

  return (
    <section className="flex flex-col" aria-label="검색결과">
      <h2 className="body-regular-bold flex items-center gap-1 py-3 text-zinc-950">
        검색결과
        {/* 숫자는 현재 페이지가 아니라 서버가 알려 주는 전체 건수다(나머지는 더보기로 이어 받는다). */}
        <span className="text-point-600">{pages[0]?.totalElements ?? 0}</span>
      </h2>
      <ul className="flex flex-col">
        {items.map((festival) => (
          <SearchResultRow key={festival.id} festival={festival} />
        ))}
      </ul>
      {query.hasNextPage ? (
        <div className="mt-2 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="body-small flex h-[37px] items-center gap-1 rounded-full bg-zinc-100 px-4 disabled:opacity-50"
          >
            {query.isFetchingNextPage ? "불러오는 중..." : "더보기"}
            <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-zinc-800" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
