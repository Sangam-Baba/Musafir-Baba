const d = new Date();
console.log("Current time:", d.toISOString());
d.setHours(0, 0, 0, 0);
console.log("targetDate:", d.toISOString());
