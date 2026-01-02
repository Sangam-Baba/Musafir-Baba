import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.log("not connected");
    process.exit(1);
  }
};

export default connectDb;
