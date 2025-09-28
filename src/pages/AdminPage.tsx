import React, { useState } from 'react';
import { 
  FileText, 
  Users, 
  Wallet, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContactModal } from '../components/ContactModal';
import { SEOHead } from '../components/SEOHead';

export default function AdminPage() {
  const [showContactModal, setShowContactModal] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <SEOHead 
        title="Rejoindre Communauté d'Énergie Bruxelles | Sun Is Up - Adhésion & Partage d'Énergie"
        description="Rejoignez la communauté d'énergie Bruxelles Sun Is Up en 4 étapes simples. Devenez membre pour bénéficier du partage d'énergie solaire et réduire votre facture électricité jusqu'à 30% en Belgique."
        keywords="rejoindre communauté d'énergie bruxelles, adhésion communauté énergie belgique, devenir membre partage énergie bruxelles, inscription communauté énergie bruxelles, join energy community brussels, become member energy sharing brussels, lid worden energiegemeenschap brussel, aansluiten energie delen brussel, comment rejoindre communauté énergie, réduction facture électricité belgique"
        url="https://sunisup.be/admin"
        logo="https://sunisup.be/images/logo.png"
      />
      <div className="min-h-screen bg-gray-50 font-sans">
      {/* Modern Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-full text-amber-700 font-medium shadow-lg mb-8 font-sans">
            <Users className="w-4 h-4 mr-2" />
            {t('howToJoin.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-8 font-sans">
            {t('howToJoin.title')}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-sans">
            {t('howToJoin.intro')}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Steps Section */}
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-full font-sans">
                    Étape 1
                  </span>
                  <h3 className="text-3xl font-bold text-gray-900 font-sans">{t('howToJoin.steps.documents.title')}</h3>
                </div>
                <ul className="space-y-4">
                  {t('howToJoin.steps.documents.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-full font-sans">
                    Étape 2
                  </span>
                  <h3 className="text-3xl font-bold text-gray-900 font-sans">{t('howToJoin.steps.membership.title')}</h3>
                </div>
                <ul className="space-y-4">
                  {t('howToJoin.steps.membership.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-purple-100 text-purple-800 font-bold px-4 py-2 rounded-full font-sans">
                    Étape 3
                  </span>
                  <h3 className="text-3xl font-bold text-gray-900 font-sans">{t('howToJoin.steps.financial.title')}</h3>
                </div>
                <ul className="space-y-4">
                  {t('howToJoin.steps.financial.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-full font-sans">
                    Étape 4
                  </span>
                  <h3 className="text-3xl font-bold text-gray-900 font-sans">{t('howToJoin.steps.activation.title')}</h3>
                </div>
                <ul className="space-y-4">
                  {t('howToJoin.steps.activation.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <h3 className="text-4xl lg:text-5xl font-bold mb-6 font-sans">
            {t('howToJoin.cta.title')}
          </h3>
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-sans">
            {t('howToJoin.cta.description')}
          </p>

          <button 
            onClick={() => setShowContactModal(true)}
              className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-full font-bold transition-all duration-200 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-3 mx-auto text-lg font-sans"
          >
             {t('howToJoin.cta.title')}
              <ArrowRight className="w-6 h-6" />
          </button>
          </div>
        </div>
      </div>

      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)} 
      />
      </div>
    </>
  );
}