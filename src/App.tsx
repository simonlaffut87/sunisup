import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import SimulationPage from './pages/SimulationPage';
import AboutPage from './pages/AboutPage';
import { ContactModal } from './components/ContactModal';
import { LoginModal } from './components/LoginModal';
import { MemberDashboard } from './components/MemberDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LanguageSelector } from './components/LanguageSelector';
import { useAutoLogout } from './hooks/useAutoLogout';
import { supabase } from './lib/supabase';

function NavigationTabs() {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
            <Link
              to="/simulation"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/simulation'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-700 hover:text-amber-600'
              }`}
            >
              {t('nav.quickscan')}
            </Link>
            <Link
              to="/admin"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-700 hover:text-amber-600'
              }`}
            >
              {t('nav.howToJoin')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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
          <div className="md:hidden border-t border-gray-100 py-4">
            <div className="space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium ${
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
                className={`block px-3 py-2 text-sm font-medium ${
                  location.pathname === '/about'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-700 hover:text-amber-600'
                }`}
              >
                {t('nav.about')}
              </Link>
              <Link
                to="/simulation"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium ${
                  location.pathname === '/simulation'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-700 hover:text-amber-600'
                }`}
              >
                {t('nav.quickscan')}
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium ${
                  location.pathname === '/admin'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-700 hover:text-amber-600'
              }`}
              >
                {t('nav.howToJoin')}
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
    i18n.changeLanguage(initialLang);

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
      } catch {}
    };

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        handleLogout();
      } else if (session) {
        setUser(session.user);
        checkIsAdmin(session.user.email);
        linkParticipantEmailIfNeeded(session.user);
      }
    }).catch((error) => {
      console.error('Failed to get session:', error);
      handleLogout();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed, clear everything
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
  }, [i18n]);

  const checkIsAdmin = (email?: string) => {
    // Check if user is admin (info@sunisup.be)
    const isAdminUser = email === 'info@sunisup.be';
    setIsAdmin(isAdminUser);
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    i18n.changeLanguage(lang);
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
      // Force complete logout with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                    {t('header.title')}
                  </h1>
                  <p className="text-gray-600 text-xs sm:text-sm lg:text-base hidden sm:block truncate">
                    {t('header.subtitle')}
                  </p>
                </div>
              </Link>
              
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                />
                
                {user ? (
                  <button
                    onClick={() => setShowDashboard(true)}
                    disabled={isLoggingOut}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-2 text-xs sm:text-sm lg:text-base"
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-2 text-xs sm:text-sm lg:text-base"
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('header.memberAccess')}</span>
                    <span className="sm:hidden">{t('header.member')}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setShowContactModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-2 text-xs sm:text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">{t('header.contact')}</span>
                  <span className="sm:hidden">Contact</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <NavigationTabs />

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="w-12 h-12" />
                  <h3 className="text-xl font-bold">Sun Is Up</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  {t('footer.description')}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('footer.contact')}</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <p>+32 471 31 71 48</p>
                  <p>info@sunisup.be</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('footer.followUs')}</h3>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
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

export default App;