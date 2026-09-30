import React from 'react';
import { Menu, X, Calendar, Activity } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onScrollTo: (elementId: string) => void;
}

export default function Navbar({ currentPath, onNavigate, onScrollTo }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const links = [
    { label: 'Accueil', id: 'accueil' },
    { label: 'Nos Spécialités', id: 'specialites' },
    { label: 'Le Cabinet', id: 'cabinet-presentation' },
    { label: 'Prendre Rendez-vous', id: 'reserver' },
    { label: 'Contact', id: 'contact-info' },
  ];

  const handleLinkClick = (id: string) => {
    setIsOpen(false);
    if (currentPath !== '/') {
      onNavigate('/');
      // Allow DOM to mount before scrolling
      setTimeout(() => onScrollTo(id), 100);
    } else {
      onScrollTo(id);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 items-center">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => handleLinkClick('accueil')}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block">Dr. El Alami</span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase block -mt-1 font-medium">Cabinet Médical Casablanca</span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="text-sm font-medium transition-colors py-1.5 cursor-pointer text-slate-600 hover:text-blue-600"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={() => onNavigate('/doctor')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Espace Médecin
            </button>
            <button
              onClick={() => handleLinkClick('reserver')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Prendre RDV
            </button>
          </div>

          {/* Hamburger Menu Mobile */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={() => handleLinkClick('reserver')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              RDV
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Menu principal"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden border-b border-slate-100 bg-white animate-fade-in">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="block w-full text-left px-4 py-2.5 rounded-lg text-base font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-950 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <button
                onClick={() => {
                  onNavigate('/doctor');
                  setIsOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Espace Médecin
              </button>
              <button
                onClick={() => handleLinkClick('reserver')}
                className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4.5 h-4.5" />
                Prendre rendez-vous
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
