"use client";

import { Button } from "@/components/ui/Button";

export type FindAccountTab = "EMAIL" | "PASSWORD";

const TABS: FindAccountTab[] = ["EMAIL", "PASSWORD"];

const TAB_LABEL: Record<FindAccountTab, string> = {
  EMAIL: "이메일 찾기",
  PASSWORD: "비밀번호 찾기",
};

export interface FindAccountTabsProps {
  value: FindAccountTab;
  onChange: (tab: FindAccountTab) => void;
}

/**
 * 계정 찾기 화면의 아이디/비밀번호 탭.
 * Admin AccountKindTabs와 같은 세그먼트 컨트롤 스타일(zinc-100 트랙 + 선택 시 흰 배경).
 */
export function FindAccountTabs({ value, onChange }: FindAccountTabsProps) {
  return (
    <div className="bg-zinc-100 p-1 rounded-sm">
      <div className="grid grid-cols-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            aria-pressed={value === tab}
            className={
              value === tab ? "bg-white text-point-600 font-semibold hover:bg-white" : "text-zinc-400"
            }
            onClick={() => onChange(tab)}
          >
            {TAB_LABEL[tab]}
          </Button>
        ))}
      </div>
    </div>
  );
}
