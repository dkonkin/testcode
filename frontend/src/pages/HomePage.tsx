import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { fetchBases } from "../api/client";
import type { RecreationBase } from "../types";
import {
  applyFilters,
  describePriceRange,
  getUniqueValues,
  type Filters,
} from "../utils/catalog";

const defaultCenter: [number, number] = [54.5, 56.1];
const defaultZoom = 6;

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const b = L.latLngBounds(points);
    map.fitBounds(b, { padding: [28, 28], maxZoom: 12 });
  }, [map, points]);
  return null;
}

export function HomePage() {
  const [allBases, setAllBases] = useState<RecreationBase[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [priceBucket, setPriceBucket] = useState<string>("");
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    fetchBases()
      .then(setAllBases)
      .catch(() => setLoadError("Не удалось загрузить данные"));
  }, []);

  const filters: Filters = useMemo(
    () => ({
      search: search.trim(),
      region,
      type,
      priceBucket: priceBucket ? Number(priceBucket) : null,
      features,
    }),
    [search, region, type, priceBucket, features]
  );

  const filtered = useMemo(
    () => applyFilters(allBases, filters),
    [allBases, filters]
  );

  const regions = useMemo(() => getUniqueValues(allBases, "region"), [allBases]);
  const types = useMemo(
    () => getUniqueValues(allBases, "accommodationType"),
    [allBases]
  );

  const mapPoints = useMemo(() => {
    const pts: [number, number][] = [];
    filtered.forEach((b) => {
      if (typeof b.lat === "number" && typeof b.lng === "number") {
        pts.push([b.lat, b.lng]);
      }
    });
    return pts;
  }, [filtered]);

  const onMarkerClick = useCallback((id: number) => {
    setHighlightId(id);
    const el = document.querySelector(`[data-base-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightId(null), 1200);
  }, []);

  const resetFilters = () => {
    setSearch("");
    setRegion("");
    setType("");
    setPriceBucket("");
    setFeatures([]);
  };

  const toggleFeature = (value: string) => {
    setFeatures((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  const featureOptions = [
    { value: "баня", label: "Баня" },
    { value: "пляж", label: "Пляж" },
    { value: "питание", label: "Питание" },
    { value: "дети", label: "Дети" },
    { value: "активный_отдых", label: "Активный отдых" },
    { value: "горнолыжка", label: "Горнолыжка" },
  ];

  return (
    <>
      <header
        style={{
          marginBottom: 18,
          padding: "18px 22px",
          borderRadius: "var(--radius-xl)",
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(6, 78, 59, 0.9))",
          border: "1px solid rgba(34, 197, 94, 0.28)",
        }}
      >
        <h1 style={{ margin: "0 0 6px", fontSize: "1.35rem" }}>
          Базы отдыха Башкортостана
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Подберите место для отдыха на природе
        </p>
        <input
          type="search"
          placeholder="Поиск по названию, реке, району..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginTop: 14,
            width: "100%",
            maxWidth: 400,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(148, 163, 184, 0.45)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "var(--text)",
          }}
        />
      </header>

      {loadError && <p className="error-msg">{loadError}</p>}

      <section className="filters">
        <div className="filter-group">
          <label>Регион</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Тип размещения</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Все</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Цена / ночь</label>
          <select
            value={priceBucket}
            onChange={(e) => setPriceBucket(e.target.value)}
          >
            <option value="">Любая</option>
            <option value="1">до 3000 ₽</option>
            <option value="2">3000–6000 ₽</option>
            <option value="3">6000–10000 ₽</option>
            <option value="4">выше 10000 ₽</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Опции</label>
          <div className="chips">
            {featureOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`chip ${features.includes(o.value) ? "chip-accent" : ""}`}
                onClick={() => toggleFeature(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>
            Сбросить фильтры
          </button>
        </div>
      </section>

      <div className="content-layout">
        <div className="side-panel">
          <div className="summary">
            <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>
              Найдено баз: {filtered.length}
            </h2>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Показано {filtered.length} из {allBases.length}. Вход для администратора — в
              меню «Вход».
            </p>
          </div>
          <div className="map-wrap">
            <h2 style={{ margin: "0 0 4px", fontSize: "1rem" }}>Карта</h2>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Клик по маркеру прокрутит к карточке.
            </p>
            <div className="map-box">
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapPoints.length > 0 && <FitBounds points={mapPoints} />}
                {filtered.map((b) => {
                  if (typeof b.lat !== "number" || typeof b.lng !== "number")
                    return null;
                  return (
                    <Marker
                      key={b.id}
                      position={[b.lat, b.lng]}
                      eventHandlers={{
                        click: () => onMarkerClick(b.id),
                      }}
                    >
                      <Popup>
                        <strong>{b.name}</strong>
                        <br />
                        {b.region}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="card-grid">
          {filtered.length === 0 && !loadError && (
            <div
              className="summary"
              style={{ gridColumn: "1 / -1", textAlign: "center" }}
            >
              Ничего не найдено. Измените фильтры.
            </div>
          )}
          {filtered.map((base) => (
            <article
              key={base.id}
              className={`card ${highlightId === base.id ? "card--highlight" : ""}`}
              data-base-id={base.id}
            >
              <div className="card-header">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{base.name}</h3>
                  <span className="chip chip-accent">{base.season || "—"}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {base.region}
                  {base.distanceFromCityKm != null && base.nearestCity
                    ? `, ~${base.distanceFromCityKm} км от ${base.nearestCity}`
                    : ""}
                </div>
              </div>
              <div className="card-body">
                <p style={{ margin: "0 0 8px", fontSize: "0.88rem", color: "#d1d5db" }}>
                  {base.description}
                </p>
                <div className="chips">
                  {(base.accommodationType || []).map((t) => (
                    <span key={t} className="chip chip-accent">
                      {t}
                    </span>
                  ))}
                  {(base.features || []).map((f) => (
                    <span key={f} className="chip">
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                  }}
                >
                  <strong style={{ color: "var(--accent-strong)" }}>
                    {describePriceRange(base)}
                  </strong>
                  {base.rating != null && (
                    <span style={{ color: "#fbbf24" }}>★ {base.rating.toFixed(1)}</span>
                  )}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {base.website && (
                    <a href={base.website} target="_blank" rel="noreferrer" className="btn btn-primary">
                      Сайт
                    </a>
                  )}
                  {base.mapsLink && (
                    <a href={base.mapsLink} target="_blank" rel="noreferrer" className="btn btn-ghost">
                      На карте
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
