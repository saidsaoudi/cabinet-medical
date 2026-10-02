// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path2 from "path";
import fs2 from "fs";
import dotenv from "dotenv";

// src/apiRouter.ts
import { Router } from "express";

// src/db/localDb.ts
import fs from "fs";
import path from "path";
var DB_DIR = process.env.VERCEL ? "/tmp/data" : path.resolve("./data");
var DB_FILE = path.join(DB_DIR, "db.json");
var DEFAULT_SCHEDULE = [
  { weekday: 1, dayName: "Lundi", isClosed: false, slots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], slotDuration: 30 },
  { weekday: 2, dayName: "Mardi", isClosed: false, slots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], slotDuration: 30 },
  { weekday: 3, dayName: "Mercredi", isClosed: false, slots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], slotDuration: 30 },
  { weekday: 4, dayName: "Jeudi", isClosed: false, slots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], slotDuration: 30 },
  { weekday: 5, dayName: "Vendredi", isClosed: false, slots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], slotDuration: 30 },
  { weekday: 6, dayName: "Samedi", isClosed: false, slots: [{ start: "09:00", end: "13:00" }], slotDuration: 30 },
  { weekday: 0, dayName: "Dimanche", isClosed: true, slots: [], slotDuration: 30 }
];
var DEFAULT_CONFIG = {
  name: "Dr. Sofia El Alami",
  title: "Allergologue, G\xE9riatre & M\xE9decin G\xE9n\xE9raliste",
  email: "contact@dr-elalami.ma",
  phone: "+212 522 45 67 89",
  whatsapp: "+212 661 23 45 67",
  address: "145 Boulevard d'Anfa, \xC9tage 3, Appt 12, Casablanca (\xE0 c\xF4t\xE9 de la station de tramway)",
  bio: "Dipl\xF4m\xE9e de la Facult\xE9 de M\xE9decine de Casablanca, sp\xE9cialis\xE9e en Allergologie et en G\xE9riatrie Clinique. Plus de 12 ans d'exp\xE9rience au service de la sant\xE9 des familles \xE0 Casablanca. Notre cabinet s'engage \xE0 offrir une \xE9coute attentive et des soins personnalis\xE9s de haute qualit\xE9, pour les petits comme pour les grands.",
  languages: ["Fran\xE7ais", "Arabe", "Anglais"],
  qualifications: [
    "Dipl\xF4me de Sp\xE9cialit\xE9 en Allergologie - Facult\xE9 de M\xE9decine",
    "Dipl\xF4me Interuniversitaire de G\xE9rontologie et G\xE9riatrie Clinique",
    "Ancien Interne des H\xF4pitaux Universitaires de Casablanca",
    "Membre de la Soci\xE9t\xE9 Marocaine d'Allergologie et d'Immunologie Clinique"
  ],
  tariffs: [
    { specialty: "Consultation M\xE9decine G\xE9n\xE9rale", price: "250 DH" },
    { specialty: "Consultation Allergologie (+ Tests Cutan\xE9s)", price: "400 DH" },
    { specialty: "Consultation G\xE9riatrie / Bilan Cognitif complet", price: "450 DH" },
    { specialty: "T\xE9l\xE9consultation (Allergies / Suivis)", price: "300 DH" },
    { specialty: "Visite \xE0 domicile G\xE9riatrique", price: "600 DH" }
  ],
  enableTeleconsultation: true,
  enableDomicile: true
};
var INITIAL_APPOINTMENTS = [
  {
    id: "apt_1",
    patientName: "Karim Benchakroun",
    patientPhone: "+212612345678",
    patientEmail: "k.benchakroun@gmail.com",
    patientDob: "1948-05-12",
    specialtyId: "geriatrie",
    consultationType: "cabinet",
    date: new Date(Date.now() + 864e5 * 2).toISOString().split("T")[0],
    // 2 days in future
    time: "10:00",
    status: "PENDING",
    reason: "Suivi cognitif trimestriel et renouvellement d'ordonnance",
    patientMessage: "Il est un peu fatigu\xE9 ces derniers temps, merci.",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "apt_2",
    patientName: "Yasmine Filali",
    patientPhone: "+212676543210",
    patientEmail: "yasmine.filali@outlook.com",
    patientDob: "1994-09-18",
    specialtyId: "allergologie",
    consultationType: "cabinet",
    date: new Date(Date.now() + 864e5).toISOString().split("T")[0],
    // tomorrow
    time: "14:30",
    status: "CONFIRMED",
    reason: "Suspicion d'allergie respiratoire au pollen",
    createdAt: new Date(Date.now() - 36e5 * 5).toISOString(),
    confirmedAt: new Date(Date.now() - 36e5 * 4).toISOString()
  },
  {
    id: "apt_3",
    patientName: "Amine Chraibi",
    patientPhone: "+212655555555",
    patientEmail: "chraibi.amine@yahoo.com",
    patientDob: "1982-11-30",
    specialtyId: "general",
    consultationType: "teleconsultation",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    // today
    time: "11:30",
    status: "CONFIRMED",
    reason: "Consultation g\xE9n\xE9rale pour \xE9tat grippal",
    createdAt: new Date(Date.now() - 36e5 * 2).toISOString(),
    confirmedAt: new Date(Date.now() - 36e5).toISOString()
  }
];
var lockPromise = Promise.resolve();
function acquireLock() {
  let release;
  const newLock = new Promise((resolve) => {
    release = resolve;
  });
  const currentLock = lockPromise;
  lockPromise = lockPromise.then(() => newLock);
  return currentLock.then(() => release);
}
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      appointments: INITIAL_APPOINTMENTS,
      schedule: DEFAULT_SCHEDULE,
      blockedDates: [],
      config: DEFAULT_CONFIG,
      smsLogs: [
        {
          id: "sms_1",
          appointmentId: "apt_2",
          patientName: "Yasmine Filali",
          phone: "+212676543210",
          message: "Bonjour Yasmine, votre rendez-vous m\xE9dical est confirm\xE9 pour le " + new Date(Date.now() + 864e5).toLocaleDateString("fr-FR") + " \xE0 14:30. Merci de vous pr\xE9senter au cabinet.",
          type: "CONFIRMATION",
          provider: "simulated",
          status: "DELIVERED",
          sentAt: new Date(Date.now() - 36e5 * 4).toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    console.log("Database initialized successfully at:", DB_FILE);
  }
}
async function readDb() {
  const release = await acquireLock();
  try {
    if (!fs.existsSync(DB_FILE)) {
      initDb();
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read database:", error);
    return {
      appointments: [],
      schedule: DEFAULT_SCHEDULE,
      blockedDates: [],
      config: DEFAULT_CONFIG,
      smsLogs: []
    };
  } finally {
    release();
  }
}
async function writeDb(data) {
  const release = await acquireLock();
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = DB_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Failed to write to database:", error);
    throw new Error("Erreur d'\xE9criture dans la base de donn\xE9es.");
  } finally {
    release();
  }
}

