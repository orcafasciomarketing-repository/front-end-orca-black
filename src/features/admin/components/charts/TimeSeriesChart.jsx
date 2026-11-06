import styles from "./TimeSeriesChart.module.css";

import { useState } from "react";

import { useElementWidth } from "../../hooks/useElementWidth";
import { formatDay } from "../../utils/chartData";
import { formatCompactCurrency, niceTicks } from "../../utils/chartScale";

const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 72 };
const MIN_LABEL_SPACING = 56;
const MAX_COLUMN_WIDTH = 24;
const COLUMN_GAP = 2;
const COLUMN_RADIUS = 4;

function columnPath(x, y, width, height) {
  const radius = Math.min(COLUMN_RADIUS, width / 2, height);

  return [
    `M${x},${y + height}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${y + height}`,
    "Z",
  ].join(" ");
}

const hasValue = (value) => value !== null && value !== undefined;

const lastIndexWithValue = (values) => values.findLastIndex(hasValue);

function lineSegments(values, pointOf) {
  const segments = [[]];

  values.forEach((value, index) => {
    if (hasValue(value)) {
      segments.at(-1).push(pointOf(index, value));
    } else if (segments.at(-1).length) {
      segments.push([]);
    }
  });

  return segments.filter((segment) => segment.length);
}

