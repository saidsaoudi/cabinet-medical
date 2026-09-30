import { Appointment, DaySchedule, BlockedDate, DoctorConfig, SmsLog } from '../db/localDb.ts';

const TOKEN_KEY = 'doctor_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Une erreur est survenue lors de la requête.');
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
    }
    return res;
  },
  
  logout: () => {
    setAuthToken(null);
  },

  checkAuth: async () => {
    try {
      const res = await request('/api/doctor/me');
      return res.loggedIn;
    } catch {
      return false;
    }
  },

  // Config
  getConfig: async (): Promise<DoctorConfig> => {
    const res = await request('/api/doctor/config');
    return res.config;
  },

  updateConfig: async (config: Partial<DoctorConfig>): Promise<DoctorConfig> => {
    const res = await request('/api/doctor/config', {
      method: 'PATCH',
      body: JSON.stringify(config)
    });
    return res.config;
  },

  // Schedules
  getSchedule: async (): Promise<DaySchedule[]> => {
    const res = await request('/api/doctor/schedule');
    return res.schedule;
  },

  updateSchedule: async (schedule: DaySchedule[]): Promise<DaySchedule[]> => {
    const res = await request('/api/doctor/schedule', {
      method: 'PATCH',
      body: JSON.stringify(schedule)
    });
    return res.schedule;
  },

  // Blocked Dates
  getBlockedDates: async (): Promise<BlockedDate[]> => {
    const res = await request('/api/doctor/blocked-dates');
    return res.blockedDates;
  },

  addBlockedDate: async (date: string, reason: string): Promise<BlockedDate> => {
    const res = await request('/api/doctor/blocked-dates', {
      method: 'POST',
      body: JSON.stringify({ date, reason })
    });
    return res.blockedDate;
  },

  removeBlockedDate: async (id: string): Promise<void> => {
    await request(`/api/doctor/blocked-dates/${id}`, {
      method: 'DELETE'
    });
  },

  // Public slot finder
  getAvailableSlots: async (date: string): Promise<string[]> => {
    const res = await request(`/api/public/available-slots?date=${date}`);
    return res.slots;
  },

  // Appointments
  createAppointment: async (appointmentData: any): Promise<Appointment> => {
    const res = await request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
    return res.appointment;
  },

  getAppointments: async (): Promise<Appointment[]> => {
    const res = await request('/api/appointments');
    return res.appointments;
  },

  getAppointmentById: async (id: string): Promise<Appointment> => {
    const res = await request(`/api/appointments/${id}`);
    return res.appointment;
  },

  confirmAppointment: async (id: string): Promise<Appointment> => {
    const res = await request(`/api/appointments/${id}/confirm`, {
      method: 'PATCH'
    });
    return res.appointment;
  },

  rejectAppointment: async (id: string, rejectionReason: string): Promise<Appointment> => {
    const res = await request(`/api/appointments/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason })
    });
    return res.appointment;
  },

  cancelAppointment: async (id: string, cancelledBy: 'patient' | 'doctor'): Promise<Appointment> => {
    const res = await request(`/api/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelledBy })
    });
    return res.appointment;
  },

  // SMS logs
  getSmsLogs: async (): Promise<SmsLog[]> => {
    const res = await request('/api/doctor/sms-logs');
    return res.smsLogs;
  }
};