// src/lib/sms.ts
var NotificationService = class {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || "simulated";
  }
  async createSmsLog(appointment, message, type, status, errorMessage) {
    const log = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      appointmentId: appointment.id,
      patientName: appointment.patientName,
      phone: appointment.patientPhone,
      message,
      type,
      provider: this.provider,
      status,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      errorMessage
    };
    try {
      const db = await readDb();
      db.smsLogs.unshift(log);
      await writeDb(db);
    } catch (err) {
      console.error("Failed to write SMS log to database:", err);
    }
    return log;
  }
  async sendAppointmentConfirmed(appointment) {
    const timeFr = appointment.time;
    const dateFr = new Date(appointment.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const message = `Bonjour ${appointment.patientName}, votre rendez-vous m\xE9dical avec le Dr. El Alami est CONFIRM\xC9 pour le ${dateFr} \xE0 ${timeFr}. Cabinet \xE0 Casablanca, 145 Bd d'Anfa.`;
    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);
    let status = "SENT";
    let errorMessage;
    if (this.provider !== "simulated" && !process.env.SMS_API_KEY) {
      status = "FAILED";
      errorMessage = "SMS_API_KEY is missing in environment variables.";
    } else {
      status = "DELIVERED";
    }
    return this.createSmsLog(appointment, message, "CONFIRMATION", status, errorMessage);
  }
  async sendAppointmentRejected(appointment, reason) {
    const dateFr = new Date(appointment.date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const reasonText = reason ? ` (Motif : ${reason})` : "";
    const message = `Bonjour ${appointment.patientName}, votre demande de rendez-vous pour le ${dateFr} \xE0 ${appointment.time} n'a pas pu \xEAtre confirm\xE9e par le cabinet${reasonText}. Merci de nous contacter pour choisir un autre cr\xE9neau.`;
    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);
    let status = "DELIVERED";
    return this.createSmsLog(appointment, message, "REJECTION", status);
  }
  async sendAppointmentReminder(appointment) {
    const message = `Rappel : Bonjour ${appointment.patientName}, vous avez rendez-vous avec le Dr. El Alami demain \xE0 ${appointment.time}. En cas d'emp\xEAchement, merci de nous pr\xE9venir au plus vite.`;
    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);
    let status = "DELIVERED";
    return this.createSmsLog(appointment, message, "REMINDER", status);
  }
  async sendAppointmentCancelled(appointment, cancelledBy) {
    const dateFr = new Date(appointment.date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const entity = cancelledBy === "patient" ? "le patient" : "le cabinet";
    const message = `Bonjour ${appointment.patientName}, votre rendez-vous du ${dateFr} \xE0 ${appointment.time} a \xE9t\xE9 annul\xE9 par ${entity}.`;
    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);
    let status = "DELIVERED";
    return this.createSmsLog(appointment, message, "CANCELLATION", status);
  }
};
var smsService = new NotificationService();

