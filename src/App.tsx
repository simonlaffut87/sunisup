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
    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <p className="text-sm text-red-800">
            <strong>Database not connected:</strong> Please configure Supabase environment variables for full functionality
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-red-600 hover:text-red-800 text-sm underline"
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
  
  // Track page views when location changes
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
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-700 hover:text-amber-600'
              }`}
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/about"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/about'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-700 hover:text-amber-600'
              }`}
            >
              {t('nav.about')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-amber-600 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-2">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium ${
                  location.pathname === '/' 
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-700 hover:text-amber-600'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium ${
                  location.pathname === '/about'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-700 hover:text-amber-600'
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

  useEffect(() => {
    // Detect browser language on first load
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['fr', 'nl', 'en'];
    const defaultLang = supportedLangs.includes(browserLang) ? browserLang : 'fr';
    
    // Check if language is stored in localStorage
    const storedLang = localStorage.getItem('language');
    const initialLang = storedLang || defaultLang;
    
    setCurrentLanguage(initialLang);
    
    // Safely change language
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(initialLang).catch(error => {
        console.warn('Language change error:', error);
      });
    }

    // Helper: Link participant email on first login
    const linkParticipantEmailIfNeeded = async (authUser: any) => {
      try {
        if (!authUser?.email) return;
        const linkFlagKey = `participant-linked:${authUser.id}`;
        if (sessionStorage.getItem(linkFlagKey)) return;

        const participantId = authUser.user_metadata?.participant_id;
        const eanCode = authUser.user_metadata?.ean_code;
        let participantRow: any = null;

        if (participantId) {
          const { data, error } = await supabase
            .from('participants')
            .select('id, email')
            .eq('id', participantId)
            .maybeSingle();
          if (!error) participantRow = data;
        } else if (eanCode) {
          const { data, error } = await supabase
            .from('participants')
            .select('id, email')
            .eq('ean_code', eanCode)
            .maybeSingle();
          if (!error) participantRow = data;
        }

        if (!participantRow) return;
        if (participantRow.email && participantRow.email.trim()) {
          sessionStorage.setItem(linkFlagKey, '1');
          return;
        }

        const { error: updateError } = await supabase
          .from('participants')
          .update({ email: authUser.email })
          .eq('id', participantRow.id)
          .is('email', null);

        if (!updateError) {
          sessionStorage.setItem(linkFlagKey, '1');
          toast.success('Votre compte a été lié à votre participant.');
        }
      } catch (error) {
        console.warn('Error linking participant email:', error);
      }
    };

    // Check for existing session
    if (isSupabaseConfigured && supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session error:', error);
        } else if (session) {
          setUser(session.user);
          checkIsAdmin(session.user.email);
          linkParticipantEmailIfNeeded(session.user);
        }
      }).catch((error) => {
        console.warn('Failed to get session:', error);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          handleLogout();
        } else if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setShowDashboard(false);
          setIsAdmin(false);
        } else if (session?.user) {
          setUser(session.user);
          checkIsAdmin(session.user.email);
          linkParticipantEmailIfNeeded(session.user);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      console.log('Supabase not configured - authentication disabled');
    }
  }, []);

  const checkIsAdmin = (email?: string) => {
    // Check if user is admin (info@sunisup.be)
    const isAdminUser = email === 'info@sunisup.be';
    setIsAdmin(isAdminUser);
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lang).catch(console.warn);
    }
    localStorage.setItem('language', lang);
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setShowDashboard(true);
    // Ne pas vérifier admin ici - sera géré dans le dashboard
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      if (supabase && supabase.auth && typeof supabase.auth.signOut === 'function') {
        await supabase.auth.signOut({ scope: 'global' });
      }
      
      // Clear all Supabase-related data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Reset local state
      setUser(null);
      setShowDashboard(false);
      setIsAdmin(false);
      
      // Force page reload to ensure clean state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout fails, clear everything and redirect
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      setUser(null);
      setShowDashboard(false);
      setIsAdmin(false);
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Hook de déconnexion automatique - NOUVEAU
  useAutoLogout({
    onLogout: handleLogout,
    timeoutMinutes: 15, // 15 minutes d'inactivité
    isLoggedIn: !!user && showDashboard // Actif seulement si l'utilisateur est connecté et sur le dashboard
  });

  if (showDashboard && user) {
    // Vérifier si c'est l'admin seulement pour l'email spécifique
    if (user.email === 'info@sunisup.be') {
      return <AdminDashboard />;
    } else {
      // Tous les autres utilisateurs vont au dashboard membre personnel
      return <MemberDashboard user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <SupabaseConnectionBanner />
        
        {/* Modern Header */}
        <header className="fixed top-0 left-0 right-0 z-50 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3">
                <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-16 h-16" />
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <NavigationLinks />
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-3">
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                />
                
                {user ? (
                  <button
                    onClick={() => setShowDashboard(true)}
                    disabled={isLoggingOut}
                    className="bg-emerald-600/90 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 text-sm font-sans backdrop-blur-sm"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-blue-600/90 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 text-sm font-sans backdrop-blur-sm"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('header.memberAccess')}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setShowContactModal(true)}
                  className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl font-sans backdrop-blur-sm"
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

        {/* Main Content with top padding for fixed header */}
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </main>

        {/* Modern Footer */}
        <footer className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-3 mb-6">
                  <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-10 h-10" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 font-sans">Sun Is Up</h3>
                    <p className="text-gray-600 text-sm font-sans">{t('footer.description')}</p>
                  </div>
                </div>
                <p className="text-gray-600 max-w-md font-sans">
                  {t('footer.description')}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 font-sans">{t('footer.contact')}</h4>
                <div className="space-y-3 text-gray-600 text-sm">
                  <div className="flex items-center space-x-2 font-sans">
                    <span>📞</span>
                    <span>+32 471 31 71 48</span>
                  </div>
                  <div className="flex items-center space-x-2 font-sans">
                    <span>✉️</span>
                    <span>info@sunisup.be</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 font-sans">{t('footer.followUs')}</h4>
                <a 
                  href="https://www.linkedin.com/company/sun-is-up-asbl" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors text-sm font-sans"
                >
                  <span>🔗</span>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500 text-sm font-sans">
              {t('footer.copyright')}
            </div>
          </div>
        </footer>

        <Toaster position="top-right" />

        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
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
          className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 ${
            location.pathname === link.path
              ? 'text-amber-600'
              : 'text-gray-700 hover:text-amber-600'
          } font-sans`}
        >
          {link.path === '/' ? t('nav.services') : link.label}
          {location.pathname === link.path && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
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
        className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-full p-2 border border-gray-200"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'text-gray-700 hover:bg-gray-50'
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