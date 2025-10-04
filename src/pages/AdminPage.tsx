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
      <div className="min-h-screen bg-white font-sans">
      {/* Modern Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-white to-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm border border-brand-gold/30 rounded-full text-brand-gold font-medium shadow-lg mb-8 font-sans">
            <Users className="w-4 h-4 mr-2" />
            {t('howToJoin.badge')}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 mb-6 sm:mb-8 font-sans leading-tight">
            {t('howToJoin.title')}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-neutral-600 max-w-4xl mx-auto font-sans leading-relaxed px-2">
            {t('howToJoin.intro')}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Steps Section */}
        <div className="space-y-8 sm:space-y-12">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-neutral-300 p-6 sm:p-8 lg:p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start space-y-6 sm:space-y-0 sm:space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-teal rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto sm:mx-0">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-center sm:text-left">
                  <span className="bg-teal-100 text-teal-800 font-bold px-3 py-1 sm:px-4 sm:py-2 rounded-full font-sans text-sm sm:text-base">
                    Étape 1
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 font-sans">{t('howToJoin.steps.documents.title')}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {t('howToJoin.steps.documents.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3 sm:space-x-4">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal flex-shrink-0 mt-0.5 sm:mt-1" />
                      <span className="text-neutral-700 text-base sm:text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-neutral-300 p-6 sm:p-8 lg:p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start space-y-6 sm:space-y-0 sm:space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-teal rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto sm:mx-0">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-center sm:text-left">
                  <span className="bg-teal-100 text-teal-800 font-bold px-3 py-1 sm:px-4 sm:py-2 rounded-full font-sans text-sm sm:text-base">
                    Étape 2
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 font-sans">{t('howToJoin.steps.membership.title')}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {t('howToJoin.steps.membership.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3 sm:space-x-4">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal flex-shrink-0 mt-0.5 sm:mt-1" />
                      <span className="text-neutral-700 text-base sm:text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-neutral-300 p-6 sm:p-8 lg:p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start space-y-6 sm:space-y-0 sm:space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-flame rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto sm:mx-0">
                  <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-center sm:text-left">
                  <span className="bg-teal-100 text-teal-800 font-bold px-3 py-1 sm:px-4 sm:py-2 rounded-full font-sans text-sm sm:text-base">
                    Étape 3
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 font-sans">{t('howToJoin.steps.financial.title')}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {t('howToJoin.steps.financial.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3 sm:space-x-4">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal flex-shrink-0 mt-0.5 sm:mt-1" />
                      <span className="text-neutral-700 text-base sm:text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-neutral-300 p-6 sm:p-8 lg:p-12 hover:shadow-3xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start space-y-6 sm:space-y-0 sm:space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-gold rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto sm:mx-0">
                  <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-center sm:text-left">
                  <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 sm:px-4 sm:py-2 rounded-full font-sans text-sm sm:text-base">
                    Étape 4
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 font-sans">{t('howToJoin.steps.activation.title')}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {t('howToJoin.steps.activation.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3 sm:space-x-4">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal flex-shrink-0 mt-0.5 sm:mt-1" />
                      <span className="text-neutral-700 text-base sm:text-lg font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-16 lg:mt-20 bg-gradient-to-r from-brand-teal via-brand-gold to-brand-flame rounded-2xl sm:rounded-3xl shadow-2xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 font-sans leading-tight">
            {t('howToJoin.cta.title')}
          </h3>
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-white/90 mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto font-sans leading-relaxed px-2">
            {t('howToJoin.cta.description')}
          </p>

          <button 
            onClick={() => setShowContactModal(true)}
              className="bg-white hover:bg-white text-neutral-900 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-full font-bold transition-all duration-200 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-2 sm:gap-3 mx-auto text-base sm:text-lg font-sans"
          >
             {t('howToJoin.cta.title')}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
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