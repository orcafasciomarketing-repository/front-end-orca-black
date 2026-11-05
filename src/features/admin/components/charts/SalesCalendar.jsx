import styles from "./SalesCalendar.module.css";

import { useState } from "react";

import { HEAT_LEVELS, heatLevel } from "../../utils/chartColors";
import { monthLabel, shortDay, weekdayName } from "../../utils/dateRange";

function dayClass(cell, max, activeDay) {
  if (cell.future) {
    return `${styles.day} ${styles.future}`;
  }

  if (!cell.inPeriod) {
    return `${styles.day} ${styles.outside}`;
  }

  return `${styles.day} ${styles[`level${heatLevel(cell.count, max)}`]} ${activeDay?.day === cell.day ? styles.active : ""}`;
}

function dayLabel(cell, formatDetail) {
  const date = `${weekdayName(cell.day)}, ${shortDay(cell.day)}`;

  if (cell.future) {
    return `${date}: ainda não chegou`;
  }

  return cell.inPeriod ? `${date}: ${formatDetail(cell)}` : `${date}: fora do período`;
}

function MonthTable({ month, weekdays, max, activeDay, onHover, formatDetail }) {
  const weekdayMax = Math.max(...month.weekdayTotals.map((total) => total.count));

  return (
    <table className={styles.table}>
      <caption className={styles.month}>{monthLabel(month.month)}</caption>
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
        {month.weeks.map(({ week, cells, total }) => (
          <tr key={week}>
            <th scope="row" className={styles.weekLabel}>
              {shortDay(week)}
            </th>
            {cells.map((cell) =>
              cell.inMonth ? (
                <td
                  key={cell.day}
                  className={dayClass(cell, max, activeDay)}
                  aria-label={dayLabel(cell, formatDetail)}
                  onPointerEnter={() => onHover(cell)}
                >
                  <span className={styles.dayNumber}>{cell.day.slice(8, 10)}</span>
                  {cell.count > 0 && <span className={styles.dayCount}>{cell.count}</span>}
                </td>
              ) : (
                <td key={cell.day} className={styles.blank} aria-hidden="true" />
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
          {month.weekdayTotals.map((total, index) => (
            <td
              key={weekdays[index]}
              className={`${styles.total} ${total.count > 0 && total.count === weekdayMax ? styles.best : ""}`}
            >
              {total.count}
            </td>
          ))}
          <td className={styles.total}>{month.total.count}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function SalesCalendar({ weekdays, calendar, formatDetail }) {
  const [activeDay, setActiveDay] = useState(null);

  return (
    <div className={styles.calendar}>
      <div className={styles.scroller} onPointerLeave={() => setActiveDay(null)}>
        {calendar.months.map((month) => (
          <MonthTable
            key={month.month}
            month={month}
            weekdays={weekdays}
            max={calendar.max}
            activeDay={activeDay}
            onHover={setActiveDay}
            formatDetail={formatDetail}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.detail} role="status">
          {activeDay ? dayLabel(activeDay, formatDetail) : "Passe o mouse num dia para ver o valor vendido"}
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
