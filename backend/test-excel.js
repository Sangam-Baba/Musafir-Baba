const xlsx = require('xlsx');
const headers = ["Country", "Country Code (Optional)", "State", "State Code (Optional)", "City", "PIN Code", "Location"];
const data = [
  headers,
  ["India", "", "Uttar Pradesh", "", "Lucknow", "226010", "Gomti Nagar"],
  ["", "", "", "", "", "", ""]
];
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, "Sample");
const json = xlsx.utils.sheet_to_json(ws, { defval: "" });
console.log(json);
