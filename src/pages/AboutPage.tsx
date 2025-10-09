import React from 'react';
import { 
  Award, 
  Target, 
  MapPin, 
  Users, 
  Lightbulb, 
  Leaf,
  Zap,
  CheckCircle,
  ArrowRight,
  Building,
  Calculator,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="À Propos Communauté d'Énergie Bruxelles | Sun Is Up - Thomas et Simon, Ingénieurs Transition Énergétique"
        description="Découvrez Sun Is Up, communauté d'énergie Bruxelles fondée par Thomas et Simon, ingénieurs passionnés. Notre mission : démocratiser le partage d'énergie solaire et la réduction des factures électricité à Bruxelles et en Belgique."
        keywords="communauté d'énergie bruxelles, communauté d'énergie belgique, partage d'énergie bruxelles, Thomas Simon ingénieurs, histoire Sun Is Up, mission transition énergétique belgique, energy community brussels founders, energiegemeenschap brussel oprichters, réduction facture électricité belgique, énergie renouvelable bruxelles"
        url="https://sunisup.be/about"
        logo="https://sunisup.be/images/logo.png"
      />
      <div className="min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-neutral-900 mb-6 font-sans">
              {t('about.whoAreWe.title')}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-neutral-600 max-w-3xl mx-auto font-sans">
              {t('about.whoAreWe.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            {/* Thomas - Left side */}
            <div className="bg-white rounded-lg shadow-md p-8 border border-brand-teal hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-teal-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-brand-teal" />
                </div>
                <h3 className="text-2xl font-semibold text-neutral-800 mb-2 font-sans">{t('about.whoAreWe.thomas.title')}</h3>
                <p className="text-brand-teal font-medium text-base font-sans">{t('about.whoAreWe.thomas.role')}</p>
              </div>
              
              <div className="space-y-6">
                {t('about.whoAreWe.thomas.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-brand-teal rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-neutral-900 text-lg font-sans">{qualification.split('\n')[0]}</p>
                          <p className="text-neutral-600 mt-2 font-sans">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p className="text-neutral-700 font-sans"><strong className="text-neutral-900">{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo - Center */}
            <div className="relative lg:order-first lg:col-span-1">
              <div className="aspect-[4/5] rounded-lg shadow-lg overflow-hidden relative">
                <img
                  src="/images/about.jpg"
                  alt="Thomas et Simon, fondateurs de Sun Is Up"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-lg shadow-lg p-4 border border-brand-gold">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-800 text-base">Décembre 2024</p>
                    <p className="text-neutral-600 text-sm">Création de Sun Is Up</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simon - Right side */}
            <div className="bg-white rounded-lg shadow-md p-8 border border-brand-gold/20 hover:border-brand-gold/30 hover:shadow-lg transition-all duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-brand-gold/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-brand-gold" />
                </div>
                <h3 className="text-2xl font-semibold text-neutral-800 mb-2 font-sans">{t('about.whoAreWe.simon.title')}</h3>
                <p className="text-brand-gold font-medium text-base font-sans">{t('about.whoAreWe.simon.role')}</p>
              </div>
              
              <div className="space-y-6">
                {t('about.whoAreWe.simon.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-neutral-900 text-lg font-sans">{qualification.split('\n')[0]}</p>
                          <p className="text-neutral-600 mt-2 font-sans">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p className="text-neutral-700 font-sans"><strong className="text-neutral-900">{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Solution Section */}

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-neutral-900 mb-6 font-sans">
              {t('about.mission.communityStats.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xl lg:text-2xl text-neutral-600 mb-10 leading-relaxed font-sans">
                {t('about.history.solution.description')}
              </p>
              
              <div className="space-y-6">
                {t('about.mission.objectives.items', { returnObjects: true }).map((item: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
                    <p className="text-neutral-600 text-base font-sans">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-lg p-8 shadow-md border border-neutral-300">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-brand-gold/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-brand-gold" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-800 mb-2 font-sans">1300</h3>
                    <p className="text-neutral-600 text-sm font-medium font-sans">{t('about.mission.stats.availableEnergy')}</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-brand-teal/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-brand-teal" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-800 mb-2 font-sans">15</h3>
                    <p className="text-neutral-600 text-sm font-medium font-sans">{t('about.mission.stats.activeMembers')}</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-brand-teal">€</span>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-800 mb-2 font-sans">15%</h3>
                    <p className="text-neutral-600 text-sm font-medium font-sans">{t('about.mission.stats.averageSavings')}</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-brand-flame/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-brand-flame" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-800 mb-2 font-sans">100%</h3>
                    <p className="text-neutral-600 text-sm font-medium font-sans">{t('about.mission.stats.localEnergy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-neutral-900 mb-6 font-sans">
              {t('about.partners.title')}
            </h2>
          </div>

          {/* Carrousel de logos partenaires - directement sur le fond */}
          <div className="relative overflow-hidden py-12">
            <div className="flex animate-scroll-infinite space-x-8" style={{ width: 'calc(200%)' }}>
              {/* Premier set de logos */}
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/brugel2.png" alt="Brugel" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/carrefourv2.png" alt="Carrefour" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Enerinvest.png" alt="Enerinvest" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Ouzerie.png" alt="Ouzerie" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Prehaut.png" alt="Préhaut" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Stephenson.png" alt="Stephenson" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Sun4school.png" alt="Sun4School" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/sibelga2.png" alt="Sibelga" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              
              {/* Deuxième set de logos (duplication pour boucle infinie) */}
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/brugel2.png" alt="Brugel" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/carrefourv2.png" alt="Carrefour" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Enerinvest.png" alt="Enerinvest" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Ouzerie.png" alt="Ouzerie" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Prehaut.png" alt="Préhaut" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Stephenson.png" alt="Stephenson" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/Sun4school.png" alt="Sun4School" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-0 shrink-0 px-8">
                <div className="bg-brand-gold/10 p-3 rounded-lg shadow-sm border border-brand-gold/20">
                  <img src="/images/sibelga2.png" alt="Sibelga" className="h-32 w-32 object-contain opacity-90 hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}