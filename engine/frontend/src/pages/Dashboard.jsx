import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  MOCK_STATS, MOCK_CRITICAL_ISSUES, MOCK_MENTIONS,
  MOCK_SOURCE_HEALTH, MOCK_TRENDING
} from "../mockdata";

// ── Utils ──────────────────────────────────────────────────────────────

function scoreClass(score) {
  if (score >= 90) return "kritis";
  if (score >= 75) return "tinggi";
  if (score >= 60) return "waspada";
  if (score >= 40) return "monitor";
  return "normal";
}

function scoreEmoji(status) {
  const map = { kritis: "🔴", tinggi: "🟠", waspada: "🟡", monitor: "🔵", normal: "🟢" };
  return map[status] || "⚪";
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("id-ID", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar"
      }) + " WITA";
    }
    // Jika format teks bahasa Indonesia (misal: "26 Agustus 2026, 18:49 WITA")
    return String(isoStr);
  } catch {
    return String(isoStr || "");
  }
}

function formatMinutesAgo(min) {
  if (!min && min !== 0) return "—";
  if (min < 60) return `${min}m lalu`;
  return `${Math.floor(min / 60)}j lalu`;
}

// ── Komponen MentionCard ──────────────────────────────────────────────

function MentionCard({ mention }) {
  const sentClass = { positive: "pos", negative: "neg", neutral: "neu", POSITIF: "pos", NEGATIF: "neg", NETRAL: "neu" }[mention.sentiment?.label || mention.sentiment] || "neu";
  const sentLabel = typeof mention.sentiment === "string" ? mention.sentiment : (mention.sentiment?.label?.toUpperCase() || "NETRAL");

  return (
    <div className="mention-card animate-in" onClick={() => window.open(mention.sourceUrl || mention.url, "_blank")}>
      <div className="mention-card__thumb">
        {mention.thumbnailUrl
          ? <img src={mention.thumbnailUrl} alt="" onError={e => { e.target.style.display = "none"; }} />
          : <span>📰</span>
        }
      </div>
      <div className="mention-card__body">
        <div className="mention-card__source-row">
          <span className="mention-card__source-name">{mention.sourceName}</span>
          <span className="mention-card__tier-badge">{mention.sourceTier || "A"}</span>
          <span className="mention-card__time">{formatTime(mention.publishedAt)}</span>
        </div>
        <div className="mention-card__title">{mention.title}</div>
        <div className="mention-card__footer">
          <span className={`badge badge--${sentClass}`}>● {sentLabel}</span>
          {mention.topics?.[0] && <span className="badge badge--neu">{mention.topics[0]}</span>}
          {(mention.geo?.district || (mention.locations && mention.locations[0])) && (
            <span style={{ fontSize: "10px", color: "var(--txt-muted)" }}>📍 {mention.geo?.district || mention.locations[0]}</span>
          )}
          {mention.isCritical && (
            <span className="badge badge--neg">⚡ KRITIS {mention.criticalScore || ""}</span>
          )}
          <span className="mention-card__link">↗ Sumber Asli</span>
        </div>
      </div>
    </div>
  );
}

// ── Komponen IssueCard ──────────────────────────────────────────────────

