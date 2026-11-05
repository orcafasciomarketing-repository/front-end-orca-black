import { isActiveSale } from "./chartData";
import { getPassagePeople } from "./passages";

export const RANK_POINTS = { sales: 2, farm: 1, passage: 1 };

const RANK_SIZE = 3;

const rankTypeOf = (sale) => (sale.funnelType === "farm" ? "farm" : "sales");

const byPointsDesc = (a, b) => b.points - a.points || a.name.localeCompare(b.name, "pt-BR");

const topOf = (people) => [...people.values()].sort(byPointsDesc).slice(0, RANK_SIZE);

export function rankVendorsFromSales(sales, funnelType) {
  const people = new Map();

  sales
    .filter((sale) => isActiveSale(sale) && sale.vendorId?._id && rankTypeOf(sale) === funnelType)
    .forEach(({ vendorId: vendor }) => {
      const current = people.get(vendor._id) ?? {
        vendorId: vendor._id,
        name: vendor.vendorName,
        job: vendor.job,
        points: 0,
      };
      people.set(vendor._id, { ...current, points: current.points + RANK_POINTS[funnelType] });
    });

  return topOf(people);
}

export function rankSdrsFromSales(sales) {
  const people = new Map();

  sales
    .filter(isActiveSale)
    .flatMap(getPassagePeople)
    .filter((person) => person._id)
    .forEach((person) => {
      const current = people.get(person._id) ?? { sdrId: person._id, name: person.name, job: person.job, points: 0 };
      people.set(person._id, { ...current, points: current.points + RANK_POINTS.passage });
    });

  return topOf(people);
}
