import { useState, useEffect, useRef, useCallback } from "react";

// -- Design tokens
const PALETTE = [
  { bg:"#FFF3E0", text:"#BF360C", accent:"#FF6D00", border:"#FFAB40", light:"#FFF8F0" },
  { bg:"#E3F2FD", text:"#0D47A1", accent:"#1976D2", border:"#64B5F6", light:"#EEF6FF" },
  { bg:"#F3E5F5", text:"#4A148C", accent:"#7B1FA2", border:"#BA68C8", light:"#F9F1FC" },
  { bg:"#E8F5E9", text:"#1B5E20", accent:"#2E7D32", border:"#66BB6A", light:"#EDF7EE" },
  { bg:"#FCE4EC", text:"#880E4F", accent:"#C2185B", border:"#F48FB1", light:"#FEF0F5" },
  { bg:"#E0F7FA", text:"#006064", accent:"#00838F", border:"#4DD0E1", light:"#EBF9FA" },
  { bg:"#FFF8E1", text:"#E65100", accent:"#F57C00", border:"#FFD54F", light:"#FFFBF0" },
];
const AVATARS = ["🐯","🦊","🐼","🦋","🐬","🦁","🐸","🦄","🐧","🐨","🦀","🦉","🦕","🐙","🦚"];
const TASK_ICONS = ["🧹","🍽️","🗑️","🧺","🛒","🐕","🌿","🚿","🪣","🧼","🍳","📚","🛏️","🧽","🪟","🚗","💊","📬","🔧","🌸"];
const RECURRENCE = [
  {value:"daily", label:"יומי", short:"יום"},
  {value:"weekly", label:"שבועי", short:"שבוע"},
  {value:"biweekly", label:"דו-שבועי", short:"2 שבועות"},
  {value:"monthly", label:"חודשי", short:"חודש"},
  {value:"once", label:"חד פעמי", short:"פעם"},
];

// -- Utils
const isTaskDue = (task, completions) => {
  const c = completions[task.id];
  if (!c) return true;
  const diff = Math.floor((Date.now() - new Date(c.date)) / 86400000);
  if (task.recurrence === "daily") return diff >= 1;
  if (task.recurrence === "weekly") return diff >= 7;
  if (task.recurrence === "biweekly") return diff >= 14;
  if (task.recurrence === "monthly") return diff >= 30;
  return false;
};

const fmtDate = iso => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// -- Confetti
function Confetti({ active, onDone }) {
  const ref = useRef();

  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 10,
      vy: -8 - Math.random() * 8,
      size: 6 + Math.random() * 8,
      color: ["#FF6D00","#FFD54F","#7B1FA2","#2E7D32","#1976D2","#C2185B","#00838F"][Math.floor(Math.random() * 7)],
      rot: Math.random() * 360,
      rspeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rot += p.rspeed;
        p.vx *= 0.99;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (alive) raf = requestAnimationFrame(draw);
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, onDone]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
        zIndex: 2000
      }}
    />
  );
}

// -- Modal
function Modal({ title, onClose, children, accent = "#FF6D00" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        backdropFilter: "blur(3px)"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 420,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 16px 60px rgba(0,0,0,0.22)",
          animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)"
        }}
      >
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: `linear-gradient(135deg,${accent}12,transparent)`
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#222" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "#F0F0F0",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666"
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// -- Badge
const Badge = ({ bg, color, children, style = {} }) => (
  <span
    style={{
      background: bg,
      color,
      borderRadius: 20,
      fontSize: 11,
      padding: "3px 10px",
      fontWeight: 700,
      ...style
    }}
  >
    {children}
  </span>
);

