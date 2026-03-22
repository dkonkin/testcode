"""
API каталога баз отдыха: JWT-аутентификация, роли admin / user.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

import jwt
from flask import Flask, abort, g, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "bases.db"
JSON_PATH = BASE_DIR / "bases.json"


def _normalize_database_url(url: str) -> str:
    """Supabase / Railway: postgres:// → драйвер SQLAlchemy; при необходимости sslmode."""
    url = url.strip()
    if url.startswith("postgres://"):
        rest = url[len("postgres://") :]
        url = f"postgresql+psycopg2://{rest}"
    elif url.startswith("postgresql://"):
        rest = url[len("postgresql://") :]
        url = f"postgresql+psycopg2://{rest}"
    if "sslmode=" not in url and "supabase" in url.lower():
        url += "&sslmode=require" if "?" in url else "?sslmode=require"
    return url


def _database_uri() -> str:
    # Supabase: Project Settings → Database → Connection string (URI)
    # Можно задать DATABASE_URL или SUPABASE_DB_URL
    env_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if env_url:
        return _normalize_database_url(env_url)
    return f"sqlite:///{DB_PATH}"


def _is_postgres_uri(uri: str) -> bool:
    return "postgresql+psycopg2" in uri.lower() or "postgresql" in uri.lower()


_INITIAL_DB_URI = _database_uri()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = _INITIAL_DB_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Пул и проверка соединения (удобно для Supabase pooler)
if _is_postgres_uri(_INITIAL_DB_URI):
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }
app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET", "dev-change-me-in-production")
app.config["JWT_EXPIRE_HOURS"] = int(os.environ.get("JWT_EXPIRE_HOURS", "24"))

db = SQLAlchemy(app)

# CORS: фронтенд (Vite) по умолчанию на 5173
_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_cors_list = [o.strip() for o in _origins.split(",") if o.strip()]
CORS(
    app,
    resources={r"/api/*": {"origins": _cors_list}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")  # admin | user


class RecreationBase(db.Model):
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
            "accommodationType": self.accommodation_type.split(",")
            if self.accommodation_type
            else [],
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


def _token_from_header():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def decode_token(token):
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            app.config["JWT_SECRET"],
            algorithms=["HS256"],
        )
    except jwt.PyJWTError:
        return None


def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        token = _token_from_header()
        payload = decode_token(token)
        if not payload or "sub" not in payload:
            return jsonify({"error": "Требуется авторизация"}), 401
        user = db.session.get(User, int(payload["sub"]))
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 401
        g.current_user = user
        return f(*args, **kwargs)

    return wrapped


def admin_required(f):
    @wraps(f)
    @login_required
    def wrapped(*args, **kwargs):
        if g.current_user.role != "admin":
            return jsonify({"error": "Доступ только для администратора"}), 403
        return f(*args, **kwargs)

    return wrapped


def create_token(user: User):
    exp = datetime.now(timezone.utc) + timedelta(
        hours=app.config["JWT_EXPIRE_HOURS"]
    )
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "username": user.username,
        "exp": exp,
    }
    return jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")


def import_bases_from_json_if_empty():
    if RecreationBase.query.first() is not None:
        return
    if not JSON_PATH.exists():
        return
    try:
        with JSON_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return
    for item in data:
        row = RecreationBase(
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
        db.session.add(row)
    db.session.commit()


def seed_users_if_empty():
    if User.query.first() is not None:
        return
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin")
    user_pw = os.environ.get("USER_PASSWORD", "user")
    db.session.add(
        User(
            username="admin",
            password_hash=generate_password_hash(admin_pw),
            role="admin",
        )
    )
    db.session.add(
        User(
            username="user",
            password_hash=generate_password_hash(user_pw),
            role="user",
        )
    )
    db.session.commit()


def _sync_postgres_sequences():
    """После вставки с явными id в PostgreSQL обновить serial."""
    if not _is_postgres_uri(str(db.engine.url)):
        return
    with db.engine.begin() as conn:
        conn.execute(
            text(
                "SELECT setval(pg_get_serial_sequence('bases', 'id'), "
                "COALESCE((SELECT MAX(id) FROM bases), 1))"
            )
        )
        conn.execute(
            text(
                "SELECT setval(pg_get_serial_sequence('users', 'id'), "
                "COALESCE((SELECT MAX(id) FROM users), 1))"
            )
        )


@app.route("/api/health", methods=["GET"])
def health():
    db_kind = "postgres" if _is_postgres_uri(str(db.engine.url)) else "sqlite"
    return jsonify({"ok": True, "database": db_kind})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "Укажите логин и пароль"}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Неверный логин или пароль"}), 401
    token = create_token(user)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return jsonify(
        {
            "access_token": token,
            "token_type": "bearer",
            "username": user.username,
            "role": user.role,
        }
    )


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    u = g.current_user
    return jsonify({"username": u.username, "role": u.role})


@app.route("/api/bases", methods=["GET"])
def get_bases():
    rows = RecreationBase.query.order_by(RecreationBase.id).all()
    return jsonify([r.to_dict() for r in rows])


@app.route("/api/bases", methods=["POST"])
@admin_required
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

    row = RecreationBase(
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
        or "Новая база, добавленная через админ-панель.",
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.to_dict()), 201


def register_spa_routes():
    """Раздача собранного React (Vite) из FRONTEND_DIST — один домен с API."""
    raw = os.environ.get("FRONTEND_DIST")
    if not raw:
        return
    root = Path(raw).resolve()
    if not root.is_dir() or not (root / "index.html").is_file():
        return

    @app.route("/assets/<path:filename>")
    def _vite_assets(filename):
        assets_dir = root / "assets"
        if not assets_dir.is_dir():
            abort(404)
        return send_from_directory(assets_dir, filename)

    @app.route("/")
    def _spa_index():
        return send_from_directory(root, "index.html")

    @app.route("/favicon.ico")
    def _favicon():
        if (root / "favicon.ico").is_file():
            return send_from_directory(root, "favicon.ico")
        abort(404)

    @app.route("/<path:path>")
    def _spa_fallback(path):
        if path.startswith("api"):
            abort(404)
        candidate = (root / path).resolve()
        try:
            if candidate.is_file() and candidate.is_relative_to(root):
                return send_from_directory(root, path)
        except (ValueError, OSError):
            pass
        return send_from_directory(root, "index.html")


register_spa_routes()


def init_db():
    with app.app_context():
        db.create_all()
        seed_users_if_empty()
        import_bases_from_json_if_empty()
        _sync_postgres_sequences()


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
