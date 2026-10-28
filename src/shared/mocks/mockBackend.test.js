import { describe, expect, it } from "vitest";

import {
  findActiveByPeriod,
  findActiveSalesOfCurrentWeek,
  findAllSales,
  findSalesByVendor,
  getGoalProgress,
  getScoreboard,
  getSdrRanking,
  getVendorRanking,
  getWeekRange,
} from "./mockBackend";
import { buildMockDatabase } from "./mockDatabase";

const now = new Date("2026-10-21T15:00:00.000Z");
const db = buildMockDatabase(now);

const idsOf = (sales) => sales.map((sale) => sale._id.replace("sale-", "")).sort();
const namesOf = (ranking) => ranking.map((item) => item.name);

describe("mockBackend › semanas (mesma regra do backend)", () => {
  it("semana atual vai de segunda 00:00 a domingo 23:59:59.999 em São Paulo", () => {
    const { startOfWeek, finalOfWeek } = getWeekRange(0, now);

    expect(startOfWeek.toISOString()).toBe("2026-10-19T03:00:00.000Z");
    expect(finalOfWeek.toISOString()).toBe("2026-10-26T02:59:59.999Z");
  });

  it("semana passada é a anterior", () => {
    const { startOfWeek, finalOfWeek } = getWeekRange(1, now);

    expect(startOfWeek.toISOString()).toBe("2026-10-12T03:00:00.000Z");
    expect(finalOfWeek.toISOString()).toBe("2026-10-19T02:59:59.999Z");
  });
});

describe("mockBackend › dados", () => {
  it("tem 18 vendas em 4 semanas, nenhuma no futuro", () => {
    expect(db.sales).toHaveLength(18);
    expect(db.sales.every((sale) => new Date(sale.realizedAt) <= now)).toBe(true);
  });

  it("as vendas seguem o formato do model de vendas do backend", () => {
    for (const sale of db.sales) {
      expect(sale).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          rdDealId: expect.any(String),
          rdDealName: expect.any(String),
          vendorId: expect.any(String),
          sdrIds: expect.any(Array),
          value: expect.any(Number),
          segment: expect.stringMatching(/^(b2b|b2g)$/),
          funnelType: expect.stringMatching(/^(sales|farm)$/),
          dealStatus: expect.stringMatching(/^(ativa|cancelada)$/),
          realizedAt: expect.any(String),
          rdUpdatedAt: expect.any(String),
          createdAt: expect.any(String),
        }),
      );
    }
  });

  it("cada venda aponta para um vendedor e um SDR que existem", () => {
    const vendorIds = new Set(db.vendors.map((vendor) => vendor._id));
    const sdrIds = new Set(db.sdrs.map((sdr) => sdr._id));

    expect(db.sales.every((sale) => vendorIds.has(sale.vendorId))).toBe(true);
    expect(db.sales.flatMap((sale) => sale.sdrIds).every((sdrId) => sdrIds.has(sdrId))).toBe(true);
  });

  it("os cadastros vêm sem imageUrl, como o backend faz quando não há foto", () => {
    expect([...db.teams, ...db.vendors, ...db.sdrs].some((item) => "imageUrl" in item)).toBe(false);
  });
});

describe("mockBackend › separação por semana", () => {
  it("semana atual só traz as vendas ativas da semana atual", () => {
    expect(idsOf(findActiveByPeriod(db, "week", now))).toEqual(["c1", "c2", "c3", "c4", "c5", "c7"]);
  });

  it("semana passada só traz as vendas ativas da semana passada", () => {
    expect(idsOf(findActiveByPeriod(db, "lastWeek", now))).toEqual(["l1", "l2", "l3", "l4", "l6"]);
  });

  it("nenhuma venda da semana passada aparece na semana atual, e vice-versa", () => {
    const current = new Set(idsOf(findActiveByPeriod(db, "week", now)));
    const last = idsOf(findActiveByPeriod(db, "lastWeek", now));

    expect(last.some((id) => current.has(id))).toBe(false);
  });

  it("venda na segunda 00:00 conta na semana atual (c7)", () => {
    expect(idsOf(findActiveByPeriod(db, "week", now))).toContain("c7");
    expect(idsOf(findActiveByPeriod(db, "lastWeek", now))).not.toContain("c7");
  });

  it("venda no domingo 23:59:59 conta na semana passada (l6)", () => {
    expect(idsOf(findActiveByPeriod(db, "lastWeek", now))).toContain("l6");
    expect(idsOf(findActiveByPeriod(db, "week", now))).not.toContain("l6");
  });

  it("vendas canceladas não entram em período nenhum (c6 e l5)", () => {
    const all = idsOf(findActiveByPeriod(db, "all", now));

    expect(all).not.toContain("c6");
    expect(all).not.toContain("l5");
    expect(all).toHaveLength(16);
  });
});

