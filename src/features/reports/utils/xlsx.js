import { downloadFile } from "../../admin/utils/downloadFile";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const CELL_FORMATS = {
  money: '"R$" #,##0.00',
  percent: "0.0%",
  integer: "0",
  date: "dd/mm/yyyy hh:mm",
  day: "dd/mm/yyyy",
};

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

export const sheetName = (name) => name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);

const columnWidth = (column, rows) => {
  if (column.width) return column.width;
  const longest = rows.reduce((max, row) => Math.max(max, String(row[column.key] ?? "").length), 0);
  return Math.min(Math.max(column.header.length, longest, 10) + 2, 48);
};

export function fillWorksheet(worksheet, { columns, rows, totals, cellTypes }) {
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: columnWidth(column, rows),
    style: column.type ? { numFmt: CELL_FORMATS[column.type] } : {},
  }));
  rows.forEach((row) => worksheet.addRow(row));
  (cellTypes ?? []).forEach((type, index) => {
    if (type) worksheet.getRow(index + 2).getCell(2).numFmt = CELL_FORMATS[type];
  });

  const header = worksheet.getRow(1);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length && columns.length) {
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }
  if (totals) {
    const row = worksheet.addRow(totals);
    row.font = { bold: true };
  }
  return worksheet;
}

export async function buildWorkbook(sheets) {
  const module = await import("exceljs");
  const ExcelJS = module.default ?? module;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Orça Black";
  workbook.created = new Date();
  for (const sheet of sheets) {
    fillWorksheet(workbook.addWorksheet(sheetName(sheet.name)), sheet);
  }
  return workbook;
}

export async function downloadWorkbook(fileName, sheets) {
  const workbook = await buildWorkbook(sheets);
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(buffer, fileName, XLSX_TYPE);
}

export const reportFileName = (name, parts = [], date = new Date()) =>
  [name, ...parts.filter(Boolean), date.toLocaleDateString("sv-SE")]
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-") + ".xlsx";
