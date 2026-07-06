"use client";

import { Star } from "lucide-react";

interface Props {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  className?: string;
}

// 表示専用（onChangeなし）／入力用（onChangeあり）の両対応。
export default function Stars({ value, size = 16, onChange, className = "" }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {stars.map((s) => {
        const filled = s <= Math.round(value);
        const star = (
          <Star
            className={filled ? "fill-amber-400 text-amber-400" : "fill-none text-slate-300"}
            style={{ width: size, height: size }}
          />
        );
        return onChange ? (
          <button key={s} type="button" onClick={() => onChange(s)} aria-label={`${s}つ星`}>
            {star}
          </button>
        ) : (
          <span key={s}>{star}</span>
        );
      })}
    </div>
  );
}
