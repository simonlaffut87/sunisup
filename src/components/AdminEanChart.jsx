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
import { CalendarDays, Users, Settings, Plus, Trash2, Edit2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

// 🔹 Couleurs par type (professionnelles)
const typeColors = {
  "Consommation Partagée": "#22C55E", // vert
  "Consommation Réseau": "#3B82F6", // bleu
  "Injection Réseau": "#FB923C", // orange
  "Injection Partagée": "#EAB308", // jaune
};

// 🔹 Parse la date (format Google Sheet)
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
  const [periodWindow, setPeriodWindow] = useState("current"); // previous | current | next
  const [loading, setLoading] = useState(false);
  const [eanToName, setEanToName] = useState({});
  const [monthlyLinks, setMonthlyLinks] = useState([]);
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([
    "Consommation Partagée",
    "Consommation Réseau",
    "Injection Réseau",
    "Injection Partagée",
  ]);

  // 📥 Chargement des participants depuis Supabase
  useEffect(() => {
    const loadParticipants = async () => {
      const { data: participantData, error } = await supabase
        .from('participants')
        .select('ean_code, name');

      if (error) {
        console.error('Erreur chargement participants:', error);
        return;
      }

      const mapping = {};
      participantData?.forEach(p => {
        if (p.ean_code && p.name) {
          mapping[p.ean_code] = p.name;
        }
      });
      setEanToName(mapping);
    };

    loadParticipants();
  }, []);

  // 📥 Chargement des liens mensuels depuis Supabase
  useEffect(() => {
    const loadMonthlyLinks = async () => {
      const { data: links, error } = await supabase
        .from('monthly_csv_links')
        .select('*')
        .order('year', { ascending: false })
        .order('month_number', { ascending: false });

      if (error) {
        console.error('Erreur chargement liens mensuels:', error);
        return;
      }

      setMonthlyLinks(links || []);
    };

    loadMonthlyLinks();
  }, []);

  // 📥 Chargement de tous les fichiers CSV mensuels
  useEffect(() => {
    if (monthlyLinks.length === 0 || Object.keys(eanToName).length === 0) return;

    setLoading(true);
    let allRows = [];
    let loadedCount = 0;

    monthlyLinks.forEach((link) => {
      Papa.parse(link.csv_url, {
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
              type: r["Type de volume"].trim(),
              volume: parseFloat(r["Volume (kWh)"]) || 0,
              month: link.month_name,
            }));

          allRows = [...allRows, ...rows];
          loadedCount++;

          // Quand tous les fichiers sont chargés
          if (loadedCount === monthlyLinks.length) {
            const uniqueNames = [...new Set(allRows.map((r) => r.name))];
            setParticipants(["Tous", ...uniqueNames.sort()]);
            setData(allRows);
            setLoading(false);
          }
        },
        error: (err) => {
          console.error(`Erreur parsing CSV ${link.month_name}:`, err);
          loadedCount++;
          if (loadedCount === monthlyLinks.length) {
            setLoading(false);
          }
        },
      });
    });
  }, [monthlyLinks, eanToName]);

  // 🕰️ Gestion de la période glissante
  const shiftDate = (baseDate, direction) => {
    if (granularity === "day") return addDays(baseDate, direction);
    if (granularity === "week") return addDays(baseDate, 7 * direction);
    if (granularity === "month") return addMonths(baseDate, direction);
    return baseDate;
  };

  const handlePeriodShift = (dir) => setSelectedDate(shiftDate(selectedDate, dir));

  // 📝 Gestion des liens mensuels
  const reloadMonthlyLinks = async () => {
    const { data: links, error } = await supabase
      .from('monthly_csv_links')
      .select('*')
      .order('year', { ascending: false })
      .order('month_number', { ascending: false });

    if (!error) {
      setMonthlyLinks(links || []);
    }
  };

  const handleAddLink = async () => {
    const monthName = prompt("Nom du mois (ex: Janvier 2025):");
    if (!monthName) return;

    const csvUrl = prompt("URL du fichier CSV:");
    if (!csvUrl) return;

    // Extraire l'année et le mois depuis le nom
    const yearMatch = monthName.match(/\d{4}/);
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin",
                        "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const monthMatch = monthNames.findIndex(m =>
      monthName.toLowerCase().includes(m)
    );

    if (!yearMatch || monthMatch === -1) {
      toast.error("Format invalide. Utilisez 'Mois Année' (ex: Janvier 2025)");
      return;
    }

    const year = parseInt(yearMatch[0]);
    const monthNumber = monthMatch + 1;

    const { error } = await supabase
      .from('monthly_csv_links')
      .upsert({
        month_name: monthName,
        csv_url: csvUrl,
        year,
        month_number
      }, {
        onConflict: 'year,month_number'
      });

    if (error) {
      toast.error("Erreur lors de l'ajout du lien");
      console.error(error);
    } else {
      toast.success(`Lien ajouté pour ${monthName}`);
      await reloadMonthlyLinks();
    }
  };

  const handleDeleteLink = async (id, monthName) => {
    if (!confirm(`Supprimer le lien de ${monthName} ?`)) return;

    const { error } = await supabase
      .from('monthly_csv_links')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success(`Lien de ${monthName} supprimé`);
      await reloadMonthlyLinks();
    }
  };

  // 🔍 Préparation des données pour le graph
  const getFilteredData = () => {
    let filtered =
      selectedParticipants.includes("Tous")
        ? data
        : data.filter((d) => selectedParticipants.includes(d.name));

    filtered = filtered.filter((d) => selectedTypes.includes(d.type));

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

    const grouped = [];
    let current = start;
    const step =
      granularity === "day"
        ? 15
        : granularity === "week"
        ? 24 * 60
        : 24 * 60 * 30; // approximatif mois

    while (current <= end) {
      const next = addMinutes(current, step);
      const label =
        granularity === "day"
          ? format(current, "HH:mm")
          : granularity === "week"
          ? format(current, "EEE dd/MM")
          : format(current, "MMM");

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
    (sum, d) => sum + selectedTypes.reduce((t, type) => t + (d[type] || 0), 0),
    0
  );

  // Tooltip personnalisé avec 2 décimales
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

  // 🧠 UI PRO
  return (
    <div className="mt-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h3 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          Tableau énergétique
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-gray-500 text-sm">
            Total affiché :{" "}
            <span className="font-semibold text-green-600">
              {totalVolume.toFixed(2)} kWh
            </span>
          </div>
          <button
            onClick={() => setShowLinkManager(!showLinkManager)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Gérer les mois ({monthlyLinks.length})
          </button>
        </div>
      </motion.div>

      {/* Gestionnaire de liens mensuels */}
      {showLinkManager && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-lg">Fichiers CSV mensuels</h4>
            <div className="flex gap-2">
              <button
                onClick={handleAddLink}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un mois
              </button>
              <button
                onClick={() => setShowLinkManager(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {monthlyLinks.length === 0 ? (
            <p className="text-gray-500 italic">Aucun fichier mensuel enregistré</p>
          ) : (
            <div className="space-y-2">
              {monthlyLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div>
                    <div className="font-medium text-gray-900">{link.month_name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {link.csv_url}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id, link.month_name)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {loading ? (
        <p className="text-gray-500 italic">Chargement des données...</p>
      ) : monthlyLinks.length === 0 ? (
        <p className="text-gray-500 italic">Aucun fichier mensuel. Cliquez sur "Gérer les mois" pour ajouter des fichiers CSV.</p>
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
              <AreaChart data={chartData} margin={{ top: 20, right: 40, left: 0, bottom: 20 }}>
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
