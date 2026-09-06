"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFestivals } from "@/features/festivals/api";
import { FestivalCard } from "@/features/festivals/FestivalCard";

const RECENT_SEARCH_KEY = "chookjibup:recent-festival-searches";
const MAX_RECENT = 8;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(keywords: string[]) {
  window.localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(keywords));
}

/**
 * 축제 검색(SEARCH01) 화면. 부스가 아니라 "축제"를 이름으로 검색한다 —
 * 백엔드 GET /api/festivals?name= 을 그대로 쓴다(상태/지역 필터는 검색과 동시에 못 씀).
 *
 * 최근 검색어는 백엔드에 저장 API가 없어서 브라우저 localStorage에만 보관한다
 * (기기를 바꾸면 최근 검색어는 안 남는다 — 필요해지면 서버 저장으로 옮길 것).
 */
export function SearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // 서버 렌더링 시점엔 localStorage가 없어서 항상 빈 배열로 시작하고, 마운트된 뒤에만
    // 실제 값으로 갱신한다 — useState 초기값에서 바로 읽으면 서버/클라이언트 렌더 결과가
    // 달라져서 하이드레이션 경고가 난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(loadRecentSearches());
  }, []);

  const query = useQuery({
    queryKey: ["festival-search", submittedKeyword],
    queryFn: () => getFestivals({ page: 0, size: 50, name: submittedKeyword }),
    enabled: submittedKeyword.trim().length > 0,
  });

  function commitSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed === "") return;
    setKeyword(trimmed);
    setSubmittedKeyword(trimmed);
    const next = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(
      0,
      MAX_RECENT,
    );
    setRecentSearches(next);
    saveRecentSearches(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    commitSearch(keyword);
  }

  function handleClear() {
    setKeyword("");
    setSubmittedKeyword("");
  }

  function removeRecentSearch(target: string) {
    const next = recentSearches.filter((item) => item !== target);
    setRecentSearches(next);
    saveRecentSearches(next);
  }

  function clearAllRecentSearches() {
    setRecentSearches([]);
    saveRecentSearches([]);
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="heading-small text-zinc-950">축제 검색</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-400 bg-white px-3 py-2">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="검색어를 입력하세요"
            className="body-regular w-full text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {keyword ? (
            <button type="button" aria-label="검색어 지우기" onClick={handleClear}>
              <Cross2Icon className="size-5 text-zinc-400" />
            </button>
          ) : (
            <button type="submit" aria-label="검색">
              <MagnifyingGlassIcon className="size-5 text-zinc-400" />
            </button>
          )}
        </div>
      </form>

      {submittedKeyword.trim().length === 0 ? (
        <RecentSearches
          keywords={recentSearches}
          onSelect={commitSearch}
          onRemove={removeRecentSearch}
          onClearAll={clearAllRecentSearches}
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="body-small-bold text-zinc-950">최근 검색어</p>
        <button type="button" onClick={onClearAll} className="body-caption text-zinc-400">
          전체 삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((word) => (
          <span
            key={word}
            className="body-small flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
          >
            <button type="button" onClick={() => onSelect(word)}>
              {word}
            </button>
            <button type="button" aria-label={`${word} 삭제`} onClick={() => onRemove(word)}>
              <Cross2Icon className="size-3 text-zinc-400" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getFestivals>>>>;
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

  const data = query.data;
  if (!data || data.items.length === 0) {
    return <p className="body-regular text-zinc-400">검색 결과가 없어요.</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 py-3">
        <p className="body-regular-bold text-zinc-950">검색결과</p>
        <p className="body-regular-bold text-secondary-600">{data.totalElements}</p>
      </div>
      <div className="flex flex-col">
        {data.items.map((festival) => (
          <FestivalCard key={festival.id} festival={festival} />
        ))}
      </div>
    </div>
  );
}
