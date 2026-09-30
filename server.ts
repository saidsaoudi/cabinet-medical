import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// ============================================================
// SUPABASE CLIENT (Server-side — bypasses RLS with service key)
// ============================================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// CONFIG
// ============================================================
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DOCTOR_TOKEN = 'alami_doctor_token_2026';

// The doctor UUID from the Supabase doctors table.
// Set DOCTOR_ID in your Vercel env vars after creating the doctor record.
const DOCTOR_ID = process.env.DOCTOR_ID || '';

// ============================================================
// DEFAULT CONFIG (used when no doctor row found in Supabase)
// ============================================================
const DEFAULT_CONFIG = {
  name: 'Dr. Sofia El Alami',
  title: 'Allergologue, Gériatre & Médecin Généraliste',
  email: 'contact@dr-elalami.ma',
  phone: '+212 522 45 67 89',
  whatsapp: '+212 661 23 45 67',
  address: "145 Boulevard d'Anfa, Étage 3, Appt 12, Casablanca",
  bio: "Diplômée de la Faculté de Médecine de Casablanca, spécialisée en Allergologie et en Gériatrie Clinique. Plus de 12 ans d'expérience.",
  languages: ['Français', 'Arabe', 'Anglais'],
  qualifications: [
    "Diplôme de Spécialité en Allergologie - Faculté de Médecine",
    "Diplôme Interuniversitaire de Gérontologie et Gériatrie Clinique",
    "Ancien Interne des Hôpitaux Universitaires de Casablanca",
    "Membre de la Société Marocaine d'Allergologie et d'Immunologie Clinique",
  ],
  tariffs: [
    { specialty: 'Consultation Médecine Générale', price: '250 DH' },
    { specialty: 'Consultation Allergologie (+ Tests Cutanés)', price: '400 DH' },
    { specialty: 'Consultation Gériatrie / Bilan Cognitif complet', price: '450 DH' },
    { specialty: 'Téléconsultation (Allergies / Suivis)', price: '300 DH' },
    { specialty: 'Visite à domicile Gériatrique', price: '600 DH' },
  ],
  enableTeleconsultation: true,
  enableDomicile: true,
};

const DEFAULT_SCHEDULE = [
  { weekday: 1, dayName: 'Lundi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 2, dayName: 'Mardi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 3, dayName: 'Mercredi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 4, dayName: 'Jeudi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 5, dayName: 'Vendredi', isClosed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], slotDuration: 30 },
  { weekday: 6, dayName: 'Samedi', isClosed: false, slots: [{ start: '09:00', end: '13:00' }], slotDuration: 30 },
  { weekday: 0, dayName: 'Dimanche', isClosed: true, slots: [], slotDuration: 30 },
];

// ============================================================
// HELPERS
// ============================================================

/** Map a Supabase doctor row → DoctorConfig */
function mapDoctorToConfig(doctor: any, clinic: any): any {
  return {
    name: doctor.display_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || DEFAULT_CONFIG.name,
    title: DEFAULT_CONFIG.title,
    email: clinic?.email || DEFAULT_CONFIG.email,
    phone: clinic?.phone || DEFAULT_CONFIG.phone,
    whatsapp: clinic?.whatsapp || DEFAULT_CONFIG.whatsapp,
    address: [clinic?.address, clinic?.city].filter(Boolean).join(', ') || DEFAULT_CONFIG.address,
    bio: doctor.bio || DEFAULT_CONFIG.bio,
    languages: doctor.languages || DEFAULT_CONFIG.languages,
    qualifications: doctor.education ? doctor.education.split('\n').filter(Boolean) : DEFAULT_CONFIG.qualifications,
    tariffs: DEFAULT_CONFIG.tariffs,
    enableTeleconsultation: true,
    enableDomicile: true,
  };
}

/** Map Supabase doctor_schedules rows → DaySchedule[] */
function mapScheduleRows(rows: any[]): any[] {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const grouped: Record<number, any> = {};

  rows.forEach((row) => {
    const wd = row.day_of_week;
    if (!grouped[wd]) {
      grouped[wd] = {
        weekday: wd,
        dayName: dayNames[wd],
        isClosed: false,
        slots: [],
        slotDuration: row.slot_duration_minutes || 30,
      };
    }
    if (row.is_active) {
      grouped[wd].slots.push({ start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) });
    }
  });

  // Ensure all 7 days are present
  return DEFAULT_SCHEDULE.map((def) => grouped[def.weekday] || { ...def, isClosed: !grouped[def.weekday] });
}

/** Map Supabase blocked_slots rows → BlockedDate[] */
function mapBlockedSlots(rows: any[]): any[] {
  return rows.map((r) => ({
    id: r.id,
    date: r.start_at.split('T')[0],
    reason: r.reason || 'Indisponibilité',
  }));
}