describe("mockBackend › placar", () => {
  it("semana atual: Wizards 8, Orçawinx 3, Sem freio 2", () => {
    expect(getScoreboard(db, "week", now)).toEqual([
      expect.objectContaining({ teamName: "Wizards of sales", sales: 4, farm: 2, passage: 2, total: 8 }),
      expect.objectContaining({ teamName: "Orçawinx", sales: 2, farm: 0, passage: 1, total: 3 }),
      expect.objectContaining({ teamName: "Sem freio", sales: 0, farm: 1, passage: 1, total: 2 }),
    ]);
  });

  it("semana passada: Orçawinx 8, Sem freio 4, Wizards 1", () => {
    expect(getScoreboard(db, "lastWeek", now)).toEqual([
      expect.objectContaining({ teamName: "Orçawinx", sales: 6, farm: 1, passage: 1, total: 8 }),
      expect.objectContaining({ teamName: "Sem freio", sales: 2, farm: 0, passage: 2, total: 4 }),
      expect.objectContaining({ teamName: "Wizards of sales", sales: 0, farm: 0, passage: 1, total: 1 }),
    ]);
  });

  it("campanha toda soma todas as semanas", () => {
    const all = getScoreboard(db, "all", now);
    const total = all.reduce((sum, team) => sum + team.total, 0);

    expect(total).toBe(13 + 13 + 6 + 4);
    expect(all[0].teamName).toBe("Orçawinx");
  });

  it("todo time aparece, mesmo com zero pontos", () => {
    const emptyDb = { ...db, sales: [] };

    expect(getScoreboard(emptyDb, "week", now).map((team) => team.total)).toEqual([0, 0, 0]);
  });
});

describe("mockBackend › várias passagens na mesma venda", () => {
  it("venda sem passagem tem lista vazia; com passagem, uma ou mais pessoas", () => {
    const sdrCounts = Object.fromEntries(db.sales.map((sale) => [sale._id, sale.sdrIds.length]));

    expect(sdrCounts["sale-c2"]).toBe(0);
    expect(sdrCounts["sale-c4"]).toBe(1);
    expect(sdrCounts["sale-c1"]).toBe(2);
    expect(sdrCounts["sale-l4"]).toBe(2);
  });

  it("cada pessoa da passagem ganha o ponto, mesmo na mesma venda", () => {
    const onlyC1 = { ...db, sales: db.sales.filter((sale) => sale._id === "sale-c1") };

    expect(getSdrRanking(onlyC1, "all", now).map((sdr) => [sdr.name, sdr.points])).toEqual([
      ["Izabel Ramos", 1],
      ["Lucas Daniel", 1],
    ]);
  });

  it("cada pessoa soma o ponto de passagem no próprio time", () => {
    const onlyL4 = { ...db, sales: db.sales.filter((sale) => sale._id === "sale-l4") };
    const passageByTeam = Object.fromEntries(getScoreboard(onlyL4, "all", now).map((team) => [team.teamName, team.passage]));

    expect(passageByTeam).toEqual({ "Wizards of sales": 1, "Sem freio": 1, "Orçawinx": 0 });
  });

  it("duas pessoas do mesmo time na mesma venda dão 2 pontos de passagem ao time", () => {
    const onlyC1 = { ...db, sales: db.sales.filter((sale) => sale._id === "sale-c1") };

    expect(getScoreboard(onlyC1, "all", now)[0]).toEqual(expect.objectContaining({ teamName: "Wizards of sales", passage: 2 }));
  });
});

