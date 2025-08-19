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

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('about.whoAreWe.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('about.whoAreWe.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Thomas - Left side */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl p-8 border border-blue-200">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('about.whoAreWe.thomas.title')}</h3>
                <p className="text-blue-700 font-semibold mb-4">{t('about.whoAreWe.thomas.role')}</p>
              </div>
              
              <div className="space-y-4 text-gray-700">
                {t('about.whoAreWe.thomas.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-blue-900">{qualification.split('\n')[0]}</p>
                          <p className="text-gray-600 mt-1">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p><strong>{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo - Center */}
            <div className="relative">
              <div className="w-full h-[600px] rounded-2xl shadow-2xl overflow-hidden relative" style={{ width: '120%', marginLeft: '-10%' }}>
                
                <img
                  src="/images/simtom.png"
                  alt="Thomas et Simon, fondateurs de Sun Is Up"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  style={{
                    imageRendering: 'auto',
                    aspectRatio: '4/3'
                  }}
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Décembre 2024</p>
                    <p className="text-gray-600 text-sm">Création de Sun Is Up</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simon - Right side */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl shadow-xl p-8 border border-amber-200">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('about.whoAreWe.simon.title')}</h3>
                <p className="text-amber-700 font-semibold mb-4">{t('about.whoAreWe.simon.role')}</p>
              </div>
              
              <div className="space-y-4 text-gray-700">
                {t('about.whoAreWe.simon.qualifications', { returnObjects: true }).map((qualification: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      {qualification.includes('\n') ? (
                        <div>
                          <p className="font-bold text-amber-900">{qualification.split('\n')[0]}</p>
                          <p className="text-gray-600 mt-1">{qualification.split('\n')[1]}</p>
                        </div>
                      ) : (
                        <p><strong>{qualification.split(' - ')[0]}</strong> - {qualification.split(' - ')[1]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Friendship story - Below the image */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded-2xl p-8 border border-gray-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('about.whoAreWe.friendship.title')}</h3>
              </div>
              <p className="text-lg text-gray-700 text-center leading-relaxed">
                {t('about.whoAreWe.friendship.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('about.history.solution.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('about.history.solution.benefits.suppliers')}
              </h3>
              <p className="text-gray-600">
                {t('about.history.solution.benefits.suppliersDescription')}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('about.history.solution.benefits.resilience')}
              </h3>
              <p className="text-gray-600">
                {t('about.history.solution.benefits.resilienceDescription')}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Leaf className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('about.history.solution.benefits.sustainable')}
              </h3>
              <p className="text-gray-600">
                {t('about.history.solution.benefits.sustainableDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('about.mission.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xl text-gray-600 mb-8">
                {t('about.history.solution.description')}
              </p>
              
              <div className="space-y-4">
                {t('about.mission.objectives.items', { returnObjects: true }).map((item: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-700 text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">724</h3>
                    <p className="text-gray-600">{t('about.mission.stats.availableEnergy')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">11</h3>
                    <p className="text-gray-600">{t('about.mission.stats.activeMembers')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-white">€</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">10%</h3>
                    <p className="text-gray-600">{t('about.mission.stats.averageSavings')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">100%</h3>
                    <p className="text-gray-600">{t('about.mission.stats.localEnergy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('about.partners.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('about.partners.subtitle')}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-amber-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Brugel</h4>
                <p className="text-gray-600">
                  {t('about.partners.technical.descriptions.brugel')}
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-amber-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Sibelga</h4>
                <p className="text-gray-600">
                  {t('about.partners.technical.descriptions.sibelga')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-amber-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            {t('about.cta.title')}
          </h2>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            {t('about.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/admin"
              className="bg-white hover:bg-gray-100 text-amber-600 px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              {t('about.cta.joinButton')}
              <ArrowRight className="w-5 h-5" />
            </a>
            <a 
              href="/simulation"
              className="border-2 border-white hover:bg-white hover:text-amber-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center gap-2 justify-center"
            >
              {t('about.cta.simulateButton')}
              <Target className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}