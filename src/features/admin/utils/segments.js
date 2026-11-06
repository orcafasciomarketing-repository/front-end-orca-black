import { segmentOf } from "./chartData";

export const SEGMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "B2B", label: "B2B" },
  { value: "B2G", label: "B2G" },
];

// b2b e b2g só têm o próprio setor no filtro; o admin tem Todos, B2B e B2G
export function getSegmentOptions(userSegment) {
  return userSegment ? SEGMENT_OPTIONS.filter((option) => option.value === userSegment) : SEGMENT_OPTIONS;
}

export function filterSalesBySegment(sales, segment) {
  return segment ? sales.filter((sale) => segmentOf(sale) === segment) : sales;
}

// Meta do setor ("B2B"/"B2G"), que vem do backend em goal.segments. Sem ela (backend
// antigo ou meta do setor não configurada) usa a meta total, como era antes: isTotal avisa isso
export function getSegmentGoal(goal, segment) {
  const segmentGoal = segment ? goal.segments?.[segment.toLowerCase()]?.goal : undefined;

  if (segmentGoal > 0) {
    return { value: segmentGoal, isTotal: false };
  }

  return { value: goal.goal, isTotal: true };
}
