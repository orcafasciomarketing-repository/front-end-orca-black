import { getWeekRange } from "./mockBackend";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const TEAMS = [
  { _id: "team-wizards", name: "Wizards of sales" },
  { _id: "team-orcawinx", name: "Orçawinx" },
  { _id: "team-sem-freio", name: "Sem freio" },
];

const VENDORS = [
  { _id: "vendor-brenda", vendorName: "Brenda Lima", job: "B2B Sales", teamId: "team-wizards" },
  { _id: "vendor-gustavo", vendorName: "Gustavo Rocha", job: "B2G Sales", teamId: "team-orcawinx" },
  { _id: "vendor-joice", vendorName: "Joice Pereira", job: "B2G Farmer", teamId: "team-sem-freio" },
  { _id: "vendor-heitor", vendorName: "Heitor Alves", job: "B2B Sales", teamId: "team-wizards" },
  { _id: "vendor-karine", vendorName: "Karine Souza", job: "B2B Sales", teamId: "team-orcawinx" },
  { _id: "vendor-danne", vendorName: "Danne Costa", job: "B2B Sales", teamId: "team-sem-freio" },
  { _id: "vendor-marcelo", vendorName: "Marcelo Dias", job: "B2B Farmer", teamId: "team-wizards" },
  { _id: "vendor-fernanda", vendorName: "Fernanda Melo", job: "B2G Sales", teamId: "team-orcawinx" },
  { _id: "vendor-leticia", vendorName: "Letícia Prado", job: "B2B Farmer", teamId: "team-sem-freio" },
  { _id: "vendor-gabriel", vendorName: "Gabriel Nunes", job: "B2B Sales", teamId: "team-wizards" },
  { _id: "vendor-giovana", vendorName: "Giovana Evaristo", job: "B2B Farmer", teamId: "team-orcawinx" },
];

const SDRS = [
  { _id: "sdr-izabel", name: "Izabel Ramos", job: "SDR", teamId: "team-wizards" },
  { _id: "sdr-caio", name: "Caio Martins", job: "CS", teamId: "team-orcawinx" },
  { _id: "sdr-julia", name: "Julia Tomaz", job: "Suporte", teamId: "team-sem-freio" },
  { _id: "sdr-lucas", name: "Lucas Daniel", job: "SDR", teamId: "team-wizards" },
];

