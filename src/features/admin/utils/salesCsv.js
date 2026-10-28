import { formatPassageNames } from "./passages";

const SEPARATOR = ";";
const BYTE_ORDER_MARK = "\uFEFF";

const FUNNEL_LABELS = {
  sales: "Vendas",
  farm: "Renovação",
};

const STATUS_LABELS = {
  ativa: "Ativa",
  cancelada: "Cancelada",
};

const csvDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const formatCsvDate = (value) => (value ? csvDateFormatter.format(new Date(value)) : "");

const formatCsvValue = (value) => (typeof value === "number" ? value.toFixed(2).replace(".", ",") : "");

const COLUMNS = [
  { header: "Negociação", value: (sale) => sale.rdDealName },
  { header: "Status", value: (sale) => STATUS_LABELS[sale.dealStatus] ?? sale.dealStatus },
  { header: "Valor (R$)", value: (sale) => formatCsvValue(sale.value) },
  { header: "Tipo", value: (sale) => FUNNEL_LABELS[sale.funnelType] ?? sale.funnelType },
  { header: "Segmento", value: (sale) => sale.segment?.toUpperCase() },
  { header: "Vendedor", value: (sale) => sale.vendorId?.vendorName },
  { header: "Passagem", value: formatPassageNames },
  { header: "Data da venda", value: (sale) => formatCsvDate(sale.realizedAt) },
  { header: "ID na RD", value: (sale) => sale.rdDealId },
];

export function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);

  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function salesToCsv(sales) {
  const header = COLUMNS.map((column) => escapeCsvCell(column.header)).join(SEPARATOR);
  const rows = sales.map((sale) => COLUMNS.map((column) => escapeCsvCell(column.value(sale))).join(SEPARATOR));

  return BYTE_ORDER_MARK + [header, ...rows].join("\r\n");
}

const toSlug = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function buildExportFileName({ vendor, weekKey } = {}, date = new Date()) {
  const day = date.toLocaleDateString("sv-SE");
  const scope = vendor ? toSlug(vendor.vendorName || vendor._id) : "todos";
  const week = weekKey ? `-semana-${weekKey}` : "";

  return `vendas-${scope}${week}-${day}.csv`;
}
