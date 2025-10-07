import React, { useState, useEffect } from "react";
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
  addDays,
  parse,
  isValid,
} from "date-fns";
import { motion } from "framer-motion";
import { Save, Trash2, Link, CalendarDays } from "lucide-react";

// 🔹 Parse la date depuis ton Google Sheet
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split(" ")[0].split("/");
  const time = dateStr.split(" ")[1] || "00:00";
  const d = new Date(`${year}-${month}-${day}T${time}`);
  return isValid(d) ? d : null;
}

export default function AdminEanChart() {
  const [urls, setUrls] = useState(() => {
    const saved = localStorage.getItem("csvUrls");
    return saved ? JSON.parse(saved) : [];
  });
  const [newUrl, setNewUrl] = useState("");
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // 🔄 Sauvegarde automatique dans localStorage
  useEffect(() => {
    localStorage.setItem("csvUrls", JSON.stringify(urls));
  }, [urls]);

  // 📥 Chargement des CSV combinés
  useEffect(() => {
    if (urls.length === 0) return;

    setLoading(true);
    const allRows = [];

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
                  .filter((r) => r["Date Début"] && r["Type de volume"])
                  .map((r) => ({
                    date: parseDate(r["Date Début"]),
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
      setLoading(false);
    });
  }, [urls]);

  // 🧮 Agrégation par quart d’heure sur la journée
  const aggregateData = () => {
    if (data.length === 0) return [];

    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    const step = 15; // minutes

    const aggregated = [];
    let current = start;
    while (current <= end) {
      const next = addMinutes(current, step);
      const slotData = data.filter((d) => d.date >= current && d.date < next);

      const consoPartagee = slotData
        .filter((d) => d.type === "Consommation partagée")
        .reduce((s, d) => s + d.volume, 0);
      const consoReseau = slotData
        .filter((d) => d.type === "Consommation réseau")
        .reduce((s, d) => s + d.volume, 0);
      const injectionReseau = slotData
        .filter((d) => d.type === "Injection Réseau")
        .reduce((s, d) => s + d.volume, 0);

      aggregated.push({
        time: format(current, "HH:mm"),
        consoPartagee,
        consoTotale: consoPartagee + consoReseau,
        injectionReseau,
      });
      current = next;
    }

    return aggregated;
  };

  const chartData = aggregateData();

  const totalConso = chartData.reduce((s, d) => s + d.consoTotale, 0);
  const totalInject = chartData.reduce((s, d) => s + d.injectionReseau, 0);

  // 🧠 UI
  return (
    <div className="bg-white mt-10 p-6 rounded-2xl shadow-lg border border-gray-200">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h3 className="text-2xl font-semibold flex items-center gap-2">
          <Link className="w-6 h-6 text-blue-600" />
          Suivi Énergétique Combiné
        </h3>
        <div className="text-sm text-gray-600">
          🔵 <strong>{totalConso.toFixed(2)} kWh</strong> consommés • 🟠{" "}
          <strong>{totalInject.toFixed(2)} kWh</strong> injectés
        </div>
      </motion.div>

      {/* Zone d’import et tableau des URLs */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">
            Ajouter une URL Google Sheet
          </label>
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Collez ici le lien CSV exporté"
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
          <Save className="w-4 h-4" /> Sauvegarder
        </button>
      </div>

      {urls.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">
            URLs enregistrées ({urls.length})
          </h4>
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

      {/* Sélecteur de date */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-5 h-5 text-gray-600" />
        <input
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="border rounded-md p-2"
        />
      </div>

      {/* Graphique principal */}
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
              {/* Conso partagée (fond vert translucide) */}
              <Area
                type="monotone"
                dataKey="consoPartagee"
                stroke="#16A34A"
                fill="#16A34A"
                fillOpacity={0.3}
                name="Consommation partagée"
              />
              {/* Conso totale (bleu) */}
              <Line
                type="monotone"
                dataKey="consoTotale"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                name="Consommation totale"
              />
              {/* Injection réseau (orange) */}
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
