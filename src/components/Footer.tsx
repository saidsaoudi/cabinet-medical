import React from 'react';
import { Mail, Phone, MapPin, Activity, ShieldCheck } from 'lucide-react';

interface FooterProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onScrollTo: (elementId: string) => void;
  doctorName?: string;
  doctorPhone?: string;
  doctorAddress?: string;
}

export default function Footer({ 
  currentPath,
  onNavigate, 
  onScrollTo, 
  doctorName = "Dr. Sofia El Alami", 
  doctorPhone = "+212 522 45 67 89", 
  doctorAddress = "145 Boulevard d'Anfa, Étage 3, Appt 12, Casablanca" 
}: FooterProps) {
  
  const handleLinkClick = (id: string) => {
    if (currentPath !== '/') {
      onNavigate('/');
      setTimeout(() => onScrollTo(id), 100);
    } else {
      onScrollTo(id);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Col 1: Cabinet Presentation */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                <Activity className="w-5.5 h-5.5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">{doctorName}</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cabinet médical pluridisciplinaire spécialisé en Allergologie, Gériatrie et Médecine Générale à Casablanca. Des soins attentifs et modernes adaptés à chaque étape de votre vie.
            </p>
          </div>

          {/* Col 2: Specialties Links */}
          <div className="space-y-4 text-left">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Nos Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleLinkClick('allergologie-detail')} className="hover:text-white transition-colors cursor-pointer text-left block">
                  Allergologue Casablanca
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('geriatrie-detail')} className="hover:text-white transition-colors cursor-pointer text-left block">
                  Gériatrie & Gérontologie
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('general-detail')} className="hover:text-white transition-colors cursor-pointer text-left block">
                  Médecine Générale
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Practical Info & Quick links */}
          <div className="space-y-4 text-left">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Liens Rapides</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleLinkClick('accueil')} className="hover:text-white transition-colors cursor-pointer">Accueil</button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('cabinet-presentation')} className="hover:text-white transition-colors cursor-pointer">Le Cabinet</button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('reserver')} className="hover:text-white transition-colors cursor-pointer font-medium text-blue-400">Prendre RDV en Ligne</button>
              </li>
              <li>
                <button onClick={() => onNavigate('/doctor')} className="hover:text-white transition-colors cursor-pointer">Portail Médecin</button>
              </li>
            </ul>
          </div>

          {/* Col 4: Address Coordinates */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Cabinet Casablanca</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{doctorAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{doctorPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                <span>contact@dr-elalami.ma</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} Cabinet Médical Dr. Sofia El Alami. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> RGPD & Secret Médical Garanti
            </span>
            <span>·</span>
            <span>Casablanca, Maroc</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
