import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Menu,
  MapPin, LogOut, Sun, Moon, Palette, Clock, Edit2,
  Trash2, CheckSquare, StickyNote, Calendar, Eye, EyeOff,
  LayoutGrid, AlignJustify, User, Map
} from "lucide-react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import Holidays from "date-holidays";

declare global {
  interface Window {
    kakao: any;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "default" | "dark" | "pastel"
type View = "login" | "signup" | "dashboard" | "detail" | "todo" | "memo" | "profile" | "map"
type CalMode = "month" | "week"

interface CalEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  description?: string
  location?: string
}

interface Todo {
  id: string
  text: string
  completed: boolean
  date: string
}

interface AppUser {
  name: string
  email: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const hd = new Holidays("KR");

const holidays = hd
  .getHolidays(new Date().getFullYear())
  .reduce((acc: Record<string, string>, holiday: any) => {

    const date = holiday.date.slice(0, 10);

    acc[date] = holiday.name;

    return acc;

  }, {});

const holidayNameMap: Record<string, string> = {
  "New Year's Day": "신정",
  "Independence Movement Day": "삼일절",
  "Children's Day": "어린이날",
  "Memorial Day": "현충일",
  "Liberation Day": "광복절",
  "National Foundation Day": "개천절",
  "Hangul Day": "한글날",
  "Christmas Day": "성탄절",
};

const INITIAL_EVENTS: CalEvent[] = []

const INITIAL_TODOS: Todo[] = []

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const EVENT_COLORS = ["#a78bfa", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#fbbf24"]

const THEME_VARS: Record<Theme, Record<string, string>> = {
  default: {
    "--background": "#f6f7fb", "--foreground": "#1e1a3c",
    "--card": "#ffffff", "--card-foreground": "#1e1a3c",
    "--primary": "#7c6fcd", "--primary-foreground": "#ffffff",
    "--secondary": "#ede9fe", "--secondary-foreground": "#4c1d95",
    "--muted": "#f0f0f8", "--muted-foreground": "#6b7280",
    "--accent": "#fce7f3", "--accent-foreground": "#831843",
    "--border": "rgba(124,111,205,0.15)",
    "--input-background": "#f0f0f8",
    "--ring": "rgba(124,111,205,0.4)",
  },
  dark: {
    "--background": "#12111f", "--foreground": "#e8e4ff",
    "--card": "#1e1c32", "--card-foreground": "#e8e4ff",
    "--primary": "#9d8fe8", "--primary-foreground": "#ffffff",
    "--secondary": "#2a2745", "--secondary-foreground": "#c4b9ff",
    "--muted": "#252342", "--muted-foreground": "#8b83b3",
    "--accent": "#3d2850", "--accent-foreground": "#f4a8e0",
    "--border": "rgba(157,143,232,0.2)",
    "--input-background": "#252342",
    "--ring": "rgba(157,143,232,0.45)",
  },
  pastel: {
    "--background": "#fdf0ff", "--foreground": "#3a1f5c",
    "--card": "#fff8ff", "--card-foreground": "#3a1f5c",
    "--primary": "#c4a8e8", "--primary-foreground": "#2a0f4a",
    "--secondary": "#fce4f5", "--secondary-foreground": "#7b1e6a",
    "--muted": "#fae8ff", "--muted-foreground": "#8b6a9a",
    "--accent": "#ffd6f0", "--accent-foreground": "#7b1e6a",
    "--border": "rgba(196,168,232,0.35)",
    "--input-background": "#fae8ff",
    "--ring": "rgba(196,168,232,0.55)",
  },
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function getWeekStart(d: Date) {
  const s = new Date(d)
  s.setDate(d.getDate() - d.getDay())
  s.setHours(0, 0, 0, 0)
  return s
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────
function AuthPage({ mode, setMode, onAuth }: {
  mode: "login" | "signup"
  setMode: (m: "login" | "signup") => void
  onAuth: (user: AppUser) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleLogin = async () => {
    console.log("구글 로그인 클릭")

    try {
      const provider = new GoogleAuthProvider()

      const result = await signInWithPopup(auth, provider)

      onAuth({
        name: result.user.displayName || "User",
        email: result.user.email || "",
      })
    } catch (error) {
      console.error(error)
      alert("구글 로그인 실패")
    }
  }
  
  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (mode === "signup") {
      if (!name.trim()) { setError("Name is required"); return }
      if (password !== confirm) { setError("Passwords don't match"); return }
    }
    if (!email.includes("@")) { setError("Enter a valid email"); return }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return }
    onAuth({ name: name || email.split("@")[0], email })
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[var(--input-background)] border border-[var(--border)] text-[var(--foreground)] text-sm outline-none focus:ring-2 focus:ring-[var(--ring)] placeholder:text-[var(--muted-foreground)] transition-all"

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)", fontFamily: "var(--font-body)" }}>
      {/* Brand panel — hidden on mobile */}
      <div className="hidden md:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--primary) 0%, #b57bee 60%, #f472b6 100%)" }}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>P</span>
            </div>
            <span className="text-white text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>PlanIt</span>
          </div>
          <div className="mt-16">
            <h1 className="text-4xl font-bold text-white leading-snug" style={{ fontFamily: "var(--font-display)" }}>
              Your time,<br />beautifully<br />organized.
            </h1>
            <p className="text-white/75 mt-4 text-base leading-relaxed max-w-xs">
              Schedule smarter with a calendar that actually understands how you work.
            </p>
          </div>
        </div>
        {/* Decorative orbs */}
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: "white", transform: "translate(30%, 30%)" }} />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full opacity-10" style={{ background: "white", transform: "translate(-50%, -50%)" }} />
        <div className="flex gap-3">
          {["Plan smarter", "Stay focused", "Move forward"].map(t => (
            <div key={t} className="text-[11px] px-3 py-1.5 rounded-full border border-white/30 text-white/80">{t}</div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
              <span className="text-white font-bold" style={{ fontFamily: "var(--font-display)" }}>P</span>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>PlanIt</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
            {mode === "login" ? "Sign in to your PlanIt account" : "Start organizing your schedule today"}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ background: "rgba(212,24,61,0.08)", borderColor: "rgba(212,24,61,0.2)", color: "#d4183d" }}>
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Alex Johnson" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="alex@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={inputCls + " pr-11"} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Confirm password</label>
                <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} className={inputCls} placeholder="••••••••" />
              </div>
            )}
            <button type="submit" className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border text-sm font-medium transition-all hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
            onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted-foreground)" }}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }}
              className="font-semibold hover:underline" style={{ color: "var(--primary)" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────
function MonthCalendar({ year, month, events, onDateClick, onEventClick }: {
  year: number
  month: number
  events: CalEvent[]
  onDateClick: (ds: string) => void
  onEventClick: (ev: CalEvent) => void
}) {
  const today = toDateStr(new Date())
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDay(year, month)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(90px, 1fr)" }}>
          {cells.map((day, idx) => {
            if (!day) return (
              <div key={idx} className="border-b border-r" style={{ borderColor: "var(--border)", background: "var(--muted)", opacity: 0.4 }} />
            )
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const holiday = holidays[ds]
            const holidayName =
              holidayNameMap[holiday] || holiday
            const dayEvents = events.filter(e => e.date === ds)
            const isToday = ds === today

            return (
              <div key={idx}
                onClick={() => onDateClick(ds)}
                className="border-b border-r p-1.5 cursor-pointer transition-colors group"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--card)")}>
                <div className="flex flex-col items-start gap-1 mb-1">
                  <span
                    className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                    style={{
                      background: isToday ? "var(--primary)" : "transparent",
                      color: isToday
                        ? "var(--primary-foreground)"
                        : holiday
                          ? "#ef4444"
                          : "var(--foreground)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {day}
                  </span>

                  {holiday && (
                    <span
                      className="text-[10px] leading-none whitespace-nowrap"
                      style={{ color: "#ef4444" }}
                    >
                      {holiday}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      className="text-[11px] rounded-md px-1.5 py-0.5 truncate cursor-pointer font-medium hover:opacity-80 transition-opacity"
                      style={{ background: ev.color, color: "white" }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] pl-1 font-medium" style={{ color: "var(--muted-foreground)" }}>
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── WeekCalendar ─────────────────────────────────────────────────────────────
function WeekCalendar({ weekStart, events, onEventClick }: {
  weekStart: Date
  events: CalEvent[]
  onEventClick: (ev: CalEvent) => void
}) {
  const today = toDateStr(new Date())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)
  const H = 64

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b flex-shrink-0" style={{ gridTemplateColumns: "52px repeat(7,1fr)", borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="border-r" style={{ borderColor: "var(--border)" }} />
        {days.map((d, i) => {
          const ds = toDateStr(d)
          const isToday = ds === today
          return (
            <div key={i} className="py-2.5 text-center border-r last:border-r-0 px-1" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{DAYS_SHORT[d.getDay()]}</div>
              <div className="w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-0.5 text-base font-bold"
                style={{ background: isToday ? "var(--primary)" : "transparent", color: isToday ? "var(--primary-foreground)" : "var(--foreground)", fontFamily: "var(--font-display)" }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid relative" style={{ gridTemplateColumns: "52px repeat(7,1fr)" }}>
          {/* Time labels */}
          <div className="border-r" style={{ borderColor: "var(--border)" }}>
            {HOURS.map(h => (
              <div key={h} className="flex items-start justify-end pr-2 pt-1 border-b" style={{ height: `${H}px`, borderColor: "var(--border)" }}>
                <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                  {h === 12 ? "12P" : h > 12 ? `${h - 12}P` : `${h}A`}
                </span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d, di) => {
            const ds = toDateStr(d)
            const dayEvents = events.filter(e => e.date === ds)
            return (
              <div key={di} className="relative border-r last:border-r-0" style={{ borderColor: "var(--border)", height: `${HOURS.length * H}px` }}>
                {HOURS.map(h => (
                  <div key={h} className="border-b" style={{ height: `${H}px`, borderColor: "var(--border)" }} />
                ))}
                {dayEvents.map(ev => {
                  const [sh, sm] = ev.startTime.split(":").map(Number)
                  const [eh, em] = ev.endTime.split(":").map(Number)
                  const top = Math.max(0, ((sh - 6) * 60 + sm) / 60 * H)
                  const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * H, 26)
                  return (
                    <div key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden z-10 hover:opacity-85 transition-opacity"
                      style={{ top: `${top}px`, height: `${height}px`, background: ev.color }}>
                      <div className="text-[11px] font-semibold text-white leading-tight truncate" style={{ fontFamily: "var(--font-body)" }}>{ev.title}</div>
                      {height > 36 && <div className="text-[10px] text-white/80" style={{ fontFamily: "var(--font-mono)" }}>{formatTime(ev.startTime)}</div>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── ScheduleModal ────────────────────────────────────────────────────────────
function ScheduleModal({ event, defaultDate, setEvents, setTodos, onClose }: {
  event?: CalEvent
  defaultDate?: string
  setEvents: React.Dispatch<React.SetStateAction<CalEvent[]>>
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: event?.title ?? "",
    date: event?.date ?? defaultDate ?? toDateStr(new Date()),
    startTime: event?.startTime ?? "09:00",
    endTime: event?.endTime ?? "10:00",
    color: event?.color ?? EVENT_COLORS[0],
    description: event?.description ?? "",
    location: event?.location ?? "",
  })
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [locationMessage, setLocationMessage] = useState("")
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const runLocationSearch = (keyword: string) => {
    const trimmed = keyword.trim()

    if (!trimmed) {
      setLocationResults([])
      setLocationMessage("")
      return
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      setLocationResults([])
      setLocationMessage("카카오맵을 불러오는 중입니다.")
      return
    }

    const search = () => {
      const places = new window.kakao.maps.services.Places()

      places.keywordSearch(trimmed, (data: any[], status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setLocationResults(data.slice(0, 5))
          setLocationMessage("")
        } else {
          setLocationResults([])
          setLocationMessage("검색 결과가 없습니다.")
        }
      })
    }

    if (window.kakao.maps.load) {
      window.kakao.maps.load(search)
    } else {
      search()
    }
  }

  const handleLocationChange = (value: string) => {
    set("location", value)

    if (locationSearchTimer.current) {
      clearTimeout(locationSearchTimer.current)
    }

    locationSearchTimer.current = setTimeout(() => {
      runLocationSearch(value)
    }, 350)
  }

  const selectLocation = (place: any) => {
    set("location", place.place_name)
    setLocationResults([])
    setLocationMessage(place.road_address_name || place.address_name || "")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const title = form.title.trim()

    if (event) {
      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, ...form, title } : ev))
    } else {
      const newId = uid()
      setEvents(prev => [...prev, { id: newId, ...form, title }])
      setTodos(prev => [
        ...prev,
        {
          id: `todo-${newId}`,
          text: title,
          completed: false,
          date: form.date,
        },
      ])
    }
    onClose()
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all"
  const inputStyle = { background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "var(--font-body)" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-lg" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
            {event ? "Edit Schedule" : "New Schedule"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} required placeholder="Event title" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Date</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Start time</label>
              <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>End time</label>
              <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted-foreground)" }}>Color</label>
            <div className="flex gap-2.5">
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110"
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
              ))}
            </div>
          </div>
          <div className="relative">
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Location</label>
            <input
              value={form.location}
              onChange={e => handleLocationChange(e.target.value)}
              placeholder="장소를 검색하세요. 예: 숙명"
              className={inputCls}
              style={inputStyle}
              autoComplete="off"
            />

            {locationResults.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden z-20"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                {locationResults.map(place => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => selectLocation(place)}
                    className="w-full text-left px-3 py-2.5 transition-all hover:opacity-80 border-b last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} style={{ color: "var(--primary)" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {place.place_name}
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5 pl-6 truncate" style={{ color: "var(--muted-foreground)" }}>
                      {place.road_address_name || place.address_name}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {locationMessage && (
              <p className="text-[11px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                {locationMessage}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              placeholder="Optional notes..." className={inputCls + " resize-none"} style={inputStyle} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              {event ? "Save Changes" : "Add Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── TodoSidebar ──────────────────────────────────────────────────────────────
function TodoSidebar({ todos, setTodos }: {
  todos: Todo[]
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
}) {
  const [input, setInput] = useState("")
  const todayStr = toDateStr(new Date())

  const add = () => {
    if (!input.trim()) return
    setTodos(p => [...p, { id: uid(), text: input.trim(), completed: false, date: todayStr }])
    setInput("")
  }

  const toggle = (id: string) => setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  const del = (id: string) => setTodos(p => p.filter(t => t.id !== id))

  const visibleTodos = todos
  const done = visibleTodos.filter(t => t.completed).length
  const total = visibleTodos.length

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)", fontFamily: "var(--font-body)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
          <CheckSquare size={15} style={{ color: "var(--primary)" }} />
          Tasks
        </h3>
        {total > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
            {done}/{total}
          </span>
        )}
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: "var(--muted)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(done / total) * 100}%`, background: "var(--primary)" }} />
        </div>
      )}
      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add a task..." className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition-all"
          style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
        <button onClick={add} className="p-2 rounded-xl transition-all hover:opacity-80 flex-shrink-0"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <Plus size={15} />
        </button>
      </div>
      {/* List */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {visibleTodos.map(todo => (
          <div key={todo.id} className="flex items-center gap-2.5 group px-1">
            <button onClick={() => toggle(todo.id)}
              className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                borderColor: todo.completed ? "var(--primary)" : "var(--border)",
                background: todo.completed ? "var(--primary)" : "transparent"
              }}>
              {todo.completed && <Check size={11} style={{ color: "var(--primary-foreground)" }} />}
            </button>
            <span className="flex-1 text-sm transition-all"
              style={{ color: todo.completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: todo.completed ? "line-through" : "none" }}>
              {todo.text}
            </span>
            <button onClick={() => del(todo.id)}
              className="opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              style={{ color: "var(--muted-foreground)" }}>
              <X size={13} />
            </button>
          </div>
        ))}
        {visibleTodos.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>No tasks yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── MemoCard ─────────────────────────────────────────────────────────────────
function MemoCard({ memo, setMemo }: { memo: string; setMemo: (v: string) => void }) {
  const [saved, setSaved] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onChange = (v: string) => {
    setMemo(v)
    setSaved(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(true), 1200)
  }

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)", fontFamily: "var(--font-body)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
          <StickyNote size={15} style={{ color: "var(--primary)" }} />
          Quick Memo
        </h3>
        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {saved ? "Saved ✓" : "Saving…"}
        </span>
      </div>
      <textarea value={memo} onChange={e => onChange(e.target.value)} rows={5}
        className="w-full text-sm rounded-xl p-3 border outline-none resize-none transition-all"
        style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ theme, setTheme, calMode, setCalMode, view, setView, user, onLogout, onMenuToggle }: {
  theme: Theme; setTheme: (t: Theme) => void
  calMode: CalMode; setCalMode: (m: CalMode) => void
  view: View; setView: (v: View) => void
  user: AppUser; onLogout: () => void; onMenuToggle: () => void
}) {
  return (
    <header className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0 z-40"
      style={{ background: "var(--card)", borderColor: "var(--border)", fontFamily: "var(--font-body)" }}>
      {/* Left */}
      <div className="flex items-center gap-2">
        <button className="hidden p-1.5 rounded-lg transition-all hover:opacity-70" onClick={onMenuToggle}
          style={{ color: "var(--muted-foreground)" }}>
          <Menu size={20} />
        </button>
        <button onClick={() => setView("dashboard")} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <span className="font-bold text-sm" style={{ color: "var(--primary-foreground)", fontFamily: "var(--font-display)" }}>P</span>
          </div>
          <span className="font-bold text-lg hidden sm:block" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>PlanIt</span>
        </button>
      </div>

      {/* Center – calendar toggle */}
      {view === "dashboard" && (
        <div className="hidden md:flex items-center gap-0.5 rounded-xl p-1" style={{ background: "var(--muted)" }}>
          {(["month", "week"] as CalMode[]).map(m => (
            <button key={m} onClick={() => setCalMode(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
              style={{
                background: calMode === m ? "var(--card)" : "transparent",
                color: calMode === m ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: calMode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
              }}>
              {m === "month" ? <LayoutGrid size={13} /> : <AlignJustify size={13} />}
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme switcher */}
        <div className="hidden md:flex items-center gap-0.5 rounded-xl p-1" style={{ background: "var(--muted)" }}>
          {([["default", <Sun size={13} />], ["dark", <Moon size={13} />], ["pastel", <Palette size={13} />]] as [Theme, React.ReactNode][]).map(([t, icon]) => (
            <button key={t} onClick={() => setTheme(t)}
              className="p-1.5 rounded-lg transition-all tooltip-target"
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              style={{
                background: theme === t ? "var(--card)" : "transparent",
                color: theme === t ? "var(--primary)" : "var(--muted-foreground)",
                boxShadow: theme === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
              }}>
              {icon}
            </button>
          ))}
        </div>

        <button onClick={() => setView("profile")}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all hover:opacity-80"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-display)" }}>
          {user.name[0].toUpperCase()}
        </button>

        <button onClick={onLogout}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-70"
          style={{ color: "var(--muted-foreground)" }}>
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
function BottomNav({ view, setView, onAdd }: { view: View; setView: (v: View) => void; onAdd: () => void }) {
  const items = [
    { icon: <Calendar size={20} />, label: "Calendar", v: "dashboard" as View },
    { icon: <CheckSquare size={20} />, label: "Tasks", v: "todo" as View },
    { icon: <StickyNote size={20} />, label: "Memo", v: "memo" as View },
    { icon: <User size={20} />, label: "Profile", v: "profile" as View },
  ]
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center"
      style={{ background: "var(--card)", borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom, 0px)", fontFamily: "var(--font-body)" }}>
      {items.slice(0, 2).map(item => (
        <button key={item.v} onClick={() => setView(item.v)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-all"
          style={{ color: view === item.v ? "var(--primary)" : "var(--muted-foreground)" }}>
          {item.icon}
          <span className="text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
      {/* FAB add button */}
      <div className="flex-shrink-0 px-2">
        <button onClick={onAdd}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <Plus size={22} />
        </button>
      </div>
      {items.slice(2).map(item => (
        <button key={item.v} onClick={() => setView(item.v)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-all"
          style={{ color: view === item.v ? "var(--primary)" : "var(--muted-foreground)" }}>
          {item.icon}
          <span className="text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── ScheduleDetailView ───────────────────────────────────────────────────────
function ScheduleDetailView({ date, events, setEvents, onBack, onAdd, onEdit, onMap }: {
  date: string; events: CalEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalEvent[]>>
  onBack: () => void; onAdd: () => void
  onEdit: (ev: CalEvent) => void; onMap: (ev: CalEvent) => void
}) {
  const holiday = holidays[date]
  const dayEvents = events.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const d = new Date(date + "T12:00:00")
  const label = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 mb-6 text-sm transition-all hover:opacity-70"
          style={{ color: "var(--muted-foreground)" }}>
          <ChevronLeft size={16} /> Back to Calendar
        </button>
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{label}</h1>
            {holiday && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium" style={{ color: "#ef4444" }}>
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                {holiday}
              </div>
            )}
          </div>
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
            <Plus size={15} /> Add Event
          </button>
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <Calendar size={28} style={{ opacity: 0.5 }} />
            </div>
            <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>Nothing scheduled</p>
            <p className="text-sm mb-4">This day is wide open</p>
            <button onClick={onAdd} className="text-sm font-semibold hover:underline" style={{ color: "var(--primary)" }}>
              Add your first event →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(ev => (
              <div key={ev.id} className="rounded-2xl border p-4 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex gap-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{ev.title}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEdit(ev)} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setEvents(p => p.filter(e => e.id !== ev.id))} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      <Clock size={12} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{formatTime(ev.startTime)} – {formatTime(ev.endTime)}</span>
                    </div>
                    {ev.location && (
                      <button onClick={() => onMap(ev)}
                        className="flex items-center gap-1.5 mt-1.5 text-sm font-medium hover:underline"
                        style={{ color: "var(--primary)" }}>
                        <MapPin size={12} /> {ev.location}
                      </button>
                    )}
                    {ev.description && (
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{ev.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TodoPage ─────────────────────────────────────────────────────────────────
function TodoPage({ todos, setTodos, onBack }: {
  todos: Todo[]
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  onBack: () => void
}) {
  const [input, setInput] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "done">("all")
  const todayStr = toDateStr(new Date())

  const add = () => {
    if (!input.trim()) return
    setTodos(p => [...p, { id: uid(), text: input.trim(), completed: false, date: todayStr }])
    setInput("")
  }
  const toggle = (id: string) => setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  const del = (id: string) => setTodos(p => p.filter(t => t.id !== id))

  const filtered = todos.filter(t => {
    if (filter === "active") return !t.completed
    if (filter === "done") return t.completed
    return true
  }).sort((a, b) => Number(a.completed) - Number(b.completed))

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-xl mx-auto px-4 md:px-6 py-6">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-sm transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>All Tasks</h1>
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
            {todos.filter(t => !t.completed).length} remaining
          </span>
        </div>
        {/* Add */}
        <div className="flex gap-2 mb-6">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
            placeholder="What do you need to do?" className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all"
            style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
          <button onClick={add} className="px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
            Add
          </button>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {(["all", "active", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{
                background: filter === f ? "var(--card)" : "transparent",
                color: filter === f ? "var(--foreground)" : "var(--muted-foreground)"
              }}>
              {f}
            </button>
          ))}
        </div>
        {/* List */}
        <div className="space-y-2">
          {filtered.map(todo => (
            <div key={todo.id} className="flex items-center gap-3 p-3.5 rounded-2xl border group transition-all hover:opacity-90"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <button onClick={() => toggle(todo.id)}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: todo.completed ? "var(--primary)" : "var(--border)", background: todo.completed ? "var(--primary)" : "transparent" }}>
                {todo.completed && <Check size={11} style={{ color: "var(--primary-foreground)" }} />}
              </button>
              <span className="flex-1 text-sm" style={{ color: todo.completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: todo.completed ? "line-through" : "none" }}>
                {todo.text}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{todo.date}</span>
              <button onClick={() => del(todo.id)} className="opacity-0 group-hover:opacity-100 transition-all" style={{ color: "var(--muted-foreground)" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>No tasks here</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MemoPage ─────────────────────────────────────────────────────────────────
function MemoPage({ memo, setMemo, onBack }: { memo: string; setMemo: (v: string) => void; onBack: () => void }) {
  const [saved, setSaved] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const onChange = (v: string) => {
    setMemo(v)
    setSaved(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(true), 1200)
  }
  const words = memo.trim() ? memo.trim().split(/\s+/).length : 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>{words} words</span>
            <span className="text-xs font-medium" style={{ color: saved ? "var(--primary)" : "var(--muted-foreground)" }}>
              {saved ? "Saved ✓" : "Saving…"}
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>Quick Memo</h1>
        <textarea value={memo} onChange={e => onChange(e.target.value)}
          placeholder="Start writing your notes…"
          className="flex-1 text-sm leading-relaxed p-4 rounded-2xl border outline-none resize-none transition-all"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", minHeight: "400px" }} />
      </div>
    </div>
  )
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
function ProfilePage({ user, theme, setTheme, onBack, onLogout }: {
  user: AppUser; theme: Theme; setTheme: (t: Theme) => void; onBack: () => void; onLogout: () => void
}) {
  const themeDescs: Record<Theme, { label: string; desc: string; preview: string[] }> = {
    default: { label: "Default", desc: "Clean & modern with soft purple tones", preview: ["#f6f7fb", "#7c6fcd", "#fce7f3"] },
    dark: { label: "Dark", desc: "Easy on the eyes for night sessions", preview: ["#12111f", "#9d8fe8", "#3d2850"] },
    pastel: { label: "Pastel", desc: "Dreamy soft hues for a gentle feel", preview: ["#fdf0ff", "#c4a8e8", "#ffd6f0"] },
  }
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-xl mx-auto px-4 md:px-6 py-6">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-sm transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
          <ChevronLeft size={16} /> Back
        </button>
        {/* Avatar */}
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-display)" }}>
            {user.name[0].toUpperCase()}
          </div>
          <h2 className="mt-3 text-xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{user.name}</h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{user.email}</p>
        </div>

        {/* Theme selector */}
        <div className="rounded-2xl border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="font-bold mb-4" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>Appearance</h3>
          <div className="grid grid-cols-1 gap-3">
            {(Object.entries(themeDescs) as [Theme, typeof themeDescs[Theme]][]).map(([t, info]) => (
              <button key={t} onClick={() => setTheme(t)}
                className="flex items-center gap-4 p-3.5 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: theme === t ? "var(--primary)" : "var(--border)",
                  background: theme === t ? "var(--secondary)" : "var(--muted)"
                }}>
                <div className="flex gap-1 flex-shrink-0">
                  {info.preview.map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border" style={{ background: c, borderColor: "var(--border)" }} />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{info.label}</div>
                  <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{info.desc}</div>
                </div>
                {theme === t && <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                  <Check size={12} style={{ color: "var(--primary-foreground)" }} />
                </div>}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="font-bold mb-3" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>Account</h3>
          <button onClick={onLogout}
            className="flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-70"
            style={{ color: "#ef4444" }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MapPage ──────────────────────────────────────────────────────────────────
function MapPage({ event, onBack }: { event: CalEvent; onBack: () => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return;

    window.kakao.maps.load(() => {

      if (!window.kakao.maps.services) {
        console.log("카카오 places services 로드 안 됨");
        return;
      }
      
      const defaultPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: defaultPosition,
        level: 3,
      });
      
      
      const places = new window.kakao.maps.services.Places();

      places.keywordSearch(event.location || "서울시청", (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const place = result[0];
          const position = new window.kakao.maps.LatLng(place.y, place.x);

          map.setCenter(position);

          const marker = new window.kakao.maps.Marker({
            map,
            position,
          });

          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px;font-size:13px;">${event.location || event.title}</div>`,
          });

          infowindow.open(map, marker);
        }
      });
    });
  }, [event.location]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0" style={{ fontFamily: "var(--font-body)" }}>
      <div className="px-4 md:px-6 py-6 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-4 text-sm cursor-pointer transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: event.color }}>
            <Map size={18} color="white" />
          </div>

          <div>
            <h2 className="font-bold text-lg" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
              {event.title}
            </h2>

            <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <MapPin size={13} style={{ color: "var(--primary)" }} />
              <span>{event.location}</span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <Clock size={12} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mx-4 md:mx-6 mb-4 md:mb-6 rounded-2xl overflow-hidden border min-h-64" style={{ borderColor: "var(--border)" }}>
        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "300px",
          }}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ calMode, setCalMode, calDate, weekStart, events, todos, setTodos, memo, setMemo, onDateClick, onEventClick, onAddOpen, onPrev, onNext }: {
  calMode: CalMode; setCalMode: (m: CalMode) => void; calDate: Date; weekStart: Date
  events: CalEvent[]
  todos: Todo[]; setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  memo: string; setMemo: (v: string) => void
  onDateClick: (ds: string) => void; onEventClick: (ev: CalEvent) => void
  onAddOpen: () => void; onPrev: () => void; onNext: () => void
}) {
  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTHS_FULL[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
    : `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Calendar section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Calendar toolbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)", fontFamily: "var(--font-body)" }}>
          <div className="flex items-center gap-3">
            <button onClick={onPrev} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={onNext} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}>
              <ChevronRight size={16} />
            </button>
            <h2 className="font-bold text-base md:text-lg" style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
              {calMode === "month" ? `${MONTHS_FULL[month]} ${year}` : weekLabel}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile mode toggle */}
            <div className="md:hidden flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: "var(--muted)" }}>
              {(["month", "week"] as CalMode[]).map(m => (
                <button key={m} onClick={() => setCalMode(m)}
                  className="p-1.5 rounded-lg transition-all"
                  title={m.charAt(0).toUpperCase() + m.slice(1)}
                  style={{ background: calMode === m ? "var(--card)" : "transparent", color: calMode === m ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {m === "month" ? <LayoutGrid size={14} /> : <AlignJustify size={14} />}
                </button>
              ))}
            </div>
            <button onClick={onAddOpen}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              <Plus size={14} />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>
        </div>
        {/* Calendar view */}
        {calMode === "month"
          ? <MonthCalendar year={year} month={month} events={events} onDateClick={onDateClick} onEventClick={onEventClick} />
          : <WeekCalendar weekStart={weekStart} events={events} onEventClick={onEventClick} />
        }
      </div>

      {/* Right sidebar – desktop only */}
      <div className="hidden md:flex flex-col w-72 xl:w-80 border-l overflow-y-auto p-4 gap-4 flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <TodoSidebar todos={todos} setTodos={setTodos} />
        <MemoCard memo={memo} setMemo={setMemo} />
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [user, setUser] = useState<AppUser | null>(null)
  const [view, setView] = useState<View>("login")
  const [theme, setTheme] = useState<Theme>("default")
  const [calMode, setCalMode] = useState<CalMode>("month")
  const [calDate, setCalDate] = useState(new Date())
  const weekStart = getWeekStart(calDate)
  const [events, setEvents] = useState<CalEvent[]>(INITIAL_EVENTS)
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS)
  const [memo, setMemo] = useState("")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [mapEvent, setMapEvent] = useState<CalEvent | null>(null)
  const [addForDate, setAddForDate] = useState<string | undefined>()

  // Apply theme vars
  useEffect(() => {
    const vars = THEME_VARS[theme]
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v)
    }
  }, [theme])

  // Font and basic cursor behavior
  useEffect(() => {
    const fontFamily = "'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    document.documentElement.style.setProperty("--font-body", fontFamily)
    document.documentElement.style.setProperty("--font-display", fontFamily)
    document.body.style.fontFamily = fontFamily

    const style = document.createElement("style")
    style.innerHTML = "button, a, [role='button'], input[type='checkbox'], input[type='radio'] { cursor: pointer; } input, textarea { cursor: text; }"
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleAuth = (u: AppUser) => {
    setUser(u)
    setView("dashboard")
  }

  const handleLogout = () => {
    setUser(null)
    setView("login")
  }

  const handleDateClick = (ds: string) => {
    setSelectedDate(ds)
    setView("detail")
  }

  const handleEventClick = (ev: CalEvent) => {
    const dateStr = ev.date
    setSelectedDate(dateStr)
    setView("detail")
  }

  const handleAddOpen = () => {
    setAddForDate(selectedDate ?? undefined)
    setEditingEvent(null)
    setShowAddModal(true)
  }

  const handleEditEvent = (ev: CalEvent) => {
    setEditingEvent(ev)
    setShowAddModal(true)
  }

const handlePrev = () => {
  setCalDate(d => {
    const n = new Date(d)

    if (calMode === "month") {
      n.setMonth(n.getMonth() - 1)
      n.setDate(1)
    } else {
      n.setDate(n.getDate() - 7)
    }

    return n
  })
}

const handleNext = () => {
  setCalDate(d => {
    const n = new Date(d)

    if (calMode === "month") {
      n.setMonth(n.getMonth() + 1)
      n.setDate(1)
    } else {
      n.setDate(n.getDate() + 7)
    }

    return n
  })
}

  if (!user || view === "login" || view === "signup") {
    return (
      <AuthPage mode={authMode} setMode={setAuthMode} onAuth={handleAuth} />
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--background)", fontFamily: "var(--font-body)" }}>
      <Navbar
        theme={theme} setTheme={setTheme}
        calMode={calMode} setCalMode={setCalMode}
        view={view} setView={setView}
        user={user} onLogout={handleLogout}
        onMenuToggle={() => {}}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "dashboard" && (
          <Dashboard
            calMode={calMode} setCalMode={setCalMode} calDate={calDate} weekStart={weekStart}
            events={events} todos={todos} setTodos={setTodos}
            memo={memo} setMemo={setMemo}
            onDateClick={handleDateClick} onEventClick={handleEventClick}
            onAddOpen={handleAddOpen} onPrev={handlePrev} onNext={handleNext}
          />
        )}
        {view === "detail" && selectedDate && (
          <ScheduleDetailView
            date={selectedDate} events={events} setEvents={setEvents}
            onBack={() => setView("dashboard")}
            onAdd={handleAddOpen}
            onEdit={handleEditEvent}
            onMap={ev => { setMapEvent(ev); setView("map") }}
          />
        )}
        {view === "todo" && (
          <TodoPage todos={todos} setTodos={setTodos} onBack={() => setView("dashboard")} />
        )}
        {view === "memo" && (
          <MemoPage memo={memo} setMemo={setMemo} onBack={() => setView("dashboard")} />
        )}
        {view === "profile" && (
          <ProfilePage user={user} theme={theme} setTheme={setTheme}
            onBack={() => setView("dashboard")} onLogout={handleLogout} />
        )}
        {view === "map" && mapEvent && (
          <MapPage event={mapEvent} onBack={() => setView("detail")} />
        )}
      </div>

      {/* Mobile bottom nav */}
      <BottomNav view={view} setView={setView} onAdd={handleAddOpen} />

      {/* Schedule modal */}
      {showAddModal && (
        <ScheduleModal
          event={editingEvent ?? undefined}
          defaultDate={addForDate}
          setEvents={setEvents}
          setTodos={setTodos}
          onClose={() => { setShowAddModal(false); setEditingEvent(null) }}
        />
      )}
    </div>
  )
}

