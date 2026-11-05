import styles from "./PeriodFilter.module.css";

import { useWeekOptions } from "../../hooks/useWeekOptions";
import { CUSTOM_PERIOD, PERIOD_PRESETS, todayKey } from "../../utils/periods";
import DateRangePicker from "../DateRangePicker/DateRangePicker";

export default function PeriodFilter({ selection, onChange, ariaLabel }) {
  const { weeks } = useWeekOptions();
  const isCustom = selection.value === CUSTOM_PERIOD;

  return (
    <>
      <label className={styles.field}>
        <span className={styles.label}>Período</span>
        <select
          className={styles.select}
          aria-label={ariaLabel}
          value={selection.value}
          onChange={(event) => onChange({ ...selection, value: event.target.value })}
        >
          <option value="">Todo o período</option>
          <optgroup label="Atalhos">
            {PERIOD_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Semanas">
            {weeks.map((week) => (
              <option key={week.key} value={week.key}>
                {week.label}
              </option>
            ))}
          </optgroup>
          <option value={CUSTOM_PERIOD}>Período específico...</option>
        </select>
      </label>
      {isCustom && (
        <div className={styles.field}>
          <span className={styles.label}>Datas</span>
          <DateRangePicker
            label="Escolher período"
            start={selection.from}
            end={selection.to}
            today={todayKey()}
            defaultOpen={!selection.from}
            onChange={({ start, end }) => onChange({ ...selection, from: start, to: end })}
          />
        </div>
      )}
    </>
  );
}
