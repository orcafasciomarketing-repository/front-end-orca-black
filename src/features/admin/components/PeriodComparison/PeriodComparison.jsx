import styles from "./PeriodComparison.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useSalesComparison } from "../../hooks/useSalesComparison";
import { CHART_COLORS } from "../../utils/chartColors";
import { formatVariation } from "../../utils/chartScale";
import { COMPARISON_ROWS, comparisonPresets } from "../../utils/comparison";
import { formatRange } from "../../utils/dateRange";
import { todayKey } from "../../utils/periods";
import { variation } from "../../utils/salesInsights";
import { formatCsvNumber } from "../../utils/tableCsv";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import DateRangePicker from "../DateRangePicker/DateRangePicker";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

const CUSTOM = "custom";

const formatDayIndex = (day) => `Dia ${day}`;

function Difference({ a, b }) {
  const change = variation(a, b);

  if (change === null) {
    return <span className={styles.neutral}>{a > 0 ? "Novo" : "—"}</span>;
  }

  if (change === 0) {
    return <span className={styles.neutral}>Igual</span>;
  }

  const isUp = change > 0;

  return (
    <span className={isUp ? styles.up : styles.down}>
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span> {formatVariation(change)}
    </span>
  );
}

export default function PeriodComparison({ segment }) {
  const [today] = useState(() => todayKey());
  const presets = comparisonPresets(today);
  const [presetKey, setPresetKey] = useState("week");
  const [ranges, setRanges] = useState(() => {
    const preset = presets.find((item) => item.key === "week");
    return { a: preset.a, b: preset.b };
  });

  const comparison = useSalesComparison(ranges.a, ranges.b, segment);
  const title = "Comparar períodos";
  const labelA = formatRange(ranges.a);
  const labelB = formatRange(ranges.b);

  const choosePreset = (key) => {
    setPresetKey(key);
    const preset = presets.find((item) => item.key === key);
    if (preset) {
      setRanges({ a: preset.a, b: preset.b });
    }
  };

  const changeRange = (side, range) => {
    setPresetKey(CUSTOM);
    setRanges({ ...ranges, [side]: range });
  };

  const formatRow = (row, value) => (row.money ? formatCurrency(value) : value);
  const days = Array.from({ length: comparison.length }, (_, index) => String(index + 1));

  return (
    <ChartCard
      title={title}
      description="Compare dois períodos quaisquer, como uma quarta com a quarta da semana passada. Segue o filtro de setor."
      csvRows={[
        ["Indicador", `Período A (${labelA})`, `Período B (${labelB})`, "Diferença (%)"],
        ...COMPARISON_ROWS.map((row) => {
          const change = variation(comparison.a[row.key], comparison.b[row.key]);
          return [
            row.label,
            formatCsvNumber(comparison.a[row.key], row.money ? 2 : 0),
            formatCsvNumber(comparison.b[row.key], row.money ? 2 : 0),
            change === null ? "" : formatCsvNumber(change * 100, 1),
          ];
        }),
      ]}
      segment={segment}
    >
      <div className={styles.comparison}>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.label}>Atalho</span>
            <select
              className={styles.select}
              aria-label="Atalho de comparação"
              value={presetKey}
              onChange={(event) => choosePreset(event.target.value)}
            >
              {presets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
              <option value={CUSTOM}>Personalizado</option>
            </select>
          </label>
          <div className={styles.field}>
            <span className={styles.label}>
              <span className={styles.swatch} style={{ background: CHART_COLORS.blue }} />
              Período A
            </span>
            <DateRangePicker
              label="Período A"
              start={ranges.a.start}
              end={ranges.a.end}
              today={today}
              align="left"
              onChange={(range) => changeRange("a", range)}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>
              <span className={styles.swatch} style={{ background: CHART_COLORS.orange }} />
              Período B
            </span>
            <DateRangePicker
              label="Período B"
              start={ranges.b.start}
              end={ranges.b.end}
              today={today}
              align="left"
              onChange={(range) => changeRange("b", range)}
            />
          </div>
        </div>

        <div className={styles.body}>
          <table className={styles.table} aria-label="Comparação dos períodos">
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col">A · {labelA}</th>
                <th scope="col">B · {labelB}</th>
                <th scope="col">A vs B</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{formatRow(row, comparison.a[row.key])}</td>
                  <td>{formatRow(row, comparison.b[row.key])}</td>
                  <td>
                    <Difference a={comparison.a[row.key]} b={comparison.b[row.key]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {comparison.length > 1 && (
            <div className={styles.chart}>
              <p className={styles.chartTitle}>Valor acumulado, dia a dia de cada período</p>
              <TimeSeriesChart
                title="Valor acumulado dos dois períodos"
                days={days}
                series={[
                  { key: "a", label: `A · ${labelA}`, color: CHART_COLORS.blue, values: comparison.dailyA },
                  { key: "b", label: `B · ${labelB}`, color: CHART_COLORS.orange, values: comparison.dailyB },
                ]}
                formatValue={formatCurrency}
                formatLabel={formatDayIndex}
              />
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
