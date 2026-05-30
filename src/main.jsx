import { useState, useEffect, useRef } from "react";
import {
  Home, Zap, ShoppingCart, Bus, HeartPulse, Coffee,
  Wallet, PiggyBank, TrendingUp, Plus, Delete, Check,
  Pencil, Sparkles, Clock, ArrowLeftRight, RotateCcw, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LabelList, Legend, Cell,
} from "recharts";

/* ============================================================
   STORAGE  (only place that touches persistence)
   --- To run this in your OWN React project for her, replace the
   --- two functions below with localStorage, e.g.:
   ---   set: localStorage.setItem(SKEY, JSON.stringify(obj))
   ---   get: JSON.parse(localStorage.getItem(SKEY))
   ============================================================ */
const SKEY = "moms-budget-v1";
async function loadSaved() {
  try {
    if (!window.storage) return null;
    const r = await window.storage.get(SKEY, false);
    return r && r.value ? JSON.parse(r.value) : null;
  } catch (e) {
    return null;
  }
}
async function persist(obj) {
  try {
    if (!window.storage) return;
    await window.storage.set(SKEY, JSON.stringify(obj), false);
  } catch (e) {
    /* never crash on save */
  }
}

/* ============================================================
   THEMES
   ============================================================ */
const THEMES = {
  maple: {
    name: "Maple Wood",
    bg: "#F6EDDF", panel: "#FFFFFF", panelAlt: "#FBF3E6",
    ink: "#3A2A1C", inkSoft: "#7C6A56",
    accent: "#B5532A", accentDeep: "#8C3A1E", accentSoft: "#EAD3B6",
    good: "#6F8B33", warn: "#C0421F", line: "#E7D6BF", dot: "#B5532A",
    bars: ["#D49255", "#B5532A"],
  },
  sage: {
    name: "Sage Garden",
    bg: "#EAEFE0", panel: "#FFFFFF", panelAlt: "#F2F5EA",
    ink: "#26331F", inkSoft: "#5C6A50",
    accent: "#54793F", accentDeep: "#3C5A2C", accentSoft: "#CBDAB4",
    good: "#4E7F4E", warn: "#B0531F", line: "#D8E1C6", dot: "#54793F",
    bars: ["#8FAE6B", "#54793F"],
  },
  slate: {
    name: "Cozy Slate",
    bg: "#E7ECF1", panel: "#FFFFFF", panelAlt: "#EFF3F8",
    ink: "#1F2B36", inkSoft: "#54626F",
    accent: "#3E6B8C", accentDeep: "#2C5070", accentSoft: "#C3D6E4",
    good: "#3E8C6B", warn: "#B0531F", line: "#D5DEE7", dot: "#3E6B8C",
    bars: ["#7AA0BC", "#3E6B8C"],
  },
};

const ICONS = { Home, Zap, ShoppingCart, Bus, HeartPulse, Coffee };

/* ============================================================
   DEFAULT DATA  (everything stored in CAD)
   ============================================================ */
const DEFAULT_DATA = {
  income: [
    { id: "pension",  label: "Government Pension", note: "Comes in every month, guaranteed", amount: 1700, enabled: true },
    { id: "parttime", label: "Part-Time Work",     note: "Changes month to month",          amount: 800,  enabled: true },
  ],
  expenses: [
    { id: "housing",   label: "Housing / Rent",   icon: "Home",         budget: 1500, spent: 1500, enabled: true },
    { id: "utilities", label: "Utilities",        icon: "Zap",          budget: 220,  spent: 165,  enabled: true },
    { id: "groceries", label: "Groceries",        icon: "ShoppingCart", budget: 460,  spent: 380,  enabled: true },
    { id: "transport", label: "Transportation",   icon: "Bus",          budget: 130,  spent: 95,   enabled: true },
    { id: "health",    label: "Health",           icon: "HeartPulse",   budget: 160,  spent: 90,   enabled: true },
    { id: "leisure",   label: "Leisure & Fun",    icon: "Coffee",       budget: 130,  spent: 70,   enabled: true },
  ],
  hourlyRate: 22,
};

const FALLBACK_RATE = 0.72;

