"use client";

import { Checkbox } from "@/components/ui/checkbox";

export interface AgreementItem {
  label: string;
  required?: boolean;
}

interface AgreementListProps {
  items: readonly AgreementItem[];
  checkedItems: readonly boolean[];
  onCheckedItemsChange: (checkedItems: boolean[]) => void;
  onView?: (index: number) => void;
}

export function AgreementList({
  items,
  checkedItems,
  onCheckedItemsChange,
  onView,
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
            <button
              type="button"
              onClick={() => onView?.(index)}
              className="body-small text-zinc-700 underline"
            >
              보기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
