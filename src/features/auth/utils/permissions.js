// Perfis do admin. As telas das TVs não usam login e continuam públicas
const SEGMENT_BY_ROLE = { b2b: "B2B", b2g: "B2G" };
const KNOWN_ROLES = ["master", "admin", "b2b", "b2g", "vendor", "sdr"];

export const PERSON_FIELDS = { vendor: "vendorId", sdr: "sdrId" };

// Perfis que dá para escolher no cadastro. O master não aparece: é definido no backend (MASTER_EMAIL)
export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

export const PERSON_ROLE_OPTIONS = [
  { value: "vendor", label: "Vendedor" },
  { value: "sdr", label: "Passagem" },
];

export const ROLE_LABELS = {
  master: "Master admin",
  admin: "Admin",
  b2b: "B2B",
  b2g: "B2G",
  vendor: "Vendedor",
  sdr: "Passagem",
};

// Sem perfil (backend antigo, sem perfis) = acesso total, como era antes.
// A segurança de verdade fica no backend: aqui é só o que aparece na tela
export function getPermissions(role) {
  const knownRole = KNOWN_ROLES.includes(role) ? role : "master";
  const isMaster = knownRole === "master";
  const isPerson = Object.hasOwn(PERSON_FIELDS, knownRole);

  return {
    role: knownRole,
    // Importação, Erros, trocar perfil/senha e excluir usuários
    isMaster,
    // Tela de Usuários (ver e cadastrar)
    canSeeUsers: isMaster || knownRole === "admin",
    // Setor fixo do usuário ("B2B"/"B2G"); vazio para master e admin, que veem todos
    segment: SEGMENT_BY_ROLE[knownRole] ?? "",
    isPerson,
    canSeeAdmin: !isPerson,
    canSeeGoals: isMaster || knownRole === "admin",
    canManageCampaigns: isMaster || knownRole === "admin",
    isVendor: knownRole === "vendor",
  };
}