// src/apiRouter.ts
var router = Router();
var DOCTOR_TOKEN = "alami_doctor_token_2026";
var requireDoctorAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ") && authHeader.split("Bearer ")[1] === DOCTOR_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Non autoris\xE9 : Acc\xE8s m\xE9decin requis" });
  }
};
router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const validUsername = process.env.DOCTOR_USER || "doctor@alami.ma";
  const validPassword = process.env.DOCTOR_PASSWORD || "casablanca2026";
  if (username === validUsername && password === validPassword) {
    res.json({ success: true, token: DOCTOR_TOKEN, doctor: { name: "Dr. Sofia El Alami", email: validUsername } });
  } else {
    res.status(401).json({ success: false, error: "Identifiants incorrects (Email ou Mot de passe)" });
  }
});
router.get("/doctor/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ") && authHeader.split("Bearer ")[1] === DOCTOR_TOKEN) {
    res.json({ success: true, loggedIn: true, doctor: { name: "Dr. Sofia El Alami", email: "doctor@alami.ma" } });
  } else {
    res.json({ success: false, loggedIn: false });
  }
});
router.get("/doctor/config", async (req, res) => {
  try {
    const db = await readDb();
    res.json({ success: true, config: db.config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/doctor/config", requireDoctorAuth, async (req, res) => {
  try {
    const db = await readDb();
    db.config = { ...db.config, ...req.body };
    await writeDb(db);
    res.json({ success: true, config: db.config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/doctor/schedule", async (req, res) => {
  try {
    const db = await readDb();
    res.json({ success: true, schedule: db.schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/doctor/schedule", requireDoctorAuth, async (req, res) => {
  try {
    const db = await readDb();
    db.schedule = req.body;
    await writeDb(db);
    res.json({ success: true, schedule: db.schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/doctor/blocked-dates", async (req, res) => {
  try {
    const db = await readDb();
    res.json({ success: true, blockedDates: db.blockedDates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/doctor/blocked-dates", requireDoctorAuth, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, error: "La date est requise" });
    const db = await readDb();
    if (db.blockedDates.some((b) => b.date === date)) {
      return res.status(400).json({ success: false, error: "Cette date est d\xE9j\xE0 bloqu\xE9e" });
    }
    const blocked = {
      id: `blk_${Date.now()}`,
      date,
      reason: reason || "Cong\xE9 / Indisponibilit\xE9"
    };
    db.blockedDates.push(blocked);
    await writeDb(db);
    res.json({ success: true, blockedDate: blocked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/doctor/blocked-dates/:id", requireDoctorAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    db.blockedDates = db.blockedDates.filter((b) => b.id !== id);
    await writeDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/doctor/sms-logs", requireDoctorAuth, async (req, res) => {
  try {
    const db = await readDb();
    res.json({ success: true, smsLogs: db.smsLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/appointments", requireDoctorAuth, async (req, res) => {
  try {
    const db = await readDb();
    const sorted = [...db.appointments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, appointments: sorted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/public/available-slots", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ success: false, error: "Le param\xE8tre date (YYYY-MM-DD) est requis" });
    }
    const db = await readDb();
    const isBlocked = db.blockedDates.some((b) => b.date === date);
    if (isBlocked) {
      return res.json({ success: true, slots: [] });
    }
    const targetDate = new Date(date);
    const weekday = targetDate.getDay();
    const daySched = db.schedule.find((s) => s.weekday === weekday);
    if (!daySched || daySched.isClosed) {
      return res.json({ success: true, slots: [] });
    }
    const duration = daySched.slotDuration || 30;
    const allSlots = [];
    daySched.slots.forEach((range) => {
      const [startH, startM] = range.start.split(":").map(Number);
      const [endH, endM] = range.end.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      while (currentMinutes + duration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeString = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        allSlots.push(timeString);
        currentMinutes += duration;
      }
    });
    const existingAppointments = db.appointments.filter(
      (apt) => apt.date === date && apt.status !== "REJECTED" && apt.status !== "CANCELLED"
    );
    const takenTimes = existingAppointments.map((apt) => apt.time);
    const availableSlots = allSlots.filter((time) => !takenTimes.includes(time));
    res.json({ success: true, slots: availableSlots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/appointments", async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      patientEmail,
      patientDob,
      specialtyId,
      consultationType,
      date,
      time,
      reason,
      patientMessage
    } = req.body;
    if (!patientName || !patientPhone || !patientEmail || !date || !time || !specialtyId || !consultationType) {
      return res.status(400).json({ success: false, error: "Tous les champs obligatoires doivent \xEAtre remplis" });
    }
    const db = await readDb();
    const isBooked = db.appointments.some(
      (apt) => apt.date === date && apt.time === time && apt.status !== "REJECTED" && apt.status !== "CANCELLED"
    );
    if (isBooked) {
      return res.status(400).json({
        success: false,
        error: "D\xE9sol\xE9, ce cr\xE9neau horaire a \xE9t\xE9 r\xE9serv\xE9 par un autre patient \xE0 l'instant. Veuillez choisir un autre cr\xE9neau."
      });
    }
    if (db.blockedDates.some((b) => b.date === date)) {
      return res.status(400).json({ success: false, error: "Le cabinet est ferm\xE9 \xE0 cette date." });
    }
    const newApt = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      patientName,
      patientPhone,
      patientEmail,
      patientDob: patientDob || "",
      specialtyId,
      consultationType,
      date,
      time,
      status: "PENDING",
      reason,
      patientMessage: patientMessage || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.appointments.push(newApt);
    await writeDb(db);
    res.status(201).json({ success: true, appointment: newApt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/appointments/:id/confirm", requireDoctorAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const aptIndex = db.appointments.findIndex((a) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: "Rendez-vous introuvable" });
    }
    const appointment = db.appointments[aptIndex];
    const collisionExists = db.appointments.some(
      (a) => a.id !== id && a.date === appointment.date && a.time === appointment.time && a.status === "CONFIRMED"
    );
    if (collisionExists) {
      return res.status(400).json({
        success: false,
        error: "Impossible de confirmer : un autre rendez-vous est d\xE9j\xE0 CONFIRM\xC9 sur ce m\xEAme cr\xE9neau."
      });
    }
    appointment.status = "CONFIRMED";
    appointment.confirmedAt = (/* @__PURE__ */ new Date()).toISOString();
    await writeDb(db);
    try {
      await smsService.sendAppointmentConfirmed(appointment);
    } catch (smsErr) {
      console.error("SMS notification service error:", smsErr);
    }
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/appointments/:id/reject", requireDoctorAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const db = await readDb();
    const aptIndex = db.appointments.findIndex((a) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: "Rendez-vous introuvable" });
    }
    const appointment = db.appointments[aptIndex];
    appointment.status = "REJECTED";
    appointment.rejectedAt = (/* @__PURE__ */ new Date()).toISOString();
    appointment.rejectionReason = rejectionReason || "Indisponibilit\xE9 du cabinet";
    await writeDb(db);
    try {
      await smsService.sendAppointmentRejected(appointment, rejectionReason);
    } catch (smsErr) {
      console.error("SMS notification service error:", smsErr);
    }
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;
    const db = await readDb();
    const aptIndex = db.appointments.findIndex((a) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: "Rendez-vous introuvable" });
    }
    const appointment = db.appointments[aptIndex];
    const previousStatus = appointment.status;
    appointment.status = "CANCELLED";
    appointment.cancelledAt = (/* @__PURE__ */ new Date()).toISOString();
    await writeDb(db);
    if (previousStatus === "CONFIRMED") {
      try {
        await smsService.sendAppointmentCancelled(appointment, cancelledBy || "patient");
      } catch (smsErr) {
        console.error("SMS notification service error:", smsErr);
      }
    }
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: "Rendez-vous introuvable" });
    }
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var apiRouter_default = router;

// server.ts
dotenv.config();
initDb();
var isProd = process.env.NODE_ENV === "production";
var PORT = process.env.PORT || 3e3;
var DOCTOR_TOKEN2 = "alami_doctor_token_2026";
async function startServer() {
  const app = express();
  app.use(express.json());
  const requireDoctorAuth2 = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ") && authHeader.split("Bearer ")[1] === DOCTOR_TOKEN2) {
      next();
    } else {
      res.status(401).json({ success: false, error: "Non autoris\xE9 : Acc\xE8s m\xE9decin requis" });
    }
  };
  app.use("/api", apiRouter_default);
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api")) {
        return next();
      }
      try {
        let template = fs2.readFileSync(path2.resolve("./index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path2.resolve("./dist")));
    app.get("*", (req, res) => {
      res.sendFile(path2.resolve("./dist/index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
startServer();
