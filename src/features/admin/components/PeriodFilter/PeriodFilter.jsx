import styles from "./PeriodFilter.module.css";

import { useWeekOptions } from "../../hooks/useWeekOptions";
import { CUSTOM_PERIOD, PERIOD_PRESETS } from "../../utils/periods";

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
        <>
          <label className={styles.field}>
            <span className={styles.label}>De</span>
            <input
              className={styles.dateInput}
              type="date"
              aria-label="Data inicial"
              value={selection.from}
              max={selection.to || undefined}
              onChange={(event) => onChange({ ...selection, from: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Até</span>
            <input
              className={styles.dateInput}
              type="date"
              aria-label="Data final"
              value={selection.to}
              min={selection.from || undefined}
              onChange={(event) => onChange({ ...selection, to: event.target.value })}
            />
          </label>
        </>
      )}
    </>
  );
}
