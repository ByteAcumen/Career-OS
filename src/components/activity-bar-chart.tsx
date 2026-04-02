"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ActivityBarChart({
  data,
}: {
  data: Array<{
    dateKey: string;
    dsaCount: number;
    buildCount: number;
    appCount: number;
  }>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.max(Math.floor(entries[0]?.contentRect.width ?? 0), 0);
      setWidth(nextWidth);
    });

    observer.observe(element);
    setWidth(Math.max(Math.floor(element.getBoundingClientRect().width), 0));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[248px] w-full">
      {width > 24 ? (
        <BarChart
          width={width}
          height={248}
          data={data}
          margin={{ top: 10, right: 0, left: -26, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            vertical={false}
          />
          <XAxis
            dataKey="dateKey"
            tickFormatter={(value) => format(parseISO(`${value}T00:00:00`), "dd MMM")}
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "var(--paper-strong)",
              borderColor: "var(--line)",
              borderRadius: "12px",
              fontSize: "13px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            itemStyle={{ color: "var(--ink)" }}
            labelFormatter={(value) =>
              format(parseISO(`${value}T00:00:00`), "EEEE, dd MMM")
            }
          />
          <Bar
            dataKey="dsaCount"
            name="DSA"
            stackId="a"
            fill="#2dd4bf"
            radius={[0, 0, 4, 4]}
            maxBarSize={40}
          />
          <Bar dataKey="buildCount" name="Builds" stackId="a" fill="#0ea5e9" maxBarSize={40} />
          <Bar
            dataKey="appCount"
            name="Apps"
            stackId="a"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      ) : (
        <div className="flex h-full items-center justify-center rounded-[20px] border border-[var(--line)] bg-white/5 text-sm text-[var(--muted)]">
          Preparing chart...
        </div>
      )}
    </div>
  );
}
