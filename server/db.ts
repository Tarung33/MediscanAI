 import 'dotenv/config';
import mongoose from "mongoose";

// ensure env loaded (dotenv/config above) so scripts that import this file directly
// will have `process.env.MONGODB_URI` available
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI must be set. Add it to your .env or environment variables.");
}

mongoose.set("strictQuery", false);

export async function connectDb() {
  await mongoose.connect(uri as string, {
    serverSelectionTimeoutMS: 30000, // Increase server selection timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
    bufferCommands: true, // Enable mongoose buffering
  });
  return mongoose.connection;
}

// Remove the auto-connect on import

export const db = mongoose.connection;
