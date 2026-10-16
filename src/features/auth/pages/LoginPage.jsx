import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import useAuth from "../hooks/useAuth.js";
import { loginUser } from "../api/authApi";

import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { dispatch } = useAuth();
  const [email, setEmail] = useState({ value: "", error: "" });
  const [password, setPassword] = useState({ value: "", error: "" });

  // Sem navigate: ao despachar SET_USER o PublicRoute redireciona sozinho (respeitando a rota de origem)
  const { mutate, error, isPending, isError } = useMutation({
    mutationFn: loginUser,
    onSuccess: (responseData) => {
      dispatch({
        type: "SET_USER",
        payload: { user: responseData.user, token: responseData.token },
      });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();

    const isEmailValid = handleEmailValidation(email.value);
    const isPasswordValid = handlePasswordValidation(password.value);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const loginObject = {
      email: email.value,
      password: password.value,
    };

    mutate(loginObject);
  }

  function handleEmailChange(value) {
    setEmail({ value: value, error: "" });
  }

  function handleEmailValidation(value) {
    if (!value) {
      setEmail((prev) => ({
        ...prev,
        error: "Email não pode estar em branco",
      }));
      return false;
    }
    return true;
  }

  function handlePasswordChange(value) {
    setPassword({ value: value, error: "" });
  }

  function handlePasswordValidation(value) {
    if (!value) {
      setPassword((prev) => ({
        ...prev,
        error: "Senha não pode estar em branco",
      }));
      return false;
    }
    return true;
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <input
              className={`${styles.input} ${email.error ? styles.inputError : ""}`}
              type="email"
              name="email"
              id="email"
              placeholder="E-mail"
              autoComplete="email"
              onChange={(e) => {
                handleEmailChange(e.target.value);
              }}
              onBlur={(e) => {
                handleEmailValidation(e.target.value);
              }}
            />
            {email.error && (
              <p className={styles.errorMessage}>{email.error}</p>
            )}
          </div>
          <div className={styles.field}>
            <input
              className={`${styles.input} ${password.error ? styles.inputError : ""}`}
              type="password"
              name="password"
              id="password"
              placeholder="Senha"
              autoComplete="current-password"
              onChange={(e) => {
                handlePasswordChange(e.target.value);
              }}
              onBlur={(e) => {
                handlePasswordValidation(e.target.value);
              }}
            />
            {password.error && (
              <p className={styles.errorMessage}>{password.error}</p>
            )}
          </div>

          {isError && (
            <p className={styles.formError}>
              {error.response?.data?.message ?? "Não foi possível fazer login"}
            </p>
          )}

          <button
            className={styles.button}
            disabled={!!password.error || !!email.error || isPending}
          >
            {isPending ? "Logando..." : "Logar"}
          </button>
        </form>
      </div>
    </section>
  );
}
