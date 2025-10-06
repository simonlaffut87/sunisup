import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMinutes,
  addDays,
  addMonths,
} from "date-fns";
import { motion } from "framer-motion";
import { CalendarDays, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

// Couleurs par type
const typeColors = {
  "Consommation Partagée": "#22C55E",
  "Consommation Réseau": "#3B82F6",
  "Injection Réseau": "#FB923C",
  "Injection Partagée": "#EAB308",
};

// Parse la date (format Google Sheet)
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split(" ")[0].split("/");
  const time = dateStr.split(" ")[1] || "00:00";
  return new Date(`${year}-${month}-${day}T${time}`);
}

export default function AdminEanChart({ csvUrl }) {
  const [data, setData] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState(["Tous"]);
  const [granularity, setGranularity] = useState("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [eanToName, setEanToName] = useState({});
  const [selectedTypes, setSelectedTypes] = useState([
    "Consommation Partagée",
    "Consommation Réseau",
    "Injection Réseau",
    "Injection Partagée",
  ]);

  // Chargement participants depuis Supabase
  useEffect(() => {
    const loadParticipants = async () => {
      const { data: participantData, error } = await supabase
        .from("participants")
        .select("ean_code, name");
      if (error) {
        console.error("Erreur chargement participants:", error);
        return;
      }
      const mapping = {};
      participantData?.forEach((p) => {
        if (p.ean_code && p.name) mapping[p.ean_code] = p.name;
      });
      setEanToName(mapping);
    };
    loadParticipants();
  }, []);

  // Chargement CSV
  useEffect(() => {
    if (!csvUrl || Object.keys(eanToName).length === 0) return;
    setLoading(true);
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .filter(
            (r) => r["Date Début"] && r["EAN"] && r["Type de volume"]
          )
          .map((r) => ({
            date: parseDate(r["Date Début"]),
            ean: r["EAN"],
            name: eanToName[r["EAN"]] || r["EAN"],
            type: r["Type de volume"].trim(),
            volume: parseFloat(r["Volume (kWh)"]) || 0,
          }));
        const uniqueNames = [...new Set(rows.map((r) => r.name))];
        setParticipants(["Tous", ...uniqueNames.sort()]);
        setData(rows);
        setLoading(false);
      },
      error: (err) => {
        console.error("Erreur parsing CSV:", err);
        setLoading(false);
      },
    });
  }, [csvUrl, eanToName]);

  // Gestion de la période glissante
  const shiftDate = (baseDate, direction) => {
    if (granularity === "day") return addDays(baseDate, direction);
    if (granularity === "week") return addDays(baseDate, 7 * direction);
    if (granularity === "month") return addMonths(baseDate, direction);
    return baseDate;
  };
  const handlePeriodShift = (dir) => setSelectedDate(shiftDate(selectedDate, dir));

  // Préparation des données pour le graph
  const getFilteredData = () => {
    let filtered = selectedParticipants.includes("Tous")
      ? data
      : data.filter((d) => selectedParticipants.includes(d.name));
    filtered = filtered.filter((d) => selectedTypes.includes(d.type));

    // Définir la période à afficher
    let start, end;
    if (granularity === "day") {
      start = startOfDay(selectedDate);
      end = endOfDay(selectedDate);
    } else if (granularity === "week") {
      start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else if (granularity === "month") {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    }

    filtered = filtered.filter((d) => d.date >= start && d.date <= end);

    // Grouper les données par période
    const grouped = [];
    let current = start;
    while (current <= end) {
      let next;
      let label;
      if (granularity === "day") {
        next = addMinutes(current, 15);
        label = format(current, "HH:mm");
      } else if (granularity === "week") {
        next = addDays(current, 7);
        label = format(current, "EEE dd/MM");
      } else if (granularity === "month") {
        next = addMonths(current, 1);
        label = format(current, "MMM yyyy");
      }
      const obj = { name: label };
      for (const type of selectedTypes) {
        obj[type] = filtered
          .filter((d) => d.type === type && d.date >= current && d.date < next)
          .reduce((sum, d) => sum + d.volume, 0);
      }
      grouped.push(obj);
      current = next;
    }
    return grouped;
  };

  const chartData = getFilteredData();
  const totalVolume = chartData.reduce(
    (sum, d) =>
      sum +
      selectedTypes.reduce((t, type) => t + (d[type] || 0), 0),
    0
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
              {entry.value.toFixed(2)} kWh
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h3 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" /> Tableau énergétique
        </h3>
        <div className="text-gray-500 text-sm">
          Total affiché:{" "}
          <span className="font-semibold text-green-600">
            {totalVolume.toFixed(2)} kWh
          </span>
        </div>
      </motion.div>

      {!csvUrl ? (
        <p className="text-gray-500 italic">Aucun fichier sélectionné</p>
      ) : loading ? (
        <p className="text-gray-500 italic">Chargement des données...</p>
      ) : (
        <>
          {/* Sélecteurs */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Participants */}
            <div>
              <label className="block text-sm font-medium mb-1">Participants</label>
              <select
                multiple
                value={selectedParticipants}
                onChange={(e) =>
                  setSelectedParticipants(
                    Array.from(e.target.selectedOptions, (opt) => opt.value)
                  )
                }
                className="border rounded-md px-2 py-1 h-24 w-48"
              >
                {participants.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Granularité */}
            <div>
              <label className="block text-sm font-medium mb-1">Granularité</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="border rounded-md px-2 py-1"
              >
                <option value="day">Jour (quart d’heure)</option>
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <CalendarDays className="w-4 h-4" /> Date de référence
              </label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border rounded-md px-2 py-1"
              />
            </div>

            {/* Période glissante */}
            <div className="flex gap-2 items-end">
              <button
                onClick={() => handlePeriodShift(-1)}
                className="px-3 py-1 border rounded-md hover:bg-gray-100"
              >
                ⬅️
              </button>
              <button
                onClick={() => handlePeriodShift(1)}
                className="px-3 py-1 border rounded-md hover:bg-gray-100"
              >
                ➡️
              </button>
            </div>

            {/* Types de données */}
            <div>
              <label className="block text-sm font-medium mb-1">Types</label>
              <div className="flex flex-wrap gap-3">
                {Object.keys(typeColors).map((type) => (
                  <label key={type} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() =>
                        setSelectedTypes((prev) =>
                          prev.includes(type)
                            ? prev.filter((t) => t !== type)
                            : [...prev, type]
                        )
                      }
                    />
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: typeColors[type], color: "#fff" }}
                    >
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Graph */}
          <div className="w-full h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedTypes.map((type) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stackId="1"
                    stroke={typeColors[type]}
                    fill={typeColors[type]}
                    fillOpacity={0.8}
                    name={type}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
