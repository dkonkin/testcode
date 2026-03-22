"""Точка входа для gunicorn / production."""
from app import app, init_db

init_db()
