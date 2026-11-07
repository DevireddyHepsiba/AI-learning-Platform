import mongoose from "mongoose";

mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in environment");
    }

    // Use sensible server selection timeout so failures surface quickly
    const conn = await mongoose.connect(uri, {
      // modern Mongoose no longer accepts `useNewUrlParser` or `useUnifiedTopology` options
      // keep only server selection timeout so failures surface quickly
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("MongoDB connection error:", err && err.message ? err.message : err);
    // rethrow so caller can decide what to do (and avoid silent buffering)
    throw err;
  }
};

export default connectDB;
