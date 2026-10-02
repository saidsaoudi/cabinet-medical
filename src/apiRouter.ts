import { Router, Request, Response, NextFunction } from 'express';
import {
  readDb,
  writeDb,
  BlockedDate,
  Appointment
} from './db/localDb.ts';
import { smsService } from './lib/sms.ts';

const router = Router();
const DOCTOR_TOKEN = 'alami_doctor_token_2026';

const requireDoctorAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1] === DOCTOR_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Non autorisé : Accès médecin requis' });
  }
};

// Doctor login
router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const validUsername = process.env.DOCTOR_USER || 'doctor@alami.ma';
  const validPassword = process.env.DOCTOR_PASSWORD || 'casablanca2026';

  if (username === validUsername && password === validPassword) {
    res.json({ success: true, token: DOCTOR_TOKEN, doctor: { name: 'Dr. Sofia El Alami', email: validUsername } });
  } else {
    res.status(401).json({ success: false, error: 'Identifiants incorrects (Email ou Mot de passe)' });
  }
});

// Get current auth state
router.get('/doctor/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1] === DOCTOR_TOKEN) {
    res.json({ success: true, loggedIn: true, doctor: { name: 'Dr. Sofia El Alami', email: 'doctor@alami.ma' } });
  } else {
    res.json({ success: false, loggedIn: false });
  }
});

// Get doctor dynamic public profile config
router.get('/doctor/config', async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    res.json({ success: true, config: db.config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update doctor profile config
router.patch('/doctor/config', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    db.config = { ...db.config, ...req.body };
    await writeDb(db);
    res.json({ success: true, config: db.config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get doctor weekly schedule
router.get('/doctor/schedule', async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    res.json({ success: true, schedule: db.schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update doctor weekly schedule
router.patch('/doctor/schedule', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    db.schedule = req.body;
    await writeDb(db);
    res.json({ success: true, schedule: db.schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get blocked dates
router.get('/doctor/blocked-dates', async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    res.json({ success: true, blockedDates: db.blockedDates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add blocked date
router.post('/doctor/blocked-dates', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'La date est requise' });

    const db = await readDb();
    if (db.blockedDates.some((b: any) => b.date === date)) {
      return res.status(400).json({ success: false, error: 'Cette date est déjà bloquée' });
    }

    const blocked: BlockedDate = {
      id: `blk_${Date.now()}`,
      date,
      reason: reason || 'Congé / Indisponibilité'
    };

    db.blockedDates.push(blocked);
    await writeDb(db);
    res.json({ success: true, blockedDate: blocked });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove blocked date
router.delete('/doctor/blocked-dates/:id', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    db.blockedDates = db.blockedDates.filter((b: any) => b.id !== id);
    await writeDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get SMS logs (doctor only)
router.get('/doctor/sms-logs', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    res.json({ success: true, smsLogs: db.smsLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all appointments (doctor only)
router.get('/appointments', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const sorted = [...db.appointments].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, appointments: sorted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available slots for a specific date
router.get('/public/available-slots', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'Le paramètre date (YYYY-MM-DD) est requis' });
    }

    const db = await readDb();
    const isBlocked = db.blockedDates.some((b: any) => b.date === date);
    if (isBlocked) {
      return res.json({ success: true, slots: [] });
    }

    const targetDate = new Date(date);
    const weekday = targetDate.getDay();
    const daySched = db.schedule.find((s: any) => s.weekday === weekday);

    if (!daySched || daySched.isClosed) {
      return res.json({ success: true, slots: [] });
    }

    const duration = daySched.slotDuration || 30;
    const allSlots: string[] = [];

    daySched.slots.forEach((range: any) => {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);

      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + duration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        allSlots.push(timeString);
        currentMinutes += duration;
      }
    });

    const existingAppointments = db.appointments.filter(
      (apt: any) => apt.date === date && apt.status !== 'REJECTED' && apt.status !== 'CANCELLED'
    );
    const takenTimes = existingAppointments.map((apt: any) => apt.time);
    const availableSlots = allSlots.filter((time: string) => !takenTimes.includes(time));

    res.json({ success: true, slots: availableSlots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create an appointment (public patient reservation)
router.post('/appointments', async (req: Request, res: Response) => {
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
      return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const db = await readDb();

    const isBooked = db.appointments.some(
      (apt: any) => apt.date === date && apt.time === time && apt.status !== 'REJECTED' && apt.status !== 'CANCELLED'
    );

    if (isBooked) {
      return res.status(400).json({
        success: false,
        error: 'Désolé, ce créneau horaire a été réservé par un autre patient à l\'instant. Veuillez choisir un autre créneau.'
      });
    }

    if (db.blockedDates.some((b: any) => b.date === date)) {
      return res.status(400).json({ success: false, error: 'Le cabinet est fermé à cette date.' });
    }

    const newApt: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      patientName,
      patientPhone,
      patientEmail,
      patientDob: patientDob || '',
      specialtyId,
      consultationType,
      date,
      time,
      status: 'PENDING',
      reason,
      patientMessage: patientMessage || '',
      createdAt: new Date().toISOString()
    };

    db.appointments.push(newApt);
    await writeDb(db);

    res.status(201).json({ success: true, appointment: newApt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Confirm appointment
router.patch('/appointments/:id/confirm', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();

    const aptIndex = db.appointments.findIndex((a: any) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Rendez-vous introuvable' });
    }

    const appointment = db.appointments[aptIndex];
    const collisionExists = db.appointments.some(
      (a: any) => a.id !== id && a.date === appointment.date && a.time === appointment.time && a.status === 'CONFIRMED'
    );

    if (collisionExists) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de confirmer : un autre rendez-vous est déjà CONFIRMÉ sur ce même créneau.'
      });
    }

    appointment.status = 'CONFIRMED';
    appointment.confirmedAt = new Date().toISOString();

    await writeDb(db);

    try {
      await smsService.sendAppointmentConfirmed(appointment);
    } catch (smsErr) {
      console.error("SMS notification service error:", smsErr);
    }

    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject appointment
router.patch('/appointments/:id/reject', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const db = await readDb();

    const aptIndex = db.appointments.findIndex((a: any) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Rendez-vous introuvable' });
    }

    const appointment = db.appointments[aptIndex];
    appointment.status = 'REJECTED';
    appointment.rejectedAt = new Date().toISOString();
    appointment.rejectionReason = rejectionReason || 'Indisponibilité du cabinet';

    await writeDb(db);

    try {
      await smsService.sendAppointmentRejected(appointment, rejectionReason);
    } catch (smsErr) {
      console.error("SMS notification service error:", smsErr);
    }

    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel appointment (can be done by doctor or patient)
router.patch('/appointments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body; // 'doctor' or 'patient'
    const db = await readDb();

    const aptIndex = db.appointments.findIndex((a: any) => a.id === id);
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Rendez-vous introuvable' });
    }

    const appointment = db.appointments[aptIndex];
    const previousStatus = appointment.status;
    appointment.status = 'CANCELLED';
    appointment.cancelledAt = new Date().toISOString();

    await writeDb(db);

    if (previousStatus === 'CONFIRMED') {
      try {
        await smsService.sendAppointmentCancelled(appointment, cancelledBy || 'patient');
      } catch (smsErr) {
        console.error("SMS notification service error:", smsErr);
      }
    }

    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific appointment by ID (for patient status check)
router.get('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const appointment = db.appointments.find((a: any) => a.id === id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Rendez-vous introuvable' });
    }
    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
