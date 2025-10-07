import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
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
  addMinutes,
  isValid,
} from "date-fns";
import { motion } from "framer-motion";
import { Save, Trash2, Link, CalendarDays } from "lucide-react";

// 🕒 Parse robuste de la date "01/07/2025 00:15"
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const [d, h] = dateStr.split(" ");
    const [day, month, year] = d.split("/");
    const [hour, minute] = (h || "00:00").split(":");
    const date = new Date(year, month - 1, day, hour, minute);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export default function AdminEanChart() {
  const [urls, setUrls] = useState(() => {
    const saved = localStorage.getItem("csvUrls");
    return saved ? JSON.parse(saved) : [];
  });
  const [newUrl, setNewUrl] = useState("");
  const [data, setData] = useState([]);
  const [eans, setEans] = useState([]);
  const [selectedEans, setSelectedEans] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Sauvegarde des URLs
  useEffect(() => {
    localStorage.setItem("csvUrls", JSON.stringify(urls));
  }, [urls]);

  // Chargement et parsing CSV
  useEffect(() => {
    if (urls.length === 0) return;
    setLoading(true);

    Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            Papa.parse(url, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (result) => {
                const rows = result.data
                  .filter((r) => r["Date Début"] && r["EAN"] && r["Type de volume"])
                  .map((r) => ({
                    date: parseDate(r["Date Début"]),
                    ean: r["EAN"].trim(),
                    type: r["Type de volume"].trim(),
                    volume: parseFloat(r["Volume (kWh)"]) || 0,
                  }))
                  .filter((r) => r.date);
                resolve(rows);
              },
              error: () => resolve([]),
            });
          })
      )
    ).then((results) => {
      const merged = results.flat();
      setData(merged);
      const uniqueEans = [...new Set(merged.map((r) => r.ean))];
      setEans(uniqueEans);
      if (selectedEans.length === 0) setSelectedEans(uniqueEans);
      setLoading(false);
    });
  }, [urls]);

  // Agrégation des données (15 min)
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const steps = [];
    for (let t = start; t <= end; t = addMinutes(t, 15)) {
      const selectedData = data.filter(
        (r) =>
          r.date >= t &&
          r.date < addMinutes(t, 15) &&
          selectedEans.includes(r.ean)
      );

      const consoPartagee = selectedData
        .filter((d) => d.type === "Consommation partagée")
        .reduce((sum, d) => sum + d.volume, 0);
      const consoReseau = selectedData
        .filter((d) => d.type === "Consommation réseau")
        .reduce((sum, d) => sum + d.volume, 0);
      const injectReseau = selectedData
        .filter((d) => d.type === "Injection Réseau")
        .reduce((sum, d) => sum + d.volume, 0);

      steps.push({
        time: format(t, "HH:mm"),
        consoPartagee,
        consoTotale: consoPartagee + consoReseau,
        injectionReseau: injectReseau,
      });
    }

    return steps;
  }, [data, selectedDate, selectedEans]);

  const totalConso = chartData.reduce((s, d) => s + d.consoTotale, 0);
  const totalInject = chartData.reduce((s, d) => s + d.injectionReseau, 0);

  return (
    <div className="bg-white mt-10 p-6 rounded-2xl shadow-lg border border-gray-200">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h3 className="text-2xl font-semibold flex items-center gap-2">
          <Link className="w-6 h-6 text-blue-600" />
          Suivi Énergétique
        </h3>
        <div className="text-sm text-gray-600">
          🔵 <strong>{totalConso.toFixed(2)} kWh</strong> consommés • 🟠{" "}
          <strong>{totalInject.toFixed(2)} kWh</strong> injectés
        </div>
      </motion.div>

      {/* Ajout URL */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Collez ici l’URL CSV exportée"
            className="border rounded-md p-2 w-full"
          />
        </div>
        <button
          onClick={() => {
            if (newUrl && !urls.includes(newUrl)) {
              setUrls([...urls, newUrl]);
              setNewUrl("");
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Liste URLs */}
      {urls.length > 0 && (
        <div className="mb-8">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Lien</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((u, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2 truncate text-blue-600">{u}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => setUrls(urls.filter((x) => x !== u))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gray-600" />
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="border rounded-md p-2"
          />
        </div>

        {eans.length > 0 && (
          <select
            multiple
            value={selectedEans}
            onChange={(e) =>
              setSelectedEans(
                Array.from(e.target.selectedOptions, (opt) => opt.value)
              )
            }
            className="border rounded-md p-2 min-w-[250px]"
          >
            <option value="ALL" onClick={() => setSelectedEans(eans)}>
              Tous les EANs
            </option>
            {eans.map((ean) => (
              <option key={ean} value={ean}>
                {ean}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Graph */}
      {loading ? (
        <p className="text-gray-500 italic">Chargement des données...</p>
      ) : (
        <div className="w-full h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="consoPartagee"
                stroke="#16A34A"
                fill="#16A34A"
                fillOpacity={0.25}
                name="Consommation partagée"
              />
              <Line
                type="monotone"
                dataKey="consoTotale"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                name="Consommation totale"
              />
              <Line
                type="monotone"
                dataKey="injectionReseau"
                stroke="#FB923C"
                strokeWidth={2}
                dot={false}
                name="Injection réseau"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
