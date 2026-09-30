import { DbSchema, Appointment, SmsLog, writeDb, readDb } from '../db/localDb';

export interface SMSService {
  sendAppointmentConfirmed(appointment: Appointment): Promise<SmsLog>;
  sendAppointmentRejected(appointment: Appointment, reason?: string): Promise<SmsLog>;
  sendAppointmentReminder(appointment: Appointment): Promise<SmsLog>;
  sendAppointmentCancelled(appointment: Appointment, cancelledBy: 'patient' | 'doctor'): Promise<SmsLog>;
}

export class NotificationService implements SMSService {
  private provider: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'simulated';
  }

  private async createSmsLog(
    appointment: Appointment,
    message: string,
    type: SmsLog['type'],
    status: SmsLog['status'],
    errorMessage?: string
  ): Promise<SmsLog> {
    const log: SmsLog = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      appointmentId: appointment.id,
      patientName: appointment.patientName,
      phone: appointment.patientPhone,
      message,
      type,
      provider: this.provider,
      status,
      sentAt: new Date().toISOString(),
      errorMessage
    };

    try {
      const db = await readDb();
      db.smsLogs.unshift(log); // newest first
      await writeDb(db);
    } catch (err) {
      console.error("Failed to write SMS log to database:", err);
    }

    return log;
  }

  async sendAppointmentConfirmed(appointment: Appointment): Promise<SmsLog> {
    const timeFr = appointment.time;
    const dateFr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `Bonjour ${appointment.patientName}, votre rendez-vous médical avec le Dr. El Alami est CONFIRMÉ pour le ${dateFr} à ${timeFr}. Cabinet à Casablanca, 145 Bd d'Anfa.`;

    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);

    let status: SmsLog['status'] = 'SENT';
    let errorMessage: string | undefined;

    // Simulate potential SMS failure or external integration
    if (this.provider !== 'simulated' && !process.env.SMS_API_KEY) {
      status = 'FAILED';
      errorMessage = 'SMS_API_KEY is missing in environment variables.';
    } else {
      status = 'DELIVERED'; // immediately delivered in simulation
    }

    return this.createSmsLog(appointment, message, 'CONFIRMATION', status, errorMessage);
  }

  async sendAppointmentRejected(appointment: Appointment, reason?: string): Promise<SmsLog> {
    const dateFr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const reasonText = reason ? ` (Motif : ${reason})` : '';
    const message = `Bonjour ${appointment.patientName}, votre demande de rendez-vous pour le ${dateFr} à ${appointment.time} n'a pas pu être confirmée par le cabinet${reasonText}. Merci de nous contacter pour choisir un autre créneau.`;

    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);

    let status: SmsLog['status'] = 'DELIVERED';
    return this.createSmsLog(appointment, message, 'REJECTION', status);
  }

  async sendAppointmentReminder(appointment: Appointment): Promise<SmsLog> {
    const message = `Rappel : Bonjour ${appointment.patientName}, vous avez rendez-vous avec le Dr. El Alami demain à ${appointment.time}. En cas d'empêchement, merci de nous prévenir au plus vite.`;

    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);

    let status: SmsLog['status'] = 'DELIVERED';
    return this.createSmsLog(appointment, message, 'REMINDER', status);
  }

  async sendAppointmentCancelled(appointment: Appointment, cancelledBy: 'patient' | 'doctor'): Promise<SmsLog> {
    const dateFr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const entity = cancelledBy === 'patient' ? 'le patient' : 'le cabinet';
    const message = `Bonjour ${appointment.patientName}, votre rendez-vous du ${dateFr} à ${appointment.time} a été annulé par ${entity}.`;

    console.log(`[SMS OUT] [Provider: ${this.provider}] to ${appointment.patientPhone}: ${message}`);

    let status: SmsLog['status'] = 'DELIVERED';
    return this.createSmsLog(appointment, message, 'CANCELLATION', status);
  }
}

export const smsService = new NotificationService();