export default function TimeSeriesChart({
  title,
  days,
  series,
  variant = "line",
  reference,
  formatValue,
  formatTick = formatCompactCurrency,
  formatLabel = formatDay,
  formatTitle = formatLabel,
  columnLabel = "Dia",
}) {
  const [containerRef, width] = useElementWidth(640);
  const [hoverIndex, setHoverIndex] = useState(null);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(...series.flatMap((item) => item.values.filter(hasValue)), reference?.value ?? 0);
  const ticks = niceTicks(maxValue);
  const yMax = ticks[ticks.length - 1];

  const isColumns = variant === "columns";
  const band = plotWidth / Math.max(days.length, 1);
  const xOf = (index) => {
    if (isColumns) {
      return MARGIN.left + band * index + band / 2;
    }

    return days.length === 1 ? MARGIN.left + plotWidth / 2 : MARGIN.left + (plotWidth / (days.length - 1)) * index;
  };
  const yOf = (value) => MARGIN.top + plotHeight - (value / yMax) * plotHeight;

  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(1, Math.floor(plotWidth / MIN_LABEL_SPACING))));
  const columnWidth = Math.max(
    2,
    Math.min(MAX_COLUMN_WIDTH, (band * 0.7 - COLUMN_GAP * (series.length - 1)) / series.length),
  );
  const groupWidth = columnWidth * series.length + COLUMN_GAP * (series.length - 1);

  const indexFromPointer = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width - MARGIN.left;
    const index = isColumns ? Math.floor(x / band) : Math.round(x / (plotWidth / Math.max(days.length - 1, 1)));

    return Math.min(Math.max(index, 0), days.length - 1);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setHoverIndex((current) =>
      Math.min(Math.max((current ?? (step > 0 ? -1 : days.length)) + step, 0), days.length - 1),
    );
  };

  const hoverX = hoverIndex === null ? 0 : xOf(hoverIndex);
  const tooltipOnLeft = hoverX > width * 0.6;

  return (
    <div className={styles.chart}>
      {series.length > 1 && (
        <ul className={styles.legend}>
          {series.map((item) => (
            <li key={item.key} className={styles.legendItem}>
              <span
                className={item.dashed ? styles.swatchDashed : styles.swatch}
                style={item.dashed ? { borderColor: item.color } : { background: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={containerRef} className={styles.plot}>
        <svg
          className={styles.svg}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${title}. Use as setas para ver cada dia.`}
          tabIndex={0}
          onPointerMove={(event) => setHoverIndex(indexFromPointer(event))}
          onPointerLeave={() => setHoverIndex(null)}
          onKeyDown={handleKeyDown}
          onBlur={() => setHoverIndex(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className={styles.grid} x1={MARGIN.left} x2={width - MARGIN.right} y1={yOf(tick)} y2={yOf(tick)} />
              <text
                className={styles.axisLabel}
                x={MARGIN.left - 8}
                y={yOf(tick)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {days.map(
            (day, index) =>
              index % labelEvery === 0 && (
                <text key={day} className={styles.axisLabel} x={xOf(index)} y={HEIGHT - 8} textAnchor="middle">
                  {formatLabel(day)}
                </text>
              ),
          )}

          {reference && (
            <g>
              <line
                className={styles.reference}
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yOf(reference.value)}
                y2={yOf(reference.value)}
              />
              <text
                className={styles.referenceLabel}
                x={width - MARGIN.right}
                y={yOf(reference.value) - 6}
                textAnchor="end"
              >
                {reference.label}
              </text>
            </g>
          )}

          {hoverIndex !== null && !isColumns && (
            <line className={styles.crosshair} x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />
          )}
          {hoverIndex !== null && isColumns && (
            <rect
              className={styles.hoverBand}
              x={MARGIN.left + band * hoverIndex}
              y={MARGIN.top}
              width={band}
              height={plotHeight}
            />
          )}

          {isColumns
            ? series.map((item, seriesIndex) =>
                item.values.map((value, index) => {
                  const height = (value / yMax) * plotHeight;
                  const x = xOf(index) - groupWidth / 2 + seriesIndex * (columnWidth + COLUMN_GAP);

                  return (
                    hasValue(value) &&
                    height > 0 && (
                      <path
                        key={`${item.key}-${days[index]}`}
                        d={columnPath(x, yOf(value), columnWidth, height)}
                        style={{ fill: item.color }}
                      />
                    )
                  );
                }),
              )
            : series.map((item) => {
                const segments = lineSegments(item.values, (index, value) => `${xOf(index)},${yOf(value)}`);
                const lastIndex = lastIndexWithValue(item.values);
                const hoverValue = hoverIndex === null ? null : item.values[hoverIndex];

                return (
                  <g key={item.key}>
                    {series.length === 1 && lastIndex >= 0 && (
                      <path
                        d={`M${xOf(0)},${yOf(0)} L${segments[0].join(" L")} L${xOf(lastIndex)},${yOf(0)} Z`}
                        style={{ fill: item.color }}
                        opacity={0.1}
                      />
                    )}
                    {segments.map((points) => (
                      <polyline
                        key={points[0]}
                        className={item.dashed ? styles.dashedLine : styles.line}
                        points={points.join(" ")}
                        style={{ stroke: item.color }}
                      />
                    ))}
                    {lastIndex >= 0 && hoverIndex === null && !item.dashed && (
                      <circle
                        className={styles.dot}
                        cx={xOf(lastIndex)}
                        cy={yOf(item.values[lastIndex])}
                        r={4}
                        style={{ fill: item.color }}
                      />
                    )}
                    {hasValue(hoverValue) && (
                      <circle
                        className={styles.dot}
                        cx={hoverX}
                        cy={yOf(hoverValue)}
                        r={4}
                        style={{ fill: item.color }}
                      />
                    )}
                  </g>
                );
              })}
        </svg>

        {hoverIndex !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: hoverX,
              transform: tooltipOnLeft ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
            role="status"
          >
            <strong className={styles.tooltipTitle}>{formatTitle(days[hoverIndex])}</strong>
            {series
              .filter((item) => hasValue(item.values[hoverIndex]))
              .map((item) => (
                <span key={item.key} className={styles.tooltipRow}>
                  <span className={styles.swatch} style={{ background: item.color }} />
                  <span className={styles.tooltipLabel}>{item.label}</span>
                  <strong>{formatValue(item.values[hoverIndex])}</strong>
                </span>
              ))}
          </div>
        )}
      </div>

      <div className={styles.srOnly}>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{columnLabel}</th>
              {series.map((item) => (
                <th key={item.key} scope="col">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={day}>
                <th scope="row">{formatTitle(day)}</th>
                {series.map((item) => (
                  <td key={item.key}>{hasValue(item.values[index]) ? formatValue(item.values[index]) : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
