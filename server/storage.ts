import { 
  users, patients, doctors, hospitals, healthRecords, doctorNotes,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type Doctor, type InsertDoctor,
  type Hospital, type InsertHospital,
  type HealthRecord, type InsertHealthRecord,
  type DoctorNote, type InsertDoctorNote
} from "@shared/schema";
import { db } from "./db";
import { eq, or, like, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Auth
  createUser(user: InsertUser): Promise<User>;
  getUserByRoleId(roleId: string, role: string): Promise<User | undefined>;
  
  // Patients
  getPatientById(id: string): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  getPatientWithRecords(patientId: string): Promise<any>;
  searchPatients(query: string, searchType: "id" | "name" | "phone"): Promise<any[]>;
  updatePatient(id: string, data: Partial<Patient>): Promise<Patient>;
  getAllPatients(): Promise<Patient[]>;
  
  // Doctors
  getDoctorsByHospital(hospitalId: string): Promise<Doctor[]>;
  getDoctorStats(): Promise<any>;
  
  // Hospitals
  getHospitalByHospitalId(hospitalId: string): Promise<Hospital | undefined>;
  
  // Health Records
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecordsByPatient(patientId: string): Promise<any[]>;
  getRecentRecordsByHospital(hospitalId: string): Promise<any[]>;
  updateHealthRecord(id: string, data: Partial<HealthRecord>): Promise<HealthRecord>;
  
  // Doctor Notes
  createDoctorNote(note: InsertDoctorNote): Promise<DoctorNote>;
}