/* ============================================================
   SMALL REUSABLE PIECES
   ============================================================ */

// An always-editable text label that looks like normal text.
function NameInput({ value, onChange, t, style }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title="Tap to rename"
        style={{
          background: "transparent",
          border: "none",
          borderBottom: `2px dashed ${hover ? t.accentSoft : "transparent"}`,
          color: t.ink,
          fontFamily: "inherit",
          fontWeight: 700,
          padding: "1px 2px",
          outline: "none",
          width: `${Math.max(value.length + 1, 4)}ch`,
          maxWidth: "100%",
          ...style,
        }}
        onFocus={(e) => (e.target.style.borderBottom = `2px solid ${t.accent}`)}
        onBlur={(e) => (e.target.style.borderBottom = `2px dashed transparent`)}
      />
      <Pencil size={15} color={t.inkSoft} style={{ opacity: hover ? 0.8 : 0.35, flexShrink: 0 }} />
    </span>
  );
}

// Money input that edits in the CURRENTLY DISPLAYED currency, stores CAD.
function MoneyInput({ cad, onChangeCad, toDisplay, fromDisplay, t, fontSize = 26 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const shown = editing
    ? draft
    : Math.round(toDisplay(cad)).toLocaleString();
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 2 }}>
      <span style={{ fontSize: fontSize * 0.72, fontWeight: 700, color: t.inkSoft }}>$</span>
      <input
        inputMode="decimal"
        value={shown}
        onFocus={() => { setEditing(true); setDraft(String(Math.round(toDisplay(cad)))); }}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={() => {
          setEditing(false);
          const n = parseFloat(draft);
          if (!isNaN(n)) onChangeCad(fromDisplay(n));
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{
          background: "transparent", border: "none", outline: "none",
          color: t.ink, fontFamily: "inherit", fontWeight: 700,
          fontSize, width: `${Math.max(shown.length, 3) + 0.5}ch`,
          padding: 0,
        }}
      />
    </span>
  );
}

