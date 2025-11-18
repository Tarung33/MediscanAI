import { connectDb } from "./db"; // ensure DB connected
import bcrypt from "bcryptjs";
import {
  Hospitals,
  Doctors,
  Patients,
  HealthRecords,
  Users,
  DoctorNotes,
} from "@shared/schema";

async function seed() {
  try {
    await connectDb();
    console.log("🌱 Starting database seed...");

    // Clear existing data
    await HealthRecords.deleteMany({});
    await DoctorNotes.deleteMany({});
    await Patients.deleteMany({});
    await Doctors.deleteMany({});
    await Hospitals.deleteMany({});
    await Users.deleteMany({});

    console.log("✅ Cleared existing data");

    // Create 2 hospitals in Chikkamagalur
    const hospital1 = await Hospitals.create({
      id: `h-${Date.now()}-1`,
      hospitalId: "HOSP001",
      name: "Chikkamagalur District Hospital",
      location: "Chikkamagalur, Karnataka",
      contactNumber: "+91 8262 220100",
      email: "contact@cdh.gov.in",
    });

    const hospital2 = await Hospitals.create({
      id: `h-${Date.now()}-2`,
      hospitalId: "HOSP002",
      name: "Sri Siddhartha Medical College",
      location: "Chikkamagalur, Karnataka",
      contactNumber: "+91 8262 221456",
      email: "info@ssmch.ac.in",
    });

    console.log("✅ Created 2 hospitals");

    // Create 10 doctors (5 per hospital)
    const doctorData = [
      // Hospital 1 doctors
      { name: "Dr. Rajesh Kumar", specialization: "Cardiology", hospitalId: hospital1.id },
      { name: "Dr. Priya Sharma", specialization: "Neurology", hospitalId: hospital1.id },
      { name: "Dr. Arjun Reddy", specialization: "Orthopedics", hospitalId: hospital1.id },
      { name: "Dr. Lakshmi Rao", specialization: "Pediatrics", hospitalId: hospital1.id },
      { name: "Dr. Suresh Naik", specialization: "General Medicine", hospitalId: hospital1.id },
      // Hospital 2 doctors
      { name: "Dr. Manjunath Gowda", specialization: "Surgery", hospitalId: hospital2.id },
      { name: "Dr. Sneha Patil", specialization: "Gynecology", hospitalId: hospital2.id },
      { name: "Dr. Vikram Shetty", specialization: "Dermatology", hospitalId: hospital2.id },
      { name: "Dr. Anitha Murthy", specialization: "Ophthalmology", hospitalId: hospital2.id },
      { name: "Dr. Kiran Hegde", specialization: "ENT", hospitalId: hospital2.id },
    ];

    const createdDoctors = await Doctors.create(
      doctorData.map((doc, idx) => ({
        id: `doc-${Date.now()}-${idx}`,
        doctorId: `DOC${String(idx + 1).padStart(3, "0")}`,
        name: doc.name,
        specialization: doc.specialization,
        hospitalId: doc.hospitalId,
        contactNumber: `+91 98${Math.floor(Math.random() * 90000000 + 10000000)}`,
        email: doc.name.toLowerCase().replace(/\s+/g, ".").replace("dr.", "") + "@hospital.com",
      }))
    );

    console.log("✅ Created 10 doctors");

    // Create 200 patients (100 per hospital)
    const firstNames = ["Arun", "Bhavani", "Chetan", "Deepa", "Esha", "Farhan", "Geeta", "Hari", "Indira", "Jagdish",
      "Kavya", "Lakshmana", "Manoj", "Nandini", "Omar", "Pooja", "Qasim", "Radha", "Sanjay", "Tanvi",
      "Uma", "Vijay", "Waqar", "Yashoda", "Zara"];
    
    const lastNames = ["Acharya", "Bhat", "Desai", "Gowda", "Hegde", "Iyer", "Joshi", "Kulkarni", "Murthy", "Naik",
      "Patel", "Reddy", "Shetty", "Rao", "Verma"];

    const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
    const genders = ["Male", "Female"];

    const patientRecords = [];
    for (let i = 0; i < 200; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      patientRecords.push({
        patientId: `PT${String(i + 1).padStart(4, "0")}`,
        name,
        age: Math.floor(Math.random() * 70) + 10,
        gender: genders[Math.floor(Math.random() * genders.length)],
        phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
        address: `${Math.floor(Math.random() * 999) + 1}, MG Road, Chikkamagalur, Karnataka`,
        emergencyContact: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      });
    }

    const createdPatients = await Patients.create(
      patientRecords.map((p, idx) => ({
        id: `pt-${Date.now()}-${idx}`,
        ...p,
      }))
    );
    console.log("✅ Created 200 patients");

    // Create health records for patients (1-5 records per patient)
    const diseases = [
      { name: "Acute Bronchitis", desc: "Inflammation of the bronchial tubes", risk: "medium", warning: "Monitor breathing difficulty" },
      { name: "Hypertension", desc: "Elevated blood pressure", risk: "high", warning: "Regular BP monitoring required" },
      { name: "Type 2 Diabetes", desc: "Chronic metabolic disorder", risk: "high", warning: "Maintain blood sugar levels" },
      { name: "Migraine", desc: "Severe recurring headaches", risk: "low", warning: "" },
      { name: "Gastritis", desc: "Stomach lining inflammation", risk: "low", warning: "Avoid spicy foods" },
      { name: "Arthritis", desc: "Joint inflammation", risk: "medium", warning: "Physical therapy recommended" },
      { name: "Asthma", desc: "Respiratory condition", risk: "medium", warning: "Keep inhaler available" },
      { name: "Dengue Fever", desc: "Mosquito-borne viral infection", risk: "high", warning: "Monitor platelet count" },
      { name: "Pneumonia", desc: "Lung infection", risk: "high", warning: "Complete antibiotic course" },
      { name: "Thyroid Disorder", desc: "Hormone imbalance", risk: "medium", warning: "Regular medication required" },
      { name: "Urinary Tract Infection", desc: "Bacterial infection of urinary system", risk: "low", warning: "Increase water intake" },
      { name: "Anemia", desc: "Low hemoglobin levels", risk: "medium", warning: "Iron supplementation needed" },
      { name: "Appendicitis", desc: "Inflammation of appendix", risk: "critical", warning: "Immediate surgical intervention required" },
      { name: "Fracture (Radius)", desc: "Broken bone in forearm", risk: "medium", warning: "Keep cast dry" },
      { name: "Common Cold", desc: "Viral upper respiratory infection", risk: "low", warning: "" },
    ];

    const treatments = [
      "Prescribed antibiotics and rest",
      "Lifestyle modifications and medication",
      "Insulin therapy and diet control",
      "Pain management and rest",
      "Antacids and dietary changes",
      "Physical therapy sessions",
      "Bronchodilators and steroids",
      "Supportive care and hydration",
      "Antibiotics and oxygen therapy",
      "Hormone replacement therapy",
      "Antibiotics course",
      "Iron supplements and diet",
      "Surgical removal",
      "Casting and immobilization",
      "Symptomatic treatment",
    ];

    const healthRecordData: any[] = [];
    for (const patient of createdPatients) {
      const numRecords = Math.floor(Math.random() * 5) + 1;
      const hospital = Math.random() < 0.5 ? hospital1 : hospital2;
      const availableDoctors = createdDoctors.filter((d: any) => d.hospitalId === hospital.id);

      for (let i = 0; i < numRecords; i++) {
        const disease = diseases[Math.floor(Math.random() * diseases.length)];
        const doctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];
        const daysAgo = Math.floor(Math.random() * 365);
        const dateTime = new Date();
        dateTime.setDate(dateTime.getDate() - daysAgo);

        healthRecordData.push({
          id: `hr-${Date.now()}-${Math.random()}`,
          patientId: (patient as any).id,
          hospitalId: hospital.id,
          doctorId: (doctor as any).id,
          dateTime,
          diseaseName: disease.name,
          diseaseDescription: disease.desc,
          treatment: treatments[Math.floor(Math.random() * treatments.length)],
          prescription: `Medication prescribed as per treatment protocol`,
          riskLevel: disease.risk as any,
          emergencyWarnings: disease.warning || null,
          isEditable: daysAgo === 0,
          editableUntil: daysAgo === 0 ? new Date(Date.now() + 3600000) : null,
        });
      }
    }

    await HealthRecords.create(healthRecordData);
    console.log(`✅ Created ${healthRecordData.length} health records`);

    // Create demo users for testing
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    await Users.create([
      {
        id: `u-${Date.now()}-1`,
        name: "Dr. Rajesh Kumar",
        role: "doctor",
        roleId: "DOC001",
        password: hashedPassword,
        email: "rajesh.kumar@hospital.com",
      },
      {
        id: `u-${Date.now()}-2`,
        name: (createdPatients as any)[0].name,
        role: "patient",
        roleId: (createdPatients as any)[0].patientId,
        password: hashedPassword,
        phone: (createdPatients as any)[0].phone,
        age: (createdPatients as any)[0].age,
      },
      {
        id: `u-${Date.now()}-3`,
        name: "Admin - CDH",
        role: "hospital",
        roleId: "HOSP001",
        password: hashedPassword,
        email: "admin@cdh.gov.in",
      },
    ]);

    console.log("✅ Created demo users (password: password123)");
    console.log("\n🎉 Database seeded successfully!");
    console.log("\nDemo Credentials:");
    console.log("Doctor: DOC001 / password123");
    console.log(`Patient: ${createdPatients[0].patientId} / password123`);
    console.log("Hospital: HOSP001 / password123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
