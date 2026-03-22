import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate(from === "/login" ? "/" : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page">
      <div className="summary" style={{ padding: "24px" }}>
        <h1 style={{ marginTop: 0 }}>Вход</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Обычный пользователь видит только каталог. Администратор получает доступ к
          панели добавления баз.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-field full" style={{ marginBottom: 12 }}>
            <label htmlFor="u">Логин</label>
            <input
              id="u"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field full" style={{ marginBottom: 12 }}>
            <label htmlFor="p">Пароль</label>
            <input
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Демо: <code>user</code> / <code>user</code> — только просмотр;{" "}
          <code>admin</code> / <code>admin</code> — админ (смените пароли в production).
        </p>
        <p>
          <Link to="/">← В каталог</Link>
        </p>
      </div>
    </div>
  );
}
