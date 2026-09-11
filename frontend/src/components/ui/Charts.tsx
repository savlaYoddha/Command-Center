import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { HudLoading } from "@/components/hud/motion";
import { ErrorState } from "./Feedback";
import { EmptyState } from "@/components/hud/EmptyState";
import { formatInr, formatPercent, niceMax, type ChartPoint, type ComparisonPoint } from "./chartUtils";
import { useChartZoom, type ChartZoomLevel } from "./useChartZoom";
type TooltipState = {
  xPct: number;
  yPct: number;
  title: string;
  lines: string[];
};

type BaseChartProps = {
  width?: number;
  height?: number;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  valueFormatter?: (value: number) => string;
  zoomLevels?: ChartZoomLevel[];
  defaultZoomLevel?: string;
};

const CHART_VIEW_W = 520;
const CHART_VIEW_H = 280;
const PAD_LEFT = 52;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 40;

function bandCenterX(layout: ReturnType<typeof useChartLayout>, index: number, count: number) {
  const slotW = layout.plotW / Math.max(count, 1);
  return layout.padLeft + slotW * index + slotW / 2;
}

function seriesX(layout: ReturnType<typeof useChartLayout>, index: number, count: number) {
  return layout.padLeft + (index / Math.max(count - 1, 1)) * layout.plotW;
}

function ChartZoomBadge({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute top-2 right-2 z-20 border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-2 py-1">
      <div className="font-display text-[9px] tracking-[0.16em] text-[color:var(--accent)] uppercase">{label}</div>
      <div className="mt-0.5 text-[9px] text-text-muted">Pinch or scroll</div>
    </div>
  );
}

