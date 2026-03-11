import json
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "bases.db"
JSON_PATH = BASE_DIR / "bases.json"

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class Base(db.Model):
  __tablename__ = "bases"

  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(255), nullable=False)
  region = db.Column(db.String(255), nullable=False)
  water = db.Column(db.String(255))
  accommodation_type = db.Column(db.String(255))
  price_from = db.Column(db.Integer)
  price_to = db.Column(db.Integer)
  features = db.Column(db.String(255))
  rating = db.Column(db.Float)
  season = db.Column(db.String(255))
  distance_from_city_km = db.Column(db.Integer)
  nearest_city = db.Column(db.String(255))
  website = db.Column(db.String(512))
  maps_link = db.Column(db.String(512))
  lat = db.Column(db.Float)
  lng = db.Column(db.Float)
  description = db.Column(db.Text)

  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name,
      "region": self.region,
      "water": self.water,
      "accommodationType": self.accommodation_type.split(",") if self.accommodation_type else [],
      "priceFrom": self.price_from,
      "priceTo": self.price_to,
      "features": self.features.split(",") if self.features else [],
      "rating": self.rating,
      "season": self.season,
      "distanceFromCityKm": self.distance_from_city_km,
      "nearestCity": self.nearest_city,
      "website": self.website,
      "mapsLink": self.maps_link,
      "lat": self.lat,
      "lng": self.lng,
      "description": self.description,
    }


def import_from_json_if_empty():
  if Base.query.first() is not None:
    return

  if not JSON_PATH.exists():
    return

  try:
    with JSON_PATH.open("r", encoding="utf-8") as f:
      data = json.load(f)
  except Exception:
    return

  for item in data:
    base = Base(
      id=item.get("id"),
      name=item.get("name", "Без названия"),
      region=item.get("region", ""),
      water=item.get("water"),
      accommodation_type=",".join(item.get("accommodationType", [])),
      price_from=item.get("priceFrom"),
      price_to=item.get("priceTo"),
      features=",".join(item.get("features", [])),
      rating=item.get("rating"),
      season=item.get("season"),
      distance_from_city_km=item.get("distanceFromCityKm"),
      nearest_city=item.get("nearestCity"),
      website=item.get("website"),
      maps_link=item.get("mapsLink"),
      lat=item.get("lat"),
      lng=item.get("lng"),
      description=item.get("description"),
    )
    db.session.add(base)

  db.session.commit()


@app.route("/")
def index():
  return send_from_directory(str(BASE_DIR), "index.html")


@app.route("/api/bases", methods=["GET"])
def get_bases():
  bases = Base.query.order_by(Base.id).all()
  return jsonify([b.to_dict() for b in bases])


@app.route("/api/bases", methods=["POST"])
def create_base():
  payload = request.get_json() or {}

  name = (payload.get("name") or "").strip()
  region = (payload.get("region") or "").strip()
  if not name or not region:
    return jsonify({"error": "name and region are required"}), 400

  def _list_to_str(values):
    if isinstance(values, list):
      return ",".join([str(v) for v in values if str(v).strip()])
    if isinstance(values, str):
      return values
    return ""

  base = Base(
    name=name,
    region=region,
    water=(payload.get("water") or "").strip() or None,
    accommodation_type=_list_to_str(payload.get("accommodationType")),
    price_from=payload.get("priceFrom"),
    price_to=payload.get("priceTo"),
    features=_list_to_str(payload.get("features")),
    rating=payload.get("rating"),
    season=(payload.get("season") or "").strip() or None,
    distance_from_city_km=payload.get("distanceFromCityKm"),
    nearest_city=(payload.get("nearestCity") or "").strip() or None,
    website=(payload.get("website") or "").strip() or None,
    maps_link=(payload.get("mapsLink") or "").strip() or None,
    lat=payload.get("lat"),
    lng=payload.get("lng"),
    description=(payload.get("description") or "").strip()
    or "Новая база, добавленная через интерфейс.",
  )

  db.session.add(base)
  db.session.commit()

  return jsonify(base.to_dict()), 201


if __name__ == "__main__":
  with app.app_context():
    db.create_all()
    import_from_json_if_empty()

  port = int(os.environ.get("PORT", "8000"))
  app.run(host="0.0.0.0", port=port, debug=True)