/** Map Supabase appointment row → Appointment */
function mapAppointment(row: any): any {
  return {
    id: row.id,
    patientName: row.patients ? `${row.patients.first_name} ${row.patients.last_name}`.trim() : 'Patient',
    patientPhone: row.patients?.phone || '',
    patientEmail: row.patients?.email || '',
    patientDob: row.patients?.date_of_birth || '',
    specialtyId: row.specialties?.slug === 'medecine-generale' ? 'general' : (row.specialties?.slug || 'general'),
    consultationType: row.consultation_type || 'cabinet',
    date: row.start_at ? row.start_at.split('T')[0] : '',
    time: row.start_at ? row.start_at.split('T')[1]?.slice(0, 5) : '',
    status: row.status,
    reason: row.reason || '',
    patientMessage: row.patient_message || '',
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at || undefined,
    rejectedAt: row.updated_at && row.status === 'REJECTED' ? row.updated_at : undefined,
    rejectionReason: row.rejection_reason || undefined,
    cancelledAt: row.cancelled_at || undefined,
  };
}

/** Get specialty UUID by slug */
async function getSpecialtyId(slug: string): Promise<string | null> {
  const mappedSlug = slug === 'general' ? 'medecine-generale' : slug;
  const { data } = await supabase
    .from('specialties')
    .select('id')
    .eq('slug', mappedSlug)
    .single();
  return data?.id || null;
}

/** Find or create a patient by phone number */
async function findOrCreatePatient(
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  dob: string
): Promise<string | null> {
  // Try to find existing patient by phone
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existing) return existing.id;

  // Create new patient
  const { data: created, error } = await supabase
    .from('patients')
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      email: email || null,
      date_of_birth: dob || null,
      consent_accepted: true,
      consent_accepted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Patient] Create error:', error);
    return null;
  }
  return created?.id || null;
}

// ============================================================
// EXPRESS APP
// ============================================================
const app = express();
app.use(express.json());

// Doctor Auth Middleware
const requireDoctorAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1] === DOCTOR_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Non autorisé : Accès médecin requis' });
  }
};

// ============================================================
// API ROUTES — AUTH
// ============================================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const validUsername = process.env.DOCTOR_USER || 'doctor@alami.ma';
  const validPassword = process.env.DOCTOR_PASSWORD || 'casablanca2026';

  if (username === validUsername && password === validPassword) {
    res.json({ success: true, token: DOCTOR_TOKEN, doctor: { name: 'Dr. Sofia El Alami', email: validUsername } });
  } else {
    res.status(401).json({ success: false, error: 'Identifiants incorrects (Email ou Mot de passe)' });
  }
});

app.get('/api/doctor/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1] === DOCTOR_TOKEN) {
    res.json({ success: true, loggedIn: true, doctor: { name: 'Dr. Sofia El Alami', email: 'doctor@alami.ma' } });
  } else {
    res.json({ success: false, loggedIn: false });
  }
});

// ============================================================
// API ROUTES — CONFIG
// ============================================================

app.get('/api/doctor/config', async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) {
      // No doctor set up yet — return defaults
      return res.json({ success: true, config: DEFAULT_CONFIG });
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*, clinics(*)')
      .eq('id', DOCTOR_ID)
      .single();

    if (!doctor) return res.json({ success: true, config: DEFAULT_CONFIG });

    const config = mapDoctorToConfig(doctor, doctor.clinics);
    res.json({ success: true, config });
  } catch (err: any) {
    console.error('[config GET]', err);
    res.json({ success: true, config: DEFAULT_CONFIG });
  }
});

app.patch('/api/doctor/config', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) return res.status(400).json({ success: false, error: 'DOCTOR_ID non configuré' });

    const { name, bio, phone, whatsapp, address, email, languages, qualifications } = req.body;

    await supabase.from('doctors').update({
      display_name: name,
      bio,
      languages,
      education: Array.isArray(qualifications) ? qualifications.join('\n') : qualifications,
    }).eq('id', DOCTOR_ID);

    // Also update clinic info if available
    const { data: doctor } = await supabase.from('doctors').select('clinic_id').eq('id', DOCTOR_ID).single();
    if (doctor?.clinic_id) {
      await supabase.from('clinics').update({ phone, whatsapp, email, address }).eq('id', doctor.clinic_id);
    }

    const { data: updatedDoctor } = await supabase.from('doctors').select('*, clinics(*)').eq('id', DOCTOR_ID).single();
    const config = mapDoctorToConfig(updatedDoctor, updatedDoctor?.clinics);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API ROUTES — SCHEDULE
// ============================================================

