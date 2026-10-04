"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type DailyPoint = { date: string; label: string; conversations: number; leads: number };

// Categorical slots 1 & 2 of the validated reference palette (blue, orange).
const SERIES = [
  { key: "conversations", name: "Conversations", color: "#2a78d6" },
  { key: "leads", name: "Leads", color: "#eb6834" },
] as const;

export function ActivityChart({ data }: { data: DailyPoint[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-zinc-600">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="#f0f0ef" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              tick={{ fontSize: 11, fill: "#71717a" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#71717a" }}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "#f4f4f5" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium text-zinc-900">{label}</p>
                    {SERIES.map((s) => (
                      <p key={s.key} className="flex items-center gap-2 text-zinc-600">
                        <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
                        {s.name}
                        <span className="ml-auto pl-4 font-medium tabular-nums text-zinc-900">
                          {payload.find((p) => p.dataKey === s.key)?.value ?? 0}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={14} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
