import { useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { createBase } from "../api/client";
import { useAuth } from "../context/AuthContext";

function MapClick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function AdminPage() {
  const { auth } = useAuth();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [water, setWater] = useState("");
  const [typesRaw, setTypesRaw] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [featuresRaw, setFeaturesRaw] = useState("");
  const [season, setSeason] = useState("");
  const [distance, setDistance] = useState("");
  const [nearestCity, setNearestCity] = useState("");
  const [website, setWebsite] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parseList = (str: string) =>
    str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!auth.token) {
      setError("Нет токена. Войдите снова.");
      return;
    }
    setLoading(true);
    try {
      await createBase(auth.token, {
        name: name.trim(),
        region: region.trim(),
        water: water.trim() || undefined,
        accommodationType: parseList(typesRaw),
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        priceTo: priceTo ? Number(priceTo) : undefined,
        features: parseList(featuresRaw),
        season: season.trim() || "круглый год",
        distanceFromCityKm: distance ? Number(distance) : undefined,
        nearestCity: nearestCity.trim() || undefined,
        website: website.trim() || undefined,
        mapsLink: mapsLink.trim() || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        description: description.trim() || undefined,
      });
      setMessage("База успешно добавлена. Откройте каталог, чтобы увидеть её в списке.");
      setName("");
      setRegion("");
      setWater("");
      setTypesRaw("");
      setPriceFrom("");
      setPriceTo("");
      setFeaturesRaw("");
      setSeason("");
      setDistance("");
      setNearestCity("");
      setWebsite("");
      setMapsLink("");
      setLat("");
      setLng("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const center: [number, number] = [54.5, 56.1];

  return (
    <div>
      <div className="summary" style={{ marginBottom: 18 }}>
        <h1 style={{ marginTop: 0 }}>Админ-панель</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Добавление новых записей о базах отдыха. Доступно только роли{" "}
          <strong>admin</strong>. Обычные пользователи эту страницу не видят.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="summary">
        <div className="form-grid">
          <div className="form-field full">
            <label>Название *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-field full">
            <label>Район *</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Водоём</label>
            <input value={water} onChange={(e) => setWater(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Типы (через запятую)</label>
            <input
              value={typesRaw}
              onChange={(e) => setTypesRaw(e.target.value)}
              placeholder="коттеджи, домики"
            />
          </div>
          <div className="form-field">
            <label>Цена от</label>
            <input
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Цена до</label>
            <input
              type="number"
              min={0}
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
            />
          </div>
          <div className="form-field full">
            <label>Опции (через запятую)</label>
            <input
              value={featuresRaw}
              onChange={(e) => setFeaturesRaw(e.target.value)}
              placeholder="баня, пляж, дети"
            />
          </div>
          <div className="form-field">
            <label>Сезон</label>
            <input value={season} onChange={(e) => setSeason(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Расстояние от города (км)</label>
            <input
              type="number"
              min={0}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div className="form-field full">
            <label>Ближайший город</label>
            <input value={nearestCity} onChange={(e) => setNearestCity(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Сайт</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Ссылка на карту</label>
            <input type="url" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Широта</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Долгота</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <div className="form-field full">
            <label>Описание</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Щёлкните по карте — подставятся координаты.
        </p>
        <div className="map-box" style={{ height: 260, marginBottom: 16 }}>
          <MapContainer
            center={center}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClick
              onPick={(la, ln) => {
                setLat(la.toFixed(6));
                setLng(ln.toFixed(6));
              }}
            />
            {lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) && (
              <Marker position={[Number(lat), Number(lng)]} />
            )}
          </MapContainer>
        </div>

        {error && <p className="error-msg">{error}</p>}
        {message && (
          <p style={{ color: "var(--accent-strong)", marginTop: 8 }}>{message}</p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Сохранение…" : "Добавить базу"}
        </button>
      </form>
    </div>
  );
}
