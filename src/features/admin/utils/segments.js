import { segmentOf } from "./chartData";

export const SEGMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "B2B", label: "B2B" },
  { value: "B2G", label: "B2G" },
];

export function filterSalesBySegment(sales, segment) {
  return segment ? sales.filter((sale) => segmentOf(sale) === segment) : sales;
}
