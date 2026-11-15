type Point = { label: string; a: number; b?: number };

/** Grafik batang grup sederhana: dua seri, sumbu Y diskalakan ke nilai maksimum */
export function BarChart({
  points,
  labelA,
  labelB,
  height = 168,
}: {
  points: Point[];
  labelA: string;
  labelB?: string;
  height?: number;
}) {
  const w = 620;
  const padL = 8;
  const padB = 22;
  const plotH = height - padB;
  const max = Math.max(1, ...points.map((p) => Math.max(p.a, p.b ?? 0)));
  const groupW = (w - padL * 2) / Math.max(1, points.length);
  const barW = labelB ? Math.min(18, groupW * 0.32) : Math.min(24, groupW * 0.5);

  return (
    <figure>
      <svg className="chart" viewBox={`0 0 ${w} ${height}`} role="img" aria-label={`${labelA} per periode`}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            className="chart-grid"
            x1={padL}
            x2={w - padL}
            y1={plotH - plotH * t}
            y2={plotH - plotH * t}
          />
        ))}
        {points.map((p, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const ha = Math.max(1, (p.a / max) * (plotH - 4));
          return (
            <g key={`${p.label}-${i}`}>
              <rect
                x={cx - (labelB ? barW + 2 : barW / 2)}
                y={plotH - ha}
                width={barW}
                height={ha}
                rx={2}
                fill="var(--signal)"
              />
              {labelB ? (
                <rect
                  x={cx + 2}
                  y={plotH - Math.max(1, ((p.b ?? 0) / max) * (plotH - 4))}
                  width={barW}
                  height={Math.max(1, ((p.b ?? 0) / max) * (plotH - 4))}
                  rx={2}
                  fill="var(--amber)"
                />
              ) : null}
              <text className="chart-label" x={cx} y={height - 6} textAnchor="middle">
                {p.label}
              </text>
            </g>
          );
        })}
        <line className="chart-grid" x1={padL} x2={w - padL} y1={plotH} y2={plotH} />
      </svg>
      <figcaption className="chart-legend">
        <span>
          <span className="swatch swatch-signal" />
          {labelA}
        </span>
        {labelB ? (
          <span>
            <span className="swatch swatch-amber" />
            {labelB}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
