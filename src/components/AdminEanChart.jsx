import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminEanChartProps {
  csvUrl: string;
  granularity?: 'day' | 'week' | 'month';
}

interface Row {
  startDate: string;
  endDate: string;
  volume: string;
}

export default function AdminEanChart({ csvUrl, granularity = 'day' }: AdminEanChartProps) {
  const [dataRows, setDataRows] = React.useState<Row[]>([]);

  React.useEffect(() => {
    fetch(csvUrl)
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n').slice(1); // skip header
        const rows: Row[] = lines.map(line => {
          const [startDate, endDate,, , , , , volume] = line.split('\t'); // Google Sheet TSV
          return { startDate, endDate, volume };
        });
        setDataRows(rows);
      });
  }, [csvUrl]);

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    dataRows.forEach(row => {
      if (!row.startDate) return;

      // Parsing date dd/MM/yyyy HH:mm
      const [day, month, yearAndTime] = row.startDate.split('/');
      if (!day || !month || !yearAndTime) return;
      const [year, time] = yearAndTime.split(' ');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(time.split(':')[0]), Number(time.split(':')[1]));
      if (isNaN(parsedDate.getTime())) return;

      let key: string;
      if (granularity === 'month') key = format(startOfMonth(parsedDate), 'yyyy-MM');
      else if (granularity === 'week') key = format(startOfWeek(parsedDate, { locale: fr }), 'yyyy-ww');
      else key = format(parsedDate, 'yyyy-MM-dd');

      // Extraire seulement le nombre du volume
      const vol = parseFloat(row.volume.replace(/\D/g, '')) || 0;

      grouped[key] = (grouped[key] || 0) + vol;
    });

    const labels = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const values = labels.map(label => grouped[label]);

    return {
      labels,
      datasets: [
        {
          label: 'Volume (kWh)',
          data: values,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.3)',
          tension: 0.3,
        },
      ],
    };
  }, [dataRows, granularity]);

  return <Line data={chartData} />;
}
