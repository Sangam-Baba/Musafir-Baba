import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const attendanceSchema = new mongoose.Schema({}, { strict: false });
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function run() {
  try {
    const records = await Attendance.find().sort({ updatedAt: -1 }).limit(1);
    records.forEach(r => {
      console.log(`User: ${r.staff}, Date: ${r.date}`);
      if (r.checkInLocation) {
        console.log(`Check In: Lat: ${r.checkInLocation.lat}, Lng: ${r.checkInLocation.lng}, Distance: ${r.checkInLocation.distance}`);
      }
      if (r.checkOutLocation) {
        console.log(`Check Out: Lat: ${r.checkOutLocation.lat}, Lng: ${r.checkOutLocation.lng}, Distance: ${r.checkOutLocation.distance}`);
      }
      console.log('---');
    });
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}
run();
