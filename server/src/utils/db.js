import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connect to MongoDB Successfully")
  } catch (err) {
    console.log("MONGO DB connection failed in dbIndex.js ", err);
    process.exit(1);
  }
};

export default connectDB;
