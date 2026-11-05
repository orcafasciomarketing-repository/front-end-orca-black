import styles from "./DateRangePicker.module.css";

import { useEffect, useRef, useState } from "react";

import {
  WEEKDAY_NAMES,
  addMonths,
  formatRange,
  longDayLabel,
  monthDays,
  monthLabel,
  monthOf,
  weekdayIndex,
} from "../../utils/dateRange";

export default function DateRangePicker({ label, start, end, onChange, today, defaultOpen = false, align = "right" }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewMonth, setViewMonth] = useState(monthOf(start || today));
  const [pendingStart, setPendingStart] = useState(null);
  const [hoverDay, setHoverDay] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event) => {
      if (!containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setPendingStart(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const open = () => {
    setViewMonth(monthOf(start || today));
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setPendingStart(null);
  };

  const pickDay = (day) => {
    if (!pendingStart) {
      setPendingStart(day);
      return;
    }

    const [first, last] = [pendingStart, day].sort();
    onChange({ start: first, end: last });
    close();
  };

  const previewEnd = pendingStart ? hoverDay || pendingStart : null;
  const [rangeStart, rangeEnd] = pendingStart ? [pendingStart, previewEnd].sort() : [start, end];

  const days = monthDays(viewMonth);
  const blanks = Array.from({ length: weekdayIndex(days[0]) });

  const dayClass = (day) =>
    [
      styles.day,
      day === today ? styles.today : "",
      rangeStart && day >= rangeStart && day <= rangeEnd ? styles.inRange : "",
      day === rangeStart || day === rangeEnd ? styles.edge : "",
    ].join(" ");

  return (
    <div className={styles.picker} ref={containerRef}>
      <button
        className={styles.trigger}
        type="button"
        aria-label={`${label}: ${start ? formatRange({ start, end }) : "escolher datas"}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {start ? formatRange({ start, end }) : "Escolher datas"}
      </button>

      {isOpen && (
        <div
          className={`${styles.popover} ${align === "left" ? styles.alignLeft : ""}`}
          role="dialog"
          aria-label={label}
          onKeyDown={(event) => event.key === "Escape" && close()}
        >
          <div className={styles.header}>
            <button
              className={styles.navButton}
              type="button"
              aria-label="Mês anterior"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            >
              ‹
            </button>
            <strong className={styles.month}>{monthLabel(viewMonth)}</strong>
            <button
              className={styles.navButton}
              type="button"
              aria-label="Próximo mês"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            >
              ›
            </button>
          </div>

          <div className={styles.grid} onPointerLeave={() => setHoverDay(null)}>
            {WEEKDAY_NAMES.map((weekday) => (
              <span key={weekday} className={styles.weekday} aria-hidden="true">
                {weekday}
              </span>
            ))}
            {blanks.map((_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {days.map((day) => (
              <button
                key={day}
                className={dayClass(day)}
                type="button"
                aria-label={longDayLabel(day)}
                aria-pressed={day === rangeStart || day === rangeEnd}
                onClick={() => pickDay(day)}
                onPointerEnter={() => setHoverDay(day)}
              >
                {Number(day.slice(8, 10))}
              </button>
            ))}
          </div>

          <p className={styles.hint} role="status">
            {pendingStart ? "Agora clique no dia final" : "Clique no dia inicial"}
          </p>
        </div>
      )}
    </div>
  );
}
