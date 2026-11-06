import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import { getPermissions } from "../utils/permissions";

// Fora do AuthContextProvider (ex.: testes de um componente solto) vale como admin
export default function usePermissions() {
  const context = useContext(AuthContext);

  const user = context?.state.user;

  // userId: para a tela de usuários não deixar o admin mexer no próprio perfil
  return { ...getPermissions(user?.role), userId: user?._id ?? null };
}
