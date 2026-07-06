"use client";

// 依存ライブラリなしの軽量SVGチャート（棒/折れ線）
export function BarChart({
  data,
  height = 160,
  format = (v: number) => v.toLocaleString(),
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 40));
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-slate-500">{format(d.value)}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400"
              style={{ height: h }}
              title={`${d.label}: ${format(d.value)}`}
            />
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
