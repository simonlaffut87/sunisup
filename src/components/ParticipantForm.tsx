import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { Save, Trash2, User, MapPin, Calendar, Mail, Hash, Euro, AlertCircle } from 'lucide-react';

type Participant = Database['public']['Tables']['participants']['Row'];

interface ParticipantFormProps {
  participant?: Participant;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ParticipantForm({ participant, onSuccess, onCancel }: ParticipantFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les données du participant lors de l'édition
  useEffect(() => {
    if (participant) {
        email: participant.email || '',
        ean_code: participant.ean_code || '',
        entry_date: participant.entry_date || participant.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        commodity_rate: participant.commodity_rate?.toString() || '',
        email: participant.email || '',
        ean_code: participant.ean_code || '',
        entry_date: participant.entry_date || participant.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        commodity_rate: participant.commodity_rate?.toString() || '',
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Le nom du participant est requis';
        } else {
          delete newErrors.name;
        }
        break;

      case 'address':
        if (!value.trim()) {
          newErrors.address = 'L\'adresse est requise';
        } else {
          delete newErrors.address;
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'adresse email est requise';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format d\'email invalide';
        } else {
          delete newErrors.email;
        }
        break;

      case 'ean_code':
        if (!value.trim()) {
          newErrors.ean_code = 'Le code EAN est requis';
        } else if (!/^[0-9]{18}$/.test(value)) {
          newErrors.ean_code = 'Le code EAN doit contenir exactement 18 chiffres';
        } else {
          delete newErrors.ean_code;
        }
        break;

      case 'commodity_rate':
        if (!value.trim()) {
          newErrors.commodity_rate = 'Le tarif de commodité est requis';
        } else {
          const numRate = parseFloat(value);
          if (isNaN(numRate) || numRate < 0 || numRate > 1000) {
            newErrors.commodity_rate = 'Le tarif doit être un nombre entre 0 et 1000 €/MWh';
          } else {
            delete newErrors.commodity_rate;
          }
        }
        break;

      case 'entry_date':
        if (!value) {
          newErrors.entry_date = 'La date d\'entrée est requise';
        } else {
          delete newErrors.entry_date;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateAllFields = () => {
    const requiredFields = ['name', 'address', 'email', 'ean_code', 'commodity_rate', 'entry_date'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData]?.toString() || '';
      
      switch (field) {
        case 'name':
          if (!value.trim()) newErrors.name = 'Le nom du participant est requis';
          break;
        case 'address':
          if (!value.trim()) newErrors.address = 'L\'adresse est requise';
          break;
        case 'email':
          if (!value.trim()) {
            newErrors.email = 'L\'adresse email est requise';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            newErrors.email = 'Format d\'email invalide';
          }
          break;
        case 'ean_code':
          if (!value.trim()) {
            newErrors.ean_code = 'Le code EAN est requis';
          } else if (!/^[0-9]{18}$/.test(value)) {
            newErrors.ean_code = 'Le code EAN doit contenir exactement 18 chiffres';
          }
          break;
        case 'commodity_rate':
          if (!value.trim()) {
            newErrors.commodity_rate = 'Le tarif de commodité est requis';
          } else {
            const numRate = parseFloat(value);
            if (isNaN(numRate) || numRate < 0 || numRate > 1000) {
              newErrors.commodity_rate = 'Le tarif doit être un nombre entre 0 et 1000 €/MWh';
            }
          }
          break;
        case 'entry_date':
          if (!value) newErrors.entry_date = 'La date d\'entrée est requise';
          break;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation complète avant soumission
    if (!validateAllFields()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire avant de continuer');
      return;
    }

    setLoading(true);

    try {
      // Données pour la table participants
      const participantData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        type: formData.type,
        email: formData.email.trim(),
        ean_code: formData.ean_code.trim(),
        commodity_rate: parseFloat(formData.commodity_rate),
        entry_date: formData.entry_date,
        // Valeurs par défaut pour les champs techniques requis
        lat: 50.8503, // Centre de Bruxelles par défaut
        lng: 4.3517,
        peak_power: 0,
        annual_production: 0,
        annual_consumption: 0,
        lat: 50.8503, // Centre de Bruxelles par défaut
        lng: 4.3517,
        peak_power: 0,
        annual_production: 0,
        annual_consumption: 0,
      };

      let participantId: string;
      // Message de succès
      const successMessage = isNewParticipant 
        ? `Participant "${formData.name}" ajouté avec succès !`
        : `Participant "${formData.name}" mis à jour avec succès !`;

      toast.success(successMessage);

      // Attendre un peu pour que l'utilisateur voie le message
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      toast.error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    } finally {
      const { error } = await supabase
        .from('participants')
      toast.success(`Participant "${participant.name}" supprimé avec succès`);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting participant:', error);
      toast.error('Erreur lors de la suppression: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleEanCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Supprimer tout ce qui n'est pas un chiffre
    if (value.length <= 18) {
      handleInputChange('ean_code', value);
    }
  };

  const handleCommodityRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permettre les nombres décimaux avec point ou virgule
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    handleInputChange('commodity_rate', cleanValue);
  };

  // Vérifier si le formulaire est valide
  const isFormValid = () => {
    return Object.keys(errors).length === 0 &&
           formData.name.trim() &&
           formData.address.trim() &&
           formData.email.trim() &&
           formData.ean_code.trim() &&
           formData.commodity_rate.trim() &&
           formData.entry_date;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {participant ? `Modifier ${participant.name}` : 'Ajouter un participant'}
        </h2>
        <p className="text-gray-600">
          Tous les champs marqués d'un astérisque (*) sont obligatoires
        </p>
      </div>

      {/* Alerte si des erreurs existent */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="font-medium text-red-900">Erreurs dans le formulaire</h4>
          </div>
          <ul className="text-sm text-red-800 space-y-1">
            {Object.values(errors).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du participant</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nom du participant *
              </label>
        {/* Informations administratives */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations administratives</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Date d'entrée */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date d'entrée dans la communauté *
              </label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={(e) => handleInputChange('entry_date', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                  errors.entry_date ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                }`}
                required
              />
              {errors.entry_date && <p className="text-sm text-red-600 mt-1">{errors.entry_date}</p>}
            </div>

            {/* Adresse email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Adresse email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                  errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                }`}
                placeholder="Ex: contact@boulangerie-martin.be"
                required
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Code EAN */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Hash className="w-4 h-4 inline mr-2" />
                Code EAN *
              </label>
              <input
                type="text"
                value={formData.ean_code}
                onChange={handleEanCodeChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-white text-gray-900 font-mono ${
                  errors.ean_code ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                }`}
                placeholder="541448000000000000"
                maxLength={18}
                required
              />
              {errors.ean_code && <p className="text-sm text-red-600 mt-1">{errors.ean_code}</p>}
              {!errors.ean_code && formData.ean_code && formData.ean_code.length < 18 && (
                <p className="text-sm text-gray-500 mt-1">
                  {18 - formData.ean_code.length} chiffres restants
                </p>
              )}
            </div>

            {/* Tarif de commodité */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Euro className="w-4 h-4 inline mr-2" />
                Tarif de commodité *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.commodity_rate}
                  onChange={handleCommodityRateChange}
                  className={`w-full px-4 py-3 pr-16 border rounded-lg focus:ring-2 focus:border-transparent bg-white text-gray-900 ${
                    errors.commodity_rate ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                  }`}
                  placeholder="Ex: 85.50"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">€/MWh</span>
                </div>
              </div>
              {errors.commodity_rate && <p className="text-sm text-red-600 mt-1">{errors.commodity_rate}</p>}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div>
            {participant?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="inline-flex items-center px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {participant ? 'Mettre à jour' : 'Ajouter le participant'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}