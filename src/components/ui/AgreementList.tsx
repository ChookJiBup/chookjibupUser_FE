"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

export interface AgreementItem {
  label: string;
  required?: boolean;
  viewHref?: string;
}

interface AgreementListProps {
  items: readonly AgreementItem[];
  checkedItems: readonly boolean[];
  onCheckedItemsChange: (checkedItems: boolean[]) => void;
}

export function AgreementList({
  items,
  checkedItems,
  onCheckedItemsChange,
}: AgreementListProps) {
  const allChecked = items.length > 0 && checkedItems.every(Boolean);

  return (
    <div>
      <label className="body-regular-bold flex h-11 cursor-pointer items-center gap-2 text-zinc-950">
        <Checkbox
          checked={allChecked}
          onCheckedChange={(checked) => onCheckedItemsChange(items.map(() => checked === true))}
        />
        전체 동의하기
      </label>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="flex h-10 items-center justify-between border-b border-zinc-200 last:border-b-0"
          >
            <label className="body-regular flex cursor-pointer items-center gap-2 text-zinc-700">
              <Checkbox
                checked={checkedItems[index]}
                onCheckedChange={(checked) =>
                  onCheckedItemsChange(
                    checkedItems.map((value, itemIndex) =>
                      itemIndex === index ? checked === true : value,
                    ),
                  )
                }
              />
              {item.required ? <span className="text-error">필수</span> : null}
              {item.label}
            </label>
            {item.viewHref ? (
              <Link
                href={item.viewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="body-small shrink-0 text-zinc-700 underline"
              >
                보기
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
