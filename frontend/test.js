const resData = [
  { _id: "1", date: "2026-06-19T18:30:00.000Z" }, // 20th June IST
  { _id: "2", date: "2026-06-05T18:30:00.000Z" }  // 6th June IST
];

const year = "2026";
const month = "06";
const daysInMonth = 30;

const completeRecords = [];
for (let i = 1; i <= daysInMonth; i++) {
  const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
  const existingRecord = resData.find((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return localDate === dateStr || r.date.startsWith(dateStr);
  });

  if (existingRecord) {
    completeRecords.push({ ...existingRecord, matchedOn: dateStr });
  } else {
    completeRecords.push({ _id: `absent_${dateStr}`, date: dateStr });
  }
}

// simulate the table map
completeRecords.forEach(r => {
  if (r._id.startsWith("absent")) {
    console.log("DUMMY", r.date);
  } else {
    console.log("REAL", r._id, "Matched On", r.matchedOn, "Rendered Date", new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  }
});
