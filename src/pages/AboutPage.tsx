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
  Building
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '../components/SEOHead';

export default function AboutPage() {
  const { t } = useTranslation();

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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 font-sans">
              {t('about.whoAreWe.title')}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto font-sans">
              {t('about.whoAreWe.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            {/* Thomas - Left side */}
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 hover:shadow-3xl transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">{t('about.whoAreWe.thomas.title')}</h3>
                <p className="text-blue-600 font-semibold text-lg font-sans">{t('about.whoAreWe.thomas.role')}</p>
              </div>
              
              <div className="space-y-6">
                {t('about.whoAreWe.thomas.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-gray-900 text-lg font-sans">{qualification.split('\n')[0]}</p>
                          <p className="text-gray-600 mt-2 font-sans">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p className="text-gray-700 font-sans"><strong className="text-gray-900">{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo - Center */}
            <div className="relative lg:order-first lg:col-span-1">
              <div className="aspect-[4/5] rounded-3xl shadow-3xl overflow-hidden relative">
                <img
                  src="/images/about.jpg"
                  alt="Thomas et Simon, fondateurs de Sun Is Up"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <div className="absolute -bottom-8 -right-8 bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Décembre 2024</p>
                    <p className="text-gray-600">Création de Sun Is Up</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simon - Right side */}
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 hover:shadow-3xl transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">{t('about.whoAreWe.simon.title')}</h3>
                <p className="text-amber-600 font-semibold text-lg font-sans">{t('about.whoAreWe.simon.role')}</p>
              </div>
              
              <div className="space-y-6">
                {t('about.whoAreWe.simon.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-gray-900 text-lg font-sans">{qualification.split('\n')[0]}</p>
                          <p className="text-gray-600 mt-2 font-sans">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p className="text-gray-700 font-sans"><strong className="text-gray-900">{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Friendship story - Below the image */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 via-white to-amber-50 rounded-3xl p-12 border border-gray-100 shadow-xl">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 font-sans">{t('about.whoAreWe.friendship.title')}</h3>
              </div>
              <p className="text-xl text-gray-700 text-center leading-relaxed max-w-4xl mx-auto font-sans">
                {t('about.whoAreWe.friendship.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans">
              {t('about.history.solution.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-200">
                <Building className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 font-sans">
                {t('about.history.solution.benefits.suppliers')}
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed font-sans">
                {t('about.history.solution.benefits.suppliersDescription')}
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 font-sans">
                {t('about.history.solution.benefits.resilience')}
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed font-sans">
                {t('about.history.solution.benefits.resilienceDescription')}
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-200">
                <Leaf className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 font-sans">
                {t('about.history.solution.benefits.sustainable')}
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed font-sans">
                {t('about.history.solution.benefits.sustainableDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans">
              {t('about.mission.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xl lg:text-2xl text-gray-600 mb-10 leading-relaxed font-sans">
                {t('about.history.solution.description')}
              </p>
              
              <div className="space-y-6">
                {t('about.mission.objectives.items', { returnObjects: true }).map((item: string, index: number) => (
                  <div key={index} className="flex items-start space-x-4">
                    <CheckCircle className="w-7 h-7 text-emerald-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-700 text-xl font-sans">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-100">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">724</h3>
                    <p className="text-gray-600 font-medium font-sans">{t('about.mission.stats.availableEnergy')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">11</h3>
                    <p className="text-gray-600 font-medium font-sans">{t('about.mission.stats.activeMembers')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl font-bold text-white">€</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">10%</h3>
                    <p className="text-gray-600 font-medium font-sans">{t('about.mission.stats.averageSavings')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <MapPin className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3 font-sans">100%</h3>
                    <p className="text-gray-600 font-medium font-sans">{t('about.mission.stats.localEnergy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans">
              {t('about.partners.title')}
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 font-sans">
              {t('about.partners.subtitle')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-12 lg:p-16 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Award className="w-12 h-12 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4 font-sans">Brugel</h4>
                <p className="text-gray-600 text-lg leading-relaxed font-sans">
                  {t('about.partners.technical.descriptions.brugel')}
                </p>
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Award className="w-12 h-12 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4 font-sans">Sibelga</h4>
                <p className="text-gray-600 text-lg leading-relaxed font-sans">
                  {t('about.partners.technical.descriptions.sibelga')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 font-sans">
            {t('about.cta.title')}
          </h2>
          <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-sans">
            {t('about.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="/admin"
              className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-full font-bold transition-all duration-200 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-3 justify-center text-lg font-sans"
            >
              {t('about.cta.joinButton')}
              <ArrowRight className="w-6 h-6" />
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}