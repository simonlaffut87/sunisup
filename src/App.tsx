import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Users, Calculator, UserPlus, Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import SimulationPage from './pages/SimulationPage';
import AdminPage from './pages/AdminPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { LanguageSelector } from './components/LanguageSelector';
import { supabase } from './lib/supabase';

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'info@sunisup.be');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'info@sunisup.be');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAdmin(userData.email === 'info@sunisup.be');
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="bg-white shadow-sm border-b border-amber-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Sun className="w-8 h-8 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600">
                  {t('header.title')}
                </h1>
                <p className="text-xs sm:text-sm text-amber-700 hidden sm:block">
                  {t('header.subtitle')}
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link
                to="/"
                className={`font-medium transition-colors ${
                  isActive('/') 
                    ? 'text-amber-600 border-b-2 border-amber-600 pb-1' 
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/about"
                className={`font-medium transition-colors ${
                  isActive('/about') 
                    ? 'text-amber-600 border-b-2 border-amber-600 pb-1' 
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                {t('nav.about')}
              </Link>
              <Link
                to="/simulation"
                className={`font-medium transition-colors ${
                  isActive('/simulation') 
                    ? 'text-amber-600 border-b-2 border-amber-600 pb-1' 
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                {t('nav.quickscan')}
              </Link>
              <Link
                to="/admin"
                className={`font-medium transition-colors ${
                  isActive('/admin') 
                    ? 'text-amber-600 border-b-2 border-amber-600 pb-1' 
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                {t('nav.howToJoin')}
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <LanguageSelector 
                currentLanguage={i18n.language} 
                onLanguageChange={handleLanguageChange} 
              />
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-amber-700">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-amber-700 hover:text-amber-900 text-sm"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden sm:flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('header.memberAccess')}
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-amber-700 hover:text-amber-900"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-amber-100 py-4">
              <nav className="flex flex-col space-y-4">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    isActive('/') ? 'text-amber-600' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    isActive('/about') ? 'text-amber-600' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to="/simulation"
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    isActive('/simulation') ? 'text-amber-600' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  {t('nav.quickscan')}
                </Link>
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    isActive('/admin') ? 'text-amber-600' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  {t('nav.howToJoin')}
                </Link>
                {!user && (
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-fit"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t('header.memberAccess')}
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'info@sunisup.be');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'info@sunisup.be');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sun className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est admin et connecté, afficher le dashboard admin
  if (isAdmin && user) {
    return (
      <>
        <AdminDashboard />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navigation />
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="bg-amber-50 border-t border-amber-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-600">Sun Is Up</h3>
                    <p className="text-sm text-amber-700">{t('footer.description')}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-amber-900 mb-4">{t('footer.contact')}</h4>
                <div className="space-y-2 text-amber-700">
                  <p>📧 info@sunisup.be</p>
                  <p>📞 +32 471 31 71 48</p>
                  <p>📍 Bruxelles, Belgique</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-amber-900 mb-4">{t('footer.followUs')}</h4>
                <div className="space-y-2">
                  <a 
                    href="https://www.linkedin.com/company/sun-is-up" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-amber-200 mt-8 pt-8 text-center">
              <p className="text-amber-600">{t('footer.copyright')}</p>
            </div>
          </div>
        </footer>
      </div>
      
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;