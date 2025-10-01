import React from 'react';
import { Users, Lightbulb, Zap, MapPin, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '../components/SEOHead';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead 
        title="À Propos Communauté d'Énergie Bruxelles | Sun Is Up"
        description="Découvrez Sun Is Up, communauté d'énergie à Bruxelles fondée par Thomas et Simon. Notre mission : démocratiser le partage d'énergie solaire."
        url="https://sunisup.be/about"
        logo="/images/logo-v2.png"
      />
      <div className="min-h-screen bg-[#FFFFFF] font-sans">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-[#F5F5F5] to-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <h1 className="text-5xl lg:text-6xl font-bold text-[#212121] mb-6">
                {t('about.whoAreWe.title')}
              </h1>
              <p className="text-xl text-[#212121]/70 max-w-3xl mx-auto">
                {t('about.whoAreWe.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
              {/* Thomas */}
              <div className="bg-[#FFFFFF] rounded-3xl shadow-xl p-10 border border-[#F5F5F5] hover:shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-[#1565C0] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-[#212121] mb-3">{t('about.whoAreWe.thomas.title')}</h3>
                  <p className="text-[#1565C0] font-semibold text-lg">{t('about.whoAreWe.thomas.role')}</p>
                </div>
              </div>

              {/* Photo */}
              <div className="relative lg:order-first lg:col-span-1">
                <div className="aspect-[4/5] rounded-3xl shadow-2xl overflow-hidden relative">
                  <img
                    src="/images/about.jpg"
                    alt="Thomas et Simon"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
                <div className="absolute -bottom-8 -right-8 bg-[#FFFFFF] rounded-2xl shadow-xl p-6 border border-[#F5F5F5]">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-[#FFC107] rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#212121] text-lg">Décembre 2024</p>
                      <p className="text-[#212121]/70">Création de Sun Is Up</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simon */}
              <div className="bg-[#FFFFFF] rounded-3xl shadow-xl p-10 border border-[#F5F5F5] hover:shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-[#FFC107] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-[#212121] mb-3">{t('about.whoAreWe.simon.title')}</h3>
                  <p className="text-[#FFC107] font-semibold text-lg">{t('about.whoAreWe.simon.role')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 bg-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-[#212121] mb-6">
                {t('about.mission.communityStats.title')}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xl text-[#212121]/70 mb-10 leading-relaxed">
                  {t('about.history.solution.description')}
                </p>
                <div className="space-y-6">
                  {t('about.mission.objectives.items', { returnObjects: true }).map((item: string, index: number) => (
                    <div key={index} className="flex items-start space-x-4">
                      <CheckCircle className="w-7 h-7 text-[#388E3C] mt-1" />
                      <p className="text-[#212121] text-lg">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#FFFFFF] rounded-3xl p-12 shadow-xl border border-[#F5F5F5]">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#FFC107] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-[#212121] mb-3">1300</h3>
                    <p className="text-[#212121]/70">{t('about.mission.stats.availableEnergy')}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#1565C0] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-[#212121] mb-3">15</h3>
                    <p className="text-[#212121]/70">{t('about.mission.stats.activeMembers')}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#388E3C] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl font-bold text-white">€</span>
                    </div>
                    <h3 className="text-3xl font-bold text-[#212121] mb-3">15%</h3>
                    <p className="text-[#212121]/70">{t('about.mission.stats.averageSavings')}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#212121] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <MapPin className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-[#212121] mb-3">100%</h3>
                    <p className="text-[#212121]/70">{t('about.mission.stats.localEnergy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section className="py-20 bg-[#F5F5F5]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-[#212121] mb-6">
                {t('about.partners.title')}
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-12">
              <img src="/images/brugel2.png" alt="Brugel" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/carrefour.png" alt="Carrefour" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/Enerinvest.png" alt="Enerinvest" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/Ouzerie.png" alt="Ouzerie" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/Prehaut.png" alt="Préhaut" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/Stephenson.png" alt="Stephenson" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/Sun4school.png" alt="Sun4School" className="h-20 object-contain opacity-90 hover:opacity-100" />
              <img src="/images/sibelga2.png" alt="Sibelga" className="h-20 object-contain opacity-90 hover:opacity-100" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
