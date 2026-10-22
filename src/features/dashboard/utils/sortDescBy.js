export const sortDescBy = (field) => (items) => [...items].sort((a, b) => b[field] - a[field]);
