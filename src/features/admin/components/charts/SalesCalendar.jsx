import styles from "./SalesCalendar.module.css";

import { useState } from "react";

import { HEAT_LEVELS, heatLevel } from "../../utils/chartColors";

const formatDayMonth = (dayKey) => `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}`;

export default function SalesCalendar({ title, weekdays, calendar, formatDetail }) {
  const [activeDay, setActiveDay] = useState(null);
  const { weeks, weekdayTotals, max } = calendar;
  const weekdayMax = Math.max(...weekdayTotals.map((total) => total.count));

  return (
    <div className={styles.calendar}>
      <div className={styles.scroller}>
        <table className={styles.table} onPointerLeave={() => setActiveDay(null)}>
          <caption className={styles.srOnly}>{title}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.corner}>
                Semana
              </th>
              {weekdays.map((weekday) => (
                <th key={weekday} scope="col" className={styles.weekday}>
                  {weekday}
                </th>
              ))}
              <th scope="col" className={styles.weekday}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(({ week, cells, total }) => (
              <tr key={week}>
                <th scope="row" className={styles.weekLabel}>
                  {formatDayMonth(week)}
                </th>
                {cells.map((cell, index) =>
                  cell.inRange ? (
                    <td
                      key={cell.day}
                      className={`${styles.day} ${styles[`level${heatLevel(cell.count, max)}`]} ${
                        activeDay?.day === cell.day ? styles.active : ""
                      }`}
                      aria-label={`${weekdays[index]}, ${formatDayMonth(cell.day)}: ${formatDetail(cell)}`}
                      onPointerEnter={() => setActiveDay({ ...cell, weekday: weekdays[index] })}
                    >
                      <span className={styles.dayNumber}>{cell.day.slice(8, 10)}</span>
                      {cell.count > 0 && <span className={styles.dayCount}>{cell.count}</span>}
                    </td>
                  ) : (
                    <td key={cell.day} className={styles.outside} aria-hidden="true" />
                  ),
                )}
                <td className={styles.total}>{total.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className={styles.weekLabel}>
                Total
              </th>
              {weekdayTotals.map((total, index) => (
                <td
                  key={weekdays[index]}
                  className={`${styles.total} ${total.count > 0 && total.count === weekdayMax ? styles.best : ""}`}
                >
                  {total.count}
                </td>
              ))}
              <td className={styles.total}>{weekdayTotals.reduce((sum, total) => sum + total.count, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.footer}>
        <p className={styles.detail} role="status">
          {activeDay
            ? `${activeDay.weekday}, ${formatDayMonth(activeDay.day)}: ${formatDetail(activeDay)}`
            : "Passe o mouse num dia para ver o valor vendido"}
        </p>
        <div className={styles.scale} aria-hidden="true">
          <span>Menos vendas</span>
          {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => (
            <span key={level} className={`${styles.swatch} ${styles[`level${level}`]}`} />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