app.get('/api/doctor/schedule', async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) return res.json({ success: true, schedule: DEFAULT_SCHEDULE });

    const { data: rows, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', DOCTOR_ID);

    if (error || !rows?.length) return res.json({ success: true, schedule: DEFAULT_SCHEDULE });
    res.json({ success: true, schedule: mapScheduleRows(rows) });
  } catch (err: any) {
    res.json({ success: true, schedule: DEFAULT_SCHEDULE });
  }
});

app.patch('/api/doctor/schedule', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) return res.status(400).json({ success: false, error: 'DOCTOR_ID non configuré' });

    const schedule: any[] = req.body;

    // Delete old schedule and re-insert
    await supabase.from('doctor_schedules').delete().eq('doctor_id', DOCTOR_ID);

    const rows: any[] = [];
    schedule.forEach((day: any) => {
      if (!day.isClosed && day.slots?.length) {
        day.slots.forEach((slot: any) => {
          rows.push({
            doctor_id: DOCTOR_ID,
            day_of_week: day.weekday,
            start_time: slot.start + ':00',
            end_time: slot.end + ':00',
            slot_duration_minutes: day.slotDuration || 30,
            is_active: true,
          });
        });
      }
    });

    if (rows.length) await supabase.from('doctor_schedules').insert(rows);

    const { data: updated } = await supabase.from('doctor_schedules').select('*').eq('doctor_id', DOCTOR_ID);
    res.json({ success: true, schedule: mapScheduleRows(updated || []) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API ROUTES — BLOCKED DATES
// ============================================================

app.get('/api/doctor/blocked-dates', async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) return res.json({ success: true, blockedDates: [] });

    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('doctor_id', DOCTOR_ID);

    if (error) throw error;
    res.json({ success: true, blockedDates: mapBlockedSlots(data || []) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/doctor/blocked-dates', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    if (!DOCTOR_ID) return res.status(400).json({ success: false, error: 'DOCTOR_ID non configuré' });

    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'La date est requise' });

    const startAt = `${date}T00:00:00+00:00`;
    const endAt = `${date}T23:59:59+00:00`;

    const { data, error } = await supabase
      .from('blocked_slots')
      .insert({ doctor_id: DOCTOR_ID, start_at: startAt, end_at: endAt, reason: reason || 'Congé / Indisponibilité' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, blockedDate: mapBlockedSlots([data])[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/doctor/blocked-dates/:id', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API ROUTES — APPOINTMENTS (DOCTOR)
// ============================================================

app.get('/api/doctor/sms-logs', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*, patients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    const smsLogs = (data || []).map((r: any) => ({
      id: r.id,
      appointmentId: r.appointment_id,
      patientName: r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : 'Patient',
      phone: r.phone,
      message: r.message,
      type: r.type,
      provider: r.provider || 'simulated',
      status: r.status,
      sentAt: r.sent_at || r.created_at,
    }));
    res.json({ success: true, smsLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appointments', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('appointments')
      .select('*, patients(*), specialties(name, slug)')
      .order('created_at', { ascending: false });

    if (DOCTOR_ID) query = query.eq('doctor_id', DOCTOR_ID);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, appointments: (data || []).map(mapAppointment) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API ROUTES — PUBLIC
// ============================================================

app.get('/api/public/available-slots', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'Le paramètre date (YYYY-MM-DD) est requis' });
    }

    if (!DOCTOR_ID) {
      // No doctor configured — generate slots from default schedule
      const targetDate = new Date(date);
      const weekday = targetDate.getDay();
      const daySched = DEFAULT_SCHEDULE.find((s) => s.weekday === weekday);
      if (!daySched || daySched.isClosed) return res.json({ success: true, slots: [] });

      const slots: string[] = [];
      daySched.slots.forEach((range) => {
        const [sh, sm] = range.start.split(':').map(Number);
        const [eh, em] = range.end.split(':').map(Number);
        let cur = sh * 60 + sm;
        const end = eh * 60 + em;
        while (cur + daySched.slotDuration <= end) {
          slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
          cur += daySched.slotDuration;
        }
      });
      return res.json({ success: true, slots });
    }

    // 1. Check blocked dates
    const dayStart = `${date}T00:00:00+00:00`;
    const dayEnd = `${date}T23:59:59+00:00`;
    const { data: blocked } = await supabase
      .from('blocked_slots')
      .select('id')
      .eq('doctor_id', DOCTOR_ID)
      .lte('start_at', dayEnd)
      .gte('end_at', dayStart);

    if (blocked && blocked.length > 0) return res.json({ success: true, slots: [] });

    // 2. Get schedule for this weekday
    const weekday = new Date(date).getDay();
    const { data: scheduleRows } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', DOCTOR_ID)
      .eq('day_of_week', weekday)
      .eq('is_active', true);

    if (!scheduleRows?.length) return res.json({ success: true, slots: [] });

    // 3. Generate all possible slots
    const allSlots: string[] = [];
    scheduleRows.forEach((row: any) => {
      const [sh, sm] = row.start_time.split(':').map(Number);
      const [eh, em] = row.end_time.split(':').map(Number);
      const duration = row.slot_duration_minutes || 30;
      let cur = sh * 60 + sm;
      const end = eh * 60 + em;
      while (cur + duration <= end) {
        allSlots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
        cur += duration;
      }
    });

    // 4. Remove already booked slots
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('start_at')
      .eq('doctor_id', DOCTOR_ID)
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .in('status', ['PENDING', 'CONFIRMED']);

    const takenTimes = new Set((existingAppts || []).map((a: any) => a.start_at.split('T')[1]?.slice(0, 5)));
    const available = allSlots.filter((t) => !takenTimes.has(t));

    res.json({ success: true, slots: available });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/appointments', async (req: Request, res: Response) => {
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
      patientMessage,
    } = req.body;

    if (!patientName || !patientPhone || !date || !time || !specialtyId) {
      return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis' });
    }

    // Split name
    const parts = patientName.trim().split(' ');
    const firstName = parts[0] || 'Patient';
    const lastName = parts.slice(1).join(' ') || '-';

    // Find or create patient
    const patientId = await findOrCreatePatient(firstName, lastName, patientPhone, patientEmail, patientDob);
    if (!patientId) return res.status(500).json({ success: false, error: 'Erreur lors de la création du patient' });

    // Get specialty UUID
    const specialtyUUID = await getSpecialtyId(specialtyId);
    if (!specialtyUUID) return res.status(400).json({ success: false, error: 'Spécialité introuvable' });

    // Use default doctor if no DOCTOR_ID configured
    let doctorUUID = DOCTOR_ID;
    if (!doctorUUID) {
      const { data: firstDoctor } = await supabase.from('doctors').select('id').eq('is_active', true).limit(1).single();
      doctorUUID = firstDoctor?.id || '';
    }
    if (!doctorUUID) return res.status(500).json({ success: false, error: 'Aucun médecin configuré' });

    // Build timestamps
    const startAt = `${date}T${time}:00+00:00`;
    const [sh, sm] = time.split(':').map(Number);
    const endMinutes = sh * 60 + sm + 30;
    const endAt = `${date}T${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00+00:00`;

    // Check double booking
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorUUID)
      .eq('start_at', startAt)
      .in('status', ['PENDING', 'CONFIRMED']);

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Désolé, ce créneau a été réservé par un autre patient. Veuillez en choisir un autre.",
      });
    }

    // Insert appointment
    const { data: apt, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorUUID,
        specialty_id: specialtyUUID,
        start_at: startAt,
        end_at: endAt,
        status: 'PENDING',
        reason: reason || null,
        patient_message: patientMessage || null,
        consultation_type: consultationType || 'cabinet',
      })
      .select('*, patients(*), specialties(name, slug)')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, appointment: mapAppointment(apt) });
  } catch (err: any) {
    console.error('[POST /api/appointments]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*), specialties(name, slug)')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: 'Rendez-vous introuvable' });
    res.json({ success: true, appointment: mapAppointment(data) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/appointments/:id/confirm', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .rpc('confirm_appointment', { p_appointment_id: id });

    if (error) throw error;
    const { data: apt } = await supabase
      .from('appointments')
      .select('*, patients(*), specialties(name, slug)')
      .eq('id', id)
      .single();

    res.json({ success: true, appointment: mapAppointment(apt) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/appointments/:id/reject', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const { error } = await supabase
      .rpc('reject_appointment', { p_appointment_id: id, p_rejection_reason: rejectionReason || null });

    if (error) throw error;
    const { data: apt } = await supabase
      .from('appointments')
      .select('*, patients(*), specialties(name, slug)')
      .eq('id', id)
      .single();

    res.json({ success: true, appointment: mapAppointment(apt) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/appointments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;
    const { error } = await supabase
      .rpc('cancel_appointment', { p_appointment_id: id, p_cancelled_reason: cancelledBy === 'doctor' ? 'Annulé par le médecin' : 'Annulé par le patient' });

    if (error) throw error;
    const { data: apt } = await supabase
      .from('appointments')
      .select('*, patients(*), specialties(name, slug)')
      .eq('id', id)
      .single();

    res.json({ success: true, appointment: mapAppointment(apt) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// VITE OR STATIC ASSETS (Only run locally)
// ============================================================
if (process.env.VERCEL !== '1') {
  if (!isProd) {
    import('vite').then(async ({ createServer: createViteServer }) => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();
        try {
          let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });

      app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
      });
    });
  } else {
    app.use(express.static(path.resolve('./dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  }
}

export default app;
