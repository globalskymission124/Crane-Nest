"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface CounterProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

export default function Counter({ icon, label, value, min = 0, max = 9, onChange }: CounterProps) {
  const { t } = useTranslation();
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{icon}</span>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          aria-label={t.counter.decrease(label)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition active:scale-95 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-200"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>

        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          aria-label={t.counter.increase(label)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-600 text-brand-600 transition active:scale-95 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
