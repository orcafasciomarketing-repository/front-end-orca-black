import { escapeCsvCell, toSlug } from "./salesCsv";

const SEPARATOR = ";";
const BYTE_ORDER_MARK = "﻿";

export const formatCsvNumber = (value, digits = 2) =>
  typeof value === "number" ? value.toFixed(digits).replace(".", ",") : "";

export function tableToCsv(rows) {
  return BYTE_ORDER_MARK + rows.map((row) => row.map(escapeCsvCell).join(SEPARATOR)).join("\r\n");
}

export function buildChartFileName(title, weekKey, date = new Date()) {
  const week = weekKey ? `-semana-${weekKey}` : "";

  return `grafico-${toSlug(title)}${week}-${date.toLocaleDateString("sv-SE")}.csv`;
}

export function timeSeriesRows(days, series, { column = "Dia", formatLabel = (day) => day } = {}) {
  return [
    [column, ...series.map((item) => item.label)],
    ...days.map((day, index) => [formatLabel(day), ...series.map((item) => formatCsvNumber(item.values[index]))]),
  ];
}

export function barRows(items, { column = "Nome", detail, value = "Valor (R$)", digits = 2 } = {}) {
  return [
    [column, ...(detail ? [detail] : []), value],
    ...items.map((item) => [item.label, ...(detail ? [item.detail ?? ""] : []), formatCsvNumber(item.value, digits)]),
  ];
}
