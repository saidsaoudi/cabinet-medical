import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const DB_DIR = isVercel ? '/tmp/data' : path.resolve('./data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Types for our local database
export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientDob: string;
  specialtyId: 'allergologie' | 'geriatrie' | 'general';
  consultationType: 'cabinet' | 'teleconsultation' | 'domicile';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  reason: string;
  patientMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
}

export interface DaySchedule {
  weekday: number; // 0 = Dimanche, 1 = Lundi, etc.
  dayName: string;
  isClosed: boolean;
  slots: { start: string; end: string }[];
  slotDuration: number; // in minutes, e.g., 30
}

export interface BlockedDate {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface DoctorConfig {
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  bio: string;
  languages: string[];
  qualifications: string[];
  tariffs: { specialty: string; price: string }[];
  enableTeleconsultation: boolean;
  enableDomicile: boolean;
}

export interface SmsLog {
  id: string;
  appointmentId: string;
  patientName: string;
  phone: string;
  message: string;
  type: 'CONFIRMATION' | 'REJECTION' | 'REMINDER' | 'CANCELLATION';
  provider: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt: string;
  errorMessage?: string;
}

export interface DbSchema {
  appointments: Appointment[];
  schedule: DaySchedule[];
  blockedDates: BlockedDate[];
  config: DoctorConfig;
  smsLogs: SmsLog[];
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { weekday: 1, dayName: 'Lundi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 2, dayName: 'Mardi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 3, dayName: 'Mercredi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 4, dayName: 'Jeudi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 5, dayName: 'Vendredi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 6, dayName: 'Samedi', isClosed: false, slots: [{ start: '09:00', end: '13:00' }], slotDuration: 30 },
  { weekday: 0, dayName: 'Dimanche', isClosed: true, slots: [], slotDuration: 30 },
];

const DEFAULT_CONFIG: DoctorConfig = {
  name: "Dr. Sofia El Alami",
  title: "Allergologue, Gériatre & Médecin Généraliste",
  email: "contact@dr-elalami.ma",
  phone: "+212 522 45 67 89",
  whatsapp: "+212 661 23 45 67",
  address: "145 Boulevard d'Anfa, Étage 3, Appt 12, Casablanca (à côté de la station de tramway)",
  bio: "Diplômée de la Faculté de Médecine de Casablanca, spécialisée en Allergologie et en Gériatrie Clinique. Plus de 12 ans d'expérience au service de la santé des familles à Casablanca. Notre cabinet s'engage à offrir une écoute attentive et des soins personnalisés de haute qualité, pour les petits comme pour les grands.",
  languages: ["Français", "Arabe", "Anglais"],
  qualifications: [
    "Diplôme de Spécialité en Allergologie - Faculté de Médecine",
    "Diplôme Interuniversitaire de Gérontologie et Gériatrie Clinique",
    "Ancien Interne des Hôpitaux Universitaires de Casablanca",
    "Membre de la Société Marocaine d'Allergologie et d'Immunologie Clinique"
  ],
  tariffs: [
    { specialty: "Consultation Médecine Générale", price: "250 DH" },
    { specialty: "Consultation Allergologie (+ Tests Cutanés)", price: "400 DH" },
    { specialty: "Consultation Gériatrie / Bilan Cognitif complet", price: "450 DH" },
    { specialty: "Téléconsultation (Allergies / Suivis)", price: "300 DH" },
    { specialty: "Visite à domicile Gériatrique", price: "600 DH" }
  ],
  enableTeleconsultation: true,
  enableDomicile: true
};

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_1",
    patientName: "Karim Benchakroun",
    patientPhone: "+212612345678",
    patientEmail: "k.benchakroun@gmail.com",
    patientDob: "1948-05-12",
    specialtyId: "geriatrie",
    consultationType: "cabinet",
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days in future
    time: "10:00",
    status: "PENDING",
    reason: "Suivi cognitif trimestriel et renouvellement d'ordonnance",
    patientMessage: "Il est un peu fatigué ces derniers temps, merci.",
    createdAt: new Date().toISOString()
  },
  {
    id: "apt_2",
    patientName: "Yasmine Filali",
    patientPhone: "+212676543210",
    patientEmail: "yasmine.filali@outlook.com",
    patientDob: "1994-09-18",
    specialtyId: "allergologie",
    consultationType: "cabinet",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    time: "14:30",
    status: "CONFIRMED",
    reason: "Suspicion d'allergie respiratoire au pollen",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    confirmedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "apt_3",
    patientName: "Amine Chraibi",
    patientPhone: "+212655555555",
    patientEmail: "chraibi.amine@yahoo.com",
    patientDob: "1982-11-30",
    specialtyId: "general",
    consultationType: "teleconsultation",
    date: new Date().toISOString().split('T')[0], // today
    time: "11:30",
    status: "CONFIRMED",
    reason: "Consultation générale pour état grippal",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    confirmedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// Transaction mutex to prevent race conditions (double-bookings)
let lockPromise = Promise.resolve();

function acquireLock(): Promise<() => void> {
  let release: () => void;
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentLock = lockPromise;
  lockPromise = lockPromise.then(() => newLock);
  return currentLock.then(() => release);
}

export function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DbSchema = {
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
          message: "Bonjour Yasmine, votre rendez-vous médical est confirmé pour le " + new Date(Date.now() + 86400000).toLocaleDateString('fr-FR') + " à 14:30. Merci de vous présenter au cabinet.",
          type: "CONFIRMATION",
          provider: "simulated",
          status: "DELIVERED",
          sentAt: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log("Database initialized successfully at:", DB_FILE);
  }
}

export async function readDb(): Promise<DbSchema> {
  const release = await acquireLock();
  try {
    if (!fs.existsSync(DB_FILE)) {
      initDb();
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read database:", error);
    // Return default empty structure to keep app from crashing
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

export async function writeDb(data: DbSchema): Promise<void> {
  const release = await acquireLock();
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    // Standard secure swap write
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Failed to write to database:", error);
    throw new Error("Erreur d'écriture dans la base de données.");
  } finally {
    release();
  }
}
