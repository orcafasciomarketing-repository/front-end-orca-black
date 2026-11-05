import { getPassagePeople } from "./passages";

export const SALE_POINTS = {
  "b2g-sales": 3,
  "b2g-farm": 2,
  "b2b-sales": 2,
  "b2b-farm": 1,
};

export const PASSAGE_POINTS = {
  "b2g sdr": 2,
  "b2b sdr": 1,
  cs: 1,
  suporte: 2,
};

const RANK_SIZE = 3;

const normalizeJob = (job) =>
  String(job ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const rankTypeOf = (sale) => (sale.funnelType === "farm" ? "farm" : "sales");

const isActive = (sale) => sale.dealStatus === "ativa";

export const salePoints = (sale) => SALE_POINTS[`${String(sale.segment ?? "").toLowerCase()}-${rankTypeOf(sale)}`] ?? 0;

export const passagePoints = (person) => PASSAGE_POINTS[normalizeJob(person?.job)] ?? 0;

const byPointsDesc = (a, b) => b.points - a.points || a.name.localeCompare(b.name, "pt-BR");

const topOf = (people) => [...people.values()].sort(byPointsDesc).slice(0, RANK_SIZE);

export function rankVendorsFromSales(sales, funnelType) {
  const people = new Map();

  sales
    .filter((sale) => isActive(sale) && sale.vendorId?._id && rankTypeOf(sale) === funnelType)
    .forEach((sale) => {
      const vendor = sale.vendorId;
      const current = people.get(vendor._id) ?? {
        vendorId: vendor._id,
        name: vendor.vendorName,
        job: vendor.job,
        points: 0,
      };
      people.set(vendor._id, { ...current, points: current.points + salePoints(sale) });
    });

  return topOf(people);
}

export function rankSdrsFromSales(sales) {
  const people = new Map();

  sales
    .filter(isActive)
    .flatMap(getPassagePeople)
    .filter((person) => person._id)
    .forEach((person) => {
      const current = people.get(person._id) ?? { sdrId: person._id, name: person.name, job: person.job, points: 0 };
      people.set(person._id, { ...current, points: current.points + passagePoints(person) });
    });

  return topOf(people);
}
