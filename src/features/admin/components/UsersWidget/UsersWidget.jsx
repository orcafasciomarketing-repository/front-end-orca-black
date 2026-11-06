import styles from "./UsersWidget.module.css";

import { useState } from "react";

import usePermissions from "../../../auth/hooks/usePermissions";
import { ROLE_LABELS, ROLE_OPTIONS } from "../../../auth/utils/permissions";
import { getUserErrorMessage } from "../../api/usersApi";
import { useUserMutations, useUsers } from "../../hooks/useUsers";

const EMPTY_FORM = { email: "", password: "", passwordConfirmation: "", role: "b2b" };

export default function UsersWidget() {
  const { users } = useUsers();
  const { create, update, remove } = useUserMutations();
  const { userId, isMaster } = usePermissions();

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Usuários</h2>
        <span className={styles.count}>{users.length}</span>
      </header>
      <div className={styles.body}>
        <p className={styles.help}>
          Master admin faz tudo. Admin vê todos os setores e cadastra usuários, mas não troca perfil, senha nem exclui.
          B2B e B2G veem só as vendas do próprio setor, no Dashboard e nos Gráficos. As telas das TVs continuam públicas.
        </p>

        <CreateUserForm create={create} />

        {update.isError && <p className={styles.error}>Não foi possível alterar: {getUserErrorMessage(update.error)}</p>}
        {remove.isError && <p className={styles.error}>Não foi possível excluir: {getUserErrorMessage(remove.error)}</p>}

        {users.length === 0 ? (
          <p className={styles.muted}>Nenhum usuário cadastrado</p>
        ) : (
          <ul className={styles.list} aria-label="Usuários cadastrados">
            {users.map((user) => (
              <UserItem
                key={user._id}
                user={user}
                isMe={user._id === userId}
                canEdit={isMaster}
                update={update}
                remove={remove}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CreateUserForm({ create }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const changeField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFormError("");
    create.reset();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (form.password.length < 6) {
      setFormError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (form.password !== form.passwordConfirmation) {
      setFormError("As senhas são diferentes");
      return;
    }

    create.mutate(form, { onSuccess: () => setForm(EMPTY_FORM) });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Cadastrar usuário">
      <h3 className={styles.formTitle}>Cadastrar usuário</h3>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input className={styles.input} type="email" required value={form.email} onChange={changeField("email")} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Perfil</span>
          <select className={styles.input} value={form.role} onChange={changeField("role")}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Senha</span>
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
          <span className={styles.label}>Confirmar senha</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            value={form.passwordConfirmation}
            onChange={changeField("passwordConfirmation")}
          />
        </label>
      </div>
      {formError && <p className={styles.error}>{formError}</p>}
      {create.isError && <p className={styles.error}>Não foi possível cadastrar: {getUserErrorMessage(create.error)}</p>}
      {create.isSuccess && <p className={styles.success}>Usuário cadastrado</p>}
      <button className={styles.primaryButton} type="submit" disabled={create.isPending}>
        {create.isPending ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}

// canEdit: só o master troca perfil e senha e exclui. O perfil do master nunca muda pela tela
function UserItem({ user, isMe, canEdit, update, remove }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isBusy = update.isPending || remove.isPending;
  const role = user.role ?? "admin";
  const canChangeRole = canEdit && !isMe && role !== "master";

  const handleRoleChange = (event) => {
    update.mutate({ id: user._id, changes: { role: event.target.value } });
  };

  const handleDelete = () => {
    if (window.confirm(`Excluir ${user.email}? A pessoa perde o acesso na hora.`)) {
      remove.mutate(user._id);
    }
  };

  return (
    <li className={styles.item}>
      <div className={styles.itemTop}>
        <strong className={styles.email}>
          {user.email}
          {isMe && <span className={styles.me}> (você)</span>}
        </strong>
        <div className={styles.actions}>
          {canChangeRole ? (
            <select
              className={styles.input}
              aria-label={`Perfil de ${user.email}`}
              value={role}
              disabled={isBusy}
              onChange={handleRoleChange}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className={styles.role} aria-label={`Perfil de ${user.email}`}>
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
          {canEdit && (
            <button
              className={styles.secondaryButton}
              type="button"
              aria-expanded={isChangingPassword}
              onClick={() => setIsChangingPassword(!isChangingPassword)}
            >
              Trocar senha
            </button>
          )}
          {canChangeRole && (
            <button className={styles.dangerButton} type="button" disabled={isBusy} onClick={handleDelete}>
              Excluir
            </button>
          )}
        </div>
      </div>
      {isChangingPassword && (
        <PasswordForm user={user} update={update} onDone={() => setIsChangingPassword(false)} />
      )}
    </li>
  );
}

function PasswordForm({ user, update, onDone }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password.length < 6) {
      setFormError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== passwordConfirmation) {
      setFormError("As senhas são diferentes");
      return;
    }

    update.mutate({ id: user._id, changes: { password, passwordConfirmation } }, { onSuccess: onDone });
  };

  return (
    <form className={styles.passwordForm} onSubmit={handleSubmit} aria-label={`Nova senha de ${user.email}`}>
      <input
        className={styles.input}
        type="password"
        autoComplete="new-password"
        placeholder="Nova senha"
        aria-label="Nova senha"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setFormError("");
        }}
      />
      <input
        className={styles.input}
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar nova senha"
        aria-label="Confirmar nova senha"
        value={passwordConfirmation}
        onChange={(event) => {
          setPasswordConfirmation(event.target.value);
          setFormError("");
        }}
      />
      <button className={styles.primaryButton} type="submit" disabled={update.isPending}>
        Salvar senha
      </button>
      {formError && <p className={styles.error}>{formError}</p>}
      <p className={styles.muted}>A pessoa sai das sessões abertas e entra de novo com a senha nova.</p>
    </form>
  );
}
