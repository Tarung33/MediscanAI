import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generatePatientSummary } from "./openai";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertHealthRecordSchema, insertDoctorNoteSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existing = await storage.getUserByRoleId(validatedData.roleId, validatedData.role);
      if (existing) {
        return res.status(400).json({ message: "User with this ID already exists" });
      }

      const user = await storage.createUser(validatedData);
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { roleId, password, role } = req.body;
      
      const user = await storage.getUserByRoleId(roleId, role);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  // Patient routes
  app.get("/api/patients/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const searchType = req.query.type as "id" | "name" | "phone" || "name";
      
      if (!query) {
        return res.json([]);
      }

      const results = await storage.searchPatients(query, searchType);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Search failed" });
    }
  });

  app.get("/api/patients/me", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const patientWithRecords = await storage.getPatientWithRecords(patient.id);
      res.json(patientWithRecords);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch patient data" });
    }
  });

  app.patch("/api/patients/me", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const updated = await storage.updatePatient(patient.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Update failed" });
    }
  });

  app.get("/api/patients/all", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch patients" });
    }
  });

  // Doctor routes
  app.get("/api/doctors/stats", async (req, res) => {
    try {
      const stats = await storage.getDoctorStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stats" });
    }
  });

  app.get("/api/doctors/hospital", async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string;
      if (!hospitalId) {
        return res.status(400).json({ message: "Hospital ID required" });
      }

      const doctors = await storage.getDoctorsByHospital(hospitalId);
      res.json(doctors);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch doctors" });
    }
  });

  // Health Records routes
  app.post("/api/health-records", async (req, res) => {
    try {
      const validatedData = insertHealthRecordSchema.parse(req.body);
      const record = await storage.createHealthRecord(validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create record" });
    }
  });

  app.get("/api/health-records/recent", async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string;
      if (!hospitalId) {
        return res.status(400).json({ message: "Hospital ID required" });
      }

      const records = await storage.getRecentRecordsByHospital(hospitalId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch records" });
    }
  });

  app.patch("/api/health-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateHealthRecord(id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Update failed" });
    }
  });

  // Doctor Notes routes
  app.post("/api/notes", async (req, res) => {
    try {
      const validatedData = insertDoctorNoteSchema.parse(req.body);
      const note = await storage.createDoctorNote(validatedData);
      res.json(note);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add note" });
    }
  });

  // AI Summarization route
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID required" });
      }

      const patient = await storage.getPatientWithRecords(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Format patient history for AI
      const historyText = patient.healthRecords.map((record: any) => {
        return `Date: ${new Date(record.dateTime).toLocaleDateString()}
Hospital: ${record.hospital.name}
Doctor: ${record.doctor.name}
Disease: ${record.diseaseName}
Description: ${record.diseaseDescription}
Treatment: ${record.treatment || "N/A"}
Risk Level: ${record.riskLevel}
${record.emergencyWarnings ? `Warnings: ${record.emergencyWarnings}` : ""}
---`;
      }).join("\n\n");

      const summary = await generatePatientSummary(historyText);
      res.json({ summary });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate summary" });
    }
  });

  // Face Recognition route (demo - returns mock patient)
  app.post("/api/face-recognition", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      if (patients.length === 0) {
        return res.status(404).json({ message: "No patients found" });
      }

      const demoPatient = patients[0];
      const patientWithRecords = await storage.getPatientWithRecords(demoPatient.id);
      res.json(patientWithRecords);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Recognition failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
