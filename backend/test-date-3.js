const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};
console.log("getStartOfDay():", getStartOfDay().toISOString());

const d = new Date("2026-05-30");
d.setHours(0,0,0,0);
console.log("new Date('YYYY-MM-DD'):", d.toISOString());