export class DatabaseStorage implements IStorage {
  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async getUserByRoleId(roleId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.roleId, roleId), eq(users.role, role)));
    return user || undefined;
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) return undefined;
    
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, user[0].roleId));
    return patient || undefined;
  }

  async getPatientWithRecords(patientId: string): Promise<any> {
    const patient = await this.getPatientById(patientId);
    if (!patient) return null;

    const records = await db
      .select({
        id: healthRecords.id,
        patientId: healthRecords.patientId,
        hospitalId: healthRecords.hospitalId,
        doctorId: healthRecords.doctorId,
        dateTime: healthRecords.dateTime,
        diseaseName: healthRecords.diseaseName,
        diseaseDescription: healthRecords.diseaseDescription,
        treatment: healthRecords.treatment,
        prescription: healthRecords.prescription,
        riskLevel: healthRecords.riskLevel,
        emergencyWarnings: healthRecords.emergencyWarnings,
        mediaFiles: healthRecords.mediaFiles,
        isEditable: healthRecords.isEditable,
        editableUntil: healthRecords.editableUntil,
        createdAt: healthRecords.createdAt,
        updatedAt: healthRecords.updatedAt,
        hospital: hospitals,
        doctor: doctors,
      })
      .from(healthRecords)
      .leftJoin(hospitals, eq(healthRecords.hospitalId, hospitals.id))
      .leftJoin(doctors, eq(healthRecords.doctorId, doctors.id))
      .where(eq(healthRecords.patientId, patientId))
      .orderBy(desc(healthRecords.dateTime));

    return {
      ...patient,
      healthRecords: records,
    };
  }

  async searchPatients(query: string, searchType: "id" | "name" | "phone"): Promise<any[]> {
    let condition;
    
    if (searchType === "id") {
      condition = like(patients.patientId, `%${query}%`);
    } else if (searchType === "name") {
      condition = like(patients.name, `%${query}%`);
    } else {
      condition = like(patients.phone, `%${query}%`);
    }

    const results = await db
      .select()
      .from(patients)
      .where(condition)
      .limit(10);

    const withRecords = await Promise.all(
      results.map(async (patient) => {
        const records = await db
          .select({
            id: healthRecords.id,
            patientId: healthRecords.patientId,
            hospitalId: healthRecords.hospitalId,
            doctorId: healthRecords.doctorId,
            dateTime: healthRecords.dateTime,
            diseaseName: healthRecords.diseaseName,
            diseaseDescription: healthRecords.diseaseDescription,
            treatment: healthRecords.treatment,
            prescription: healthRecords.prescription,
            riskLevel: healthRecords.riskLevel,
            emergencyWarnings: healthRecords.emergencyWarnings,
            mediaFiles: healthRecords.mediaFiles,
            isEditable: healthRecords.isEditable,
            editableUntil: healthRecords.editableUntil,
            createdAt: healthRecords.createdAt,
            updatedAt: healthRecords.updatedAt,
            hospital: hospitals,
            doctor: doctors,
          })
          .from(healthRecords)
          .leftJoin(hospitals, eq(healthRecords.hospitalId, hospitals.id))
          .leftJoin(doctors, eq(healthRecords.doctorId, doctors.id))
          .where(eq(healthRecords.patientId, patient.id))
          .orderBy(desc(healthRecords.dateTime));

        return {
          ...patient,
          healthRecords: records,
        };
      })
    );

    return withRecords;
  }

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const [updated] = await db
      .update(patients)
      .set(data)
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(patients.name);
  }

  async getDoctorsByHospital(hospitalId: string): Promise<Doctor[]> {
    return await db
      .select()
      .from(doctors)
      .where(eq(doctors.hospitalId, hospitalId))
      .orderBy(doctors.name);
  }

  async getDoctorStats(): Promise<any> {
    const totalPatients = await db.select({ count: sql<number>`count(*)` }).from(patients);
    const recentCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(healthRecords)
      .where(sql`${healthRecords.dateTime} > NOW() - INTERVAL '30 days'`);

    return {
      totalPatients: totalPatients[0]?.count || 0,
      recentCases: recentCases[0]?.count || 0,
      pendingReviews: 0,
    };
  }

  async getHospitalByHospitalId(hospitalId: string): Promise<Hospital | undefined> {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.hospitalId, hospitalId));
    return hospital || undefined;
  }

  async createHealthRecord(insertRecord: InsertHealthRecord): Promise<HealthRecord> {
    const editableUntil = new Date();
    editableUntil.setHours(editableUntil.getHours() + 1);

    const [record] = await db
      .insert(healthRecords)
      .values({
        ...insertRecord,
        isEditable: true,
        editableUntil,
      })
      .returning();
    return record;
  }

  async getHealthRecordsByPatient(patientId: string): Promise<any[]> {
    return await db
      .select({
        id: healthRecords.id,
        patientId: healthRecords.patientId,
        hospitalId: healthRecords.hospitalId,
        doctorId: healthRecords.doctorId,
        dateTime: healthRecords.dateTime,
        diseaseName: healthRecords.diseaseName,
        diseaseDescription: healthRecords.diseaseDescription,
        treatment: healthRecords.treatment,
        prescription: healthRecords.prescription,
        riskLevel: healthRecords.riskLevel,
        emergencyWarnings: healthRecords.emergencyWarnings,
        mediaFiles: healthRecords.mediaFiles,
        isEditable: healthRecords.isEditable,
        editableUntil: healthRecords.editableUntil,
        createdAt: healthRecords.createdAt,
        updatedAt: healthRecords.updatedAt,
        hospital: hospitals,
        doctor: doctors,
      })
      .from(healthRecords)
      .leftJoin(hospitals, eq(healthRecords.hospitalId, hospitals.id))
      .leftJoin(doctors, eq(healthRecords.doctorId, doctors.id))
      .where(eq(healthRecords.patientId, patientId))
      .orderBy(desc(healthRecords.dateTime));
  }

  async getRecentRecordsByHospital(hospitalId: string): Promise<any[]> {
    return await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.hospitalId, hospitalId))
      .orderBy(desc(healthRecords.createdAt))
      .limit(10);
  }

  async updateHealthRecord(id: string, data: Partial<HealthRecord>): Promise<HealthRecord> {
    const [updated] = await db
      .update(healthRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(healthRecords.id, id))
      .returning();
    return updated;
  }

  async createDoctorNote(insertNote: InsertDoctorNote): Promise<DoctorNote> {
    const [note] = await db
      .insert(doctorNotes)
      .values(insertNote)
      .returning();
    return note;
  }
}

export const storage = new DatabaseStorage();
