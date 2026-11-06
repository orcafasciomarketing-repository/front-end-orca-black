import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { createUser, deleteUser, getUsers, updateUser } from "../api/usersApi";

const USERS_KEY = ["admin-users"];

// Email repetido, senha curta etc. (4xx) é erro de digitação, não vai para os logs de erro
const reportUnexpected = (location) => (error) => {
  if (!error.response || error.response.status >= 500) reportError(error, { location });
};

export function useUsers() {
  const { data } = useSuspenseQuery({
    queryKey: USERS_KEY,
    queryFn: getUsers,
  });

  return { users: data };
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });

  const create = useMutation({
    mutationFn: (userData) => createUser(userData),
    onSuccess: refreshUsers,
    onError: reportUnexpected("Admin › cadastro de usuário"),
  });

  const update = useMutation({
    mutationFn: (variables) => updateUser(variables),
    onSuccess: refreshUsers,
    onError: reportUnexpected("Admin › alteração de usuário"),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: refreshUsers,
    onError: reportUnexpected("Admin › exclusão de usuário"),
  });

  return { create, update, remove };
}
