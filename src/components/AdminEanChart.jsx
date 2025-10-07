import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { parseISO, format } from "date-fns";

const AdminEanChart = () => {
  const [urls, setUrls] = useState(() => {
    const saved = localStorage.getItem("eanUrls");
    return saved ? JSON.parse(saved) : [];
  });
  const [data, setData] = useState([]);
  const [newUrl, setNewUrl] = useState("");

  // Charger toutes les URLs enregistrées
  useEffect(() => {
    urls.forEach((urlObj) => {
      fetch(urlObj.url)
        .then((res) => res.json())
        .then((json) => {
          const processed = json.map((d) => ({
            ...d,
            date: parseISO(d.date),
          }));
          setData((prev) => [...prev, ...processed]);
        })
        .catch((err) => console.error("Erreur fetch URL:", err));
    });
  }, [urls]);

  const handleAddUrl = () => {
    if (!newUrl) return;
    fetch(newUrl)
      .then((res) => res.json())
      .then((json) => {
        if (!json.length) return alert("Fichier vide");

        // Nom = mois + année du premier élément
        const firstDate = parseISO(json[0].date);
        const monthName = format(firstDate, "MMMM yyyy");

        const urlObj = { name: monthName, url: newUrl };
        const newUrls = [...urls, urlObj];
        setUrls(newUrls);
        localStorage.setItem("eanUrls", JSON.stringify(newUrls));

        const processed = json.map((d) => ({
          ...d,
          date: parseISO(d.date),
        }));
        setData((prev) => [...prev, ...processed]);
        setNewUrl("");
      })
      .catch((err) => alert("Erreur fetch URL: " + err));
  };

  // Préparer les données pour le graphique
  const getChartData = () => {
    const grouped = {};
    data.forEach((d) => {
      const key = format(d.date, "yyyy-MM-dd HH:mm");
      if (!grouped[key]) grouped[key] = {};
      if (d.type === "Consommation Partagée") grouped[key]["Consommation Partagée"] = d.volume;
      if (d.type === "Consommation Réseau") grouped[key]["Consommation Réseau"] = d.volume;
      if (d.type === "Injection Réseau") grouped[key]["Injection Réseau"] = d.volume;
    });

    return Object.entries(grouped).map(([key, value]) => ({
      name: key,
      "Consommation Partagée": value["Consommation Partagée"] || 0,
      "Consommation Totale":
        (value["Consommation Partagée"] || 0) + (value["Consommation Réseau"] || 0),
      "Injection Réseau": value["Injection Réseau"] || 0,
    }));
  };

  const chartData = getChartData();

  return (
    <div style={{ padding: "20px" }}>
      <h2>Graphique EAN</h2>

      {/* URL input */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Entrer URL JSON"
          style={{ width: "300px" }}
        />
        <button onClick={handleAddUrl} style={{ marginLeft: "10px" }}>
          Ajouter
        </button>
      </div>

      {/* Liste des URL enregistrées */}
      <div style={{ marginBottom: "20px" }}>
        <strong>Fichiers enregistrés :</strong>{" "}
        {urls.map((u, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {u.name}
          </span>
        ))}
      </div>

      {/* Graphique */}
      <AreaChart
        width={900}
        height={400}
        data={chartData}
        margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Legend />

        {/* Conso partagée en fond */}
        <Area
          type="monotone"
          dataKey="Consommation Partagée"
          stroke="#4caf50"
          fill="#4caf50"
          fillOpacity={0.4}
          name="Consommation Partagée"
        />

        {/* Conso totale au-dessus */}
        <Area
          type="monotone"
          dataKey="Consommation Totale"
          stroke="#2196f3"
          fill="#2196f3"
          fillOpacity={0.6}
          name="Consommation Totale"
        />

        {/* Injection réseau en pointillés */}
        <Area
          type="monotone"
          dataKey="Injection Réseau"
          stroke="#ff9800"
          fill="none"
          strokeDasharray="5 5"
          name="Injection Réseau"
        />
      </AreaChart>
    </div>
  );
};

export default AdminEanChart;
