const date = "2026-06-01";
const targetDateStart = new Date(date);
targetDateStart.setHours(0, 0, 0, 0);
const targetDateEnd = new Date(date);
targetDateEnd.setHours(23, 59, 59, 999);

console.log("targetDateStart:", targetDateStart.toISOString());
console.log("targetDateEnd:", targetDateEnd.toISOString());

const [year, m] = "2026-06".split('-');
const startDate = new Date(year, m - 1, 1);
const endDate = new Date(year, m, 0, 23, 59, 59, 999);

console.log("startDate:", startDate.toISOString());
console.log("endDate:", endDate.toISOString());
