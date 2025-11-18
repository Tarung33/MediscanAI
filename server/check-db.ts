import { connectDb } from "./db"; // connects using MONGODB_URI
import { db } from "./db";
import { Hospitals, Doctors, Patients, HealthRecords, Users, DoctorNotes } from "../shared/schema";

async function check() {
  try {
    await connectDb();
    console.log("Checking MongoDB collections...");
    const counts = await Promise.all([
      Hospitals.countDocuments(),
      Doctors.countDocuments(),
      Patients.countDocuments(),
      HealthRecords.countDocuments(),
      Users.countDocuments(),
      DoctorNotes.countDocuments(),
    ]);

    console.log(`Hospitals: ${counts[0]}`);
    console.log(`Doctors: ${counts[1]}`);
    console.log(`Patients: ${counts[2]}`);
    console.log(`HealthRecords: ${counts[3]}`);
    console.log(`Users: ${counts[4]}`);
    console.log(`DoctorNotes: ${counts[5]}`);
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error("Error connecting or querying DB:", err && (err as any).message ? (err as any).message : err);
    try { await db.close(); } catch(e) {}
    process.exit(1);
  }
}

check();
