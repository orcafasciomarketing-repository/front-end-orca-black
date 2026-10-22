import styles from "./ErrorScreen.module.css";

const firstLine = (text) =>
  text
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);

export default function ErrorScreen({ error, location, componentStack, onRetry, className = "" }) {
  const component = firstLine(componentStack);

  return (
    <section className={`${styles.screen} ${className}`} role="alert">
      <h1 className={styles.title}>Ops, algo deu errado</h1>
      <p className={styles.message}>{error?.message ?? String(error)}</p>
      <dl className={styles.where}>
        <div>
          <dt>Local</dt>
          <dd>{location}</dd>
        </div>
        {component && (
          <div>
            <dt>Componente</dt>
            <dd>{component}</dd>
          </div>
        )}
      </dl>
      {(error?.stack || componentStack) && (
        <pre className={styles.stack}>{[error?.stack, componentStack].filter(Boolean).join("\n\nComponentes:")}</pre>
      )}
      {onRetry && (
        <button className={styles.retry} type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </section>
  );
}
