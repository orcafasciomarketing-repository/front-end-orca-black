import styles from "./MoneyInput.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { parseMoney } from "../../utils/goalMath";

const isEmpty = (value) => value === "" || value === null || value === undefined;

const toEditText = (value) => (isEmpty(value) ? "" : String(value).replace(".", ","));

export default function MoneyInput({ value, onChange, label, plain = false, invalid = false, className = "" }) {
  const [text, setText] = useState(null);
  const editing = text !== null;
  const shown = editing ? text : isEmpty(value) ? "" : formatCurrency(Number(value));

  return (
    <input
      className={[styles.input, plain && styles.plain, invalid && styles.invalid, className].filter(Boolean).join(" ")}
      type="text"
      inputMode="decimal"
      placeholder="R$ 0,00"
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={shown}
      onFocus={() => setText(toEditText(value))}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseMoney(event.target.value));
      }}
      onBlur={() => setText(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
