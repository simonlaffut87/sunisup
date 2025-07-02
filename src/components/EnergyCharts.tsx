import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { energyPrices } from '../data';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EnergyChartsProps {
  totalProduction: number;
  totalConsumption: number;
}

export function EnergyCharts({ totalProduction, totalConsumption }: EnergyChartsProps) {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Distribution mensuelle approximative basée sur un profil type
  const monthlyDistribution = [
    0.10, 0.09, 0.08, 0.07, 0.07, 0.06,
    0.07, 0.07, 0.08, 0.09, 0.10, 0.12
  ];

  const monthlyProduction = monthlyDistribution.map(factor => totalProduction * factor);
  const monthlyConsumption = monthlyDistribution.map(factor => totalConsumption * factor);

  const sunIsUpRate = energyPrices.providers.find(p => p.name === 'Sun Is Up CE')?.price || 0.100;

  // Formater les noms des fournisseurs sur deux lignes
  const formattedLabels = energyPrices.providers.map(p => {
    const words = p.name.split(' ');
    const midPoint = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, midPoint).join(' ');
    const secondLine = words.slice(midPoint).join(' ');
    return [firstLine, secondLine].filter(Boolean).join('\n');
  });

  const productionConsumptionData = {
    labels: months,
    datasets: [
      {
        label: 'Production (kWh)',
        data: monthlyProduction,
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Consommation (kWh)',
        data: monthlyConsumption,
        backgroundColor: 'rgba(217, 119, 6, 0.8)',
        borderColor: 'rgb(217, 119, 6)',
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  };

  const priceComparisonData = {
    labels: formattedLabels,
    datasets: [
      {
        label: 'Prix par kWh (€)',
        data: energyPrices.providers.map(p => p.price),
        backgroundColor: energyPrices.providers.map(p => 
          p.name === 'Sun Is Up CE' ? 'rgba(251, 191, 36, 0.8)' : 'rgba(217, 119, 6, 0.5)'
        ),
        borderColor: energyPrices.providers.map(p => 
          p.name === 'Sun Is Up CE' ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)'
        ),
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  };

  const productionConsumptionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Production et Consommation Mensuelle',
        color: 'rgb(120, 53, 15)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Énergie (kWh)',
        },
      },
    },
  };

  const priceComparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: ['Comparaison des Prix', energyPrices.description],
        color: 'rgb(120, 53, 15)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const provider = energyPrices.providers[context.dataIndex];
            return [
              `Prix: ${context.formattedValue} €/kWh`,
              provider.description
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '€/kWh',
        },
      },
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          font: {
            size: 12,
            weight: 'bold'
          },
          autoSkip: false
        },
        afterFit: (scale: any) => {
          scale.height = 80; // Ajuste l'espace pour les labels multi-lignes
        }
      }
    },
    layout: {
      padding: {
        bottom: 10
      }
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-100">
        <div style={{ height: '400px' }}>
          <Bar options={productionConsumptionOptions} data={productionConsumptionData} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-100">
        <div style={{ height: '400px' }}>
          <Bar options={priceComparisonOptions} data={priceComparisonData} />
        </div>
      </div>
    </div>
  );
}