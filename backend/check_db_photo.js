import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const attendanceSchema = new mongoose.Schema({}, { strict: false });
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function run() {
  try {
    const records = await Attendance.find().sort({ createdAt: -1 }).limit(3);
    records.forEach(r => {
      console.log(`User: ${r.staff}`);
      console.log(`Check In Photo: ${r.checkInPhotoUrl}`);
      console.log(`Check Out Photo: ${r.checkOutPhotoUrl}`);
      console.log('---');
    });
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}
run();
