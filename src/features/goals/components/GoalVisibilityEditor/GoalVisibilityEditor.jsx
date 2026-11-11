import styles from "./GoalVisibilityEditor.module.css";

import { useState } from "react";

import { getGoalErrorMessage } from "../../api/goalsApi";
import {
  toVisibility,
  VENDOR_TIERS,
  VENDOR_WIDGETS,
} from "../../utils/goalVisibility";

export default function GoalVisibilityEditor({
  title,
  visibility,
  mutation,
  onSave,
  onCancel,
}) {
  const [draft, setDraft] = useState(() => toVisibility(visibility));

  const toggleOpen = () => {
    mutation.reset();
    setDraft((previous) => ({ ...previous, open: !previous.open }));
  };

  const toggleItem = (key) => {
    mutation.reset();
    setDraft((previous) => ({
      ...previous,
      hidden: previous.hidden.includes(key)
        ? previous.hidden.filter((item) => item !== key)
        : [...previous.hidden, key],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(toVisibility(draft));
  };

  return (
    <form className={styles.editor} onSubmit={handleSubmit} aria-label={title}>
      <label className={styles.openToggle}>
        <input type="checkbox" checked={draft.open} onChange={toggleOpen} />
        <span>
          <strong>Mês liberado para os vendedores</strong>
          <small className={styles.hint}>
            Desmarcado, o vendedor vê só o aviso de que as metas ainda não foram
            liberadas
          </small>
        </span>
      </label>

      <div className={styles.groups}>
        <ItemGroup
          legend="Faixas"
          description="Faixa escondida some de todos os widgets"
          items={VENDOR_TIERS}
          hidden={draft.hidden}
          disabled={!draft.open}
          onToggle={toggleItem}
        />
        <ItemGroup
          legend="Widgets"
          description="O que aparece na tela Minhas metas"
          items={VENDOR_WIDGETS}
          hidden={draft.hidden}
          disabled={!draft.open}
          onToggle={toggleItem}
        />
      </div>

      {mutation.isError && (
        <p className={styles.error}>
          Não foi possível salvar: {getGoalErrorMessage(mutation.error)}
        </p>
      )}
      {mutation.isSuccess && <p className={styles.success}>Salvo</p>}

      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onCancel}
        >
          Fechar
        </button>
      </div>
    </form>
  );
}

function ItemGroup({ legend, description, items, hidden, disabled, onToggle }) {
  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>
      <p className={styles.hint}>{description}</p>
      {items.map((item) => (
        <label key={item.key} className={styles.item}>
          <input
            type="checkbox"
            checked={!hidden.includes(item.key)}
            onChange={() => onToggle(item.key)}
          />
          <span>
            {item.label}
            {item.hint && <small className={styles.hint}>{item.hint}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