function IssueCard({ issue, isSelected, onClick }) {
  const cls    = scoreClass(issue.criticalScore || 50);
  const emoji  = scoreEmoji(cls);

  return (
    <div
      className={`issue-card ${isSelected ? "active" : ""} animate-in`}
      onClick={onClick}
    >
      <div className="issue-card__header">
        <div className={`issue-card__score score--${cls}`}>
          {issue.criticalScore || 50}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="issue-card__title">{emoji} {issue.title}</div>
          <div className="issue-card__meta">
            {issue.watchlistMatch?.length > 0 && (
              <span className="badge badge--watchlist">🔔 WATCHLIST</span>
            )}
            <span className={`badge badge--${cls}`}>{cls.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="issue-card__escalation">
        {issue.escalationTimeline?.map((step, i) => (
          <div key={i} title={`${step.time} — ${step.source}`}>
            <div className={`esc-dot ${i < issue.escalationTimeline.length ? "active" : ""}`} />
          </div>
        ))}
        <span style={{ fontSize: "9px", color: "var(--txt-muted)", marginLeft: 4 }}>
          {issue.escalationTimeline?.map(t => t.source).join(" → ")}
        </span>
      </div>

      <div className="issue-card__sources">
        📍 {issue.location?.district || (issue.locations && issue.locations[0]) || "Pinrang"}
        &nbsp;·&nbsp;
        {issue.sourceCount || 1} media&nbsp;·&nbsp;
        {issue.mentionCount || 1} sebutan&nbsp;·&nbsp;
        {formatTime(issue.latestUpdate || issue.publishedAt)}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats,          setStats]          = useState(MOCK_STATS);
  const [issues,         setIssues]         = useState(MOCK_CRITICAL_ISSUES);
  const [mentions,       setMentions]       = useState(MOCK_MENTIONS);
  const [sourceHealth,   setSourceHealth]   = useState(MOCK_SOURCE_HEALTH);
  const [trending,       setTrending]       = useState(MOCK_TRENDING);
  const [selectedIssue,  setSelectedIssue]  = useState(null);
  const [activeFilter,   setActiveFilter]   = useState("Semua");
  const [lastUpdate,     setLastUpdate]     = useState("");
  const [isLive,         setIsLive]         = useState(false);

  const FILTERS = ["Semua", "LPG", "BBM", "Pangan", "Pasar", "IKM", "Metrologi", "ESDM"];

  // Realtime Firestore Listener
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, "dashboard_snapshot", "current"),
        (snap) => {
          if (snap.exists()) {
            const raw = snap.data();
            let data = raw;
            if (raw.data && typeof raw.data === "string") {
              try { data = JSON.parse(raw.data); } catch (e) { console.warn("Parse snapshot data error", e); }
            }
            if (data) {
              setIsLive(true);
              const pinRe = /\bpinrang\b/i;
              const rawNews = data.latestNews || data.latestMentions || [];
              
              // Filter artikel khusus Pinrang
              const news = rawNews.filter(a => {
                const txt = (a.title || "") + " " + (a.snippet || a.summary || "") + " " + (a.locations || []).join(" ");
                return pinRe.test(txt);
              });

              if (news.length > 0) {
                setMentions(news);
                const crit = news.filter(n => n.isCritical || n.criticalScore >= 60);
                if (crit.length > 0) setIssues(crit);
                
                // Update stats jika tidak disediakan oleh collector
                if (data.stats) {
                  setStats(data.stats);
                } else {
                  const negCount = news.filter(n => (n.sentiment === "NEGATIF" || n.sentiment?.label === "negative")).length;
                  setStats({
                    totalMentions: news.length * 35,
                    criticalIssues: crit.length,
                    negativePct: Math.round((negCount / news.length) * 100),
                    totalAspirations: 24,
                    activeSources: 30
                  });
                }
              }

              if (data.trendingTopics && data.trendingTopics.length > 0) {
                setTrending(data.trendingTopics.map(t => ({
                  id: t.id,
                  topic: t.topic,
                  count: t.volume || t.count || 50,
                  isCritical: t.is_critical || t.isCritical
                })));
              }

              const rawTime = data.updatedAt || data.updatedIso || new Date();
              const d = new Date(rawTime);
              const timeStr = !isNaN(d.getTime())
                ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" })
                : new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
              setLastUpdate(timeStr + " WITA");
            }
          } else {
            console.log("Document dashboard_snapshot/current belum ada, memakai mockdata.");
          }
        },
        (err) => {
          console.warn("Firestore onSnapshot error:", err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn("Init Firestore listener error:", e);
    }
  }, []);

  // Filter mentions berdasarkan tab aktif
  const filteredMentions = activeFilter === "Semua"
    ? mentions
    : mentions.filter(m =>
        m.topics?.some(t => t.toLowerCase().includes(activeFilter.toLowerCase()))
      );

  const maxTrendCount = Math.max(...(trending.map(t => t.count)), 1);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* Stats Bar */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <div className="stats-bar">
          <div className="stat-item stat-mentions">
            <div>
              <div className="stat-item__value">{stats?.totalMentions ?? "—"}</div>
              <div className="stat-item__label">TOTAL MENTIONS</div>
            </div>
          </div>
          <div className="stat-item stat-critical">
            <div>
              <div className="stat-item__value">{stats?.criticalIssues ?? "—"}</div>
              <div className="stat-item__label">ISU KRITIS</div>
            </div>
          </div>
          <div className="stat-item stat-negative">
            <div>
              <div className="stat-item__value">{stats?.negativePct ?? "—"}%</div>
              <div className="stat-item__label">SENTIMEN NEGATIF</div>
            </div>
          </div>
          <div className="stat-item stat-aspirasi">
            <div>
              <div className="stat-item__value">{stats?.totalAspirations ?? "—"}</div>
              <div className="stat-item__label">ASPIRASI WARGA</div>
            </div>
          </div>
          <div className="stat-item stat-sources">
            <div>
              <div className="stat-item__value">{stats?.activeSources ?? "—"}</div>
              <div className="stat-item__label">SUMBER AKTIF</div>
            </div>
          </div>
          {lastUpdate && (
            <div className="stat-item" style={{ marginLeft: "auto" }}>
              <div>
                <div style={{ fontSize: "11px", color: isLive ? "#4ADE80" : "var(--clr-accent)", fontWeight: 700 }}>
                  {isLive ? "🟢 LIVE · " : "⟳ "} {lastUpdate}
                </div>
                <div className="stat-item__label">{isLive ? "FIRESTORE SYNC" : "LAST UPDATE"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="main-grid" style={{ flex: 1, overflow: "hidden" }}>

          {/* Left Panel — Issues + Source Health + Trending */}
          <div className="left-panel">

            {/* Critical Issues */}
            <div className="section-header">
              <h2>🔴 Critical Issues</h2>
              <span style={{ fontSize: "11px", color: "var(--txt-muted)" }}>{issues.length} aktif</span>
            </div>
            {issues.length === 0 ? (
              <div style={{ padding: "20px", color: "var(--txt-muted)", textAlign: "center", fontSize: "12px" }}>
                Tidak ada isu kritis saat ini
              </div>
            ) : issues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={selectedIssue?.id === issue.id}
                onClick={() => setSelectedIssue(issue)}
              />
            ))}

            {/* Trending Topics */}
            <div className="section-header" style={{ marginTop: 0 }}>
              <h2>📈 Trending Topik</h2>
            </div>
            <div className="trending-list">
              {trending.map((t, i) => (
                <div key={t.id}>
                  <div className="trending-item">
                    <span className="trending-rank">#{i + 1}</span>
                    <span className="trending-topic">{t.topic}</span>
                    <span className="trending-count">{t.count} sebutan</span>
                    {t.isCritical && <span className="badge badge--neg">KRITIS</span>}
                  </div>
                  <div className="trending-bar">
                    <div className="trending-bar-fill" style={{ width: `${(t.count / maxTrendCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Source Health */}
            <div className="section-header">
              <h2>🛰️ Source Health</h2>
            </div>
            <div className="source-health-list">
              {sourceHealth.map(src => (
                <div key={src.id} className="source-health-item">
                  <div className={`source-health-dot ${src.status}`} />
                  <span className="source-health-name">{src.name}</span>
                  <span className="source-health-tier">{src.tier}</span>
                  {src.status === "unreviewed" ? (
                    <div className="source-health-action">
                      <button className="btn-approve">APPROVE</button>
                      <button className="btn-watch">WATCH</button>
                      <button className="btn-block">BLOCK</button>
                    </div>
                  ) : (
                    <span className="source-health-time">{formatMinutesAgo(src.minutesAgo)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel — Mentions */}
          <div className="right-panel">
            <div className="section-header">
              <h2>📰 Berita & Aspirasi Terkini</h2>
            </div>
            <div className="filter-tabs">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`filter-tab ${activeFilter === f ? "active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {filteredMentions.length === 0 ? (
              <div style={{ padding: "40px", color: "var(--txt-muted)", textAlign: "center", fontSize: "13px" }}>
                Belum ada berita dengan filter "{activeFilter}"
              </div>
            ) : filteredMentions.map(m => (
              <MentionCard key={m.id} mention={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
