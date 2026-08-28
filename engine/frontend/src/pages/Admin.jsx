// src/pages/Admin.jsx
// Admin Panel: Source Management + Keyword Management + Watchlist
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MOCK_SOURCE_HEALTH } from "../mockdata";

const MOCK_KEYWORDS = [
  { id: "lpg", label: "LPG 3 Kg", terms: ["LPG", "LPG 3 kg", "gas melon", "pangkalan LPG", "HET LPG"], riskTerms: ["langka", "penimbunan", "mahal", "permainan harga"], enabled: true },
  { id: "bbm", label: "BBM & Solar", terms: ["solar", "SPBU", "APMS", "pelangsir", "BBM subsidi"], riskTerms: ["penimbunan", "penyalahgunaan", "antrean"], enabled: true },
  { id: "harga_pangan", label: "Harga Pangan", terms: ["beras", "cabai", "bawang", "minyak goreng", "sembako"], riskTerms: ["naik", "kenaikan", "langka", "melonjak"], enabled: true },
];

const MOCK_WATCHLIST = [
  { topic: "lpg",   label: "LPG 3 KG",     multiplier: 1.4, active: true  },
  { topic: "solar", label: "Solar Subsidi", multiplier: 1.3, active: true  },
];

// Helper Toast notification
let showToastGlobal = null;


// ── Source Management ─────────────────────────────────────────────────

