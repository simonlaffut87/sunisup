import { Producer, Consumer } from './types';

export const producers: Producer[] = [
  {
    id: 1,
    lat: 50.8503,
    lng: 4.3517,
    peakPower: 5.2,
    name: "Centre Solaire Bruxelles-Central"
  },
  {
    id: 2,
    lat: 50.8467,
    lng: 4.3525,
    peakPower: 8.4,
    name: "Coopérative Sablon Solar"
  },
  {
    id: 3,
    lat: 50.8449,
    lng: 4.3489,
    peakPower: 3.6,
    name: "Marolles Energy Hub"
  }
];

export const consumers: Consumer[] = [
  {
    id: 1,
    lat: 50.8485,
    lng: 4.3541,
    name: "Résidence Grand Place"
  },
  {
    id: 2,
    lat: 50.8476,
    lng: 4.3507,
    name: "Appartements Saint-Géry"
  },
  {
    id: 3,
    lat: 50.8459,
    lng: 4.3534,
    name: "Logements Communautaires Midi"
  },
  {
    id: 4,
    lat: 50.8492,
    lng: 4.3484,
    name: "Complexe Dansaert"
  }
];

export const monthlyData = {
  production: [
    45000, 42000, 38000, 35000, 32000, 30000,
    31000, 33000, 36000, 39000, 42000, 44000
  ],
  consumption: [
    52000, 48000, 45000, 40000, 35000, 32000,
    33000, 34000, 38000, 42000, 46000, 50000
  ]
};

export const energyPrices = {
  description: "Prix moyens sur 2 ans hors frais de réseau et taxes",
  providers: [
    { 
      name: "Engie Easy Pro Variable", 
      price: 0.180,
      description: "Prix variable indexé sur le marché"
    },
    { 
      name: "Engie Direct Pro Variable Pro", 
      price: 0.145,
      description: "Prix variable avec engagement 2 ans"
    },
    { 
      name: "Total Energies Pixel Pro", 
      price: 0.145,
      description: "Prix variable avec engagement 1 an"
    },
    { 
      name: "Luminus ComfyFlex Pro", 
      price: 0.190,
      description: "Prix variable sans engagement"
    },
    { 
      name: "Sun Is Up CE", 
      price: 0.100,
      description: "Prix fixe direct producteur-consommateur"
    }
  ]
};