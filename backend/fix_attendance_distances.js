import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const attendanceSchema = new mongoose.Schema({}, { strict: false });
const Attendance = mongoose.model('Attendance', attendanceSchema);

const OFFICE_LAT = 28.611123809619;
const OFFICE_LNG = 76.9749109459618;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

async function run() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await Attendance.find({ date: today });
    
    for (const r of records) {
      let updated = false;
      if (r.checkInLocation && r.checkInLocation.lat) {
        r.checkInLocation.distance = calculateDistance(r.checkInLocation.lat, r.checkInLocation.lng, OFFICE_LAT, OFFICE_LNG);
        updated = true;
      }
      if (r.checkOutLocation && r.checkOutLocation.lat) {
        r.checkOutLocation.distance = calculateDistance(r.checkOutLocation.lat, r.checkOutLocation.lng, OFFICE_LAT, OFFICE_LNG);
        updated = true;
      }
      if (updated) {
        await Attendance.updateOne({ _id: r._id }, { $set: { checkInLocation: r.checkInLocation, checkOutLocation: r.checkOutLocation } });
        console.log(`Updated distances for ${r._id}`);
      }
    }
    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}
run();
