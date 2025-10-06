import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split(" ")[0].split("/");
  const time = dateStr.split(" ")[1] || "00:00";
  return new Date(`${year}-${month}-${day}T${time}`);
}

export default function AdminEanChart({ csvUrl }) {
  const [data, setData] = useState([]);
  const [eans, setEans] = useState([]);
  const [selectedEAN, setSelectedEAN] = useState("");
  const [granularity, setGranularity] = useState("quarter"); // quarter | day | month
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
            type: r["Type de volume"],
            volume: parseFloat(r["Volume (kWh)"]) || 0,
          }));
        setData(rows);
        const uniqueEans = [...new Set(rows.map((r) => r.ean))];
        setEans(uniqueEans);
        setSelectedEAN(uniqueEans[0] || "");
        setLoading(false);
      },
      error: (err) => {
        console.error("Erreur parsing CSV:", err);
        setLoading(false);
      },
    });
  }, [csvUrl]);

  const aggregate = (arr, keyFn, valueFn) => {
    const map = new Map();
    for (const item of arr) {
      const key = keyFn(item);
      const value = valueFn(item);
      map.set(key, (map.get(key) || 0) + value);
    }
    return Array.from(map, ([key, value]) => ({ key, value }));
  };

  const filtered = data.filter((d) => d.ean === selectedEAN);
  let grouped = [];

  if (granularity === "quarter") {
    grouped = filtered;
  } else if (granularity === "day") {
    grouped = aggregate(
      filtered,
      (d) => d.date.toISOString().slice(0, 10),
      (d) => d.volume
    );
  } else if (granularity === "month") {
    grouped = aggregate(
      filtered,
      (d) => d.date.toISOString().slice(0, 7),
      (d) => d.volume
    );
  }

  const chartData = grouped.map((d) => ({
    name: d.key || d.date?.toLocaleString(),
    volume: d.value ?? d.volume,
  }));

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
              <label className="block text-sm font-medium mb-1">EAN</label>
              <select
                value={selectedEAN}
                onChange={(e) => setSelectedEAN(e.target.value)}
                className="border rounded-md px-2 py-1"
              >
                {eans.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
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
                <option value="quarter">Quarts d’heure</option>
                <option value="day">Journalier</option>
                <option value="month">Mensuel</option>
              </select>
            </div>
          </div>

          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#10B981"
                  dot={false}
                  name="Volume (kWh)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
