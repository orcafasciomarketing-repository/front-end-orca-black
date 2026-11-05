import styles from "./Heatmap.module.css";

import { useState } from "react";

import { HEAT_LEVELS, heatLevel } from "../../utils/chartColors";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_LABEL_EVERY = 3;

const formatHour = (hour) => `${String(hour).padStart(2, "0")}h`;

export default function Heatmap({ title, rows, cells, max, formatCell }) {
  const [active, setActive] = useState(null);
  const activeCell = active && cells[active.row][active.hour];

  return (
    <div className={styles.heatmap}>
      <div className={styles.scroller}>
        <div className={styles.grid} aria-hidden="true" onPointerLeave={() => setActive(null)}>
          <span />
          {HOURS.map((hour) => (
            <span key={hour} className={styles.hourLabel}>
              {hour % HOUR_LABEL_EVERY === 0 ? formatHour(hour) : ""}
            </span>
          ))}
          {rows.map((row, rowIndex) => [
            <span key={row} className={styles.rowLabel}>
              {row}
            </span>,
            ...HOURS.map((hour) => {
              const cell = cells[rowIndex][hour];
              const isActive = active?.row === rowIndex && active?.hour === hour;

              return (
                <span
                  key={`${row}-${hour}`}
                  className={`${styles.cell} ${styles[`level${heatLevel(cell.count, max)}`]} ${isActive ? styles.active : ""}`}
                  onPointerEnter={() => setActive({ row: rowIndex, hour })}
                />
              );
            }),
          ])}
        </div>
      </div>

      <div className={styles.footer}>
        <p className={styles.detail} role="status">
          {activeCell
            ? `${rows[active.row]}, ${formatHour(active.hour)}: ${formatCell(activeCell)}`
            : "Passe o mouse num quadrado para ver o detalhe"}
        </p>
        <div className={styles.scale} aria-hidden="true">
          <span>Menos</span>
          {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => (
            <span key={level} className={`${styles.cell} ${styles[`level${level}`]}`} />
          ))}
          <span>Mais</span>
        </div>
      </div>

      <div className={styles.srOnly}>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Hora</th>
              <th scope="col">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row, rowIndex) =>
              HOURS.filter((hour) => cells[rowIndex][hour].count > 0).map((hour) => (
                <tr key={`${row}-${hour}`}>
                  <th scope="row">{row}</th>
                  <td>{formatHour(hour)}</td>
                  <td>{formatCell(cells[rowIndex][hour])}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
