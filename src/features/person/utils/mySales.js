const sumValues = (sales) => sales.reduce((total, sale) => total + (sale.value ?? 0), 0);

export function summarizeMySales(sales) {
  const active = sales.filter((sale) => sale.dealStatus === "ativa");
  const total = sumValues(active);

  return {
    total,
    count: active.length,
    average: active.length ? total / active.length : 0,
    cancelled: sales.filter((sale) => sale.dealStatus === "cancelada").length,
  };
}
