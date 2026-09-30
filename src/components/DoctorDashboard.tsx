import React from 'react';
import { 
  Users, Calendar, Clock, MessageSquare, AlertCircle, Check, X, ShieldAlert,
  LogOut, Settings, ListFilter, RefreshCw, Eye, FileText, Ban, Trash2, PlusCircle, ToggleLeft, ToggleRight, CheckSquare
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Appointment, DaySchedule, BlockedDate, DoctorConfig, SmsLog } from '../db/localDb.ts';

interface DoctorDashboardProps {
  onLogout: () => void;
}

export default function DoctorDashboard({ onLogout }: DoctorDashboardProps) {
  // Navigation / Tabs State
  const [activeTab, setActiveTab] = React.useState<'demandes' | 'calendar' | 'availability' | 'sms' | 'settings'>('demandes');
  
  // Data State
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [schedule, setSchedule] = React.useState<DaySchedule[]>([]);
  const [blockedDates, setBlockedDates] = React.useState<BlockedDate[]>([]);
  const [smsLogs, setSmsLogs] = React.useState<SmsLog[]>([]);
  const [config, setConfig] = React.useState<DoctorConfig | null>(null);

  // UI Helpers
  const [loading, setLoading] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  // Rejection Modal Helper
  const [rejectionId, setRejectionId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  // New Blocked Date Helper
  const [newBlockedDate, setNewBlockedDate] = React.useState('');
  const [newBlockedReason, setNewBlockedReason] = React.useState('');

  // Selected date in Calendar view
  const [selectedCalDate, setSelectedCalDate] = React.useState(new Date().toISOString().split('T')[0]);

  // Fetch all necessary data
  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [apts, sched, blocked, logs, cfg] = await Promise.all([
        api.getAppointments(),
        api.getSchedule(),
        api.getBlockedDates(),
        api.getSmsLogs(),
        api.getConfig()
      ]);
      setAppointments(apts);
      setSchedule(sched);
      setBlockedDates(blocked);
      setSmsLogs(logs);
      setConfig(cfg);
    } catch (err: any) {
      setErrorMessage(err.message || "Impossible de charger les données d'administration.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAllData();
  }, []);

  // Action: Confirm
  const handleConfirm = async (id: string) => {
    setActionLoadingId(id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.confirmAppointment(id);
      setSuccessMessage("Rendez-vous validé ! Le SMS automatique a été envoyé au patient.");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de validation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Open Rejection Modal
  const openRejection = (id: string) => {
    setRejectionId(id);
    setRejectionReason('');
  };

  // Action: Submit Rejection
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionId) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.rejectAppointment(rejectionId, rejectionReason);
      setSuccessMessage("Rendez-vous décliné et SMS de notification envoyé.");
      setRejectionId(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de rejet.");
    }
  };

  // Action: Cancel (for confirmed appointments)
  const handleCancel = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment annuler ce rendez-vous ? Un SMS d'annulation sera envoyé au patient.")) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.cancelAppointment(id, 'doctor');
      setSuccessMessage("Rendez-vous annulé.");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur d'annulation.");
    }
  };

  // Action: Save Config settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.updateConfig(config);
      setSuccessMessage("Profil et tarifs mis à jour avec succès.");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur d'enregistrement.");
    }
  };

  // Action: Add holiday/blockdate
  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.addBlockedDate(newBlockedDate, newBlockedReason);
      setSuccessMessage("Date bloquée ajoutée.");
      setNewBlockedDate('');
      setNewBlockedReason('');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur d'ajout.");
    }
  };

  // Action: Remove holiday/blockdate
  const handleRemoveBlockedDate = async (id: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.removeBlockedDate(id);
      setSuccessMessage("Date débloquée avec succès.");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de suppression.");
    }
  };

  // Action: Toggle weekday close status
  const handleToggleWeekday = async (weekdayIdx: number) => {
    const updated = schedule.map(day => {
      if (day.weekday === weekdayIdx) {
        return { ...day, isClosed: !day.isClosed };
      }
      return day;
    });
    try {
      await api.updateSchedule(updated);
      setSuccessMessage("Horaires modifiés.");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage("Erreur de sauvegarde des horaires.");
    }
  };

  // Action: Edit single schedule slots in local schedule state before saving
  const handleSaveScheduleTimes = async (weekdayIdx: number, newSlotsText: string) => {
    // Parse format e.g. "09:00-12:00, 14:00-18:00"
    try {
      const parts = newSlotsText.split(',').map(p => p.trim());
      const parsedSlots = parts.map(p => {
        const [start, end] = p.split('-').map(s => s.trim());
        if (!start || !end || !start.includes(':') || !end.includes(':')) {
          throw new Error();
        }
        return { start, end };
      });

      const updated = schedule.map(day => {
        if (day.weekday === weekdayIdx) {
          return { ...day, slots: parsedSlots };
        }
        return day;
      });

      await api.updateSchedule(updated);
      setSuccessMessage("Créneaux enregistrés !");
      await loadAllData();
    } catch {
      setErrorMessage("Format incorrect. Utilisez : HH:MM-HH:MM, HH:MM-HH:MM (Ex: 09:00-12:00, 14:00-18:00)");
    }
  };

  // Analytics Computation
  const pendingAppointments = appointments.filter(a => a.status === 'PENDING');
  const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMED');
  const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'CONFIRMED');

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-md">En attente</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md">Confirmé</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-md">Refusé</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md">Annulé</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 rounded-md">{status}</span>;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header practitioner lockup */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-blue-600 font-bold tracking-wider uppercase block">Portail Praticien Sécurisé</span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{config?.name || 'Dr. Sofia El Alami'}</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Se déconnecter
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200/60 text-xs font-medium text-rose-600 rounded-2xl flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200/60 text-xs font-medium text-emerald-700 rounded-2xl flex items-center gap-2 shadow-xs">
            <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick analytics scoreboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs text-left">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Demandes en attente</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-2xl font-mono font-extrabold text-slate-800 block mt-2">{pendingAppointments.length}</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs text-left">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">RDV Confirmés</span>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-2xl font-mono font-extrabold text-slate-800 block mt-2">{confirmedAppointments.length}</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs text-left">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Consultations Aujourd'hui</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-2xl font-mono font-extrabold text-slate-800 block mt-2">{todayAppointments.length}</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs text-left">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Notifications SMS envoyées</span>
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-2xl font-mono font-extrabold text-slate-800 block mt-2">{smsLogs.length}</span>
          </div>
        </div>

        {/* Dashboard Tabs & Workspaces */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-3xl p-3 space-y-1.5 shadow-2xs">
            <button
              onClick={() => setActiveTab('demandes')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'demandes' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2"><ListFilter className="w-4.5 h-4.5" /> Demandes reçues</span>
              {pendingAppointments.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${activeTab === 'demandes' ? 'bg-white text-blue-600' : 'bg-amber-500 text-white'}`}>
                  {pendingAppointments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" /> Calendrier Praticien
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'availability' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4.5 h-4.5" /> Disponibilités & Congés
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sms' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5" /> Journaux des SMS
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4.5 h-4.5" /> Paramètres du cabinet
            </button>
          </div>

          {/* Tab Workspaces */}
          <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs min-h-[500px]">
            
            {/* WORKSPACE 1: DEMANDES */}
            {activeTab === 'demandes' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Demandes de consultations à valider</h2>
                  <p className="text-xs text-slate-400 mt-1">Étudiez les demandes de rendez-vous en attente de confirmation. La confirmation envoie automatiquement un SMS.</p>
                </div>

                {pendingAppointments.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs">
                    Aucune nouvelle demande de rendez-vous en attente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAppointments.map((apt) => (
                      <div key={apt.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm">{apt.patientName}</span>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-600 rounded-md uppercase tracking-wider">{apt.specialtyId}</span>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-150 text-slate-600 rounded-md uppercase tracking-wider">{apt.consultationType}</span>
                          </div>
                          
                          <div className="text-xs text-slate-500 space-y-1">
                            <p>🎂 Né(e) le : <span className="font-semibold text-slate-700">{apt.patientDob || "Non renseigné"}</span> | 📱 Tél : <span className="font-semibold text-slate-700">{apt.patientPhone}</span></p>
                            <p>📅 Souhaité le : <span className="font-bold text-blue-600">{new Date(apt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {apt.time}</span></p>
                            <p>🩺 Motif : <span className="font-semibold text-slate-700 italic">"{apt.reason}"</span></p>
                            {apt.patientMessage && <p>💬 Message : <span className="text-slate-500">"{apt.patientMessage}"</span></p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={actionLoadingId === apt.id}
                            onClick={() => handleConfirm(apt.id)}
                            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm shadow-emerald-500/10 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Confirmer
                          </button>
                          <button
                            onClick={() => openRejection(apt.id)}
                            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Décliner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WORKSPACE 2: CALENDAR */}
            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Agenda Praticien</h2>
                    <p className="text-xs text-slate-400 mt-1">Gérez vos rendez-vous confirmés ou en cours par date.</p>
                  </div>
                  <input
                    type="date"
                    value={selectedCalDate}
                    onChange={(e) => setSelectedCalDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Filter and display appointments on the selected day */}
                {(() => {
                  const dayAppointments = appointments.filter(a => a.date === selectedCalDate && a.status !== 'REJECTED');
                  
                  return dayAppointments.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs">
                      Aucun rendez-vous planifié pour le {new Date(selectedCalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {dayAppointments.sort((a,b) => a.time.localeCompare(b.time)).map((apt) => (
                        <div key={apt.id} className="border border-slate-100 rounded-2xl p-4 flex justify-between items-center bg-slate-50 text-left">
                          <div className="flex items-center gap-4">
                            <div className="w-12 text-center border-r border-slate-200 pr-4">
                              <span className="text-sm font-extrabold text-blue-600 font-mono">{apt.time}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{apt.patientName}</span>
                                {getStatusBadge(apt.status)}
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium">Motif : {apt.reason} | Mode : <span className="capitalize">{apt.consultationType}</span></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {apt.status === 'PENDING' && (
                              <button
                                onClick={() => handleConfirm(apt.id)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Confirmer le rendez-vous"
                              >
                                Valider
                              </button>
                            )}
                            {apt.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleCancel(apt.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Annuler le rendez-vous"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* WORKSPACE 3: AVAILABILITY & CONGES */}
            {activeTab === 'availability' && (
              <div className="space-y-8">
                
                {/* 1. Weekday Open schedules */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">1. Horaires hebdomadaires et créneaux</h2>
                    <p className="text-xs text-slate-400 mt-1">Configurez vos plages horaires d'ouverture et de garde. Utilisez le format de créneau : HH:MM-HH:MM (séparés par une virgule pour les coupures de midi).</p>
                  </div>

                  <div className="border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {schedule.map((day) => (
                      <div key={day.weekday} className="p-4 bg-slate-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleWeekday(day.weekday)}
                            className="text-blue-600 cursor-pointer"
                          >
                            {day.isClosed ? (
                              <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">Fermé</span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Ouvert</span>
                            )}
                          </button>
                          <span className="font-bold text-slate-800 text-sm w-16">{day.dayName}</span>
                        </div>

                        {!day.isClosed && (
                          <div className="flex-1 flex items-center gap-2 max-w-md w-full">
                            <input
                              type="text"
                              defaultValue={day.slots.map(s => `${s.start}-${s.end}`).join(', ')}
                              onBlur={(e) => handleSaveScheduleTimes(day.weekday, e.target.value)}
                              placeholder="09:00-12:00, 14:00-18:00"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                            />
                            <span className="text-[10px] text-slate-400">Durée : {day.slotDuration} min</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Block dates */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">2. Bloquer une date spécifique (Congés ou urgence)</h2>
                    <p className="text-xs text-slate-400 mt-1">Les dates bloquées empêchent les patients de réserver en ligne pour cette journée.</p>
                  </div>

                  <form onSubmit={handleAddBlockedDate} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="date"
                      required
                      value={newBlockedDate}
                      onChange={(e) => setNewBlockedDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Motif (Ex: Congés de printemps)"
                      value={newBlockedReason}
                      onChange={(e) => setNewBlockedReason(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" /> Bloquer
                    </button>
                  </form>

                  {blockedDates.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun congé ni date bloquée programmée.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {blockedDates.map((block) => (
                        <div key={block.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex justify-between items-center text-xs text-rose-900 text-left">
                          <div>
                            <span className="font-bold">{new Date(block.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <span className="block text-[10px] text-rose-600 font-medium">Motif : {block.reason}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlockedDate(block.id)}
                            className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* WORKSPACE 4: SMS LOGS */}
            {activeTab === 'sms' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Historique des notifications SMS envoyées</h2>
                  <p className="text-xs text-slate-400 mt-1">Consultez l'état d'envoi et de délivrabilité des notifications automatiques.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-500">
                    <thead className="text-[10px] uppercase text-slate-400 bg-slate-50/50">
                      <tr>
                        <th className="py-3 px-4 font-bold">Date & Heure</th>
                        <th className="py-3 px-4 font-bold">Patient</th>
                        <th className="py-3 px-4 font-bold">Destinataire</th>
                        <th className="py-3 px-4 font-bold">Type</th>
                        <th className="py-3 px-4 font-bold">Message</th>
                        <th className="py-3 px-4 font-bold">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {smsLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium">{new Date(log.sentAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{log.patientName}</td>
                          <td className="py-3 px-4 font-semibold">{log.phone}</td>
                          <td className="py-3 px-4"><span className="text-[9px] font-bold tracking-wider uppercase">{log.type}</span></td>
                          <td className="py-3 px-4 max-w-xs truncate" title={log.message}>{log.message}</td>
                          <td className="py-3 px-4">
                            {log.status === 'DELIVERED' ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">Délivré</span>
                            ) : log.status === 'SENT' ? (
                              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold">Envoyé</span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold" title={log.errorMessage}>Échec</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WORKSPACE 5: SETTINGS */}
            {activeTab === 'settings' && config && (
              <form onSubmit={handleSaveConfig} className="space-y-6 text-left">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Paramètres généraux du cabinet</h2>
                  <p className="text-xs text-slate-400 mt-1">Personnalisez vos informations de contact, adresse et tarifs affichés sur la plateforme patient.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Nom complet du Praticien</label>
                    <input
                      type="text"
                      required
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Titre professionnel</label>
                    <input
                      type="text"
                      required
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Téléphone Secrétariat</label>
                    <input
                      type="text"
                      required
                      value={config.phone}
                      onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">WhatsApp Cabinet</label>
                    <input
                      type="text"
                      required
                      value={config.whatsapp}
                      onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Adresse Physique du Cabinet</label>
                    <input
                      type="text"
                      required
                      value={config.address}
                      onChange={(e) => setConfig({ ...config, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Présentation Cabinet (Bio)</label>
                    <textarea
                      rows={3}
                      required
                      value={config.bio}
                      onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Mode switches */}
                  <div className="space-y-3 md:col-span-2 pt-2">
                    <h3 className="text-xs font-bold text-slate-800">Modes de consultations activables</h3>
                    <div className="flex gap-6 text-xs text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.enableTeleconsultation}
                          onChange={(e) => setConfig({ ...config, enableTeleconsultation: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span>Autoriser la Téléconsultation (Vidéo)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.enableDomicile}
                          onChange={(e) => setConfig({ ...config, enableDomicile: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span>Autoriser la Visite à Domicile</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Sauvegarder les modifications
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* REJECTION REASON DIALOG MODAL */}
      {rejectionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 text-left">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Décliner la demande</h3>
              <p className="text-xs text-slate-400 mt-1">Expliquez brièvement le motif du refus. Il sera communiqué au patient par SMS automatique.</p>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Ex: Le cabinet est complet ce jour là / Urgence"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectionId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
