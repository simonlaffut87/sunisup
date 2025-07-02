import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { Save, UserPlus } from 'lucide-react';

type Participant = Database['public']['Tables']['participants']['Row'];

export function ParticipantEntry() {
  const [formData, setFormData] = useState<Partial<Participant>>({
    name: '',
    address: '',
    type: 'consumer',
    peak_power: 0,
    annual_production: 0,
    annual_consumption: 0,
    lat: 50.8503,
    lng: 4.3517,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('participants')
        .insert([formData]);
      
      if (error) throw error;
      
      toast.success('Participant ajouté avec succès');
      setFormData({
        name: '',
        address: '',
        type: 'consumer',
        peak_power: 0,
        annual_production: 0,
        annual_consumption: 0,
        lat: 50.8503,
        lng: 4.3517,
      });
    } catch (error) {
      console.error('Error saving participant:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-amber-100 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-amber-600" />
        <h2 className="text-2xl font-bold text-amber-900">Ajouter un participant</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Type
            </label>
            <select
              value={formData.type || 'consumer'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'producer' | 'consumer' })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            >
              <option value="consumer">Consommateur</option>
              <option value="producer">Producteur</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Latitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.lat || ''}
              onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.lng || ''}
              onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            />
          </div>

          {formData.type === 'producer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Puissance installée (kWp)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.peak_power || ''}
                  onChange={(e) => setFormData({ ...formData, peak_power: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Production annuelle (kWh)
                </label>
                <input
                  type="number"
                  value={formData.annual_production || ''}
                  onChange={(e) => setFormData({ ...formData, annual_production: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg"
                  required
                />
              </div>
            </>
          )}

          <div className={formData.type === 'producer' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Consommation annuelle (kWh)
            </label>
            <input
              type="number"
              value={formData.annual_consumption || ''}
              onChange={(e) => setFormData({ ...formData, annual_consumption: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}