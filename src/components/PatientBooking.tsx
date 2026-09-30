import React from 'react';
import { Calendar as CalendarIcon, Check, ChevronRight, ChevronLeft, ShieldCheck, Clock, User, Phone, Mail, FileText, CheckCircle, Search, HelpCircle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Appointment, DoctorConfig } from '../db/localDb.ts';

interface PatientBookingProps {
  onNavigate: (path: string) => void;
  config: DoctorConfig;
  preselectedSpecialty?: 'allergologie' | 'geriatrie' | 'general' | '';
  onClearPreselectedSpecialty?: () => void;
}

export default function PatientBooking({ 
  onNavigate, 
  config, 
  preselectedSpecialty = '', 
  onClearPreselectedSpecialty 
}: PatientBookingProps) {
  const [step, setStep] = React.useState(1);

  // Synchronize preselectedSpecialty
  React.useEffect(() => {
    if (preselectedSpecialty) {
      setSpecialty(preselectedSpecialty);
      setStep(2); // Jump to consultation mode selection
    }
  }, [preselectedSpecialty]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  
  // Form State
  const [specialty, setSpecialty] = React.useState<'allergologie' | 'geriatrie' | 'general' | ''>('');
  const [consultationType, setConsultationType] = React.useState<'cabinet' | 'teleconsultation' | 'domicile' | ''>('');
  const [selectedDate, setSelectedDate] = React.useState(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = React.useState('');
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [patientName, setPatientName] = React.useState('');
  const [patientPhone, setPatientPhone] = React.useState('');
  const [patientEmail, setPatientEmail] = React.useState('');
  const [patientDob, setPatientDob] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [patientMessage, setPatientMessage] = React.useState('');
  const [consent, setConsent] = React.useState(false);

  // Success State
  const [createdAppointment, setCreatedAppointment] = React.useState<Appointment | null>(null);

  // Tracker State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchedApt, setSearchedApt] = React.useState<Appointment | null>(null);
  const [searchError, setSearchError] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  // Month navigation for date-picker
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const specialties = [
    { id: 'allergologie', title: 'Allergologie', desc: 'Diagnostic, tests cutanés (prick-tests) et traitements désensibilisants' },
    { id: 'geriatrie', title: 'Gérontologie & Gériatrie', desc: 'Bilan d\'autonomie, évaluation mémoire et suivi global du senior' },
    { id: 'general', title: 'Médecine Générale', desc: 'Suivi de famille, bilans de santé, ordonnances et préventions régulières' }
  ];

  // Fetch slots whenever the date changes
  React.useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      setSelectedTime('');
      api.getAvailableSlots(selectedDate)
        .then((slots) => {
          setAvailableSlots(slots);
          setErrorMsg('');
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg("Impossible de charger les créneaux libres.");
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [selectedDate]);

  // Calendar Helpers
  const handleMonthChange = (direction: 'next' | 'prev') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Fill offset for first day weekday
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to Monday starter

    for (let i = 0; i < offset; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push(dayDate);
    }

    return days;
  };

  const daysGrid = getDaysInMonth(currentMonth);

  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isDateSelectable = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Disable sundays (0)
    if (date.getDay() === 0) return false;

    // Disable past dates
    if (date < today) return false;

    // Maximum 60 days in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    if (date > maxDate) return false;

    return true;
  };

  // Submit appointment request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setErrorMsg("Vous devez accepter l'utilisation de vos informations pour soumettre votre demande.");
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        patientName,
        patientPhone,
        patientEmail,
        patientDob,
        specialtyId: specialty,
        consultationType,
        date: selectedDate,
        time: selectedTime,
        reason,
        patientMessage
      };

      const res = await api.createAppointment(payload);
      setCreatedAppointment(res);
      setStep(6); // Success screen
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de la réservation. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Track status from input
  const handleTrackStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchedApt(null);

    try {
      const res = await api.getAppointmentById(searchQuery.trim());
      if (res) {
        setSearchedApt(res);
      } else {
        setSearchError("Aucun rendez-vous trouvé avec cet identifiant.");
      }
    } catch (err: any) {
      setSearchError(err.message || "Aucun rendez-vous trouvé. Vérifiez l'identifiant saisi.");
    } finally {
      setSearching(false);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-md text-xs font-semibold">🟡 En attente de validation</span>;
      case 'CONFIRMED':
        return <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-md text-xs font-semibold">🟢 Confirmé</span>;
      case 'REJECTED':
        return <span className="text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-md text-xs font-semibold">🔴 Refusé par le cabinet</span>;
      case 'CANCELLED':
        return <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">⚪ Annulé</span>;
      default:
        return <span className="text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Navigation back and header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Réservation Simple</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Prendre Rendez-vous en Ligne</h2>
            <p className="text-sm text-slate-500 mt-1">Réservez votre consultation en quelques clics. Confirmation automatique par SMS.</p>
          </div>
        </div>

        {/* Step indicator (hide if success screen step 6) */}
        {step < 6 && (
          <div className="mb-8 bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            {[1, 2, 3, 4, 5].map((s) => {
              const isActive = s === step;
              const isPassed = s < step;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                    isPassed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isPassed ? <Check className="w-4.5 h-4.5" /> : s}
                  </div>
                  <span className={`text-xs font-medium hidden md:inline ${isActive ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    {s === 1 && "Spécialité"}
                    {s === 2 && "Prestation"}
                    {s === 3 && "Date & Heure"}
                    {s === 4 && "Informations"}
                    {s === 5 && "Confirmation"}
                  </span>
                  {s < 5 && <ChevronRight className="w-4 h-4 text-slate-300 hidden md:inline" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic step rendering */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          
          {errorMsg && (
            <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs font-medium text-rose-600">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* STEP 1: Specialty choice */}
          {step === 1 && (
            <div className="p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">1. Choisissez la Spécialité médicale</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {specialties.map((spec) => {
                  const isSelected = specialty === spec.id;
                  return (
                    <button
                      key={spec.id}
                      onClick={() => setSpecialty(spec.id as any)}
                      className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'
                        }`}>
                          <Check className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">{spec.title}</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{spec.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  disabled={!specialty}
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  Continuer <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Prestation mode selection */}
          {step === 2 && (
            <div className="p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">2. Sélectionnez le mode de consultation</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  onClick={() => setConsultationType('cabinet')}
                  className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    consultationType === 'cabinet' ? 'border-blue-600 bg-blue-50/20 shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl mb-3 block">🏥</span>
                  <h3 className="font-bold text-slate-800 text-sm">Au Cabinet</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    À l'adresse : 145 Bd d'Anfa, Casablanca.
                  </p>
                </button>

                <button
                  disabled={!config.enableTeleconsultation}
                  onClick={() => setConsultationType('teleconsultation')}
                  className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    !config.enableTeleconsultation ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    consultationType === 'teleconsultation' ? 'border-blue-600 bg-blue-50/20 shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl mb-3 block">💻</span>
                  <h3 className="font-bold text-slate-800 text-sm">Téléconsultation (Vidéo)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Lien sécurisé envoyé par SMS avant la consultation.
                  </p>
                </button>

                <button
                  disabled={!config.enableDomicile || specialty === 'allergologie'}
                  onClick={() => setConsultationType('domicile')}
                  className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    (!config.enableDomicile || specialty === 'allergologie') ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    consultationType === 'domicile' ? 'border-blue-600 bg-blue-50/20 shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl mb-3 block">🏠</span>
                  <h3 className="font-bold text-slate-800 text-sm">Visite à Domicile</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Disponible pour gériatrie et médecine générale à Casablanca.
                  </p>
                </button>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => {
                    if (onClearPreselectedSpecialty) {
                      onClearPreselectedSpecialty();
                    }
                    setStep(1);
                  }}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Retour
                </button>
                <button
                  disabled={!consultationType}
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  Choisir la date <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Date & Time Picker */}
          {step === 3 && (
            <div className="p-6 md:p-8 space-y-8">
              <h2 className="text-xl font-bold text-slate-900">3. Choisissez votre date et heure</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Visual Calendar */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => handleMonthChange('prev')} className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => handleMonthChange('next')} className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {daysGrid.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      
                      const isSelectable = isDateSelectable(day);
                      const isSelected = selectedDate === formatDateString(day);
                      const isToday = formatDateString(day) === formatDateString(new Date());

                      return (
                        <button
                          key={day.toISOString()}
                          disabled={!isSelectable}
                          onClick={() => setSelectedDate(formatDateString(day))}
                          className={`aspect-square rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                            isSelected ? 'bg-blue-600 text-white font-bold scale-105 shadow-md shadow-blue-500/20' :
                            isSelectable ? 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-100 shadow-xs' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <span>{day.getDate()}</span>
                          {isToday && (
                            <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slots Column */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-blue-600" />
                    Créneaux du {selectedDate ? new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : "---"}
                  </h3>

                  {!selectedDate ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                      Veuillez cliquer sur un jour du calendrier pour voir les créneaux disponibles.
                    </div>
                  ) : loadingSlots ? (
                    <div className="text-center py-10 space-y-2 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                      <span>Chargement des horaires libres...</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center text-rose-700 text-xs">
                      Aucun créneau disponible pour cette journée. Le cabinet est complet ou fermé. Veuillez choisir un autre jour.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {availableSlots.map((time) => {
                        const isChosen = selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`py-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isChosen ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15' : 'bg-white text-slate-700 border-slate-100 hover:border-blue-300'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Retour
                </button>
                <button
                  disabled={!selectedDate || !selectedTime || loadingSlots}
                  onClick={() => setStep(4)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  Vos Informations <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Personal Information Form */}
          {step === 4 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(5); }} className="p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">4. Renseignez vos coordonnées</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Youssef Benjelloun"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Téléphone Portable * (reçoit confirmation par SMS)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +212 612 34 56 78"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Ex: youssef@gmail.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Date de naissance (Gériatrie / Allergies)</label>
                  <input
                    type="date"
                    value={patientDob}
                    onChange={(e) => setPatientDob(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">Motif de consultation *</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prick-test allergie, suivi mémoire, check-up annuel, état grippal..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">Message complémentaire (optionnel)</label>
                  <textarea
                    rows={3}
                    placeholder="Précisez un symptôme ou toute information utile pour le médecin..."
                    value={patientMessage}
                    onChange={(e) => setPatientMessage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  Résumé du RDV <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Final Summary & Consent */}
          {step === 5 && (
            <div className="p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">5. Récapitulatif et envoi de la demande</h2>
              
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div className="text-slate-500 font-medium">Médecin</div>
                  <div className="font-bold text-slate-800">{config.name}</div>

                  <div className="text-slate-500 font-medium">Spécialité</div>
                  <div className="font-bold text-slate-800 uppercase text-xs">{specialty}</div>

                  <div className="text-slate-500 font-medium">Type</div>
                  <div className="font-bold text-slate-800 capitalize text-xs">{consultationType}</div>

                  <div className="text-slate-500 font-medium">Date du rendez-vous</div>
                  <div className="font-bold text-slate-800">
                    {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>

                  <div className="text-slate-500 font-medium">Heure du rendez-vous</div>
                  <div className="font-bold text-blue-600 text-base">{selectedTime}</div>

                  <div className="text-slate-500 font-medium border-t border-slate-150 pt-2">Patient</div>
                  <div className="font-bold text-slate-800 border-t border-slate-150 pt-2">{patientName}</div>

                  <div className="text-slate-500 font-medium">Portable</div>
                  <div className="font-bold text-slate-800">{patientPhone}</div>

                  <div className="text-slate-500 font-medium">Motif</div>
                  <div className="font-bold text-slate-700">{reason}</div>
                </div>
              </div>

              {/* RGPD Consent */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="consent" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                  J'accepte que mes informations personnelles soient recueillies et transmises au cabinet du Dr. El Alami pour traiter ma demande de rendez-vous médical et recevoir mes rappels et confirmations par SMS.
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Retour
                </button>
                <button
                  disabled={!consent || submitting}
                  onClick={handleSubmit}
                  className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer ma demande de RDV
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Booking Success */}
          {step === 6 && createdAppointment && (
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-md">
                <CheckCircle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900">Demande Envoyée avec Succès !</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                  <span>Statut : En attente de validation</span>
                </div>
              </div>

              <div className="max-w-md mx-auto p-5 border border-slate-100 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-3 leading-relaxed text-left">
                <p>
                  <strong>Monsieur / Madame {createdAppointment.patientName},</strong> votre demande de consultation du <strong>{new Date(createdAppointment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {createdAppointment.time}</strong> a bien été enregistrée.
                </p>
                <p>
                  Le médecin va étudier votre créneau. Vous recevrez <strong>automatiquement un SMS de confirmation</strong> sur votre téléphone portable ({createdAppointment.patientPhone}) dès validation.
                </p>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span>Identifiant de suivi :</span>
                  <span className="font-mono font-bold text-slate-900">{createdAppointment.id}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setStep(1);
                    setSpecialty('');
                    setConsultationType('');
                    setSelectedDate('');
                    setSelectedTime('');
                    setConsent(false);
                    setCreatedAppointment(null);
                    if (onClearPreselectedSpecialty) {
                      onClearPreselectedSpecialty();
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Retour à l'accueil
                </button>
                <button
                  onClick={() => {
                    setSearchQuery(createdAppointment.id);
                    setStep(7); // Go to Status Tracker tab
                    api.getAppointmentById(createdAppointment.id).then(setSearchedApt);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Suivre le statut
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Status Tracker View */}
          {step === 7 && (
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Suivi et statut de votre Rendez-vous</h2>
                <p className="text-xs text-slate-500 mt-1">Saisissez votre identifiant de suivi pour connaître l'état de votre demande en temps réel.</p>
              </div>

              <form onSubmit={handleTrackStatus} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Saisissez votre identifiant de RDV (Ex: apt_174...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Rechercher"}
                </button>
              </form>

              {searchError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-600 rounded-xl">
                  ⚠️ {searchError}
                </div>
              )}

              {searchedApt && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Demande de consultation</span>
                      <h3 className="font-extrabold text-slate-800 text-base">{searchedApt.patientName}</h3>
                    </div>
                    <div>
                      {getStatusBadge(searchedApt.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-medium block">Spécialité</span>
                      <span className="font-semibold text-slate-800 capitalize">{searchedApt.specialtyId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Mode de visite</span>
                      <span className="font-semibold text-slate-800 capitalize">{searchedApt.consultationType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Date</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(searchedApt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Heure</span>
                      <span className="font-semibold text-blue-600 text-sm">{searchedApt.time}</span>
                    </div>
                  </div>

                  {searchedApt.status === 'REJECTED' && searchedApt.rejectionReason && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-xs rounded-xl text-rose-800">
                      <strong>Note du cabinet :</strong> {searchedApt.rejectionReason}
                    </div>
                  )}

                  {searchedApt.status === 'CONFIRMED' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 text-xs rounded-xl text-emerald-800 leading-relaxed">
                      🎉 <strong>Votre rendez-vous est confirmé !</strong> Un SMS automatique a été envoyé à votre numéro de téléphone portable. Merci de vous présenter au cabinet 5 minutes avant l'heure prévue.
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-150 flex justify-between">
                <button
                  onClick={() => {
                    setStep(1);
                    setSpecialty('');
                    setConsultationType('');
                    setSelectedDate('');
                    setSelectedTime('');
                    setConsent(false);
                    setCreatedAppointment(null);
                    setSearchedApt(null);
                    setSearchQuery('');
                    if (onClearPreselectedSpecialty) {
                      onClearPreselectedSpecialty();
                    }
                  }}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Prendre un autre RDV
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setSpecialty('');
                    setConsultationType('');
                    setSelectedDate('');
                    setSelectedTime('');
                    setConsent(false);
                    setCreatedAppointment(null);
                    setSearchedApt(null);
                    setSearchQuery('');
                    if (onClearPreselectedSpecialty) {
                      onClearPreselectedSpecialty();
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Retour Accueil
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic tracker entry shortcut */}
        {step !== 7 && step !== 6 && (
          <div className="mt-8 bg-white/70 backdrop-blur-sm border border-slate-150 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Vous avez déjà envoyé une demande ?</p>
                <p className="text-[10px] text-slate-400">Suivez le statut de votre dossier de réservation en ligne.</p>
              </div>
            </div>
            <button
              onClick={() => { setStep(7); setErrorMsg(''); }}
              className="px-4 py-2 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Suivre mon statut
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
