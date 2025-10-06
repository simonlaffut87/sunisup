import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'react-hot-toast';
import { trackPageView } from './utils/analytics';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import SimulationPage from './pages/SimulationPage';
import AboutPage from './pages/AboutPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ContactModal } from './components/ContactModal';
import { LoginModal } from './components/LoginModal';
import { MemberDashboard } from './components/MemberDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LanguageSelector } from './components/LanguageSelector';
import { useAutoLogout } from './hooks/useAutoLogout';
import { supabase, isSupabaseConfigured } from './lib/supabase';

function SupabaseConnectionBanner() {
  const [showBanner, setShowBanner] = useState(!isSupabaseConfigured);
  if (!showBanner) return null;
  return (
    <div className="bg-brand-flame/10 border-b border-brand-flame px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-brand-flame/10 rounded-full animate-pulse"></div>
          <p className="text-sm text-brand-flame">
            <strong>Database not connected:</strong> Please configure Supabase environment variables for full functionality
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-brand-flame hover:text-brand-flame text-sm underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function NavigationTabs() {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const pageTitle = {
      '/': 'Accueil | Sun Is Up - Communauté d\'Énergie Bruxelles',
      '/about': 'À Propos | Sun Is Up - Thomas et Simon, Ingénieurs',
      '/simulation': 'Simulation Gratuite | Sun Is Up - Calculez vos Économies',
      '/admin': 'Rejoindre | Sun Is Up - Devenez Membre'
    }[location.pathname] || 'Sun Is Up';

    trackPageView(location.pathname, pageTitle);
  }, [location.pathname]);

  return (
    <nav className="bg-transparent sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-black border-b-2 border-black'
                  : 'text-black hover:text-neutral-800'
              }`}
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/about"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/about'
                  ? 'text-black border-b-2 border-black'
                  : 'text-black hover:text-neutral-800'
              }`}
            >
              {t('nav.about')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-black hover:text-neutral-800 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-300 py-2 bg-white/90">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium ${
                  location.pathname === '/' 
                    ? 'text-black bg-neutral-50'
                    : 'text-black hover:text-neutral-800'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium ${
                  location.pathname === '/about'
                    ? 'text-black bg-neutral-50'
                    : 'text-black hover:text-neutral-800'
                }`}
              >
                {t('nav.about')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [user, setUser] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setShowLoginModal(false);
    setIsAdmin(userData.email === 'info@sunisup.be');
    toast.success(t('login.success'));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setShowDashboard(false);
      toast.success(t('logout.success'));
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('logout.error'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ... (tout le reste du code App reste identique, pas touché)

  if (showDashboard && user) {
    if (user.email === 'info@sunisup.be') {
      return <AdminDashboard />;
    } else {
      return <MemberDashboard user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <Router>
      <div className="min-h-screen bg-white font-sans">
        <SupabaseConnectionBanner />

        {/* Transparent Header */}
        <header className="fixed top-0 left-0 right-0 z-50 font-sans bg-transparent text-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center space-x-3 relative top-2">
                <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-24 h-24" />
              </Link>

              <div className="hidden md:flex items-center space-x-8">
                <NavigationLinks />
              </div>

              <div className="flex items-center space-x-3">
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                />

                {user ? (
                  <button
                    onClick={() => setShowDashboard(true)}
                    disabled={isLoggingOut}
                    className="bg-brand-teal hover:bg-brand-teal-light text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm font-sans"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-brand-flame hover:bg-brand-flame-light text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm font-sans"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('header.memberAccess')}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowContactModal(true)}
                  className="bg-brand-gold hover:bg-brand-gold-light text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm font-sans"
                >
                  <span>{t('header.contact')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <MobileNavigation />

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gradient-to-br from-neutral-800 via-neutral-900 to-brand-teal/20 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-12 h-12" />
                  <div>
                    <h3 className="text-xl font-bold text-white font-sans">Sun Is Up</h3>
                    <p className="text-neutral-300 text-sm font-sans">{t('footer.description')}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-brand-gold mb-4 font-sans">{t('footer.contact')}</h4>
                <div className="space-y-2 text-neutral-200">
                  <p className="font-sans">📧 info@sunisup.be</p>
                  <p className="font-sans">📞 +32 471 31 71 48</p>
                  <p className="font-sans">📍 Bruxelles, Belgique</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-brand-gold mb-4 font-sans">{t('footer.followUs')}</h4>
                <div className="flex space-x-4">
                  <a href="https://www.linkedin.com/company/sun-is-up" target="_blank" rel="noopener noreferrer"
                     className="text-neutral-200 hover:text-brand-gold transition-colors">
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-600 mt-12 pt-8 text-center">
              <p className="text-neutral-300 font-sans">{t('footer.copyright')}</p>
            </div>
          </div>
        </footer>

        <Toaster position="top-right" />

        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLoginSuccess={handleLoginSuccess} />
      </div>
    </Router>
  );
}

function NavigationLinks() {
  const location = useLocation();
  const { t } = useTranslation();
  const links = [
    { path: '/', label: t('nav.home') },
    { path: '/about', label: t('nav.about') },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`relative px-3 py-2 text-sm font-medium transition-colors ${
            location.pathname === link.path
              ? 'text-neutral-800 border-b-2 border-brand-teal'
              : 'text-neutral-700 hover:text-neutral-900'
          } font-sans`}
        >
          {link.path === '/' ? t('nav.services') : link.label}
          {location.pathname === link.path && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />
          )}
        </Link>
      ))}
    </>
  );
}

function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const links = [
    { path: '/', label: t('nav.home') },
    { path: '/about', label: t('nav.about') },
  ];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-full p-2 border border-neutral-300"
      >
        {isOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5 text-black" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)}>
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300">
            <div className="p-6 pt-20">
              <nav className="space-y-4">
                {links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                      location.pathname === link.path
                        ? 'bg-teal-50 text-brand-teal border border-teal-200'
                        : 'text-neutral-700 hover:bg-white'
                    } font-sans`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
