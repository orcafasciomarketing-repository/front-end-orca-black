import { getPassagePeople } from "./passages";

const NO_SECTOR = "Sem setor";

const bySectorName = (a, b) => a.sector.localeCompare(b.sector, "pt-BR");

function countBy(labels) {
  const counts = new Map();

  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));

  return [...counts].map(([sector, count]) => ({ sector, count })).sort(bySectorName);
}

const segmentOf = (sale) => sale.segment?.toUpperCase() || NO_SECTOR;

export function countBySector(sales) {
  const activeSales = sales.filter((sale) => sale.dealStatus === "ativa");

  return {
    sales: countBy(activeSales.filter((sale) => sale.funnelType !== "farm").map(segmentOf)),
    passages: countBy(activeSales.flatMap(getPassagePeople).map((person) => person.job || NO_SECTOR)),
    renewals: countBy(activeSales.filter((sale) => sale.funnelType === "farm").map(segmentOf)),
  };
}
