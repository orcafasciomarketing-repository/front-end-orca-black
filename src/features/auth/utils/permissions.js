// Perfis fixos do admin. As telas das TVs não usam login e continuam públicas
const SEGMENT_BY_ROLE = { b2b: "B2B", b2g: "B2G" };

export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin (tudo)" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

// Sem perfil (usuário antigo ou backend sem perfis) = admin, como era antes.
// A segurança de verdade fica no backend: aqui é só o que aparece na tela
export function getPermissions(role) {
  const segment = SEGMENT_BY_ROLE[role] ?? "";

  return {
    role: segment ? role : "admin",
    isAdmin: !segment,
    // Setor fixo do usuário ("B2B"/"B2G"); vazio para o admin, que vê todos
    segment,
  };
}
