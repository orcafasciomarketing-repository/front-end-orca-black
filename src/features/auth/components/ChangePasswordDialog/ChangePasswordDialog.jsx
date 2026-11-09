import styles from "./ChangePasswordDialog.module.css";

import { useEffect, useRef, useState } from "react";

import { changePassword, getAuthErrorMessage } from "../../api/authApi";

const EMPTY_FORM = { currentPassword: "", password: "", passwordConfirmation: "" };

export default function ChangePasswordDialog({ onClose, onChanged }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const changeField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password.length < 6) {
      setError("A senha nova precisa ter pelo menos 6 caracteres");
      return;
    }
    if (form.password !== form.passwordConfirmation) {
      setError("As senhas novas são diferentes");
      return;
    }

    setIsSaving(true);
    try {
      const data = await changePassword(form);
      onChanged?.(data);
      setForm(EMPTY_FORM);
      setIsDone(true);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <h2 id="change-password-title" className={styles.title}>
            Trocar minha senha
          </h2>
          <p className={styles.description}>
            Você continua conectado aqui. Nos outros computadores e celulares, vai precisar entrar de novo.
          </p>
        </header>

        {isDone ? (
          <>
            <p className={styles.success} role="status">
              Senha alterada
            </p>
            <footer className={styles.footer}>
              <button className={styles.saveButton} type="button" onClick={onClose}>
                Fechar
              </button>
            </footer>
          </>
        ) : (
          <form onSubmit={handleSubmit} aria-label="Trocar minha senha">
            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.label}>Senha atual</span>
                <input
                  ref={firstFieldRef}
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.currentPassword}
                  onChange={changeField("currentPassword")}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Senha nova</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={changeField("password")}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Confirmar senha nova</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.passwordConfirmation}
                  onChange={changeField("passwordConfirmation")}
                />
              </label>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className={styles.footer}>
              <button className={styles.cancelButton} type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className={styles.saveButton} type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar senha"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
