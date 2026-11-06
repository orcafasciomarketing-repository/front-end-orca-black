import styles from "./Sparkline.module.css";

const WIDTH = 96;
const HEIGHT = 28;
const PADDING = 3;

export default function Sparkline({ values }) {
  const max = Math.max(...values, 0);
  const step = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0;
  const yOf = (value) => (max > 0 ? HEIGHT - PADDING - (value / max) * (HEIGHT - PADDING * 2) : HEIGHT - PADDING);
  const points = values.map((value, index) => `${PADDING + step * index},${yOf(value)}`);
  const last = values.length - 1;

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
    >
      <polyline className={styles.line} points={points.join(" ")} />
      {last >= 0 && <circle className={styles.dot} cx={PADDING + step * last} cy={yOf(values[last])} r={2.5} />}
    </svg>
  );
}
