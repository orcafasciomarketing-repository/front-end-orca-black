const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}