const SALES = [
  { id: "c1", when: { week: 0, progress: 0.2 }, vendor: "brenda", sdrs: ["izabel", "lucas"], funnel: "sales", segment: "b2b", value: 12000, status: "ativa", name: "Construtora Horizonte" },
  { id: "c2", when: { week: 0, progress: 0.5 }, vendor: "brenda", funnel: "sales", segment: "b2b", value: 8500, status: "ativa", name: "Edifício Aurora" },
  { id: "c3", when: { week: 0, progress: 0.6 }, vendor: "gustavo", funnel: "sales", segment: "b2g", value: 45000, status: "ativa", name: "Prefeitura de Campinas" },
  { id: "c4", when: { week: 0, progress: 0.7 }, vendor: "joice", sdrs: ["caio"], funnel: "farm", segment: "b2g", value: 8000, status: "ativa", name: "Secretaria de Obras SP" },
  { id: "c5", when: { week: 0, progress: 0.8 }, vendor: "brenda", funnel: "farm", segment: "b2b", value: 5000, status: "ativa", name: "Reforma Vila Nova" },
  { id: "c6", when: { week: 0, progress: 0.9 }, vendor: "heitor", funnel: "sales", segment: "b2b", value: 20000, status: "cancelada", name: "Galpão Logístico Sul" },
  { id: "c7", when: { week: 0, edge: "start" }, vendor: "marcelo", sdrs: ["julia"], funnel: "farm", segment: "b2b", value: 3500, status: "ativa", name: "Condomínio Jardins" },
  { id: "l1", when: { week: 1, day: 1, hour: 10 }, vendor: "gustavo", sdrs: ["julia"], funnel: "sales", segment: "b2g", value: 30000, status: "ativa", name: "Governo do Estado MG" },
  { id: "l2", when: { week: 1, day: 2, hour: 15 }, vendor: "gustavo", funnel: "sales", segment: "b2g", value: 15000, status: "ativa", name: "Câmara Municipal BH" },
  { id: "l3", when: { week: 1, day: 3, hour: 11 }, vendor: "karine", funnel: "farm", segment: "b2b", value: 9000, status: "ativa", name: "Shopping Central" },
  { id: "l4", when: { week: 1, day: 4, hour: 9 }, vendor: "danne", sdrs: ["izabel", "julia"], funnel: "sales", segment: "b2b", value: 18000, status: "ativa", name: "Hospital Santa Clara" },
  { id: "l5", when: { week: 1, day: 4, hour: 16 }, vendor: "marcelo", funnel: "sales", segment: "b2b", value: 7000, status: "cancelada", name: "Escola Nova Era" },
  { id: "l6", when: { week: 1, edge: "end" }, vendor: "karine", sdrs: ["caio"], funnel: "sales", segment: "b2b", value: 6000, status: "ativa", name: "Clínica Bem Viver" },
  { id: "w1", when: { week: 2, day: 0, hour: 14 }, vendor: "fernanda", sdrs: ["lucas"], funnel: "sales", segment: "b2g", value: 22000, status: "ativa", name: "Prefeitura de Santos" },
  { id: "w2", when: { week: 2, day: 2, hour: 10 }, vendor: "leticia", funnel: "farm", segment: "b2b", value: 6000, status: "ativa", name: "Residencial Primavera" },
  { id: "w3", when: { week: 2, day: 5, hour: 12 }, vendor: "gabriel", funnel: "sales", segment: "b2b", value: 11000, status: "ativa", name: "Loja Matriz Centro" },
  { id: "x1", when: { week: 3, day: 1, hour: 9 }, vendor: "giovana", funnel: "farm", segment: "b2b", value: 4000, status: "ativa", name: "Hotel Beira Mar" },
  { id: "x2", when: { week: 3, day: 3, hour: 17 }, vendor: "heitor", sdrs: ["caio"], funnel: "sales", segment: "b2b", value: 9000, status: "ativa", name: "Indústria Metalúrgica" },
];

function resolveDate(when, now) {
  const { startOfWeek, finalOfWeek } = getWeekRange(when.week, now);

  if (when.edge === "start") {
    return startOfWeek;
  }

  if (when.edge === "end") {
    return finalOfWeek;
  }

  if (when.progress !== undefined) {
    return new Date(startOfWeek.getTime() + (now.getTime() - startOfWeek.getTime()) * when.progress);
  }

  return new Date(startOfWeek.getTime() + when.day * DAY_MS + when.hour * HOUR_MS);
}

export function buildMockDatabase(now = new Date()) {
  return {
    teams: TEAMS.map((team) => ({ ...team })),
    vendors: VENDORS.map((vendor) => ({ ...vendor, rdUserId: `rd-${vendor._id}` })),
    sdrs: SDRS.map((sdr) => ({ ...sdr })),
    sales: SALES.map((sale) => {
      const realizedAt = resolveDate(sale.when, now).toISOString();

      return {
        _id: `sale-${sale.id}`,
        rdDealId: `rd-deal-${sale.id}`,
        rdDealName: sale.name,
        vendorId: `vendor-${sale.vendor}`,
        sdrIds: (sale.sdrs ?? []).map((sdr) => `sdr-${sdr}`),
        value: sale.value,
        segment: sale.segment,
        funnelType: sale.funnel,
        dealStatus: sale.status,
        realizedAt,
        rdUpdatedAt: realizedAt,
        createdAt: realizedAt,
        updatedAt: realizedAt,
      };
    }),
  };
}
