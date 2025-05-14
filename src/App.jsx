// Main app for the time-blocked to-do list, inspired by agenda.dev
// 4 sections: 10am-2pm, 2-6pm, 6-10pm, 10pm-sleep
// Modern dark UI, React + Tailwind CSS, agenda.dev color palette, interactive cards, and per-task comments
import React, { useState, useEffect } from "react";

const TIME_BLOCKS = [
  { label: "10am - 2pm", key: "morning" },
  { label: "2pm - 6pm", key: "afternoon" },
  { label: "6pm - 10pm", key: "evening" },
  { label: "10pm - Sleep", key: "night" },
];
const CARD_GRADIENT = "from-agendaPurple to-agendaAccent";

function getInitialTasks() {
  const saved = localStorage.getItem("tasks-by-block");
  if (saved) return JSON.parse(saved);
  return {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };
}

function getInitialComments() {
  const saved = localStorage.getItem("comments-by-task");
  if (saved) return JSON.parse(saved);
  return {};
}

function getInitialLabels() {
  const saved = localStorage.getItem("block-labels");
  if (saved) return JSON.parse(saved);
  return {
    morning: "10am - 2pm",
    afternoon: "2pm - 6pm",
    evening: "6pm - 10pm",
    night: "10pm - Sleep",
  };
}

function getTodayKey() {
  const d = new Date();
  // Convert to Mountain Time
  const mountainTime = new Date(d.toLocaleString("en-US", { timeZone: "America/Denver" }));
  return `${mountainTime.getFullYear()}-${mountainTime.getMonth() + 1}-${mountainTime.getDate()}`;
}

function MountainTimeClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mountainTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" }));
      setTime(mountainTime.toLocaleTimeString("en-US", { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: "America/Denver"
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-agendaGold text-sm font-mono">
      {time}
    </div>
  );
}

function RecurringBadge() {
  return (
    <span
      title="Recurring daily"
      className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 border border-yellow-300 text-xs font-semibold text-yellow-700 shadow-sm animate-fadein"
      style={{ verticalAlign: 'middle' }}
    >
      <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 17.657A9 9 0 1 1 12 21a9 9 0 0 1-6.365-3.343" />
      </svg>
      daily
    </span>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    return localStorage.getItem("logged-in") === "true";
  });
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUser === "fajar" && loginPass === "fajar") {
      setLoggedIn(true);
      localStorage.setItem("logged-in", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };
  const handleLogout = () => {
    setLoggedIn(false);
    localStorage.removeItem("logged-in");
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <form
          className="bg-agendaCardDark p-8 rounded-2xl shadow-lg flex flex-col gap-4 w-80"
          onSubmit={handleLogin}
        >
          <h2 className="text-2xl font-bold text-center text-white mb-2">Login</h2>
          <input
            className="rounded px-3 py-2 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent"
            type="text"
            placeholder="Username"
            value={loginUser}
            onChange={e => setLoginUser(e.target.value)}
            autoFocus
          />
          <input
            className="rounded px-3 py-2 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent"
            type="password"
            placeholder="Password"
            value={loginPass}
            onChange={e => setLoginPass(e.target.value)}
          />
          {loginError && <div className="text-red-400 text-sm text-center">{loginError}</div>}
          <button
            className="rounded px-4 py-2 bg-agendaAccent hover:bg-agendaPurple text-white font-semibold transition-colors mt-2"
            type="submit"
          >
            Log In
          </button>
        </form>
      </div>
    );
  }

  const [tasks, setTasks] = useState(getInitialTasks());
  const [inputs, setInputs] = useState({});
  const [comments, setComments] = useState(getInitialComments());
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [labels, setLabels] = useState(getInitialLabels());
  const [editingAll, setEditingAll] = useState(false);
  const [labelInputs, setLabelInputs] = useState(labels);
  const [lastReset, setLastReset] = useState(localStorage.getItem("last-reset") || getTodayKey());

  React.useEffect(() => {
    localStorage.setItem("tasks-by-block", JSON.stringify(tasks));
  }, [tasks]);
  React.useEffect(() => {
    localStorage.setItem("comments-by-task", JSON.stringify(comments));
  }, [comments]);
  React.useEffect(() => {
    localStorage.setItem("block-labels", JSON.stringify(labels));
  }, [labels]);

  // On app load, reset recurring tasks if the day has changed
  React.useEffect(() => {
    const today = getTodayKey();
    if (lastReset !== today) {
      setTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((block) => {
          updated[block] = updated[block].map((t) =>
            t.recurring ? { ...t, done: false } : t
          );
        });
        return updated;
      });
      setLastReset(today);
      localStorage.setItem("last-reset", today);
    }
  }, [lastReset]);

  const handleInput = (block, value) => {
    setInputs((prev) => ({ ...prev, [block]: value }));
  };

  const addTask = (block) => {
    const text = (inputs[block] || "").trim();
    if (!text) return;
    setTasks((prev) => ({
      ...prev,
      [block]: [
        ...prev[block],
        { text, done: false, id: Date.now() + Math.random() },
      ],
    }));
    setInputs((prev) => ({ ...prev, [block]: "" }));
  };

  const toggleTask = (block, id) => {
    setTasks((prev) => {
      const updated = { ...prev };
      const items = Array.from(updated[block]);
      const idx = items.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      // Toggle done
      items[idx] = { ...items[idx], done: !items[idx].done };
      // Move to bottom
      const [task] = items.splice(idx, 1);
      items.push(task);
      updated[block] = items;
      return updated;
    });
  };

  const deleteTask = (block, id) => {
    setTasks((prev) => ({
      ...prev,
      [block]: prev[block].filter((t) => t.id !== id),
    }));
    setComments((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Comments logic
  const toggleComments = (taskId) => {
    setOpenComments((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCommentInput = (taskId, value) => {
    setCommentInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const addComment = (taskId) => {
    const text = (commentInputs[taskId] || "").trim();
    if (!text) return;
    setComments((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), { text, id: Date.now() + Math.random() }],
    }));
    setCommentInputs((prev) => ({ ...prev, [taskId]: "" }));
    // Recurring logic via comments
    if (text === '!repeat') {
      setTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((block) => {
          updated[block] = updated[block].map((t) =>
            t.id === taskId ? { ...t, recurring: true } : t
          );
        });
        return updated;
      });
    } else if (text === '!end') {
      setTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((block) => {
          updated[block] = updated[block].map((t) =>
            t.id === taskId ? { ...t, recurring: false } : t
          );
        });
        return updated;
      });
    }
  };

  const deleteComment = (taskId, commentId) => {
    setComments((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter((c) => c.id !== commentId),
    }));
  };

  const handleLabelInput = (key, value) => {
    setLabelInputs((prev) => ({ ...prev, [key]: value }));
  };
  const saveAllLabels = () => {
    setLabels((prev) => {
      const updated = { ...prev };
      Object.keys(labelInputs).forEach((key) => {
        updated[key] = labelInputs[key].trim() || prev[key];
      });
      return updated;
    });
    setEditingAll(false);
  };

  const handleEditButton = () => {
    if (editingAll) {
      saveAllLabels();
    } else {
      setEditingAll(true);
    }
  };

  const moveTask = (block, idx, direction) => {
    setTasks((prev) => {
      const updated = { ...prev };
      const items = Array.from(updated[block]);
      if (direction === 'up' && idx > 0) {
        [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
      } else if (direction === 'down' && idx < items.length - 1) {
        [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
      }
      updated[block] = items;
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center py-8 relative">
      <button
        className="absolute top-6 right-8 p-2 text-agendaGold hover:text-agendaAccent rounded transition-colors z-10"
        onClick={handleEditButton}
        title={editingAll ? 'Finish editing headers' : 'Edit headers'}
      >
        {editingAll ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1-7V7a1 1 0 1 1 2 0v4a1 1 0 0 1-2 0Zm1 4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M17.414 2.586a2 2 0 0 0-2.828 0l-9.5 9.5A2 2 0 0 0 4 13.414V16a1 1 0 0 0 1 1h2.586a2 2 0 0 0 1.414-.586l9.5-9.5a2 2 0 0 0 0-2.828l-2-2ZM15 4l1 1-2 2-1-1 2-2Zm-3 3l1 1-7 7H5v-1l7-7Z" />
          </svg>
        )}
      </button>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">get shit done</h1>
        <MountainTimeClock />
      </div>
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {TIME_BLOCKS.map(({ label, key }) => (
          <section
            key={key}
            className={`rounded-2xl shadow-agenda p-6 flex flex-col transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-b ${CARD_GRADIENT}`}
          >
            <div className="flex items-center mb-4">
              {editingAll ? (
                <input
                  className="text-xl font-semibold w-fit px-2 py-1 rounded bg-black/60 text-white focus:outline-none focus:ring-2 focus:ring-agendaGold"
                  value={labelInputs[key]}
                  autoFocus={editingAll}
                  onChange={e => handleLabelInput(key, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveAllLabels(); }}
                />
              ) : (
                <h2 className="text-xl font-semibold w-fit">
                  <span className="text-white">{labels[key]}</span>
                </h2>
              )}
            </div>
            <div className="flex mb-4 items-center gap-2">
              <input
                className="flex-1 rounded-l-xl px-3 py-2 bg-agendaCardDark text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent"
                type="text"
                placeholder="Add a task..."
                value={inputs[key] || ""}
                onChange={(e) => handleInput(key, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask(key)}
              />
              <button
                className="rounded-r-xl px-4 py-2 bg-agendaAccent hover:bg-agendaPurple text-white font-semibold transition-colors"
                onClick={() => addTask(key)}
              >
                Add
              </button>
            </div>
            <ul className="space-y-3 flex-1">
              {tasks[key].length === 0 && (
                <li className="text-gray-300 italic">No tasks yet.</li>
              )}
              {tasks[key].map((task, idx) => (
                <li
                  key={task.id}
                  className={`group relative bg-agendaCard/80 rounded-xl px-4 py-3 flex flex-col shadow-md transition-all duration-200 hover:shadow-xl hover:bg-agendaCard/90 ${
                    task.done ? "opacity-60 line-through" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex-1 cursor-pointer select-none text-lg"
                      onClick={() => toggleTask(key, task.id)}
                    >
                      {task.text}
                      {task.recurring && <RecurringBadge />}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        className="p-1 text-xs text-gray-400 hover:text-agendaGold rounded disabled:opacity-30"
                        onClick={() => moveTask(key, idx, 'up')}
                        disabled={idx === 0}
                        title="Move up"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5-5 5 5"/></svg>
                      </button>
                      <button
                        className="p-1 text-xs text-gray-400 hover:text-agendaGold rounded disabled:opacity-30"
                        onClick={() => moveTask(key, idx, 'down')}
                        disabled={idx === tasks[key].length - 1}
                        title="Move down"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5"/></svg>
                      </button>
                      <button
                        className="text-agendaAccent hover:text-agendaGreen transition-colors"
                        onClick={() => toggleComments(task.id)}
                        title="Show comments"
                      >
                        <svg className={`w-5 h-5 transform transition-transform ${openComments[task.id] ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button
                        className="text-red-400 hover:text-red-600 transition-colors"
                        onClick={() => deleteTask(key, task.id)}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  {/* Comments dropdown */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${openComments[task.id] ? "max-h-60 mt-3" : "max-h-0"}`}
                  >
                    <div className="bg-agendaCardDark rounded-xl p-3 mt-1">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          className="flex-1 rounded-l-lg px-2 py-1 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent"
                          type="text"
                          placeholder="comments...(!repeat, !end)"
                          value={commentInputs[task.id] || ""}
                          onChange={(e) => handleCommentInput(task.id, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addComment(task.id)}
                        />
                        <button
                          className="rounded-r-lg px-3 py-1 bg-agendaAccent hover:bg-agendaGreen text-white font-semibold transition-colors"
                          onClick={() => addComment(task.id)}
                        >
                          Add
                        </button>
                      </div>
                      <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {(comments[task.id] || []).length === 0 && (
                          <li className="text-gray-400 italic">No comments yet.</li>
                        )}
                        {(comments[task.id] || []).map((c) => (
                          <li key={c.id} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                            <span className="flex-1 text-sm">{c.text}</span>
                            <button
                              className="ml-2 text-red-400 hover:text-red-600 text-xs"
                              onClick={() => deleteComment(task.id, c.id)}
                              title="Delete comment"
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="mt-12 text-gray-400 text-sm">fajar <button className="ml-4 text-agendaAccent underline" onClick={handleLogout}>Logout</button></footer>
    </div>
  );
} 