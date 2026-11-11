export const VENDOR_TIERS = [
  {
    key: "super",
    label: "Super meta",
    hint: "Some das faixas, da previsão, das semanas e dos gráficos",
  },
  {
    key: "black",
    label: "Meta black",
    hint: "Só existe no mês da campanha com Meta black",
  },
];

export const VENDOR_WIDGETS = [
  {
    key: "summary",
    label: "Resumo",
    hint: "Cartões do topo: vendido, quanto falta, por dia e vendido hoje",
  },
  {
    key: "month",
    label: "Faixas do mês",
    hint: "Cartões da Meta, da Super e da Black do mês",
  },
  {
    key: "forecast",
    label: "Previsão do mês",
    hint: "Também tira a chance de bater e a previsão realista",
  },
  { key: "comparison", label: "Comparação com o mês anterior" },
  {
    key: "breakdown",
    label: "Como chegar na meta",
    hint: "Vendas e leads que faltam",
  },
  {
    key: "week",
    label: "Semana atual",
    hint: "Também tira a Meta da semana do resumo",
  },
  {
    key: "evolution",
    label: "Evolução",
    hint: "Gráficos do mês, das semanas e dos meses",
  },
  {
    key: "weeks",
    label: "Metas por semana",
    hint: "Tabela com a meta de cada semana e por dia útil",
  },
];

export const VISIBILITY_ITEMS = [...VENDOR_TIERS, ...VENDOR_WIDGETS];

export const DEFAULT_VISIBILITY = { open: true, hidden: [] };

export function toVisibility(visibility) {
  return {
    open: visibility?.open ?? true,
    hidden: VISIBILITY_ITEMS.map((item) => item.key).filter((key) =>
      (visibility?.hidden ?? []).includes(key),
    ),
  };
}

export const isShown = (visibility, key) =>
  !toVisibility(visibility).hidden.includes(key);

export function visibilitySummary(visibility) {
  const value = toVisibility(visibility);
  if (!value.open) return "Mês fechado";
  if (!value.hidden.length) return "Tudo liberado";
  return value.hidden.length === 1
    ? "1 item escondido"
    : `${value.hidden.length} itens escondidos`;
}
