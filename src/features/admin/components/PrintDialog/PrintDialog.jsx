import styles from "./PrintDialog.module.css";

import { useEffect, useRef, useState } from "react";

export default function PrintDialog({ items, onCancel, onPrint }) {
  const [selected, setSelected] = useState(() => new Set(items));
  const selectAllRef = useRef(null);

  const allSelected = selected.size === items.length;
  const noneSelected = selected.size === 0;

  useEffect(() => {
    selectAllRef.current.indeterminate = !allSelected && !noneSelected;
  }, [allSelected, noneSelected]);

  useEffect(() => {
    selectAllRef.current.focus();
  }, []);

  const toggle = (item) => {
    const next = new Set(selected);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setSelected(next);
  };

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items));

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <h2 id="print-dialog-title" className={styles.title}>
            Gerar relatório em PDF
          </h2>
          <p className={styles.description}>
            Escolha o que entra no relatório. Na janela de impressão, selecione "Salvar como PDF".
          </p>
        </header>

        <label className={`${styles.option} ${styles.selectAll}`}>
          <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleAll} />
          Selecionar todos
          <span className={styles.counter}>
            {selected.size} de {items.length}
          </span>
        </label>

        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item}>
              <label className={styles.option}>
                <input type="checkbox" checked={selected.has(item)} onChange={() => toggle(item)} />
                {item}
              </label>
            </li>
          ))}
        </ul>

        <footer className={styles.footer}>
          <button className={styles.cancelButton} type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={styles.printButton}
            type="button"
            disabled={noneSelected}
            onClick={() => onPrint(items.filter((item) => selected.has(item)))}
          >
            Gerar PDF
          </button>
        </footer>
      </div>
    </div>
  );
}
