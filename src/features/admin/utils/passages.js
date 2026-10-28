export function getPassagePeople(sale) {
  if (Array.isArray(sale.sdrIds)) {
    return sale.sdrIds.filter(Boolean);
  }

  return sale.sdrId ? [sale.sdrId] : [];
}

export function formatPassageNames(sale) {
  return getPassagePeople(sale)
    .map((person) => person.name)
    .filter(Boolean)
    .join(", ");
}
