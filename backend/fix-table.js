import fs from 'fs';
const file = 'src/controllers/attendance.controller.js';
let content = fs.readFileSync(file, 'utf8');

// Replace exact date match with range match for getAllAttendance
content = content.replace(
  /const records = await Attendance\.find\(\{ date: targetDate \}\)/,
  `const startOfDay = new Date(targetDate);\n    startOfDay.setHours(0, 0, 0, 0);\n    const endOfDay = new Date(targetDate);\n    endOfDay.setHours(23, 59, 59, 999);\n\n    const records = await Attendance.find({ date: { $gte: startOfDay, $lte: endOfDay } })`
);

fs.writeFileSync(file, content);
console.log("Fixed getAllAttendance date query!");
