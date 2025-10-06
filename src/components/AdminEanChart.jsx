import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, addMinutes, addDays, addMonths } from "date-fns";

// Mapping EAN → Nom (à adapter avec vos données)
const eanToName = {
  "541448911000009785": "Participant A",
  "541448911000009786": "Participant B",
  "541448911000009787": "Participant C",
  // ajoutez tous les EAN ici
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split(" ")[0].split("/");
  const time = dateStr.split(" ")[1] || "00:00";
  return new Date(`${year}-${month}-${day}T${time}`);
}

export default function AdminEanChart({ csvUrl }) {
  const [data, setData] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [granularity, setGranularity] = useState("day"); // day | week | year
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!csvUrl) return;
    setLoading(true);
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .filter((r) => r["Date Début"] && r["EAN"] && r["Type de volume"])
          .map((r) => ({
            date: parseDate(r["Date Début"]),
            ean: r["EAN"],
            name: eanToName[r["EAN"]] || r["EAN"],
            type: r["Type de volume"],
            volume: parseFloat(r["Volume (kWh)"]) || 0,
          }));
        setData(rows);

        const uniqueNames = [...new Set(rows.map((r) => r.name))];
        setParticipants(["Tous", ...uniqueNames]);
        setSelectedParticipant("Tous");
        setLoading(false);
      },
      error: (err) => {
        console.error("Erreur parsing CSV:", err);
        setLoading(false);
      },
    });
  }, [csvUrl]);

  const filterData = () => {
    let filtered = selectedParticipant === "Tous" 
      ? data 
      : data.filter((d) => d.name === selectedParticipant);

    let start, end;

    if (granularity === "day") {
      start = startOfDay(selectedDate);
      end = endOfDay(selectedDate);
    } else if (granularity === "week") {
      start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else if (granularity === "year") {
      start = startOfYear(selectedDate);
      end = endOfYear(selectedDate);
    }

    filtered = filtered.filter((d) => d.date >= start && d.date <= end);

    const grouped = [];
    if (granularity === "day") {
      let current = start;
      while (current <= end) {
        const next = addMinutes(current, 15);
        const volume = filtered
          .filter((d) => d.date >= current && d.date < next)
          .reduce((sum, d) => sum + d.volume, 0);
        grouped.push({ name: format(current, "HH:mm"), volume });
        current = next;
      }
    } else if (granularity === "week") {
      let current = start;
      while (current <= end) {
        const volume = filtered
          .filter((d) => d.date >= current && d.date < addDays(current, 1))
          .reduce((sum, d) => sum + d.volume, 0);
        grouped.push({ name: format(current, "EEE dd/MM"), volume });
        current = addDays(current, 1);
      }
    } else if (granularity === "year") {
      let current = start;
      while (current <= end) {
        const next = addMonths(current, 1);
        const volume = filtered
          .filter((d) => d.date >= current && d.date < next)
          .reduce((sum, d) => sum + d.volume, 0);
        grouped.push({ name: format(current, "MMM yyyy"), volume });
        current = next;
      }
    }

    return grouped;
  };

  const chartData = filterData();
  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);

  return (
    <div className="mt-10 bg-white p-6 rounded-xl border border-neutral-300 shadow-lg">
      <h3 className="text-xl font-semibold mb-4">📈 Volumes partagés et réseau</h3>

      {!csvUrl ? (
        <p className="text-neutral-500 italic">Aucun fichier sélectionné</p>
      ) : loading ? (
        <p className="text-neutral-500 italic">Chargement des données...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Participant</label>
              <select
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className="border rounded-md px-2 py-1"
              >
                {participants.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Granularité</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="border rounded-md px-2 py-1"
              >
                <option value="day">Journalier</option>
                <option value="week">Hebdomadaire</option>
                <option value="year">Annuel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border rounded-md px-2 py-1"
              />
            </div>
          </div>

          <div className="w-full h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis>
                  <Label value={`Volume total: ${totalVolume.toFixed(2)} kWh`} position="top" offset={20} />
                </YAxis>
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#10B981" dot={false} name="Volume (kWh)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
