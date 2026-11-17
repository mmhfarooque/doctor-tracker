'use client';

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-control border border-line bg-white px-3 py-2 shadow-lift">
      <p className="text-xs text-muted">{p.full}</p>
      <p className="num text-sm font-semibold text-ink">{p.admissions} admitted</p>
      <p className="num text-sm text-recovering">{p.discharges} discharged</p>
    </div>
  );
}

/** Admissions (filled area) against discharges (line) per month. */
export default function AdmissionsChart({ series }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="admitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B6A57" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#1B6A57" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E7EBE9" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#8A949D', fontSize: 12 }} dy={8} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#8A949D', fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#B5D8CC', strokeWidth: 1 }} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="admissions"
            stroke="#155E4E"
            strokeWidth={2.25}
            fill="url(#admitFill)"
            activeDot={{ r: 5, fill: '#155E4E', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="discharges"
            stroke="#2B64C7"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, fill: '#2B64C7', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