function Pill({ active, onClick, children, t }) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 56, padding: "0 22px", borderRadius: 16,
        border: `2px solid ${active ? t.accent : t.line}`,
        background: active ? t.accent : t.panel,
        color: active ? "#fff" : t.inkSoft,
        fontFamily: "inherit", fontWeight: 700, fontSize: 19,
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        boxShadow: active ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
        transition: "all .15s ease",
      }}
    >
      {children}
    </button>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [theme, setTheme] = useState("maple");
  const [currency, setCurrency] = useState("CAD");
  const [view, setView] = useState("flow");
  const [hydrated, setHydrated] = useState(false);

  const [rate, setRate] = useState(FALLBACK_RATE);
  const [rateLive, setRateLive] = useState(false);

  // simulator state
  const [extraHours, setExtraHours] = useState(5);
  const [extraGroceries, setExtraGroceries] = useState(40);

  // expense logging modal
  const [logOpen, setLogOpen] = useState(false);

  const t = THEMES[theme];

  /* ---- load saved data on first render ---- */
  useEffect(() => {
    (async () => {
      const s = await loadSaved();
      if (s) {
        if (s.data) setData(s.data);
        if (s.theme && THEMES[s.theme]) setTheme(s.theme);
        if (s.currency) setCurrency(s.currency);
      }
      setHydrated(true);
    })();
  }, []);

  /* ---- save whenever something meaningful changes ---- */
  useEffect(() => {
    if (hydrated) persist({ data, theme, currency });
  }, [data, theme, currency, hydrated]);

  /* ---- fetch live exchange rate, fall back gracefully ---- */
  useEffect(() => {
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/CAD")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && d.rates && typeof d.rates.USD === "number") {
          setRate(d.rates.USD);
          setRateLive(true);
        }
      })
      .catch(() => { /* keep fallback rate, no crash */ });
    return () => { cancelled = true; };
  }, []);

  /* ---- load nice fonts ---- */
  useEffect(() => {
    const id = "moms-budget-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Atkinson+Hyperlegible:wght@400;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  /* ---- currency conversion helpers (base currency = CAD) ---- */
  const toDisplay = (cad) => (currency === "USD" ? cad * rate : cad);
  const fromDisplay = (v) => (currency === "USD" ? v / rate : v);
  const money = (cad) =>
    "$" + Math.round(toDisplay(cad)).toLocaleString();

  /* ---- updaters ---- */
  const setIncome = (id, patch) =>
    setData((d) => ({ ...d, income: d.income.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const setExpense = (id, patch) =>
    setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  /* ---- totals (all in CAD) ---- */
  const incomeTotal = data.income.filter((i) => i.enabled).reduce((s, i) => s + (+i.amount || 0), 0);
  const billsTotal = data.expenses.filter((e) => e.enabled).reduce((s, e) => s + (+e.budget || 0), 0);
  const spentTotal = data.expenses.filter((e) => e.enabled).reduce((s, e) => s + (+e.spent || 0), 0);
  const cushion = incomeTotal - spentTotal;

  const fontHead = 'Fraunces, Georgia, "Times New Roman", serif';
  const fontBody = '"Atkinson Hyperlegible", system-ui, sans-serif';

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: fontBody,
        color: t.ink,
        fontSize: 18,
        background: `radial-gradient(1200px 600px at 80% -5%, ${t.accentSoft}66, transparent 60%), ${t.bg}`,
        transition: "background .3s ease",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* ===================== HEADER ===================== */}
        <header style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: fontHead, fontSize: 34, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              My Money, Made Simple
            </h1>
            {/* 3-dot theme picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <span style={{ color: t.inkSoft, fontSize: 16 }}>Look &amp; feel:</span>
              {Object.entries(THEMES).map(([key, th]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  title={th.name}
                  aria-label={th.name}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: th.dot, cursor: "pointer",
                    border: theme === key ? `3px solid ${t.ink}` : `3px solid #ffffff`,
                    boxShadow: "0 2px 6px rgba(0,0,0,.18)",
                    transform: theme === key ? "scale(1.12)" : "scale(1)",
                    transition: "transform .15s ease",
                  }}
                />
              ))}
              <span style={{ color: t.inkSoft, fontSize: 16 }}>{t.name}</span>
            </div>
          </div>

          {/* Currency toggle + live badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                display: "inline-flex", background: t.panel, padding: 6,
                borderRadius: 20, border: `2px solid ${t.line}`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              {[
                { c: "CAD", flag: "🇨🇦" },
                { c: "USD", flag: "🇺🇸" },
              ].map(({ c, flag }) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  style={{
                    minHeight: 54, padding: "0 22px", borderRadius: 15, border: "none",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 21,
                    display: "flex", alignItems: "center", gap: 8,
                    background: currency === c ? t.accent : "transparent",
                    color: currency === c ? "#fff" : t.inkSoft,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{flag}</span> {c}
                </button>
              ))}
            </div>
            <span
              style={{
                fontSize: 15, color: t.inkSoft, background: t.panelAlt,
                padding: "5px 12px", borderRadius: 999, border: `1px solid ${t.line}`,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{
                width: 9, height: 9, borderRadius: "50%",
                background: rateLive ? t.good : t.inkSoft,
                display: "inline-block",
              }} />
              {rateLive ? "Live rate" : "Standard rate"}: 1 CAD = ${rate.toFixed(2)} USD
            </span>
          </div>
        </header>

        {/* ===================== TOP NAV ===================== */}
        <nav style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <Pill active={view === "flow"} onClick={() => setView("flow")} t={t}>
            <Wallet size={22} /> My Monthly Flow
          </Pill>
          <Pill active={view === "stretch"} onClick={() => setView("stretch")} t={t}>
            <TrendingUp size={22} /> Hours &amp; Savings
          </Pill>
        </nav>

        {view === "flow" ? (
          <FlowView
            t={t} fontHead={fontHead} data={data} currency={currency}
            money={money} toDisplay={toDisplay} fromDisplay={fromDisplay}
            incomeTotal={incomeTotal} billsTotal={billsTotal} cushion={cushion}
            setIncome={setIncome} setExpense={setExpense}
            onLog={() => setLogOpen(true)}
          />
        ) : (
          <StretchView
            t={t} fontHead={fontHead} data={data} currency={currency}
            money={money} toDisplay={toDisplay} fromDisplay={fromDisplay}
            cushion={cushion} setData={setData}
            extraHours={extraHours} setExtraHours={setExtraHours}
            extraGroceries={extraGroceries} setExtraGroceries={setExtraGroceries}
          />
        )}

        {/* footer */}
        <footer style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: t.inkSoft, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Check size={16} color={t.good} /> Everything you type is saved automatically on this device.
          </span>
          <button
            onClick={() => {
              if (window.confirm("Start fresh? This clears your numbers and names and brings back the examples.")) {
                setData(DEFAULT_DATA);
              }
            }}
            style={{
              background: "transparent", border: `1.5px solid ${t.line}`, color: t.inkSoft,
              borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit",
              fontSize: 15, display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            <RotateCcw size={16} /> Start fresh
          </button>
        </footer>
      </div>

      {logOpen && (
        <LogModal
          t={t} fontHead={fontHead} data={data} currency={currency}
          toDisplay={toDisplay} fromDisplay={fromDisplay}
          onClose={() => setLogOpen(false)}
          onAdd={(catId, cadAmount) => {
            setExpense(catId, { spent: (data.expenses.find((e) => e.id === catId)?.spent || 0) + cadAmount });
            setLogOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   VIEW A — MY MONTHLY FLOW
   ============================================================ */
function FlowView({
  t, fontHead, data, currency, money, toDisplay, fromDisplay,
  incomeTotal, billsTotal, cushion, setIncome, setExpense, onLog,
}) {
  const cardBase = {
    background: t.panel, borderRadius: 22, padding: "20px 22px",
    border: `1.5px solid ${t.line}`, boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <div style={cardBase}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.inkSoft, fontSize: 16 }}>
            <Wallet size={20} color={t.accent} /> This Month's Income
          </div>
          <div style={{ fontFamily: fontHead, fontSize: 38, fontWeight: 700, marginTop: 6 }}>{money(incomeTotal)}</div>
          <div style={{ fontSize: 14, color: t.inkSoft }}>{currency}</div>
        </div>

        <div style={cardBase}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.inkSoft, fontSize: 16 }}>
            <Home size={20} color={t.accent} /> Total Fixed Bills
          </div>
          <div style={{ fontFamily: fontHead, fontSize: 38, fontWeight: 700, marginTop: 6 }}>{money(billsTotal)}</div>
          <div style={{ fontSize: 14, color: t.inkSoft }}>{currency} planned</div>
        </div>
      </div>

      {/* BIG CUSHION CARD */}
      <div
        style={{
          background: `linear-gradient(135deg, ${t.accent}, ${t.accentDeep})`,
          borderRadius: 26, padding: "26px 26px", color: "#fff",
          boxShadow: `0 14px 34px ${t.accent}55`, position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "#ffffff22" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, opacity: 0.95 }}>
          <PiggyBank size={26} /> Your Leftover Cash Cushion This Month
        </div>
        <div style={{ fontFamily: fontHead, fontSize: 64, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }}>
          {money(cushion)}
        </div>
        <div style={{ fontSize: 17, opacity: 0.95, marginTop: 4 }}>
          That's your income minus what you've spent so far.
        </div>
        <div
          style={{
            marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8,
            background: "#ffffff26", padding: "10px 16px", borderRadius: 14, fontSize: 17, fontWeight: 700,
          }}
        >
          <Sparkles size={20} />
          {cushion > 0
            ? `Wonderful — you've kept ${money(cushion)} safe this month!`
            : cushion === 0
            ? "You're right on track. Every dollar you save adds up."
            : "A little tight this month — let's find a small win on the next tab."}
        </div>
      </div>

      {/* INCOME TRACKER */}
      <section style={cardBase}>
        <h2 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Money Coming In</h2>
        <p style={{ color: t.inkSoft, fontSize: 16, margin: "0 0 16px" }}>Two simple buckets. Tap any name to rename it.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.income.map((item, idx) => {
            const fixed = idx === 0;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                  background: t.panelAlt, borderRadius: 16, padding: "14px 16px",
                  border: `1.5px solid ${t.line}`, opacity: item.enabled ? 1 : 0.5,
                }}
              >
                <input
                  type="checkbox" checked={item.enabled}
                  onChange={(e) => setIncome(item.id, { enabled: e.target.checked })}
                  title="Use this"
                  style={{ width: 26, height: 26, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 20 }}>
                    <NameInput value={item.label} onChange={(v) => setIncome(item.id, { label: v })} t={t} style={{ fontSize: 20 }} />
                  </div>
                  <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 2 }}>
                    <span style={{
                      background: fixed ? t.good + "22" : t.accent + "22",
                      color: fixed ? t.good : t.accent, padding: "2px 9px", borderRadius: 999, fontWeight: 700, marginRight: 6,
                    }}>
                      {fixed ? "Guaranteed" : "Adjustable"}
                    </span>
                    {item.note}
                  </div>
                </div>
                <MoneyInput cad={item.amount} onChangeCad={(v) => setIncome(item.id, { amount: v })}
                  toDisplay={toDisplay} fromDisplay={fromDisplay} t={t} fontSize={28} />
              </div>
            );
          })}
        </div>
      </section>

      {/* EXPENSE TRACKER */}
      <section style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 700, margin: 0 }}>Money Going Out</h2>
          <button
            onClick={onLog}
            style={{
              minHeight: 56, padding: "0 22px", borderRadius: 16, border: "none", cursor: "pointer",
              background: t.accent, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 19,
              display: "inline-flex", alignItems: "center", gap: 10, boxShadow: `0 6px 18px ${t.accent}55`,
            }}
          >
            <Plus size={24} /> Log a Receipt
          </button>
        </div>
        <p style={{ color: t.inkSoft, fontSize: 16, margin: "0 0 16px" }}>
          The bar fills up as you spend. Green means you still have room.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.expenses.map((e) => {
            const Icon = ICONS[e.icon] || Coffee;
            const pct = e.budget > 0 ? e.spent / e.budget : 0;
            const over = pct > 1;
            const barColor = over ? t.warn : pct > 0.85 ? "#D49255" : t.good;
            return (
              <div
                key={e.id}
                style={{
                  background: t.panelAlt, borderRadius: 16, padding: "14px 16px",
                  border: `1.5px solid ${t.line}`, opacity: e.enabled ? 1 : 0.45,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <input
                    type="checkbox" checked={e.enabled}
                    onChange={(ev) => setExpense(e.id, { enabled: ev.target.checked })}
                    title="Use this"
                    style={{ width: 26, height: 26, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{
                    width: 46, height: 46, borderRadius: 14, background: t.accentSoft,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={26} color={t.accentDeep} />
                  </span>
                  <div style={{ flex: 1, minWidth: 130, fontSize: 20 }}>
                    <NameInput value={e.label} onChange={(v) => setExpense(e.id, { label: v })} t={t} style={{ fontSize: 20 }} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, color: t.inkSoft }}>Spent so far</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                      <MoneyInput cad={e.spent} onChangeCad={(v) => setExpense(e.id, { spent: v })}
                        toDisplay={toDisplay} fromDisplay={fromDisplay} t={t} fontSize={24} />
                      <span style={{ color: t.inkSoft, fontSize: 17 }}>of</span>
                      <MoneyInput cad={e.budget} onChangeCad={(v) => setExpense(e.id, { budget: v })}
                        toDisplay={toDisplay} fromDisplay={fromDisplay} t={t} fontSize={24} />
                    </div>
                  </div>
                </div>
                {/* progress bar */}
                <div style={{ marginTop: 12, height: 16, borderRadius: 999, background: t.line, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: barColor,
                    borderRadius: 999, transition: "width .25s ease",
                  }} />
                </div>
                {over && (
                  <div style={{ color: t.warn, fontSize: 15, marginTop: 6, fontWeight: 700 }}>
                    A little over budget here — no worry, just something to watch.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   VIEW B — HOURS & SAVINGS STRETCHER
   ============================================================ */
function StretchView({
  t, fontHead, data, currency, money, toDisplay, fromDisplay,
  cushion, setData, extraHours, setExtraHours, extraGroceries, setExtraGroceries,
}) {
  const cardBase = {
    background: t.panel, borderRadius: 22, padding: "22px 24px",
    border: `1.5px solid ${t.line}`, boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  };

  const baseMonthly = Math.max(cushion, 0);
  const extraMonthly = extraHours * data.hourlyRate + extraGroceries; // CAD
  const boostedMonthly = baseMonthly + extraMonthly;

  const periods = [3, 6, 12];
  const chartData = periods.map((m) => ({
    name: `${m} months`,
    Current: Math.round(toDisplay(baseMonthly * m)),
    Boosted: Math.round(toDisplay(boostedMonthly * m)),
  }));
  const sixMonth = boostedMonthly * 6;

  const sliderStyle = {
    width: "100%", height: 14, borderRadius: 999, appearance: "none",
    background: `linear-gradient(${t.accent}, ${t.accent})`, accentColor: t.accent, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <section style={cardBase}>
        <h2 style={{ fontFamily: fontHead, fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
          Small changes, big comfort
        </h2>
        <p style={{ color: t.inkSoft, fontSize: 17, margin: "0 0 22px" }}>
          Slide these to see how a little extra builds a safety net over time.
        </p>

        {/* hourly rate */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, color: t.inkSoft, marginBottom: 22, flexWrap: "wrap" }}>
          <Clock size={20} color={t.accent} /> You earn about
          <MoneyInput cad={data.hourlyRate} onChangeCad={(v) => setData((d) => ({ ...d, hourlyRate: v }))}
            toDisplay={toDisplay} fromDisplay={fromDisplay} t={t} fontSize={22} />
          <span>per hour at your part-time job.</span>
        </div>

        {/* slider 1 */}
        <div style={{ marginBottom: 26 }}>
          <label style={{ fontSize: 19, fontWeight: 700, display: "block", marginBottom: 10 }}>
            If I work an extra <span style={{ color: t.accent }}>{extraHours} hours</span> this month…
          </label>
          <input type="range" min={0} max={15} step={1} value={extraHours}
            onChange={(e) => setExtraHours(+e.target.value)} style={sliderStyle} />
          <div style={{ display: "flex", justifyContent: "space-between", color: t.inkSoft, fontSize: 14, marginTop: 4 }}>
            <span>0 hrs</span><span>15 hrs</span>
          </div>
          <div style={{ fontSize: 16, color: t.good, fontWeight: 700, marginTop: 6 }}>
            +{money(extraHours * data.hourlyRate)} this month
          </div>
        </div>

        {/* slider 2 */}
        <div>
          <label style={{ fontSize: 19, fontWeight: 700, display: "block", marginBottom: 10 }}>
            …and if I save an extra <span style={{ color: t.accent }}>{money(extraGroceries)}</span> on groceries.
          </label>
          <input type="range" min={0} max={200} step={5} value={extraGroceries}
            onChange={(e) => setExtraGroceries(+e.target.value)} style={sliderStyle} />
          <div style={{ display: "flex", justifyContent: "space-between", color: t.inkSoft, fontSize: 14, marginTop: 4 }}>
            <span>$0</span><span>{money(200)}</span>
          </div>
        </div>
      </section>

      {/* milestone banner */}
      <div style={{
        background: `linear-gradient(135deg, ${t.accent}, ${t.accentDeep})`, color: "#fff",
        borderRadius: 22, padding: "22px 24px", boxShadow: `0 14px 34px ${t.accent}55`,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <Sparkles size={34} />
        <div>
          <div style={{ fontSize: 18, opacity: 0.95 }}>In 6 months, you'll have a safe emergency fund of</div>
          <div style={{ fontFamily: fontHead, fontSize: 46, fontWeight: 700, lineHeight: 1.1 }}>
            {money(sixMonth)}!
          </div>
        </div>
      </div>

      {/* chart */}
      <section style={cardBase}>
        <h3 style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
          How your savings grow
        </h3>
        <p style={{ color: t.inkSoft, fontSize: 16, margin: "0 0 8px" }}>
          Lighter bar = your normal pace. Darker bar = with your extra effort. (Shown in {currency}.)
        </p>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 34, right: 10, left: 0, bottom: 6 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: t.ink, fontSize: 17, fontWeight: 700 }} axisLine={{ stroke: t.line }} tickLine={false} />
              <YAxis tick={{ fill: t.inkSoft, fontSize: 14 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)} />
              <Legend wrapperStyle={{ fontSize: 16, fontWeight: 700, paddingTop: 8 }} />
              <Bar dataKey="Current" name="Normal pace" fill={t.bars[0]} radius={[8, 8, 0, 0]} maxBarSize={64}>
                <LabelList dataKey="Current" position="top" formatter={(v) => "$" + Number(v).toLocaleString()}
                  style={{ fill: t.inkSoft, fontSize: 15, fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="Boosted" name="With extra effort" fill={t.bars[1]} radius={[8, 8, 0, 0]} maxBarSize={64}>
                <LabelList dataKey="Boosted" position="top" formatter={(v) => "$" + Number(v).toLocaleString()}
                  style={{ fill: t.ink, fontSize: 17, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   EXPENSE LOGGING MODAL (numeric pad + category)
   ============================================================ */
function LogModal({ t, fontHead, data, currency, toDisplay, fromDisplay, onClose, onAdd }) {
  const usable = data.expenses.filter((e) => e.enabled);
  const [cat, setCat] = useState(usable[0]?.id || data.expenses[0]?.id);
  const [entry, setEntry] = useState("");

  const press = (k) => {
    if (k === "del") return setEntry((s) => s.slice(0, -1));
    if (k === "." && entry.includes(".")) return;
    if (entry.replace(".", "").length >= 7) return;
    setEntry((s) => s + k);
  };

  const amount = parseFloat(entry) || 0;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(20,12,6,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel, borderRadius: 26, padding: 22, width: "100%", maxWidth: 440,
          border: `1.5px solid ${t.line}`, boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 700, margin: 0 }}>Log an Expense</h3>
          <button onClick={onClose} aria-label="Close" style={{
            width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${t.line}`,
            background: t.panelAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={24} color={t.ink} />
          </button>
        </div>

        {/* amount display */}
        <div style={{
          background: t.panelAlt, border: `2px solid ${t.line}`, borderRadius: 16,
          padding: "16px 18px", textAlign: "center", marginBottom: 14,
        }}>
          <div style={{ fontFamily: fontHead, fontSize: 46, fontWeight: 700, color: t.ink }}>
            ${entry === "" ? "0" : entry}
          </div>
          <div style={{ color: t.inkSoft, fontSize: 15 }}>{currency}</div>
        </div>

        {/* category */}
        <label style={{ fontSize: 16, color: t.inkSoft, display: "block", marginBottom: 6 }}>Which category?</label>
        <select
          value={cat} onChange={(e) => setCat(e.target.value)}
          style={{
            width: "100%", minHeight: 56, fontSize: 19, fontFamily: "inherit", fontWeight: 700,
            borderRadius: 14, border: `2px solid ${t.line}`, background: t.panel, color: t.ink,
            padding: "0 14px", marginBottom: 16, cursor: "pointer",
          }}
        >
          {usable.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>

        {/* number pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {keys.map((k) => (
            <button
              key={k} onClick={() => press(k)}
              style={{
                minHeight: 64, fontSize: 26, fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                borderRadius: 16, border: `1.5px solid ${t.line}`,
                background: k === "del" ? t.panelAlt : t.panel, color: t.ink,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {k === "del" ? <Delete size={26} /> : k}
            </button>
          ))}
        </div>

        <button
          disabled={amount <= 0}
          onClick={() => onAdd(cat, fromDisplay(amount))}
          style={{
            width: "100%", minHeight: 62, borderRadius: 16, border: "none",
            cursor: amount > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700, fontSize: 21,
            background: amount > 0 ? t.accent : t.line, color: amount > 0 ? "#fff" : t.inkSoft,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: amount > 0 ? `0 6px 18px ${t.accent}55` : "none",
          }}
        >
          <Check size={24} /> Add {amount > 0 ? "$" + amount.toLocaleString() : ""} expense
        </button>
      </div>
    </div>
  );
}

export default App;