function SourceManagement() {
  const [sources, setSources] = useState(MOCK_SOURCE_HEALTH);
  const [filter, setFilter]   = useState("Semua");

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "config", "sources"), (snap) => {
        if (snap.exists() && snap.data().items) {
          setSources(snap.data().items);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Firestore sources listener error:", e);
    }
  }, []);

  const filtered = filter === "Semua" ? sources
    : filter === "UNREVIEWED" ? sources.filter(s => s.status === "unreviewed")
    : sources.filter(s => s.tier === filter);

  async function handleAction(id, action) {
    const updated = sources.map(s => {
      if (s.id !== id) return s;
      if (action === "APPROVE") return { ...s, status: "healthy", tier: "A" };
      if (action === "WATCH")   return { ...s, status: "healthy", tier: "B" };
      if (action === "BLOCK")   return { ...s, status: "blocked" };
      return s;
    });
    setSources(updated);
    try {
      await setDoc(doc(db, "config", "sources"), { items: updated, updatedAt: new Date().toISOString() });
      if (showToastGlobal) showToastGlobal(`Sumber ${id} berhasil di-${action.toLowerCase()} ke Firestore!`);
    } catch (e) {
      if (showToastGlobal) showToastGlobal(`Tersimpan lokal (${action} ${id})`);
    }
  }

  const statusDot = (status) => {
    const map = { healthy: "#4ADE80", error: "#EF233C", unreviewed: "#FFD60A", blocked: "#666" };
    return (
      <span style={{
        display: "inline-block", width: 8, height: 8,
        borderRadius: "50%", background: map[status] || "#666",
        boxShadow: `0 0 6px ${map[status] || "#666"}`
      }} />
    );
  };

  return (
    <div>
      <div className="section-header">
        <h2>🛰️ Source Management</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["Semua", "A+", "A", "B", "UNREVIEWED"].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
            <th style={th}>Sumber</th>
            <th style={th}>Tier</th>
            <th style={th}>Status</th>
            <th style={th}>Last Data</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(src => (
            <tr key={src.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card)"}
              onMouseLeave={e => e.currentTarget.style.background = ""}
            >
              <td style={td}>{src.name}</td>
              <td style={td}>
                <span style={{ color: "var(--clr-accent)", fontWeight: 700, fontSize: "11px" }}>
                  {src.tier}
                </span>
              </td>
              <td style={td}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {statusDot(src.status)}
                  {src.status === "unreviewed" ? "⚠ REVIEW" : src.status === "blocked" ? "BLOCKED" : "LIVE"}
                </span>
              </td>
              <td style={{ ...td, color: "var(--txt-muted)" }}>
                {src.minutesAgo != null ? `${src.minutesAgo}m lalu` : "—"}
              </td>
              <td style={td}>
                {src.status === "unreviewed" && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-approve" onClick={() => handleAction(src.id, "APPROVE")}>✓ APPROVE</button>
                    <button className="btn-watch"   onClick={() => handleAction(src.id, "WATCH")}>👁 WATCH</button>
                    <button className="btn-block"   onClick={() => handleAction(src.id, "BLOCK")}>🚫 BLOCK</button>
                  </div>
                )}
                {src.status !== "unreviewed" && (
                  <button style={{ fontSize: "10px", color: "var(--txt-muted)", padding: "2px 8px", borderRadius: 4 }}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Keyword Management ────────────────────────────────────────────────

function KeywordManagement() {
  const [keywords,   setKeywords]   = useState(MOCK_KEYWORDS);
  const [selected,   setSelected]   = useState(MOCK_KEYWORDS[0]);
  const [newTerm,    setNewTerm]    = useState("");
  const [newRisk,    setNewRisk]    = useState("");

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "config", "keywords"), (snap) => {
        if (snap.exists() && snap.data().items) {
          const list = snap.data().items;
          setKeywords(list);
          const current = list.find(k => k.id === selected?.id) || list[0];
          setSelected(current);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Firestore keywords listener error:", e);
    }
  }, []);

  async function saveKeywords(updatedList, currentSelected) {
    setKeywords(updatedList);
    if (currentSelected) setSelected(currentSelected);
    try {
      await setDoc(doc(db, "config", "keywords"), { items: updatedList, updatedAt: new Date().toISOString() });
      if (showToastGlobal) showToastGlobal("Perubahan keyword tersimpan ke Firestore!");
    } catch (e) {
      if (showToastGlobal) showToastGlobal("Tersimpan secara lokal");
    }
  }

  function addTerm(clusterId, type) {
    const val = type === "term" ? newTerm : newRisk;
    if (!val.trim()) return;
    const updated = keywords.map(k => {
      if (k.id !== clusterId) return k;
      if (type === "term") return { ...k, terms: [...k.terms, val.trim()] };
      return { ...k, riskTerms: [...k.riskTerms, val.trim()] };
    });
    const updatedSelected = {
      ...selected,
      ...(type === "term"
        ? { terms: [...selected.terms, val.trim()] }
        : { riskTerms: [...selected.riskTerms, val.trim()] })
    };
    saveKeywords(updated, updatedSelected);
    if (type === "term") setNewTerm("");
    else setNewRisk("");
  }

  function removeTerm(clusterId, term, type) {
    const updated = keywords.map(k => {
      if (k.id !== clusterId) return k;
      if (type === "term") return { ...k, terms: k.terms.filter(t => t !== term) };
      return { ...k, riskTerms: k.riskTerms.filter(t => t !== term) };
    });
    const updatedSelected = {
      ...selected,
      ...(type === "term"
        ? { terms: selected.terms.filter(t => t !== term) }
        : { riskTerms: selected.riskTerms.filter(t => t !== term) })
    };
    saveKeywords(updated, updatedSelected);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", height: "100%", gap: 0 }}>
      {/* Cluster List */}
      <div style={{ borderRight: "1px solid var(--bg-border)", padding: "8px 0" }}>
        <div style={{ padding: "12px 16px", fontSize: "11px", color: "var(--txt-muted)", fontWeight: 700, letterSpacing: "0.06em" }}>
          CLUSTER KEYWORD
        </div>
        {keywords.map(k => (
          <button
            key={k.id}
            onClick={() => setSelected(k)}
            style={{
              width: "100%", textAlign: "left", padding: "10px 16px", fontSize: "12px",
              fontWeight: 600, color: selected?.id === k.id ? "var(--clr-accent)" : "var(--txt-primary)",
              background: selected?.id === k.id ? "var(--bg-glass)" : "transparent",
              borderLeft: selected?.id === k.id ? "2px solid var(--clr-accent)" : "2px solid transparent",
              transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "space-between"
            }}
          >
            <span>{k.label}</span>
            <span style={{ fontSize: "9px", color: k.enabled ? "var(--clr-normal)" : "var(--txt-muted)" }}>
              {k.enabled ? "ON" : "OFF"}
            </span>
          </button>
        ))}
      </div>

      {/* Keyword Editor */}
      {selected && (
        <div style={{ padding: "16px 20px", overflow: "auto" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 16, color: "var(--clr-accent)" }}>
            [{selected.label}]
          </h3>

          {/* Terms */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "11px", color: "var(--txt-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
              TOPIK KEYWORDS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selected.terms.map(t => (
                <span key={t} style={{ ...chip, background: "rgba(0,180,216,0.12)", color: "var(--clr-accent)" }}>
                  ✓ {t}
                  <span style={{ cursor: "pointer", marginLeft: 4, opacity: 0.6 }}
                    onClick={() => removeTerm(selected.id, t, "term")}>×</span>
                </span>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTerm(selected.id, "term")}
                  placeholder="+ tambah keyword..."
                  style={inputStyle}
                />
                <button onClick={() => addTerm(selected.id, "term")} style={btnAdd}>+</button>
              </div>
            </div>
          </div>

          {/* Risk Terms */}
          <div>
            <div style={{ fontSize: "11px", color: "var(--txt-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
              RISK KEYWORDS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selected.riskTerms.map(t => (
                <span key={t} style={{ ...chip, background: "rgba(239,35,60,0.12)", color: "var(--clr-kritis)" }}>
                  ⚠ {t}
                  <span style={{ cursor: "pointer", marginLeft: 4, opacity: 0.6 }}
                    onClick={() => removeTerm(selected.id, t, "risk")}>×</span>
                </span>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newRisk}
                  onChange={e => setNewRisk(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTerm(selected.id, "risk")}
                  placeholder="+ tambah risk keyword..."
                  style={inputStyle}
                />
                <button onClick={() => addTerm(selected.id, "risk")} style={{ ...btnAdd, background: "rgba(239,35,60,0.2)", color: "var(--clr-kritis)" }}>+</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: "10px 14px", background: "rgba(255,214,10,0.08)", borderRadius: 8, fontSize: "11px", color: "var(--clr-waspada)" }}>
            💡 Perubahan keyword disimpan ke Firestore secara realtime. Collector akan membaca konfigurasi terbaru pada run berikutnya.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Watchlist Management ──────────────────────────────────────────────

function WatchlistManagement() {
  const [watchlist, setWatchlist] = useState(MOCK_WATCHLIST);
  const [newTopic,  setNewTopic]  = useState("");

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "config", "watchlist"), (snap) => {
        if (snap.exists() && snap.data().items) {
          setWatchlist(snap.data().items);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Firestore watchlist listener error:", e);
    }
  }, []);

  async function saveWatchlist(updated) {
    setWatchlist(updated);
    try {
      await setDoc(doc(db, "config", "watchlist"), { items: updated, updatedAt: new Date().toISOString() });
      if (showToastGlobal) showToastGlobal("Watchlist tersimpan ke Firestore!");
    } catch (e) {
      if (showToastGlobal) showToastGlobal("Tersimpan secara lokal");
    }
  }

  function toggle(topic) {
    const updated = watchlist.map(w => w.topic === topic ? { ...w, active: !w.active } : w);
    saveWatchlist(updated);
  }
  function remove(topic) {
    const updated = watchlist.filter(w => w.topic !== topic);
    saveWatchlist(updated);
  }
  function addWatchlist() {
    if (!newTopic.trim()) return;
    const updated = [...watchlist, { topic: newTopic.toLowerCase(), label: newTopic.toUpperCase(), multiplier: 1.2, active: true }];
    saveWatchlist(updated);
    setNewTopic("");
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,214,10,0.06)", borderRadius: 8, fontSize: "11px", color: "var(--clr-waspada)" }}>
        ⚠️ <b>priorityMultiplier</b> hanya memengaruhi urutan tampilan di wallboard. Tidak mengubah sentiment, relevance, atau kebenaran berita.
      </div>

      {watchlist.map(w => (
        <div key={w.topic} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
          borderBottom: "1px solid var(--bg-border)"
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: w.active ? "var(--clr-waspada)" : "var(--txt-muted)",
            boxShadow: w.active ? "0 0 8px var(--clr-waspada)" : "none"
          }} />
          <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>
            {w.label}
          </span>
          <span style={{ fontSize: "12px", color: "var(--txt-muted)" }}>
            ×{w.multiplier} prioritas
          </span>
          <button
            onClick={() => toggle(w.topic)}
            style={{ ...btnSmall, background: w.active ? "rgba(74,222,128,0.12)" : "rgba(148,163,184,0.12)" }}
          >
            {w.active ? "ON" : "OFF"}
          </button>
          <button onClick={() => remove(w.topic)} style={{ ...btnSmall, background: "rgba(239,35,60,0.12)", color: "var(--clr-kritis)" }}>
            ✕
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addWatchlist()}
          placeholder="Tambah topik ke watchlist..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={addWatchlist} style={btnAdd}>+ Tambah</button>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────

const TABS = ["Source Management", "Keyword Management", "Watchlist"];

export default function Admin() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [toastMsg,  setToastMsg]  = useState("");

  useEffect(() => {
    showToastGlobal = (msg) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(""), 3500);
    };
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {toastMsg && (
        <div style={{
          position: "absolute", top: 16, right: 24, zIndex: 100,
          background: "#00B4D8", color: "#0B132B", padding: "8px 16px",
          borderRadius: 8, fontWeight: 700, fontSize: "12px",
          boxShadow: "0 4px 14px rgba(0,180,216,0.35)", animation: "fadeIn .2s ease"
        }}>
          ✓ {toastMsg}
        </div>
      )}

      <div style={{
        padding: "10px 24px",
        borderBottom: "1px solid var(--bg-border)",
        display: "flex",
        alignItems: "center",
        gap: 4
      }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`filter-tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
            style={{ fontSize: "13px" }}
          >{t}</button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: "11px", color: "var(--txt-muted)" }}>
          🔒 Admin Panel — Disperindag ESDM Pinrang
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "Source Management"  && <SourceManagement />}
        {activeTab === "Keyword Management" && <KeywordManagement />}
        {activeTab === "Watchlist"          && <WatchlistManagement />}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const th = { padding: "8px 16px", textAlign: "left", fontSize: "10px", color: "var(--txt-muted)", fontWeight: 700, letterSpacing: "0.05em" };
const td = { padding: "10px 16px", fontSize: "12px" };
const chip = { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 100, fontSize: "11px", fontWeight: 600 };
const inputStyle = {
  background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: 6,
  color: "var(--txt-primary)", padding: "6px 10px", fontSize: "12px", outline: "none",
  fontFamily: "var(--font-ui)"
};
const btnAdd = {
  background: "var(--bg-glass)", color: "var(--clr-accent)", border: "1px solid var(--clr-accent)",
  borderRadius: 6, padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer"
};
const btnSmall = {
  padding: "4px 10px", borderRadius: 4, fontSize: "11px", fontWeight: 700, cursor: "pointer",
  color: "var(--txt-primary)"
};