// -- Ring
function Ring({ pct, size = 56, stroke = 5, color = "#FF6D00" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [activeMember, setActiveMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState({});
  const [config, setConfig] = useState({ adminPassword: "1234" });
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState(null);

  const [adminTab, setAdminTab] = useState("members");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const [mName, setMName] = useState("");
  const [mColor, setMColor] = useState(0);
  const [mAvatar, setMAvatar] = useState(0);
  const [editMId, setEditMId] = useState(null);

  const [tName, setTName] = useState("");
  const [tIcon, setTIcon] = useState(0);
  const [tRec, setTRec] = useState("weekly");
  const [tNote, setTNote] = useState("");
  const [editTId, setEditTId] = useState(null);
  const [tSearch, setTSearch] = useState("");

  const [newPw, setNewPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  const [completing, setCompleting] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [doneNote, setDoneNote] = useState("");
  const [photoModal, setPhotoModal] = useState(null);
  const fileRef = useRef();

  // טעינה מ-localStorage
  useEffect(() => {
    try {
      const m = localStorage.getItem("fc:members");
      if (m) setMembers(JSON.parse(m));

      const t = localStorage.getItem("fc:tasks");
      if (t) setTasks(JSON.parse(t));

      const c = localStorage.getItem("fc:config");
      if (c) setConfig(JSON.parse(c));

      const cp = localStorage.getItem("fc:completions");
      if (cp) setCompletions(JSON.parse(cp));
    } catch (e) {
      console.error("Failed to load local data", e);
    }
    setLoading(false);
  }, []);

  // שמירה ל-localStorage
  const saveM = useCallback(async (l) => {
    setMembers(l);
    try {
      localStorage.setItem("fc:members", JSON.stringify(l));
    } catch (e) {
      console.error("Failed to save members", e);
    }
  }, []);

  const saveT = useCallback(async (l) => {
    setTasks(l);
    try {
      localStorage.setItem("fc:tasks", JSON.stringify(l));
    } catch (e) {
      console.error("Failed to save tasks", e);
    }
  }, []);

  const saveC = useCallback(async (c) => {
    setConfig(c);
    try {
      localStorage.setItem("fc:config", JSON.stringify(c));
    } catch (e) {
      console.error("Failed to save config", e);
    }
  }, []);

  const saveCP = useCallback(async (cp) => {
    setCompletions(cp);
    try {
      localStorage.setItem("fc:completions", JSON.stringify(cp));
    } catch (e) {
      console.error("Failed to save completions", e);
    }
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const resetMForm = () => {
    setMName("");
    setMColor(0);
    setMAvatar(0);
    setEditMId(null);
  };

  const resetTForm = () => {
    setTName("");
    setTIcon(0);
    setTRec("weekly");
    setTNote("");
    setEditTId(null);
  };

  const addMember = () => {
    if (!mName.trim()) return;
    if (editMId) {
      saveM(members.map(m => m.id === editMId ? { ...m, name: mName.trim(), colorIdx: mColor, avatarIdx: mAvatar } : m));
    } else {
      saveM([...members, { id: Date.now(), name: mName.trim(), colorIdx: mColor, avatarIdx: mAvatar }]);
    }
    resetMForm();
    showToast(editMId ? "בן משפחה עודכן" : "בן משפחה נוסף 🎉");
  };

  const delMember = id => {
    saveM(members.filter(m => m.id !== id));
    saveT(tasks.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== id) })));
    if (editMId === id) resetMForm();
    showToast("בן משפחה נמחק", "info");
  };

  const addTask = () => {
    if (!tName.trim()) return;
    const existing = editTId ? tasks.find(t => t.id === editTId) : null;
    const task = {
      id: editTId || Date.now(),
      name: tName.trim(),
      iconIdx: tIcon,
      recurrence: tRec,
      note: tNote.trim(),
      assignees: existing?.assignees || [],
      createdAt: existing?.createdAt || Date.now(),
    };
    if (editTId) saveT(tasks.map(t => t.id === editTId ? task : t));
    else saveT([...tasks, task]);
    resetTForm();
    showToast(editTId ? "מטלה עודכנה" : "מטלה נוספה ✓");
  };

  const delTask = id => {
    saveT(tasks.filter(t => t.id !== id));
    if (editTId === id) resetTForm();
    showToast("מטלה נמחקה", "info");
  };

  const toggleAssign = (taskId, memberId) => {
    saveT(tasks.map(t => {
      if (t.id !== taskId) return t;
      const a = t.assignees.includes(memberId)
        ? t.assignees.filter(x => x !== memberId)
        : [...t.assignees, memberId];
      return { ...t, assignees: a };
    }));
  };

  const confirmDone = async () => {
    if (!completing) return;

    const updated = {
      ...completions,
      [completing.id]: {
        date: new Date().toISOString(),
        memberId: activeMember?.id,
        memberName: activeMember?.name,
        photo: photoData || null,
        note: doneNote.trim(),
      }
    };

    await saveCP(updated);
    const completedTask = completing;
    setCompleting(null);
    setPhotoData(null);
    setDoneNote("");

    const myTasks = tasks.filter(t => t.assignees.includes(activeMember?.id));
    const stillPending = myTasks.filter(t => t.id !== completedTask.id && isTaskDue(t, updated));

    if (stillPending.length === 0 && myTasks.length > 0) {
      setConfetti(true);
      showToast("🌟 כל הכבוד! סיימת הכל!");
    } else {
      showToast(`✅ ${completedTask.name} סומן כבוצע!`);
    }
  };

  const undoDone = taskId => {
    const updated = { ...completions };
    delete updated[taskId];
    saveCP(updated);
    showToast("↩ ביצוע בוטל", "info");
  };

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoData(ev.target.result);
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:320,fontFamily:"'Segoe UI',Arial,sans-serif",direction:"rtl",flexDirection:"column",gap:16}}>
        <div style={{fontSize:40,animation:"spin 1s linear infinite"}}>🏠</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes popIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
        <div style={{color:"#aaa",fontSize:15}}>טוען...</div>
      </div>
    );
  }

  if (view === "home") {
    return (
      <div style={{direction:"rtl",fontFamily:"'Segoe UI',Arial,sans-serif",minHeight:500,background:"#FFFBF7",paddingBottom:48}}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}} @keyframes toastIn{from{opacity:0;transform:translateX(50%)}to{opacity:1;transform:translateX(0)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>

        <div style={{background:"linear-gradient(135deg,#FF6D00 0%,#FF8F00 100%)",padding:"32px 28px 28px",borderRadius:"0 0 36px 36px",color:"#fff",boxShadow:"0 6px 28px rgba(255,109,0,0.32)"}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.5px",lineHeight:1.1}}>🏠 מטלות הבית</div>
          <div style={{fontSize:13,opacity:0.85,marginTop:6,display:"flex",gap:12}}>
            <span>👨‍👩‍👧‍👦 {members.length} בני משפחה</span>
            <span>📋 {tasks.length} מטלות</span>
            <span>✅ {Object.keys(completions).length} בוצעו</span>
          </div>
        </div>

        <div style={{padding:"26px 18px 0"}}>
          <div style={{fontSize:12,color:"#bbb",textAlign:"center",marginBottom:18,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>
            מי אתה?
          </div>
          {members.length === 0 ? (
            <div style={{textAlign:"center",padding:"52px 24px",background:"#fff",borderRadius:24,border:"2px dashed #FFD0A0",animation:"fadeIn 0.4s ease"}}>
              <div style={{fontSize:56}}>🏡</div>
              <div style={{fontSize:19,fontWeight:800,color:"#555",marginTop:14}}>עדיין אין בני משפחה</div>
              <div style={{fontSize:14,color:"#aaa",marginTop:6}}>המנהל צריך להוסיף בני משפחה קודם</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {members.map((m, i) => {
                const col = PALETTE[m.colorIdx % PALETTE.length];
                const myT = tasks.filter(t => t.assignees.includes(m.id));
                const pend = myT.filter(t => isTaskDue(t, completions)).length;
                const done = myT.filter(t => !isTaskDue(t, completions)).length;
                const pct = myT.length === 0 ? 0 : Math.round(done / myT.length * 100);

                return (
                  <div
                    key={m.id}
                    onClick={() => { setActiveMember(m); setView("member"); }}
                    style={{background:"#fff",border:`2px solid ${col.border}`,borderRadius:24,padding:"22px 16px 18px",cursor:"pointer",textAlign:"center",boxShadow:"0 4px 18px rgba(0,0,0,0.07)",transition:"all 0.18s",animation:`popIn 0.3s ${i * 0.06}s both`,position:"relative",overflow:"hidden"}}
                  >
                    <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${col.light} 0%,transparent 60%)`,pointerEvents:"none"}} />
                    {pct === 100 && myT.length > 0 && <div style={{position:"absolute",top:10,left:10,fontSize:16}}>⭐</div>}
                    <div style={{fontSize:50,marginBottom:6}}>{AVATARS[m.avatarIdx % AVATARS.length]}</div>
                    <div style={{fontSize:17,fontWeight:800,color:col.text,marginBottom:10}}>{m.name}</div>
                    {myT.length > 0 ? (
                      <>
                        <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                          <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                            <Ring pct={pct} size={48} stroke={4} color={col.accent} />
                            <div style={{position:"absolute",fontSize:11,fontWeight:800,color:col.text}}>{pct}%</div>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"center",gap:5,flexWrap:"wrap"}}>
                          {pend > 0 && <Badge bg="#FF6D00" color="#fff">{pend} ממתינות</Badge>}
                          {done > 0 && <Badge bg="#2E7D32" color="#fff">✓ {done}</Badge>}
                        </div>
                      </>
                    ) : (
                      <Badge bg="#F0F0F0" color="#aaa">אין מטלות</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:34}}>
          <button
            onClick={() => { setView("admin-login"); setPwInput(""); setPwError(false); }}
            style={{background:"none",border:"1.5px solid #E0E0E0",borderRadius:20,padding:"9px 24px",fontSize:13,color:"#aaa",cursor:"pointer"}}
          >
            🔐 כניסת מנהל
          </button>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  if (view === "member" && activeMember) {
    const col = PALETTE[activeMember.colorIdx % PALETTE.length];
    const myTasks = tasks.filter(t => t.assignees.includes(activeMember.id));
    const pending = myTasks.filter(t => isTaskDue(t, completions));
    const done = myTasks.filter(t => !isTaskDue(t, completions));
    const pct = myTasks.length === 0 ? 0 : Math.round(done.length / myTasks.length * 100);
    const allDone = myTasks.length > 0 && pending.length === 0;

    return (
      <div style={{direction:"rtl",fontFamily:"'Segoe UI',Arial,sans-serif",minHeight:500,background:"#F7F8FA",paddingBottom:48}}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}} @keyframes toastIn{from{opacity:0;transform:translateX(50%)}to{opacity:1;transform:translateX(0)}} @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(46,125,50,0.3)}50%{box-shadow:0 0 0 10px rgba(46,125,50,0)}}`}</style>

        <div style={{background:`linear-gradient(135deg,${col.accent} 0%,${col.border} 100%)`,padding:"22px 20px 18px",borderRadius:"0 0 30px 30px",color:"#fff",boxShadow:`0 6px 24px ${col.accent}44`}}>
          <button onClick={() => setView("home")} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"5px 13px",color:"#fff",fontSize:13,cursor:"pointer",marginBottom:14,fontWeight:700}}>
            ← חזרה
          </button>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.22)",border:"3px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>
              {AVATARS[activeMember.avatarIdx % AVATARS.length]}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:24,fontWeight:900,lineHeight:1.1}}>שלום, {activeMember.name}! 👋</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:4}}>
                {pending.length} ממתינות • {done.length} בוצעו
              </div>
            </div>
            <div style={{textAlign:"center",position:"relative"}}>
              <Ring pct={pct} size={56} stroke={5} color="rgba(255,255,255,0.9)" />
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>
                {pct}%
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"18px 16px 0"}}>
          {allDone && (
            <div style={{background:"linear-gradient(135deg,#E8F5E9,#F1F8E9)",borderRadius:20,padding:"20px",textAlign:"center",marginBottom:18,border:"2px solid #A5D6A7",animation:"glow 2s infinite"}}>
              <div style={{fontSize:44}}>🌟</div>
              <div style={{fontSize:19,fontWeight:900,color:"#1B5E20",marginTop:8}}>כל הכבוד!</div>
              <div style={{fontSize:14,color:"#2E7D32",marginTop:4}}>סיימת את כל המטלות שלך!</div>
            </div>
          )}

          {pending.length > 0 && (
            <>
              <SectionHeader label="לביצוע" count={pending.length} color="#FF6D00" bg="#FFF3E0" />
              {pending.map((t, i) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  completion={null}
                  col={col}
                  idx={i}
                  onComplete={() => {
                    setCompleting(t);
                    setPhotoData(null);
                    setDoneNote("");
                  }}
                />
              ))}
            </>
          )}

          {done.length > 0 && (
            <>
              <SectionHeader label="בוצע" count={done.length} color="#2E7D32" bg="#E8F5E9" icon="✓" style={{marginTop: pending.length > 0 ? 20 : 0}} />
              {done.map((t, i) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  completion={completions[t.id]}
                  col={col}
                  idx={i}
                  done
                  onUndo={() => undoDone(t.id)}
                  onPhoto={completions[t.id]?.photo ? () => setPhotoModal({ src: completions[t.id].photo, taskName: t.name }) : null}
                />
              ))}
            </>
          )}

          {myTasks.length === 0 && (
            <div style={{textAlign:"center",padding:"60px 24px",background:"#fff",borderRadius:24,border:"2px dashed #E0E0E0",animation:"fadeIn 0.4s ease"}}>
              <div style={{fontSize:52}}>🎯</div>
              <div style={{fontSize:17,fontWeight:800,color:"#999",marginTop:12}}>לא שויכו אליך מטלות עדיין</div>
            </div>
          )}
        </div>

        {completing && (
          <Modal title={`✅ ${completing.name}`} onClose={() => { setCompleting(null); setPhotoData(null); setDoneNote(""); }} accent={col.accent}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{width:72,height:72,borderRadius:20,background:col.bg,border:`2.5px solid ${col.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 10px"}}>
                {TASK_ICONS[completing.iconIdx % TASK_ICONS.length]}
              </div>
              {completing.note && <div style={{fontSize:13,color:"#999",marginTop:4,fontStyle:"italic"}}>📝 {completing.note}</div>}
            </div>
            <textarea
              value={doneNote}
              onChange={e => setDoneNote(e.target.value)}
              placeholder="הוסף הערה קצרה (אופציונלי)..."
              rows={2}
              style={{width:"100%",padding:"10px 14px",borderRadius:12,border:"1.5px solid #E0E0E0",fontSize:14,boxSizing:"border-box",marginBottom:14,outline:"none",fontFamily:"inherit",resize:"none",background:"#FAFAFA"}}
            />
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto} />
            {!photoData ? (
              <button onClick={() => fileRef.current.click()} style={{width:"100%",padding:"12px",borderRadius:14,border:"2px dashed #E0E0E0",background:"#FAFAFA",color:"#999",fontSize:14,cursor:"pointer",marginBottom:14}}>
                📷 צרף תמונה כהוכחה (אופציונלי)
              </button>
            ) : (
              <div style={{marginBottom:14,position:"relative",borderRadius:14,overflow:"hidden"}}>
                <img src={photoData} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}} />
                <button onClick={() => setPhotoData(null)} style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ✕
                </button>
                <div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:11,padding:"3px 8px",borderRadius:8}}>
                  ✓ תמונה מוכנה
                </div>
              </div>
            )}
            <button onClick={confirmDone} style={{width:"100%",padding:"14px",borderRadius:14,background:`linear-gradient(135deg,${col.accent},${col.border})`,color:"#fff",border:"none",fontSize:17,fontWeight:900,cursor:"pointer",boxShadow:`0 6px 20px ${col.accent}55`}}>
              ✅ בוצע! סמן כגמור
            </button>
          </Modal>
        )}

        {photoModal && (
          <Modal title={`📷 ${photoModal.taskName}`} onClose={() => setPhotoModal(null)}>
            <img src={photoModal.src} alt="" style={{width:"100%",borderRadius:14,objectFit:"contain",maxHeight:420}} />
          </Modal>
        )}
        {confetti && <Confetti active={confetti} onDone={() => setConfetti(false)} />}
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  if (view === "admin-login") {
    return (
      <div style={{direction:"rtl",fontFamily:"'Segoe UI',Arial,sans-serif",minHeight:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#FFF8F2 0%,#FFF0FA 100%)",padding:32}}>
        <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{background:"#fff",borderRadius:26,padding:"40px 30px",width:"100%",maxWidth:360,boxShadow:"0 6px 36px rgba(0,0,0,0.1)",textAlign:"center",animation:"popIn 0.25s ease"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#FFF3E0",border:"3px solid #FFB74D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}>
            🔐
          </div>
          <div style={{fontSize:22,fontWeight:900,color:"#222",marginBottom:4}}>כניסת מנהל</div>
          <div style={{fontSize:14,color:"#aaa",marginBottom:24}}>הכנס את סיסמת המנהל</div>
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (pwInput === config.adminPassword) {
                  setView("admin");
                  setPwInput("");
                } else setPwError(true);
              }
            }}
            placeholder="••••••"
            style={{width:"100%",padding:"13px 16px",borderRadius:14,border:pwError ? "2.5px solid #E53935" : "1.5px solid #E0E0E0",fontSize:20,textAlign:"center",letterSpacing:6,boxSizing:"border-box",outline:"none",marginBottom:pwError ? 6 : 14}}
          />
          {pwError && (
            <div style={{color:"#E53935",fontSize:13,marginBottom:10,animation:"popIn 0.2s ease",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              ❌ סיסמה שגויה, נסה שוב
            </div>
          )}
          <button
            onClick={() => {
              if (pwInput === config.adminPassword) {
                setView("admin");
                setPwInput("");
              } else setPwError(true);
            }}
            style={{width:"100%",padding:"13px 0",borderRadius:14,background:"linear-gradient(135deg,#FF6D00,#FF8F00)",color:"#fff",border:"none",fontSize:16,fontWeight:800,cursor:"pointer",marginBottom:12,boxShadow:"0 4px 16px rgba(255,109,0,0.3)"}}
          >
            כניסה
          </button>
          <button onClick={() => setView("home")} style={{background:"none",border:"none",color:"#bbb",fontSize:14,cursor:"pointer"}}>
            ← חזרה
          </button>
          <div style={{marginTop:16,fontSize:11,color:"#ddd"}}>ברירת מחדל: 1234</div>
        </div>
      </div>
    );
  }

  if (view === "admin") {
    const filtered = tasks.filter(t => t.name.toLowerCase().includes(tSearch.toLowerCase()));
    const TABS = [
      { id: "members", label: "👨‍👩‍👧‍👦", full: "בני משפחה" },
      { id: "tasks", label: "📋", full: "מטלות" },
      { id: "assign", label: "🔗", full: "שיוך" },
      { id: "progress", label: "📊", full: "התקדמות" },
      { id: "settings", label: "⚙️", full: "הגדרות" },
    ];

    return (
      <div style={{direction:"rtl",fontFamily:"'Segoe UI',Arial,sans-serif",minHeight:500,background:"#F4F5F7"}}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes popIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}} @keyframes toastIn{from{opacity:0;transform:translateX(50%)}to{opacity:1;transform:translateX(0)}}`}</style>

        <div style={{background:"#1A1A2E",padding:"20px 20px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.3px"}}>⚙️ ממשק מנהל</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>מטלות הבית — {members.length} בני משפחה, {tasks.length} מטלות</div>
          </div>
          <button onClick={() => setView("home")} style={{background:"rgba(255,109,0,0.15)",border:"1px solid rgba(255,109,0,0.3)",borderRadius:12,padding:"7px 14px",color:"#FF8F00",fontSize:13,cursor:"pointer",fontWeight:700}}>
            ← יציאה
          </button>
        </div>

        <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #eee",padding:"0 8px",overflowX:"auto"}}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setAdminTab(tab.id); resetTForm(); }}
              style={{padding:"12px 12px",border:"none",background:"none",fontSize:13,fontWeight:adminTab === tab.id ? 800 : 400,color:adminTab === tab.id ? "#FF6D00" : "#888",borderBottom:adminTab === tab.id ? "2.5px solid #FF6D00" : "2.5px solid transparent",cursor:"pointer",marginBottom:"-1px",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}
            >
              <span style={{fontSize:16}}>{tab.label}</span>
              <span style={{display:adminTab === tab.id ? "inline" : "none"}}>{tab.full}</span>
            </button>
          ))}
        </div>

        <div style={{animation:"fadeIn 0.2s ease"}}>
          {adminTab === "members" && (
            <div style={{padding:18}}>
              <AdminCard title={editMId ? "✏️ עריכת בן משפחה" : "➕ הוספת בן משפחה"}>
                <input value={mName} onChange={e => setMName(e.target.value)} placeholder="שם בן/בת המשפחה..." style={inputStyle} />
                <PickerLabel>אווטאר:</PickerLabel>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
                  {AVATARS.map((a, i) => (
                    <EmojiBtn key={i} selected={mAvatar === i} onClick={() => setMAvatar(i)}>{a}</EmojiBtn>
                  ))}
                </div>
                <PickerLabel>צבע:</PickerLabel>
                <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:18}}>
                  {PALETTE.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setMColor(i)}
                      style={{width:32,height:32,borderRadius:"50%",background:c.accent,border:mColor === i ? "3px solid #222" : "2.5px solid transparent",cursor:"pointer"}}
                    />
                  ))}
                </div>
                {mName.trim() && (
                  <div style={{display:"flex",alignItems:"center",gap:10,background:"#F8F9FA",borderRadius:12,padding:"10px 14px",marginBottom:14}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:PALETTE[mColor].bg,border:`2.5px solid ${PALETTE[mColor].border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                      {AVATARS[mAvatar]}
                    </div>
                    <div style={{fontWeight:700,color:PALETTE[mColor].text,fontSize:15}}>{mName.trim()}</div>
                  </div>
                )}
                <div style={{display:"flex",gap:10}}>
                  <ActionBtn primary disabled={!mName.trim()} onClick={addMember}>{editMId ? "💾 שמור" : "➕ הוסף"}</ActionBtn>
                  {editMId && <ActionBtn onClick={resetMForm}>ביטול</ActionBtn>}
                </div>
              </AdminCard>

              {members.length === 0 ? (
                <EmptyState>לא נוספו בני משפחה עדיין</EmptyState>
              ) : members.map(m => {
                const col = PALETTE[m.colorIdx % PALETTE.length];
                const cnt = tasks.filter(t => t.assignees.includes(m.id)).length;
                return (
                  <div key={m.id} style={{background:"#fff",borderRadius:16,border:"1px solid #eee",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <div style={{width:48,height:48,borderRadius:"50%",background:col.bg,border:`3px solid ${col.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
                      {AVATARS[m.avatarIdx % AVATARS.length]}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:16,color:"#222"}}>{m.name}</div>
                      <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{cnt} מטלות משויכות</div>
                    </div>
                    <IconBtn bg="#EEF4FF" color="#1565C0" onClick={() => { setEditMId(m.id); setMName(m.name); setMColor(m.colorIdx); setMAvatar(m.avatarIdx); }}>✏️</IconBtn>
                    <IconBtn bg="#FFEBEE" color="#B71C1C" onClick={() => delMember(m.id)}>🗑️</IconBtn>
                  </div>
                );
              })}
            </div>
          )}

          {adminTab === "tasks" && (
            <div style={{padding:18}}>
              <AdminCard title={editTId ? "✏️ עריכת מטלה" : "➕ הוספת מטלה"}>
                <input value={tName} onChange={e => setTName(e.target.value)} placeholder="שם המטלה..." style={inputStyle} />
                <PickerLabel>אייקון:</PickerLabel>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
                  {TASK_ICONS.map((ic, i) => (
                    <EmojiBtn key={i} selected={tIcon === i} onClick={() => setTIcon(i)}>{ic}</EmojiBtn>
                  ))}
                </div>
                <PickerLabel>תדירות:</PickerLabel>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                  {RECURRENCE.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setTRec(r.value)}
                      style={{padding:"7px 14px",borderRadius:20,fontSize:13,cursor:"pointer",border:tRec === r.value ? "2px solid #FF6D00" : "1.5px solid #E0E0E0",background:tRec === r.value ? "#FFF3E0" : "#FAFAFA",color:tRec === r.value ? "#E65100" : "#666",fontWeight:tRec === r.value ? 700 : 400}}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <textarea value={tNote} onChange={e => setTNote(e.target.value)} placeholder="הערה / הוראות (אופציונלי)..." rows={2} style={{...inputStyle,resize:"none",fontFamily:"inherit"}} />
                <div style={{display:"flex",gap:10}}>
                  <ActionBtn primary disabled={!tName.trim()} onClick={addTask}>{editTId ? "💾 שמור" : "➕ הוסף"}</ActionBtn>
                  {editTId && <ActionBtn onClick={resetTForm}>ביטול</ActionBtn>}
                </div>
              </AdminCard>

              {tasks.length > 1 && (
                <input value={tSearch} onChange={e => setTSearch(e.target.value)} placeholder="🔍 חיפוש מטלה..." style={{...inputStyle,marginBottom:14}} />
              )}
              {filtered.length === 0 ? (
                <EmptyState>{tasks.length === 0 ? "לא נוספו מטלות עדיין" : "לא נמצאו תוצאות"}</EmptyState>
              ) : filtered.map(t => {
                const assigned = members.filter(m => t.assignees.includes(m.id));
                const rec = RECURRENCE.find(r => r.value === t.recurrence)?.label || "";
                return (
                  <div key={t.id} style={{background:"#fff",borderRadius:16,border:"1px solid #eee",padding:"14px 16px",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:12,background:"#F5F5F5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                        {TASK_ICONS[t.iconIdx % TASK_ICONS.length]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:15,color:"#222"}}>{t.name}</div>
                        <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{rec}{t.note ? ` • ${t.note}` : ""}</div>
                        {assigned.length > 0 && (
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
                            {assigned.map(m => {
                              const c = PALETTE[m.colorIdx % PALETTE.length];
                              return (
                                <span key={m.id} style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,borderRadius:20,fontSize:11,padding:"2px 9px",fontWeight:600}}>
                                  {AVATARS[m.avatarIdx % AVATARS.length]} {m.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <IconBtn bg="#EEF4FF" color="#1565C0" onClick={() => { setEditTId(t.id); setTName(t.name); setTIcon(t.iconIdx); setTRec(t.recurrence); setTNote(t.note || ""); }}>✏️</IconBtn>
                        <IconBtn bg="#FFEBEE" color="#B71C1C" onClick={() => delTask(t.id)}>🗑️</IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {adminTab === "assign" && (
            <div style={{padding:18}}>
              <div style={{fontSize:13,color:"#888",marginBottom:14,background:"#FFF8F0",borderRadius:12,padding:"10px 14px",border:"1px solid #FFD0A0"}}>
                💡 לחץ על שם בן משפחה כדי לשייך / לבטל שיוך למטלה
              </div>
              {tasks.length === 0 ? (
                <EmptyState>אין מטלות עדיין — הוסף קודם בטאב "מטלות"</EmptyState>
              ) : tasks.map(t => (
                <div key={t.id} style={{background:"#fff",borderRadius:16,border:"1px solid #eee",padding:16,marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <span style={{fontSize:26}}>{TASK_ICONS[t.iconIdx % TASK_ICONS.length]}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:"#222"}}>{t.name}</div>
                      <div style={{fontSize:12,color:"#aaa"}}>{RECURRENCE.find(r => r.value === t.recurrence)?.label}</div>
                    </div>
                  </div>
                  {members.length === 0 ? (
                    <div style={{fontSize:13,color:"#ccc"}}>אין בני משפחה</div>
                  ) : (
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {members.map(m => {
                        const col = PALETTE[m.colorIdx % PALETTE.length];
                        const on = t.assignees.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleAssign(t.id, m.id)}
                            style={{padding:"8px 15px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,background:on ? col.bg : "#F5F5F5",border:on ? `2px solid ${col.border}` : "2px solid #E8E8E8",color:on ? col.text : "#bbb"}}
                          >
                            {AVATARS[m.avatarIdx % AVATARS.length]} {m.name}{on ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {adminTab === "progress" && (
            <div style={{padding:18}}>
              {members.length === 0 ? (
                <EmptyState>אין בני משפחה עדיין</EmptyState>
              ) : (
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
                    {[
                      {label:"בוצעו",value:Object.keys(completions).length,icon:"✅",color:"#2E7D32"},
                      {label:"ממתינות",value:tasks.filter(t => isTaskDue(t, completions)).length,icon:"⏳",color:"#E65100"},
                      {label:"עם תמונה",value:Object.values(completions).filter(c => c.photo).length,icon:"📷",color:"#1565C0"},
                    ].map(s => (
                      <div key={s.label} style={{background:"#fff",borderRadius:14,padding:"12px 10px",textAlign:"center",border:"1px solid #eee"}}>
                        <div style={{fontSize:22}}>{s.icon}</div>
                        <div style={{fontSize:22,fontWeight:900,color:s.color,marginTop:4}}>{s.value}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {members.map(m => {
                    const col = PALETTE[m.colorIdx % PALETTE.length];
                    const myT = tasks.filter(t => t.assignees.includes(m.id));
                    const done = myT.filter(t => !isTaskDue(t, completions));
                    const pct = myT.length === 0 ? 0 : Math.round(done.length / myT.length * 100);

                    return (
                      <div key={m.id} style={{background:"#fff",borderRadius:18,border:"1px solid #eee",padding:18,marginBottom:14}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                          <div style={{width:48,height:48,borderRadius:"50%",background:col.bg,border:`3px solid ${col.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
                            {AVATARS[m.avatarIdx % AVATARS.length]}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:16,color:"#222"}}>{m.name}</div>
                            <div style={{fontSize:12,color:"#aaa"}}>{done.length}/{myT.length} מטלות בוצעו</div>
                          </div>
                          <div style={{position:"relative",display:"inline-flex"}}>
                            <Ring pct={pct} size={52} stroke={5} color={pct === 100 ? "#2E7D32" : col.accent} />
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:pct === 100 ? "#2E7D32" : col.text}}>
                              {pct}%
                            </div>
                          </div>
                        </div>

                        {myT.length > 0 && myT.map(t => {
                          const comp = completions[t.id];
                          const isDone = !isTaskDue(t, completions);
                          return (
                            <div key={t.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:12,marginBottom:6,background:isDone ? "#F0FFF0" : "#FFF8F0",border:`1px solid ${isDone ? "#A5D6A7" : "#FFCC80"}`}}>
                              <span style={{fontSize:18,flexShrink:0}}>{TASK_ICONS[t.iconIdx % TASK_ICONS.length]}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{t.name}</div>
                                {comp && <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{fmtDate(comp.date)}{comp.note ? ` · "${comp.note}"` : ""}</div>}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                                {comp?.photo && (
                                  <button onClick={() => setPhotoModal({ src: comp.photo, taskName: t.name })} style={{background:"#E3F2FD",border:"none",borderRadius:8,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"#1565C0",fontWeight:600}}>
                                    📷
                                  </button>
                                )}
                                <span style={{fontSize:16}}>{isDone ? "✅" : "⏳"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {adminTab === "settings" && (
            <div style={{padding:18}}>
              <AdminCard title="🔒 שינוי סיסמת מנהל">
                <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwSaved(false); }} placeholder="סיסמה חדשה" style={inputStyle} />
                <ActionBtn
                  primary
                  onClick={async () => {
                    if (!newPw.trim()) return;
                    await saveC({ ...config, adminPassword: newPw.trim() });
                    setNewPw("");
                    setPwSaved(true);
                    showToast("🔒 סיסמה עודכנה!");
                  }}
                >
                  עדכן סיסמה
                </ActionBtn>
                {pwSaved && <div style={{color:"#2E7D32",fontSize:14,textAlign:"center",marginTop:10,fontWeight:600}}>✅ הסיסמה עודכנה!</div>}
              </AdminCard>
            </div>
          )}
        </div>

        {photoModal && (
          <Modal title={`📷 ${photoModal.taskName}`} onClose={() => setPhotoModal(null)}>
            <img src={photoModal.src} alt="" style={{width:"100%",borderRadius:14,objectFit:"contain",maxHeight:420}} />
          </Modal>
        )}
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  return null;
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1.5px solid #E8E8E8",
  fontSize: 15,
  boxSizing: "border-box",
  marginBottom: 14,
  outline: "none",
  background: "#FAFAFA",
  color: "#222",
  caretColor: "#222",
  fontFamily: "inherit",
};

const PickerLabel = ({ children }) => (
  <div style={{fontSize:12,color:"#aaa",fontWeight:700,marginBottom:8,letterSpacing:"0.3px"}}>
    {children}
  </div>
);

const EmojiBtn = ({ children, selected, onClick }) => (
  <button
    onClick={onClick}
    style={{width:38,height:38,borderRadius:10,border:selected ? "2.5px solid #FF6D00" : "1.5px solid #E8E8E8",background:selected ? "#FFF3E0" : "#FAFAFA",fontSize:20,cursor:"pointer",transform:selected ? "scale(1.1)" : "scale(1)"}}
  >
    {children}
  </button>
);

const ActionBtn = ({ children, onClick, primary, disabled }) => (
  <button
    onClick={!disabled ? onClick : undefined}
    style={{flex:primary ? 1 : undefined,padding:"12px 18px",borderRadius:12,background:primary ? (!disabled ? "linear-gradient(135deg,#FF6D00,#FF8F00)" : "#E0E0E0") : "#F0F0F0",color:primary ? (!disabled ? "#fff" : "#aaa") : "#555",border:"none",fontSize:14,fontWeight:700,cursor:disabled ? "not-allowed" : "pointer"}}
  >
    {children}
  </button>
);

const IconBtn = ({ children, bg, color, onClick }) => (
  <button onClick={onClick} style={{background:bg,border:"none",borderRadius:10,padding:"7px 11px",color,fontSize:14,cursor:"pointer",fontWeight:600}}>
    {children}
  </button>
);

const AdminCard = ({ title, children }) => (
  <div style={{background:"#fff",borderRadius:18,padding:18,border:"1px solid #eee",marginBottom:18}}>
    <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:16}}>{title}</div>
    {children}
  </div>
);

const EmptyState = ({ children }) => (
  <div style={{textAlign:"center",color:"#ccc",padding:"40px 0",fontSize:15,fontWeight:600}}>
    {children}
  </div>
);

const SectionHeader = ({ label, count, color, icon = "", style = {} }) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,...style}}>
    <span style={{background:color,color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>
      {icon} {label}
    </span>
    <span style={{fontSize:12,color:"#ccc",fontWeight:600}}>{count} מטלות</span>
  </div>
);

function TaskCard({ task, completion, col, idx, done, onComplete, onUndo, onPhoto }) {
  const rec = RECURRENCE.find(r => r.value === task.recurrence)?.label || "";
  return (
    <div style={{background:"#fff",borderRadius:18,border:`1.5px solid ${done ? "#A5D6A7" : col.border}`,padding:"15px 16px",marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",animation:`popIn 0.2s ${idx * 0.05}s both`,opacity:done ? 0.85 : 1}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:52,height:52,borderRadius:14,background:done ? "#E8F5E9" : col.bg,border:`2px solid ${done ? "#A5D6A7" : col.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>
          {TASK_ICONS[task.iconIdx % TASK_ICONS.length]}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:15,color:"#222",textDecoration:done ? "line-through" : "none",opacity:done ? 0.6 : 1}}>
            {task.name}
          </div>
          <div style={{fontSize:11,color:"#bbb",marginTop:3,display:"flex",alignItems:"center",gap:6}}>
            <span style={{background:"#F5F5F5",borderRadius:8,padding:"1px 6px",fontWeight:600}}>{rec}</span>
            {task.note && <span style={{color:"#ccc"}}>• {task.note}</span>}
          </div>
          {done && completion && (
            <div style={{fontSize:11,color:"#2E7D32",marginTop:5,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
              <span>✓</span>
              <span>{fmtDate(completion.date)}</span>
              {completion.note && <span style={{color:"#aaa",fontWeight:400}}>• {completion.note}</span>}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
          {!done && onComplete && (
            <button onClick={onComplete} style={{background:`linear-gradient(135deg,${col.accent},${col.border})`,color:"#fff",border:"none",borderRadius:12,padding:"10px 16px",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              ✅ סיימתי
            </button>
          )}
          {done && onUndo && (
            <button onClick={onUndo} style={{background:"#F5F5F5",color:"#bbb",border:"1px solid #E8E8E8",borderRadius:10,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>
              ↩ בטל
            </button>
          )}
          {done && onPhoto && (
            <button onClick={onPhoto} style={{background:"#E3F2FD",color:"#1565C0",border:"none",borderRadius:10,padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>
              📷
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type = "success" }) {
  const bg = type === "success" ? "#1B5E20" : type === "info" ? "#1565C0" : "#B71C1C";
  return (
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:bg,color:"#fff",padding:"12px 22px",borderRadius:20,fontSize:14,fontWeight:700,zIndex:3000,whiteSpace:"nowrap",boxShadow:"0 6px 24px rgba(0,0,0,0.2)",animation:"toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
      {msg}
    </div>
  );
}