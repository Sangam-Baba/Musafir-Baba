import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from './src/models/User.js';
import { Staff } from './src/models/Staff.js';
import { Session } from './src/models/Session.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const admin = await Staff.findOne({ role: { $in: ['admin', 'superadmin'] } }).lean();
  if (!admin) {
    console.log("No admin found");
    process.exit(1);
  }

  const token = jwt.sign(
    { _id: admin._id, name: admin.name, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" }
  );
  
  // Create a valid session
  const session = await Session.create({
    userId: admin._id,
    token: token,
    role: admin.role,
    expiresAt: new Date(Date.now() + 3600000)
  });

  console.log("Got token for:", admin.name);

  // Get a webpage
  const { WebPage } = await import('./src/models/WebPage.js');
  const page = await WebPage.findOne().lean();

  console.log("Updating webpage:", page.title);

  // Send request
  try {
    const res = await axios.patch(
      `http://localhost:8000/api/webpage/${page._id}`,
      { title: page.title + " test2" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Response:", res.data.success);
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
  }
  
  // Cleanup session
  await Session.deleteOne({ _id: session._id });
  process.exit(0);
}

test();
