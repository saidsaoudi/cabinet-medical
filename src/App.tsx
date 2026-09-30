import React from 'react';
import { api } from './lib/api.ts';
import { DoctorConfig } from './db/localDb.ts';
import Navbar from './components/Navbar.tsx';
import Footer from './components/Footer.tsx';
import PatientBooking from './components/PatientBooking.tsx';
import DoctorDashboard from './components/DoctorDashboard.tsx';
import ScrollReveal from './components/ScrollReveal.tsx';
import { Calendar, Phone, Clock, ShieldCheck, CheckCircle2, ChevronRight, RefreshCw, Activity, CheckCircle, AlertCircle, MapPin, Mail, ExternalLink } from 'lucide-react';

// Dynamic Image Paths
import CABINET_HERO from './assets/images/cabinet_interior_1790767908854.jpg';
import DOCTOR_PORTRAIT from './assets/images/doctor_profile_portrait_1790767897555.jpg';
import ALLERGOLOGY_IMAGE from './assets/images/allergology_testing_1790767920493.jpg';

export default function App() {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
  const [config, setConfig] = React.useState<DoctorConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = React.useState(true);

  // Preselected specialty state for true one-page booking flow integration
  const [preselectedSpecialty, setPreselectedSpecialty] = React.useState<'allergologie' | 'geriatrie' | 'general' | ''>('');

  const handleBookSpecialty = (spec: 'allergologie' | 'geriatrie' | 'general' | '') => {
    setPreselectedSpecialty(spec);
    handleScrollTo('reserver');
  };

  // Doctor Auth state
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = React.useState(false);
  const [doctorUser, setDoctorUser] = React.useState('');
  const [doctorPass, setDoctorPass] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);

  // Handle client-side navigation
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      // Offset slightly to account for the sticky navbar
      const yOffset = -75; 
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Load config
    setLoadingConfig(true);
    api.getConfig()
      .then(setConfig)
      .catch(err => console.error("Error loading config:", err))
      .finally(() => setLoadingConfig(false));

    // Check existing login
    api.checkAuth().then(setIsDoctorLoggedIn);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.login(doctorUser, doctorPass);
      if (res.success) {
        setIsDoctorLoggedIn(true);
        setDoctorUser('');
        setDoctorPass('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Identifiants incorrects.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsDoctorLoggedIn(false);
    navigate('/');
  };

  if (loadingConfig || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Chargement du cabinet...</span>
      </div>
    );
  }

  // Render Doctor portal pages
  if (currentPath.startsWith('/doctor')) {
    if (!isDoctorLoggedIn) {
      return (
        <div className="bg-slate-100 min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200/60 shadow-xl space-y-6 text-left">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Espace Praticien</h2>
              <p className="text-xs text-slate-400">Cabinet Médical Casablanca. Connexion sécurisée.</p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-medium text-rose-600">
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Adresse Email Professionnelle</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@alami.ma"
                  value={doctorUser}
                  onChange={(e) => setDoctorUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={doctorPass}
                  onChange={(e) => setDoctorPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                {authLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100">
              <button 
                onClick={() => navigate('/')}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ← Retour au site public
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <DoctorDashboard onLogout={handleLogout} />
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <Navbar currentPath={currentPath} onNavigate={navigate} onScrollTo={handleScrollTo} />

      <main className="flex-1">
        
        {/* Public One-Page Website layout */}
        {currentPath === '/' && (
          <div className="space-y-24 pb-20">
            
            {/* 1. HERO SECTION */}
            <div id="accueil">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
                    
                    {/* Hero Texts */}
                    <div className="space-y-6">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                        Cabinet Médical Casablanca
                      </span>
                      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight text-wrap balance">
                        Votre santé, <br />
                        <span className="text-blue-600">notre priorité.</span>
                      </h1>
                      <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-xl">
                        Allergologie, Gériatrie et Médecine générale à Casablanca, avec une prise en charge personnalisée, attentive et à la pointe des technologies médicales.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                          onClick={() => {
                            setPreselectedSpecialty('');
                            handleScrollTo('reserver');
                          }}
                          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/15 hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Calendar className="w-4.5 h-4.5" /> Prendre rendez-vous
                        </button>
                        <button
                          onClick={() => handleScrollTo('cabinet-presentation')}
                          className="px-6 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Découvrir le cabinet
                        </button>
                      </div>

                      {/* Trust Badges */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">100% sur rendez-vous</span>
                          <span className="block text-[10px] text-slate-400">Pas d'attente prolongée</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">Casablanca</span>
                          <span className="block text-[10px] text-slate-400">145 Bd d'Anfa</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">Réservation en ligne</span>
                          <span className="block text-[10px] text-slate-400">Simple & rapide</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">Confirmation SMS</span>
                          <span className="block text-[10px] text-slate-400">Rappels automatisés</span>
                        </div>
                      </div>
                    </div>

                    {/* Hero Image */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video lg:aspect-[4/3] bg-slate-200">
                      <img 
                        src={CABINET_HERO} 
                        alt="Cabinet médical moderne Dr. Sofia El Alami" 
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800"; // fallback
                        }}
                      />
                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-md border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Secrétariat Téléphonique</span>
                          <span className="text-sm font-bold text-slate-800">{config.phone}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 2. SUMMARY SPECIALTIES SECTION */}
            <div id="specialites">
              <ScrollReveal>
                <section className="bg-slate-50 py-16">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Notre Expertise Clinique</span>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nos Spécialités</h2>
                      <p className="text-sm text-slate-500 max-w-xl mx-auto">
                        Trois disciplines complémentaires pour un accompagnement attentif à tous les âges de la vie.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                      {/* Card 1: Allergologue */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all">
                        <div className="space-y-4">
                          <span className="text-3xl">🧬</span>
                          <h3 className="text-lg font-bold text-slate-950">Allergologie</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Diagnostic, tests cutanés (prick-tests) et traitements de l'ensemble des allergies respiratoires, alimentaires, médicamenteuses et cutanées chez l'enfant et l'adulte.
                          </p>
                        </div>
                        <button
                          onClick={() => handleScrollTo('allergologie-detail')}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Découvrir la spécialité <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Card 2: Gériatrie */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all">
                        <div className="space-y-4">
                          <span className="text-3xl">🧓</span>
                          <h3 className="text-lg font-bold text-slate-950">Gérontologie – Gériatrie</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Bilan cognitif, évaluation de mémoire, suivi de polymédication et préservation de l'autonomie chez les seniors de Casablanca. Consultations à domicile disponibles.
                          </p>
                        </div>
                        <button
                          onClick={() => handleScrollTo('geriatrie-detail')}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Découvrir la spécialité <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Card 3: Médecine Générale */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all">
                        <div className="space-y-4">
                          <span className="text-3xl">🩺</span>
                          <h3 className="text-lg font-bold text-slate-950">Médecine générale</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Suivi médical global, bilans de santé annuels, dépistage des maladies chroniques (hypertension, diabète) et orientation coordonnée.
                          </p>
                        </div>
                        <button
                          onClick={() => handleScrollTo('general-detail')}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Découvrir la spécialité <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 3. DETAILED ALLERGOLOGIE SECTION */}
            <div id="allergologie-detail">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-slate-50/50 rounded-3xl p-6 md:p-10 border border-slate-100/80">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center text-left">
                      <div className="space-y-6">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Focus Spécialité</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Allergologie Clinique</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          La prévalence des allergies respiratoires et cutanées à Casablanca nécessite un dépistage précoce et précis. Notre cabinet effectue des prick-tests (tests cutanés rapides, résultats en 15 minutes) permettant de diagnostiquer instantanément l'origine de vos symptômes.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Allergies respiratoires & Asthme</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Allergies alimentaires</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Eczéma & Urticaire chronique</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Prick-tests cutanés immédiats</div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleBookSpecialty('allergologie')}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                          >
                            Prendre RDV en Allergologie
                          </button>
                        </div>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden aspect-video shadow-md bg-slate-200">
                        <img 
                          src={ALLERGOLOGY_IMAGE} 
                          alt="Plateau d'allergologie diagnostic" 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 4. DETAILED GERIATRIE SECTION */}
            <div id="geriatrie-detail">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-slate-50/50 rounded-3xl p-6 md:p-10 border border-slate-100/80">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center text-left">
                      
                      <div className="relative rounded-2xl overflow-hidden aspect-video shadow-md bg-slate-200 order-last lg:order-first">
                        <img 
                          src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800" 
                          alt="Suivi gériatrique personnalisé" 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-6">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Focus Spécialité</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gérontologie & Gériatrie</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Pour accompagner nos aînés dans les meilleures conditions, nous proposons une Évaluation Gériatrique Globale (EGG) : bilan de mémoire, évaluation de l'autonomie physique, prévention des risques de chutes et régulation de la polymédication pour éviter les interactions médicamenteuses néfastes.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Bilan de mémoire & Cognition</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Prévention de la perte d'autonomie</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Suivi nutritionnel adapté</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Visite à domicile à Casablanca</div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleBookSpecialty('geriatrie')}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                          >
                            Prendre RDV en Gériatrie
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 5. DETAILED GENERAL SECTION */}
            <div id="general-detail">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-slate-50/50 rounded-3xl p-6 md:p-10 border border-slate-100/80">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center text-left">
                      <div className="space-y-6">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Focus Service</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Médecine Générale & Famille</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          La médecine générale est le pilier d'une bonne santé au quotidien. Le cabinet assure un suivi médical continu pour toute la famille : consultations aiguës, dépistage et régulation de l'hypertension artérielle et du diabète, vaccination et check-up annuels personnalisés.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Consultations aiguës de famille</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Suivi des maladies chroniques</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Check-up & bilans biologiques</div>
                          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-600" /> Certificats & vaccination</div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleBookSpecialty('general')}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                          >
                            Réserver une consultation générale
                          </button>
                        </div>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden aspect-video shadow-md bg-slate-200">
                        <img 
                          src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=800" 
                          alt="Médecine générale stéthoscope" 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 6. ABOUT DR. SOFIA EL ALAMI SECTION */}
            <div id="cabinet-presentation">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
                    
                    {/* Doctor Portrait Image */}
                    <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[3/4] max-w-sm mx-auto w-full bg-slate-200">
                      <img 
                        src={DOCTOR_PORTRAIT} 
                        alt="Dr. Sofia El Alami - Allergologue & Gériatre Casablanca" 
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"

                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-6 text-white">
                        <div>
                          <span className="text-base font-bold block">{config.name}</span>
                          <span className="text-xs text-blue-200 block">Casablanca Practice</span>
                        </div>
                      </div>
                    </div>

                    {/* Info Text */}
                    <div className="space-y-6">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">À propos du Médecin</span>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Une prise en charge humaine et rigoureuse</h2>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {config.bio}
                      </p>

                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Diplômes & Qualifications</h4>
                        <ul className="space-y-2.5">
                          {config.qualifications.map((qual, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                              <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                              <span>{qual}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                        <div>🗣️ Langues : <span className="font-semibold text-slate-800">{config.languages.join(', ')}</span></div>
                      </div>
                    </div>

                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 7. WHY CHOOSE US SECTION */}
            <div id="why-choose-us">
              <ScrollReveal>
                <section className="bg-slate-50 py-16">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Qualité des Soins</span>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pourquoi Nous Choisir ?</h2>
                      <p className="text-sm text-slate-500 max-w-xl mx-auto">
                        Nous plaçons le respect, l'écoute et l'excellence technique au cœur de notre déontologie quotidienne.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                      <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-xs space-y-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">01</div>
                        <h3 className="font-bold text-slate-800 text-sm">Écoute</h3>
                        <p className="text-xs text-slate-400 leading-normal">Une attention particulière portée à chaque patient, respectant le temps nécessaire pour un interrogatoire complet.</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-xs space-y-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">02</div>
                        <h3 className="font-bold text-slate-800 text-sm">Suivi personnalisé</h3>
                        <p className="text-xs text-slate-400 leading-normal">Une prise en charge médicale sur-mesure adaptée à votre mode de vie, vos antécédents et votre âge.</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-xs space-y-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">03</div>
                        <h3 className="font-bold text-slate-800 text-sm">Expertise</h3>
                        <p className="text-xs text-slate-400 leading-normal">Une approche basée sur l'expérience hospitalière et des formations universitaires complémentaires accréditées.</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-xs space-y-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">04</div>
                        <h3 className="font-bold text-slate-800 text-sm">Rendez-vous simplifié</h3>
                        <p className="text-xs text-slate-400 leading-normal">Une réservation en ligne ergonomique ouverte 24h/24, avec validation humaine rapide et alertes SMS.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            {/* 8. EMBEDDED RESERVATION funnel */}
            <div id="reserver">
              <ScrollReveal>
                <div className="bg-slate-50/40 py-10 border-y border-slate-100">
                  <PatientBooking 
                    onNavigate={navigate} 
                    config={config} 
                    preselectedSpecialty={preselectedSpecialty}
                    onClearPreselectedSpecialty={() => setPreselectedSpecialty('')}
                  />
                </div>
              </ScrollReveal>
            </div>

            {/* 9. CONTACT & HOURS COORDINATES SECTION */}
            <div id="contact-info">
              <ScrollReveal>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                  <div className="text-center mb-12">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Horaires & Plan</span>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nous Contacter & Nous Trouver</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
                      Notre cabinet est idéalement situé à Casablanca sur le Boulevard d'Anfa pour vous recevoir dans d'excellentes conditions d'accessibilité.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch text-left">
                    {/* Contact Coordinates */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/60 flex flex-col justify-between space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-950 mb-6 flex items-center gap-2">Coordonnées</h3>
                        
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse</h4>
                              <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{config.address}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone Fixe</h4>
                              <p className="text-sm font-semibold text-blue-600 mt-0.5">{config.phone}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.353 5.022L2 22l5.132-1.347a9.916 9.916 0 004.878 1.277c5.505 0 10.012-4.478 10.014-9.984C22.026 6.478 17.519 2 12.012 2zm5.727 14.18c-.234.66-.1.144-.812 1.345-.373.627-.864.887-1.484 1.137-.58.233-1.07.288-3.567-.704-2.83-1.127-4.63-4.018-4.773-4.21-.14-.19-1.14-1.52-1.14-2.899 0-1.38.72-2.057.975-2.333.254-.277.557-.347.74-.347.185 0 .373.003.535.01a1.57 1.57 0 011.107.531c.294.707.784 1.907.85 2.046.069.138.106.3.007.498-.1.199-.148.32-.294.49-.148.172-.31.384-.443.516-.148.148-.303.31-.131.606.172.296.764 1.258 1.636 2.036.872.778 1.604 1.018 1.83 1.116.226.1.36.082.496-.073.135-.155.584-.68.74-.91.155-.23.31-.19.525-.11.215.08 1.367.643 1.602.76.235.117.393.176.45.275.059.1.059.577-.176 1.236z"/>
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Secrétariat</h4>
                              <p className="text-sm font-semibold text-emerald-600 mt-0.5">{config.whatsapp}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Secrétariat</h4>
                              <p className="text-sm text-slate-600 mt-0.5">{config.email}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                        <a 
                          href={`tel:${config.phone.replace(/\s+/g, '')}`} 
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Phone className="w-4 h-4" /> Appeler Secrétariat
                        </a>
                        <a 
                          href={`https://wa.me/${config.whatsapp.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          WhatsApp Pro
                        </a>
                      </div>
                    </div>

                    {/* Opening Hours & Map Fallback */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/60 flex flex-col justify-between space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-950 mb-6 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-600" /> Horaires d'Ouverture
                        </h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                            <span className="font-semibold text-slate-700">Lundi - Vendredi</span>
                            <span className="text-slate-600">09:00 - 12:00 | 14:00 - 18:00</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                            <span className="font-semibold text-slate-700">Samedi</span>
                            <span className="text-slate-600">09:00 - 13:00</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                            <span className="font-semibold text-slate-700">Dimanche</span>
                            <span className="text-rose-600 font-bold uppercase text-[10px]">Fermé</span>
                          </div>
                        </div>
                      </div>

                      {/* Map preview */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                        <span className="block text-xs font-bold text-slate-800">145 Boulevard d'Anfa, Étage 3, Appt 12</span>
                        <span className="block text-[10px] text-slate-400 mt-1">À côté de la station de tramway. Ascenseur et rampe PMR disponibles.</span>
                        <a 
                          href="https://maps.google.com" 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-3 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          Ouvrir avec Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            </div>

          </div>
        )}

      </main>

      <Footer 
        currentPath={currentPath}
        onNavigate={navigate}
        onScrollTo={handleScrollTo}
        doctorName={config.name}
        doctorPhone={config.phone}
        doctorAddress={config.address}
      />
    </div>
  );
}