function ChartPlotArea({
  width,
  height,
  tooltip,
  children,
  className = "",
  surfaceRef,
  zoomLabel,
}: {
  width: number;
  height: number;
  tooltip: TooltipState | null;
  children: ReactNode;
  className?: string;
  surfaceRef?: RefObject<HTMLDivElement>;
  zoomLabel?: string;
}) {
  return (
    <div
      ref={surfaceRef}
      className={`relative h-[var(--cc-chart-height)] w-full touch-none select-none ${className}`}
    >
      {zoomLabel ? <ChartZoomBadge label={zoomLabel} /> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        {children}
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
function ChartShell({
  loading,
  error,
  empty,
  emptyTitle = "NO TELEMETRY",
  emptyBody = "No data available for the selected period.",
  children,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <HudLoading label="LOADING TELEMETRY..." />
      </div>
    );
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  if (empty) {
    return (
      <div className="min-h-[12rem]">
        <EmptyState kicker="Telemetry" title={emptyTitle} body={emptyBody} />
      </div>
    );
  }
  return <>{children}</>;
}

function clampTooltip(tooltip: TooltipState): TooltipState & { flip: boolean } {
  const flip = tooltip.yPct < 24;
  return {
    ...tooltip,
    xPct: Math.min(90, Math.max(10, tooltip.xPct)),
    yPct: Math.min(88, Math.max(12, tooltip.yPct)),
    flip,
  };
}

function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  const t = clampTooltip(tooltip);
  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[14rem] border border-[color:var(--accent)] bg-[color:var(--surface-elevated)] px-3 py-2 shadow-hud hud-fade-in"
      style={{
        left: `${t.xPct}%`,
        top: `${t.yPct}%`,
        transform: t.flip ? "translate(-50%, 12px)" : "translate(-50%, calc(-100% - 12px))",
      }}
      role="tooltip"
    >
      <div className="font-display text-[9px] tracking-[0.18em] text-[color:var(--accent)] uppercase">{tooltip.title}</div>
      {tooltip.lines.map((line) => (
        <div key={line} className="mt-1 text-xs text-text-primary">
          {line}
        </div>
      ))}
    </div>
  );
}

function useChartLayout(width: number, height: number) {
  return useMemo(
    () => ({
      width,
      height,
      plotW: width - PAD_LEFT - PAD_RIGHT,
      plotH: height - PAD_TOP - PAD_BOTTOM,
      padLeft: PAD_LEFT,
      padTop: PAD_TOP,
      padBottom: PAD_BOTTOM,
    }),
    [width, height],
  );
}

function GridAndAxes({
  ticks,
  labels,
  layout,
  formatter,
  distribution = "series",
}: {
  ticks: number[];
  labels: string[];
  layout: ReturnType<typeof useChartLayout>;
  formatter: (v: number) => string;
  distribution?: "series" | "bands";
}) {
  const max = ticks[ticks.length - 1] ?? 1;
  return (
    <>
      {ticks.map((tick) => {
        const y = layout.padTop + layout.plotH - (tick / max) * layout.plotH;
        return (
          <g key={tick}>
            <line x1={layout.padLeft} y1={y} x2={layout.width - PAD_RIGHT} y2={y} stroke="var(--border)" strokeOpacity="0.45" />
            <text x={layout.padLeft - 6} y={y + 3} textAnchor="end" className="fill-[var(--text-muted)] text-[9px]">
              {formatter(tick)}
            </text>
          </g>
        );
      })}
      {labels.map((label, index) => {
        const x =
          distribution === "bands"
            ? bandCenterX(layout, index, labels.length)
            : seriesX(layout, index, labels.length);
        const show = labels.length <= 8 || index % Math.ceil(labels.length / 8) === 0 || index === labels.length - 1;
        if (!show) return null;
        return (
          <text key={`${label}-${index}`} x={x} y={layout.height - 10} textAnchor="middle" className="fill-[var(--text-secondary)] text-[10px] font-medium">
            {label}
          </text>
        );
      })}
    </>
  );
}
export function LineChart({
  data,
  width = CHART_VIEW_W,
  height = CHART_VIEW_H,
  loading,
  error,
  emptyTitle,
  emptyBody,
  valueFormatter = (v) => formatInr(v, true),
  zoomLevels,
  defaultZoomLevel = "months",
}: BaseChartProps & { data: ChartPoint[] }) {
  const zoom = useChartZoom({
    levels: zoomLevels?.length ? zoomLevels : [{ id: "static", label: "", data }],
    defaultLevelId: defaultZoomLevel,
  });
  const chartData = zoomLevels?.length ? zoom.data : data;
  const layout = useChartLayout(width, height);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const max = niceMax(chartData.map((p) => p.value));
  const ticks = useMemo(() => [0, max * 0.33, max * 0.66, max].map(Math.round), [max]);
  const points = chartData.map((point, index) => {
    const x = seriesX(layout, index, chartData.length);
    const y = layout.padTop + layout.plotH - (point.value / max) * layout.plotH;
    return { ...point, x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <ChartShell loading={loading} error={error} empty={chartData.length === 0} emptyTitle={emptyTitle} emptyBody={emptyBody}>
      <ChartPlotArea
        width={layout.width}
        height={layout.height}
        tooltip={tooltip}
        surfaceRef={zoomLevels?.length ? zoom.surfaceRef : undefined}
        zoomLabel={zoomLevels?.length ? zoom.level.label : undefined}
      >
        <GridAndAxes ticks={ticks} labels={chartData.map((p) => p.label)} layout={layout} formatter={valueFormatter} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {points.map((p) => (
          <circle
            key={`${p.label}-${zoom.level.id}`}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="var(--accent)"
            className="cursor-pointer"
            onMouseEnter={() =>
              setTooltip({
                xPct: (p.x / layout.width) * 100,
                yPct: (p.y / layout.height) * 100,
                title: p.label,
                lines: [`Spending: ${formatInr(p.value)}`],
              })
            }
            onMouseLeave={() => setTooltip(null)}
            onFocus={() =>
              setTooltip({
                xPct: (p.x / layout.width) * 100,
                yPct: (p.y / layout.height) * 100,
                title: p.label,
                lines: [`Spending: ${formatInr(p.value)}`],
              })
            }
            onBlur={() => setTooltip(null)}
            tabIndex={0}
            role="button"
            aria-label={`${p.label}: ${formatInr(p.value)}`}
          />
        ))}
      </ChartPlotArea>
    </ChartShell>
  );
}
export function ComparisonAreaChart({
  data,
  width = CHART_VIEW_W,
  height = CHART_VIEW_H,
  loading,
  error,
  emptyTitle,
  emptyBody,
}: BaseChartProps & { data: ComparisonPoint[] }) {
  const layout = useChartLayout(width, height);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const max = niceMax(data.flatMap((p) => [p.income, p.expenses]));
  const ticks = useMemo(() => [0, max * 0.33, max * 0.66, max].map(Math.round), [max]);

  const incomePoints = data.map((point, index) => {
    const x = layout.padLeft + (index / Math.max(data.length - 1, 1)) * layout.plotW;
    const y = layout.padTop + layout.plotH - (point.income / max) * layout.plotH;
    return { ...point, x, y };
  });
  const expensePoints = data.map((point, index) => {
    const x = layout.padLeft + (index / Math.max(data.length - 1, 1)) * layout.plotW;
    const y = layout.padTop + layout.plotH - (point.expenses / max) * layout.plotH;
    return { x, y, label: point.label, value: point.expenses };
  });

  const incomeLine = incomePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const expenseLine = expensePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const incomeArea = `${incomeLine} L${incomePoints.at(-1)?.x ?? layout.padLeft},${layout.padTop + layout.plotH} L${incomePoints[0]?.x ?? layout.padLeft},${layout.padTop + layout.plotH} Z`;
  const expenseArea = `${expenseLine} L${expensePoints.at(-1)?.x ?? layout.padLeft},${layout.padTop + layout.plotH} L${expensePoints[0]?.x ?? layout.padLeft},${layout.padTop + layout.plotH} Z`;

  return (
    <ChartShell loading={loading} error={error} empty={data.length === 0} emptyTitle={emptyTitle} emptyBody={emptyBody}>
      <div className="flex w-full flex-col">
        <div className="mb-2 flex shrink-0 flex-wrap gap-4 border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2">
          <span className="inline-flex items-center gap-2 font-display text-[10px] tracking-[0.14em] uppercase text-text-primary">
            <span className="h-2.5 w-2.5 bg-[color:var(--success)] shadow-[0_0_6px_color-mix(in_srgb,var(--success)_50%,transparent)]" />
            Income
          </span>
          <span className="inline-flex items-center gap-2 font-display text-[10px] tracking-[0.14em] uppercase text-text-primary">
            <span className="h-2.5 w-2.5 bg-[color:var(--accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--accent)_50%,transparent)]" />
            Expenses
          </span>
        </div>
        <ChartPlotArea width={layout.width} height={layout.height} tooltip={tooltip}>
          <GridAndAxes ticks={ticks} labels={data.map((p) => p.label)} layout={layout} formatter={(v) => formatInr(v, true)} />
          <path d={incomeArea} fill="color-mix(in srgb, var(--success) 18%, transparent)" />
          <path d={expenseArea} fill="color-mix(in srgb, var(--accent) 18%, transparent)" />
          <path d={incomeLine} fill="none" stroke="var(--success)" strokeWidth="2.5" />
          <path d={expenseLine} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          {data.map((point, index) => {
            const x = layout.padLeft + (index / Math.max(data.length - 1, 1)) * layout.plotW;
            const y = layout.padTop + layout.plotH / 2;
            return (
              <rect
                key={point.label}
                x={x - 12}
                y={layout.padTop}
                width={24}
                height={layout.plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTooltip({
                    xPct: (x / layout.width) * 100,
                    yPct: (y / layout.height) * 100,
                    title: point.label,
                    lines: [`Income: ${formatInr(point.income)}`, `Expenses: ${formatInr(point.expenses)}`],
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </ChartPlotArea>
      </div>
    </ChartShell>
  );
}

export function AreaChart(props: BaseChartProps & { data: ChartPoint[] }) {
  return <LineChart {...props} />;
}

export function BarChart({
  data,
  width = CHART_VIEW_W,
  height = CHART_VIEW_H,
  loading,
  error,
  emptyTitle,
  emptyBody,
  valueFormatter = (v) => formatInr(v, true),
  zoomLevels,
  defaultZoomLevel = "months",
}: BaseChartProps & { data: ChartPoint[] }) {
  const zoom = useChartZoom({
    levels: zoomLevels?.length ? zoomLevels : [{ id: "static", label: "", data }],
    defaultLevelId: defaultZoomLevel,
  });
  const chartData = zoomLevels?.length ? zoom.data : data;
  const layout = useChartLayout(width, height);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const max = niceMax(chartData.map((p) => p.value));
  const ticks = useMemo(() => [0, max * 0.33, max * 0.66, max].map(Math.round), [max]);
  const slotW = layout.plotW / Math.max(chartData.length, 1);
  const barW = slotW * 0.62;

  return (
    <ChartShell loading={loading} error={error} empty={chartData.length === 0} emptyTitle={emptyTitle} emptyBody={emptyBody}>
      <ChartPlotArea
        width={layout.width}
        height={layout.height}
        tooltip={tooltip}
        surfaceRef={zoomLevels?.length ? zoom.surfaceRef : undefined}
        zoomLabel={zoomLevels?.length ? zoom.level.label : undefined}
      >
        <GridAndAxes
          ticks={ticks}
          labels={chartData.map((p) => p.label)}
          layout={layout}
          formatter={valueFormatter}
          distribution="bands"
        />
        {chartData.map((point, index) => {
          const h = (point.value / max) * layout.plotH;
          const x = bandCenterX(layout, index, chartData.length) - barW / 2;
          const y = layout.padTop + layout.plotH - h;
          return (
            <rect
              key={`${point.label}-${zoom.level.id}`}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill="var(--accent)"
              className="cursor-pointer"
              onMouseEnter={() =>
                setTooltip({
                  xPct: (bandCenterX(layout, index, chartData.length) / layout.width) * 100,
                  yPct: (y / layout.height) * 100,
                  title: point.label,
                  lines: [formatInr(point.value), formatPercent(point.value, chartData.reduce((s, d) => s + d.value, 0))],
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </ChartPlotArea>
    </ChartShell>
  );
}
export function DonutChart({
  data,
  size = 360,
  loading,
  error,
  emptyTitle,
  emptyBody,
  formatValue = formatInr,
}: BaseChartProps & { data: ChartPoint[]; size?: number; formatValue?: (value: number) => string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const peak = data.length ? Math.max(...data.map((item) => item.value)) : 0;
  const colors = ["var(--accent)", "var(--accent-secondary)", "var(--success)", "var(--warning)", "var(--danger)", "var(--info)"];
  let angle = -90;
  const slices = data.map((item, index) => {
    const portion = (item.value / total) * 360;
    const start = angle;
    const mid = start + portion / 2;
    angle += portion;
    const large = portion > 180 ? 1 : 0;
    const r = size / 2 - 12;
    const cx = size / 2;
    const cy = size / 2;
    const x1 = cx + r * Math.cos((Math.PI * start) / 180);
    const y1 = cy + r * Math.sin((Math.PI * start) / 180);
    const x2 = cx + r * Math.cos((Math.PI * angle) / 180);
    const y2 = cy + r * Math.sin((Math.PI * angle) / 180);
    const tipX = cx + (r * 0.72) * Math.cos((Math.PI * mid) / 180);
    const tipY = cy + (r * 0.72) * Math.sin((Math.PI * mid) / 180);
    return {
      item,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
      tipX,
      tipY,
    };
  });

  return (
    <ChartShell loading={loading} error={error} empty={data.length === 0} emptyTitle={emptyTitle} emptyBody={emptyBody}>
      <div className="flex w-full flex-col">
        <div className="relative h-[var(--cc-chart-height)] w-full">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Donut chart">
            {slices.map((slice) => (
              <path
                key={slice.item.label}
                d={slice.d}
                fill={slice.color}
                className="cursor-pointer transition-opacity duration-[var(--anim)] hover:opacity-90"
                onMouseEnter={() =>
                  setTooltip({
                    xPct: (slice.tipX / size) * 100,
                    yPct: (slice.tipY / size) * 100,
                    title: slice.item.label,
                    lines: [formatValue(slice.item.value), formatPercent(slice.item.value, total)],
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
            <circle cx={size / 2} cy={size / 2} r={size / 4.2} fill="var(--bg-primary)" />
          </svg>
          <ChartTooltip tooltip={tooltip} />
        </div>
        <div className="mt-2 shrink-0 text-center">
          <div className="font-display text-[10px] tracking-[0.18em] text-text-muted uppercase">Peak</div>
          <div className="text-lg font-medium text-text-primary">{formatValue(peak)}</div>
        </div>
        <div className="mt-3 grid w-full grid-cols-1 gap-2 px-1 sm:grid-cols-2">
          {data.map((item, index) => (
            <span key={item.label} className="inline-flex items-center gap-2 font-display text-[11px] tracking-[0.14em] uppercase text-text-primary">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: colors[index % colors.length] }} />
              {item.label}
              <span className="text-text-muted">{formatValue(item.value)}</span>
            </span>
          ))}
        </div>
      </div>
    </ChartShell>
  );
}

export function ChartCard({
  title,
  description,
  filters,
  footer,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  filters?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-[color:var(--border)] bg-[color:var(--surface)] p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">{title}</div>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {filters}
      </div>
      <div className="w-full overflow-visible">{children}</div>
      {footer ? <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-xs text-text-secondary">{footer}</div> : null}
    </div>
  );
}
