import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { auth, logout, isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Каталог
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Админ-панель
            </NavLink>
          )}
        </div>
        <div className="nav-links">
          {auth.token ? (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {auth.username} ({auth.role})
              </span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <NavLink to="/login">Вход</NavLink>
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
