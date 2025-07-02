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

export default function AdminPage() {
  const [showContactModal, setShowContactModal] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-6">
            <Users className="w-4 h-4 mr-2" />
            {t('howToJoin.badge')}
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('howToJoin.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('howToJoin.intro')}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Steps Section */}
        <div className="space-y-8">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    Étape 1
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{t('howToJoin.steps.documents.title')}</h3>
                </div>
                <ul className="space-y-3">
                  {t('howToJoin.steps.documents.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                    Étape 2
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{t('howToJoin.steps.membership.title')}</h3>
                </div>
                <ul className="space-y-3">
                  {t('howToJoin.steps.membership.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                    Étape 3
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{t('howToJoin.steps.financial.title')}</h3>
                </div>
                <ul className="space-y-3">
                  {t('howToJoin.steps.financial.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 rounded-full">
                    Étape 4
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{t('howToJoin.steps.activation.title')}</h3>
                </div>
                <ul className="space-y-3">
                  {t('howToJoin.steps.activation.items', { returnObjects: true }).map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl p-8 lg:p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">
            {t('howToJoin.cta.title')}
          </h3>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            {t('howToJoin.cta.description')}
          </p>

          <button 
            onClick={() => setShowContactModal(true)}
            className="bg-white hover:bg-gray-100 text-amber-600 px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto text-lg"
          >
            {t('howToJoin.cta.button')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)} 
      />
    </div>
  );
}