describe("mockBackend › rankings", () => {
  it("artilheiros de vendas da semana atual: Brenda (4) e Gustavo (2)", () => {
    const { vendor } = getVendorRanking(db, "week", "sales", now);

    expect(vendor.map((item) => [item.name, item.points])).toEqual([
      ["Brenda Lima", 4],
      ["Gustavo Rocha", 2],
    ]);
  });

  it("quem só vendeu na semana passada não aparece no ranking da semana atual", () => {
    const names = [
      ...namesOf(getVendorRanking(db, "week", "sales", now).vendor),
      ...namesOf(getVendorRanking(db, "week", "farm", now).vendor),
    ];

    expect(names).not.toContain("Karine Souza");
    expect(names).not.toContain("Danne Costa");
  });

  it("artilheiros de vendas da semana passada: Gustavo (4), Danne (2), Karine (2)", () => {
    const { vendor } = getVendorRanking(db, "lastWeek", "sales", now);

    expect(vendor.map((item) => [item.name, item.points])).toEqual([
      ["Gustavo Rocha", 4],
      ["Karine Souza", 2],
      ["Danne Costa", 2],
    ]);
  });

  it("venda cancelada não dá ponto (Heitor na semana atual)", () => {
    expect(namesOf(getVendorRanking(db, "week", "sales", now).vendor)).not.toContain("Heitor Alves");
  });

  it("ranking de renovação da semana atual tem Brenda, Joice e Marcelo com 1 ponto", () => {
    const { vendor } = getVendorRanking(db, "week", "farm", now);

    expect(vendor.map((item) => item.points)).toEqual([1, 1, 1]);
    expect(namesOf(vendor).sort()).toEqual(["Brenda Lima", "Joice Pereira", "Marcelo Dias"]);
  });

  it("ranking da campanha toda é limitado ao top 3", () => {
    const { vendor } = getVendorRanking(db, "all", "sales", now);

    expect(vendor).toHaveLength(3);
    expect(vendor[0]).toEqual(expect.objectContaining({ name: "Gustavo Rocha", points: 6 }));
    expect(vendor[1]).toEqual(expect.objectContaining({ name: "Brenda Lima", points: 4 }));
  });

  it("passagens da semana atual: Izabel, Caio e Julia com 1 cada", () => {
    const ranking = getSdrRanking(db, "week", now);

    expect(namesOf(ranking).sort()).toEqual(["Caio Martins", "Izabel Ramos", "Julia Tomaz"]);
    expect(ranking.every((item) => item.points === 1)).toBe(true);
  });

  it("passagens da campanha toda: Caio e Julia com 3, Izabel com 2", () => {
    expect(getSdrRanking(db, "all", now).map((sdr) => [sdr.name, sdr.points])).toEqual([
      ["Caio Martins", 3],
      ["Julia Tomaz", 3],
      ["Izabel Ramos", 2],
    ]);
  });
});

describe("mockBackend › meta e vendas do admin", () => {
  it("meta soma só as vendas ativas de todas as semanas", () => {
    expect(getGoalProgress(db)).toEqual({ goal: 3000000, total: 212000, percent: 7.07 });
  });

  it("/sales/admin traz todas as vendas, inclusive canceladas, da mais nova para a mais antiga, populadas", () => {
    const { data, total } = findAllSales(db);

    expect(total).toBe(18);
    expect(data[0]._id).toBe("sale-c6");
    expect(data.at(-1)._id).toBe("sale-x1");
    expect(data[0].vendorId).toEqual(expect.objectContaining({ vendorName: "Heitor Alves" }));
    expect(data.find((sale) => sale._id === "sale-c1").sdrIds.map((sdr) => sdr.name)).toEqual(["Izabel Ramos", "Lucas Daniel"]);
    expect(data.find((sale) => sale._id === "sale-c2").sdrIds).toEqual([]);
  });

  it("/sales/get/:vendorId traz todas as vendas do vendedor, de todas as semanas", () => {
    const { data, total } = findSalesByVendor(db, "vendor-gustavo");

    expect(total).toBe(3);
    expect(idsOf(data)).toEqual(["c3", "l1", "l2"]);
  });

  it("/sales/get traz só as vendas ativas da semana atual", () => {
    expect(idsOf(findActiveSalesOfCurrentWeek(db, now).data)).toEqual(["c1", "c2", "c3", "c4", "c5", "c7"]);
  });
});
