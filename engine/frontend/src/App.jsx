// src/App.jsx
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import "./index.css";

function App() {
  return (
    <HashRouter>
      <div className="app-root">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__brand">
            <div className="topbar__logo">PI</div>
            <div>
              <div className="topbar__title">PINRANG INTEL</div>
              <div className="topbar__subtitle">DISPERINDAG ESDM KAB. PINRANG</div>
            </div>
          </div>

          <div className="topbar__live">
            <span className="topbar__live-dot" />
            <span>LIVE RADAR</span>
          </div>

          <nav className="topbar__nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
              <button>
                📊 Wallboard
              </button>
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => isActive ? "active" : ""}>
              <button>⚙️ Admin</button>
            </NavLink>
          </nav>
        </header>

        {/* Routes */}
        <Routes>
          <Route path="/"      element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;