import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// ─── Schedule Data ───
const defaultSchedules = {
  mondayThursday: [
    ["SPARK","08:35","08:55"],
    ["Block 1","08:58","09:53"],
    ["Block 2","09:56","10:51"],
    ["Block 3","10:54","11:49"],
    ["Lunch","11:49","12:24"],
    ["Block 4","12:27","13:22"],
    ["Block 5","13:25","14:20"],
    ["Block 6","14:23","15:18"]
  ],
  friday: [
    ["Block 1","08:35","09:15"],
    ["Block 2","09:18","09:58"],
    ["Block 3","10:01","10:41"],
    ["Block 4","10:44","11:24"],
    ["Nutrition","11:24","11:39"],
    ["Block 5","11:41","12:21"],
    ["Block 6","12:24","13:04"]
  ]
}

const STORAGE_KEYS = {
  customSchedule: "customSchedule",
  scheduleSource: "scheduleSource",
  scheduleName: "scheduleName",
  soundEnabled: "soundEnabled",
  theme: "theme"
}

// ─── Helpers ───
function parseTime(v) {
  if (typeof v !== "string") return null
  const m = v.trim().match(/^([0-9]{1,2}):([0-9]{2})$/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function formatTime(total) {
  const s = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
}

function formatCountdown(sec) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`
}

function getDaySchedule(day) {
  if (day === 0 || day === 6) return null // weekend
  if (day === 5) return "friday"
  return "mondayThursday"
}

// ─── Theme definitions ───
const themes = {
  latte:  { accent:"#D4A574", dark:"#8B6F47", bg1:"#FFFCF8", bg2:"#FAF0E6", name:"Latte" },
  red:    { accent:"#C75B5B", dark:"#8B3A3A", bg1:"#FFF5F5", bg2:"#FED7D7", name:"Rose" },
  orange: { accent:"#D4883A", dark:"#8B5A2B", bg1:"#FFFBF5", bg2:"#FEEBC8", name:"Amber" },
  green:  { accent:"#5B9B5B", dark:"#3A6B3A", bg1:"#F5FFF5", bg2:"#C6F6D5", name:"Sage" },
  blue:   { accent:"#5B7FBF", dark:"#3A5A8B", bg1:"#F5F8FF", bg2:"#BEE3F8", name:"Sky" },
  purple: { accent:"#8B6BBF", dark:"#5B3A8B", bg1:"#FAF5FF", bg2:"#E9D8FD", name:"Lavender" },
  pink:   { accent:"#BF6B8B", dark:"#8B3A5B", bg1:"#FFF5F8", bg2:"#FED7E2", name:"Blush" },
  dark:   { accent:"#6B7280", dark:"#374151", bg1:"#1a1a2e", bg2:"#16213e", name:"Midnight" }
}

export default function App() {
  const [time, setTime] = useState(new Date())
  const [builderOpen, setBuilderOpen] = useState(false)
  const [theme, setThemeKey] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || "latte")
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.soundEnabled) !== "false")
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem("notifications") === "true")
  const [customSchedule, setCustomSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.customSchedule) || "null") } catch { return null }
  })
  const [scheduleSource, setScheduleSource] = useState(() => localStorage.getItem(STORAGE_KEYS.scheduleSource) || "auto")
  const [builderBlocks, setBuilderBlocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.customSchedule) || "null") || [{name:"Block 1",start:"08:35",end:"09:30"}] } catch { return [{name:"Block 1",start:"08:35",end:"09:30"}] }
  })
  const [builderErrors, setBuilderErrors] = useState("")
  const [builderSuccess, setBuilderSuccess] = useState("")

  const audioRef = useRef(null)

  // Apply theme
  useEffect(() => {
    const t = themes[theme] || themes.latte
    const root = document.documentElement
    root.style.setProperty("--accent", t.accent)
    root.style.setProperty("--accent-dark", t.dark)
    root.style.setProperty("--bg1", t.bg1)
    root.style.setProperty("--bg2", t.bg2)
    localStorage.setItem(STORAGE_KEYS.theme, theme)
  }, [theme])

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Get active schedule
  const getActiveSchedule = useCallback(() => {
    const daySched = getDaySchedule(time.getDay())
    if (scheduleSource === "custom" && customSchedule?.length) {
      return { source: "custom", blocks: customSchedule }
    }
    if (scheduleSource === "friday" && daySched === "friday") {
      return { source: "friday", blocks: defaultSchedules.friday.map(([n,s,e]) => ({name:n,start:s,end:e})) }
    }
    if (scheduleSource === "mondayThursday" && daySched !== "friday" && daySched !== null) {
      return { source: "mondayThursday", blocks: defaultSchedules.mondayThursday.map(([n,s,e]) => ({name:n,start:s,end:e})) }
    }
    if (scheduleSource === "auto") {
      if (daySched === null) return { source: "weekend", blocks: [] }
      const key = daySched
      return { source: key, blocks: defaultSchedules[key].map(([n,s,e]) => ({name:n,start:s,end:e})) }
    }
    // fallback to auto
    if (daySched === null) return { source: "weekend", blocks: [] }
    return { source: daySched, blocks: defaultSchedules[daySched].map(([n,s,e]) => ({name:n,start:s,end:e})) }
  }, [time, scheduleSource, customSchedule])

  // Compute timer state
  const timerState = (() => {
    const { blocks } = getActiveSchedule()
    const currentMin = time.getHours() * 60 + time.getMinutes() + time.getSeconds() / 60

    if (!blocks.length) {
      if (getDaySchedule(time.getDay()) === null) {
        return { state:"weekend", currentText:"🎉 Weekend", nextText:"", timerText:"--:--", statusText:"No school today", titleText:"Weekend", fill:0, pct:"" }
      }
      return { state:"empty", currentText:"No Schedule", nextText:"", timerText:"--:--", statusText:"Create a schedule", titleText:"School Timer", fill:0, pct:"" }
    }

    const norm = blocks.map(b => ({...b, s: parseTime(b.start), e: parseTime(b.end)})).filter(b => b.s !== null && b.e !== null).sort((a,b) => a.s - b.s)
    if (!norm.length) return { state:"empty", currentText:"No Schedule", nextText:"", timerText:"--:--", statusText:"Invalid times", titleText:"School Timer", fill:0, pct:"" }

    if (currentMin < norm[0].s) {
      const rem = (norm[0].s - currentMin) * 60
      const cd = formatCountdown(rem)
      return { state:"before", currentText:"School Starts Soon", nextText:norm[0].name, timerText:cd, statusText:`School starts in ${cd}`, titleText:`${cd} before school`, fill:0, pct:"0%" }
    }

    for (let i = 0; i < norm.length; i++) {
      const b = norm[i], next = norm[i+1], after = norm[i+2]
      if (currentMin >= b.s && currentMin < b.e) {
        const dur = b.e - b.s, elapsed = currentMin - b.s
        const rem = (b.e - currentMin) * 60
        const pct = dur > 0 ? (elapsed / dur) * 100 : 0
        const cd = formatCountdown(rem)
        return { state:"block", currentText:b.name, nextText:next ? `Next: ${next.name}` : "Next: End of Day", afterNext: after ? `After: ${after.name}` : "", timerText:cd, statusText:`${b.name} ends in ${cd}`, titleText:`${cd} | ${b.name}`, fill:pct, pct:`${Math.floor(pct)}%` }
      }
      if (next && currentMin >= b.e && currentMin < next.s) {
        const gap = next.s - b.e, elapsed = currentMin - b.e
        const rem = (next.s - currentMin) * 60
        const pct = gap > 0 ? (elapsed / gap) * 100 : 0
        const cd = formatCountdown(rem)
        return { state:"break", currentText:"Break", nextText:`Next: ${next.name}`, afterNext: after ? `After: ${after.name}` : "", timerText:cd, statusText:`Break ends in ${cd}`, titleText:`${cd} | Break`, fill:pct, pct:`${Math.floor(pct)}%` }
      }
    }

    return { state:"after", currentText:"Schedule Complete", nextText:"", timerText:"--:--", statusText:"Enjoy your day 🎉", titleText:"Done!", fill:100, pct:"100%" }
  })()

  // Update title
  useEffect(() => { document.title = timerState.titleText }, [timerState.titleText])

  // Save custom schedule
  const saveSchedule = () => {
    try {
      const parsed = builderBlocks.map(b => ({ name: b.name.trim(), start: b.start.trim(), end: b.end.trim() }))
      if (!parsed.length) { setBuilderErrors("Add at least one block"); setBuilderSuccess(""); return }
      for (let i = 0; i < parsed.length; i++) {
        if (!parsed[i].name) { setBuilderErrors(`Block ${i+1} needs a name`); setBuilderSuccess(""); return }
        if (!parsed[i].start || !parsed[i].end) { setBuilderErrors(`${parsed[i].name || "Block "+(i+1)} missing time`); setBuilderSuccess(""); return }
        if (!parseTime(parsed[i].start) || !parseTime(parsed[i].end)) { setBuilderErrors(`${parsed[i].name} has invalid time`); setBuilderSuccess(""); return }
        if (parseTime(parsed[i].end) <= parseTime(parsed[i].start)) { setBuilderErrors(`${parsed[i].name} ends before it starts`); setBuilderSuccess(""); return }
      }
      setCustomSchedule(parsed)
      localStorage.setItem(STORAGE_KEYS.customSchedule, JSON.stringify(parsed))
      setScheduleSource("custom")
      localStorage.setItem(STORAGE_KEYS.scheduleSource, "custom")
      setBuilderSuccess("Schedule saved!")
      setBuilderErrors("")
    } catch(e) { setBuilderErrors("Error saving"); setBuilderSuccess("") }
    setBuilderOpen(false)
  }

  const updateBlock = (idx, field, val) => {
    setBuilderBlocks(prev => prev.map((b,i) => i === idx ? {...b, [field]: val} : b))
    setBuilderErrors("")
    setBuilderSuccess("")
  }

  const addBlock = () => {
    setBuilderBlocks(prev => [...prev, { name: `Block ${prev.length + 1}`, start: "08:35", end: "09:30" }])
  }

  const removeBlock = (idx) => {
    setBuilderBlocks(prev => prev.filter((_,i) => i !== idx))
  }

  const currentTheme = themes[theme] || themes.latte
  const isWeekend = getDaySchedule(time.getDay()) === null

  return (
    <div style={{minHeight:"100vh", position:"relative"}}>
      {/* Background */}
      <div className="bg-animation">
        <div className="floating-shape" />
        <div className="floating-shape" />
        <div className="floating-shape" />
      </div>

      {/* Schedule bubble */}
      {!builderOpen && !isWeekend && (
        <div className="schedule-bubble glass">
          {timerState.state === "weekend" ? "No school today" : (
            <span>📅 {getDaySchedule(time.getDay()) === "friday" ? "Friday" : "Mon–Thu"} Schedule</span>
          )}
        </div>
      )}

      {/* Top-right builder button */}
      {!builderOpen && (
        <button className="builder-btn" onClick={() => setBuilderOpen(true)} title="Schedule Builder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      )}

      {/* Main content */}
      {!builderOpen ? (
        <div className="main-container">
          {/* Clock */}
          <div className="clock-display">
            {time.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </div>

          {/* Current block */}
          <div className={`timer-card ${timerState.state}`}>
            <div className="timer-current">{timerState.currentText}</div>
            {timerState.nextText && <div className="timer-next">{timerState.nextText}</div>}
            {timerState.afterNext && <div className="timer-after">{timerState.afterNext}</div>}

            <div className="timer-countdown">{timerState.timerText}</div>

            <div className="progress-track">
              <div className="progress-fill" style={{width: `${timerState.fill}%`}} />
            </div>

            <div className="timer-meta">
              <span className="timer-status">{timerState.statusText}</span>
              {timerState.pct && <span className="timer-pct">{timerState.pct}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* Builder overlay */
        <div className="builder-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBuilderOpen(false) }}>
          <div className="builder-panel" onClick={e => e.stopPropagation()}>
            <div className="builder-header">
              <h2>Schedule Builder</h2>
              <button className="btn-icon" onClick={() => setBuilderOpen(false)}>✕</button>
            </div>

            <p className="builder-hint">Create your own schedule with blocks, names, and times.</p>

            <div className="builder-rows">
              {builderBlocks.map((block, idx) => (
                <div className="builder-row" key={idx}>
                  <input
                    className="input-field block-name"
                    placeholder="Block name"
                    value={block.name}
                    onChange={e => updateBlock(idx, "name", e.target.value)}
                  />
                  <input
                    type="time"
                    className="input-field block-time"
                    value={block.start}
                    onChange={e => updateBlock(idx, "start", e.target.value)}
                  />
                  <span className="time-sep">–</span>
                  <input
                    type="time"
                    className="input-field block-time"
                    value={block.end}
                    onChange={e => updateBlock(idx, "end", e.target.value)}
                  />
                  <button className="btn-icon btn-trash" onClick={() => removeBlock(idx)}>✕</button>
                </div>
              ))}
            </div>

            <button className="btn-add-block" onClick={addBlock}>+ Add Block</button>

            {builderErrors && <div className="builder-msg error">{builderErrors}</div>}
            {builderSuccess && <div className="builder-msg success">{builderSuccess}</div>}

            <div className="builder-footer">
              <button className="btn-secondary" onClick={() => setBuilderOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveSchedule}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Theme sidebar */}
      {!builderOpen && (
        <div className="theme-sidebar">
          <div className="theme-label">THEMES</div>
          <div className="theme-grid">
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                className={`theme-dot ${theme === key ? "active" : ""}`}
                style={{background: t.accent}}
                onClick={() => setThemeKey(key)}
                title={t.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {!builderOpen && (
        <div className="settings-panel">
          <div className="settings-title">Settings</div>
          <div className="setting-row">
            <span>Sound</span>
            <label className="switch">
              <input type="checkbox" checked={soundEnabled} onChange={e => { setSoundEnabled(e.target.checked); localStorage.setItem(STORAGE_KEYS.soundEnabled, e.target.checked) }} />
              <span className="slider" />
            </label>
          </div>
          <div className="setting-row">
            <span>Notifications</span>
            <label className="switch">
              <input type="checkbox" checked={notificationsEnabled} onChange={e => { setNotificationsEnabled(e.target.checked); localStorage.setItem("notifications", e.target.checked) }} />
              <span className="slider" />
            </label>
          </div>
          <div className="setting-row">
            <span>Source</span>
            <select
              className="select-input"
              value={scheduleSource}
              onChange={e => { setScheduleSource(e.target.value); localStorage.setItem(STORAGE_KEYS.scheduleSource, e.target.value) }}
            >
              <option value="auto">Auto (Day-based)</option>
              <option value="mondayThursday">Mon–Thu</option>
              <option value="friday">Friday</option>
              <option value="custom" disabled={!customSchedule}>Custom</option>
            </select>
          </div>
          <button className="btn-fullscreen" onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            else document.documentElement.requestFullscreen()
          }}>
            {document.fullscreenElement ? "Exit Fullscreen" : "⛶ Fullscreen"}
          </button>
        </div>
      )}
    </div>
  )
}
