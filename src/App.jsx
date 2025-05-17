// Main app for the time-blocked to-do list, inspired by agenda.dev
// 4 sections: 10am-2pm, 2-6pm, 6-10pm, 10pm-sleep
// Modern dark UI, React + Tailwind CSS, agenda.dev color palette, interactive cards, and per-task comments
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateTime } from 'luxon';

const TIME_BLOCKS = [
  { label: "10am - 2pm", key: "morning" },
  { label: "2pm - 6pm", key: "afternoon" },
  { label: "6pm - 10pm", key: "evening" },
  { label: "10pm - Sleep", key: "night" },
];
const CARD_GRADIENT = "from-agendaPurple to-agendaAccent";

// Add new constants
const CATEGORIES = {
  WORK: { label: "Work", color: "blue" },
  SCHOOL: { label: "School", color: "purple" },
  PERSONAL: { label: "Personal", color: "green" },
  HEALTH: { label: "Health", color: "red" },
  MARKETING: { label: "Marketing", color: "yellow" },
};

const URGENCY_LEVELS = {
  HIGH: { label: "High", color: "red" },
  MEDIUM: { label: "Medium", color: "yellow" },
  LOW: { label: "Low", color: "green" },
};

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

function getDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatDateLabel(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
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

// Add utility functions at the top
function parseTaskInput(input) {
  const [taskText, dateStr] = input.split(',').map(s => s.trim());
  if (!taskText || !dateStr) return null;

  // Parse date in MMDD or MDD format
  let month, day;
  if (dateStr.length === 3) {
    month = parseInt(dateStr[0]);
    day = parseInt(dateStr.slice(1));
  } else if (dateStr.length === 4) {
    month = parseInt(dateStr.slice(0, 2));
    day = parseInt(dateStr.slice(2));
  } else {
    return null;
  }

  // Validate date
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return {
    taskText,
    date
  };
}

function getTimeBlock(date) {
  const hour = date.getHours();
  if (hour >= 10 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
      {message}
    </div>
  );
}

// Add new components
function TaskCard({ task, onToggle, onDelete, comments, onAddComment, onDeleteComment, showCompleted }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const hasComments = comments && comments[task.id] && comments[task.id].length > 0;
  const isCompleted = !!task.done;
  if (isCompleted && !showCompleted) return null;
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        opacity: isCompleted ? 0.5 : 1,
        filter: isCompleted ? 'grayscale(0.2)' : 'none',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      exit={{ opacity: 0 }}
      className={`group relative rounded-xl p-3 mb-2 transition-all duration-200 hover:shadow-lg hover:shadow-agendaAccent/20 ${URGENCY_COLORS[task.urgency] || ''} ${isCompleted ? 'pointer-events-auto' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              task.urgency === 3 ? 'bg-red-700/30 text-red-300' :
              task.urgency === 2 ? 'bg-purple-700/30 text-purple-300' :
              'bg-blue-700/30 text-blue-300'
            }`} style={{marginRight: 4}}>
              {URGENCY_LABELS[task.urgency]}
            </span>
            {hasComments && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-800 text-white flex items-center gap-1">
                <span role="img" aria-label="comments">💬</span> {comments[task.id].length}
              </span>
            )}
          </div>
          <motion.span
            layout
            initial={false}
            animate={{
              textDecoration: isCompleted ? 'line-through' : 'none',
              opacity: isCompleted ? 0.7 : 1,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="block text-white text-sm"
            style={{
              transition: 'text-decoration-color 0.3s',
              textDecorationColor: isCompleted ? '#aaa' : 'transparent',
            }}
          >
            {task.text}
          </motion.span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">
              {new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 self-center">
          <button
            onClick={() => onToggle(task.id)}
            className="p-1 rounded-full transition-colors text-white focus:outline-none flex items-center justify-center"
            title={task.done ? 'Mark as incomplete' : 'Mark as complete'}
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <AnimatePresence initial={false}>
              <motion.span
                key="check"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="inline-block"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.span>
            </AnimatePresence>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-red-400 rounded-full transition-colors flex items-center justify-center"
            title="Delete task"
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button
            onClick={() => setCommentsOpen(v => !v)}
            className="p-1 text-gray-400 hover:text-agendaAccent rounded-full transition-colors flex items-center justify-center"
            title={commentsOpen ? 'Hide comments' : 'Show comments'}
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {commentsOpen && (
          <TaskComments
            taskId={task.id}
            comments={comments[task.id]}
            onAdd={onAddComment}
            onDelete={onDeleteComment}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CategoryBox({ title, tasks, onToggle, onDelete, comments, onAddComment, onDeleteComment, showCompleted }) {
  const [isOpen, setIsOpen] = useState(true);
  // Only count unfinished tasks for the badge
  const unfinishedCount = tasks.filter(t => !t.done).length;
  return (
    <div className="bg-agendaCardDark/60 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-agendaCardDark/80 hover:bg-agendaCardDark transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium">{title}</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-agendaAccent/30 text-white shadow-sm min-w-[1.5em] text-center" style={{letterSpacing: '0.01em'}}>
            {unfinishedCount}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {tasks.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No tasks</p>
              ) : (
                tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    comments={comments}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    showCompleted={showCompleted}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskSection({ title, tasks, onToggle, onDelete, boxClass, categories, comments, onAddComment, onDeleteComment, showCompleted }) {
  const tasksByCategory = categories.reduce((acc, cat) => {
    acc[cat] = [];
    return acc;
  }, {});
  tasks.forEach(task => {
    const cat = task.category || categories[0];
    if (!tasksByCategory[cat]) tasksByCategory[cat] = [];
    tasksByCategory[cat].push(task);
  });
  return (
    <motion.div
      className={`rounded-xl p-4 ${boxClass}`}
      whileHover={{ boxShadow: "0 0 24px #a855f7" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.h2
        className="text-xl font-semibold text-white mb-4 cursor-pointer"
        whileHover={{ color: "#a855f7", scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {title}
      </motion.h2>
      {categories.map(cat => (
        <CategoryBox
          key={cat}
          title={cat}
          tasks={tasksByCategory[cat] || []}
          onToggle={onToggle}
          onDelete={onDelete}
          comments={comments}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          showCompleted={showCompleted}
        />
      ))}
    </motion.div>
  );
}

// --- Modal Component ---
function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-agendaCardDark rounded-2xl shadow-2xl p-8 w-full max-w-md relative"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-agendaAccent"
              onClick={onClose}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Settings Dropdown (viewport safe) ---
function SettingsDropdown({ isOpen, onClose, categories, onAddCategory, onRemoveCategory }) {
  const [newCat, setNewCat] = useState("");
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed md:absolute right-2 top-14 md:top-12 md:right-2 w-72 bg-agendaCardDark rounded-xl shadow-lg z-50 p-4 border border-gray-800"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{ maxWidth: '90vw' }}
        >
          <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
          <div className="mb-2 flex flex-col gap-1">
            <label className="block text-sm text-gray-300 mb-1">Add Category</label>
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 rounded px-2 py-1 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent min-w-0"
                type="text"
                placeholder="e.g. Fitness"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newCat.trim()) {
                    onAddCategory(newCat.trim());
                    setNewCat("");
                  }
                }}
                style={{ minWidth: 0 }}
              />
              <button
                className="rounded px-3 py-1 bg-agendaAccent text-white font-semibold whitespace-nowrap"
                onClick={() => {
                  if (newCat.trim()) {
                    onAddCategory(newCat.trim());
                    setNewCat("");
                  }
                }}
              >Add</button>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-400">Categories:</span>
            <ul className="mt-1 space-y-1">
              {categories.map(cat => (
                <li key={cat} className="group flex items-center text-sm text-gray-200 justify-between pr-1">
                  <span className="truncate">{cat}</span>
                  <button
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-0.5 rounded"
                    style={{ fontSize: '1rem', lineHeight: 1 }}
                    onClick={() => onRemoveCategory(cat)}
                    tabIndex={-1}
                    aria-label={`Remove ${cat}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Urgency Color Helper ---
const URGENCY_COLORS = {
  3: "border-l-4 border-red-600 bg-gradient-to-r from-red-900/60 to-transparent",
  2: "border-l-4 border-purple-700 bg-gradient-to-r from-purple-900/60 to-transparent",
  1: "border-l-4 border-blue-700 bg-gradient-to-r from-blue-900/60 to-transparent",
};
const URGENCY_LABELS = {
  3: "High",
  2: "Medium",
  1: "Low",
};

// --- Completed Tasks Toggle Icon ---
function CompletedToggle({ showCompleted, onToggle }) {
  return (
    <button
      className="ml-2 p-2 text-agendaGold hover:text-agendaAccent rounded transition-colors"
      onClick={onToggle}
      title={showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
      aria-label={showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
    >
      {showCompleted ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      )}
    </button>
  );
}

// --- Redesigned Task Comments Dropdown ---
function TaskComments({ taskId, comments, onAdd, onDelete }) {
  const [input, setInput] = useState("");
  const handleAdd = () => {
    if (input.trim()) {
      onAdd(taskId, input.trim());
      setInput("");
    }
  };
  return (
    <motion.div
      initial={{ height: 0, opacity: 0, y: -10 }}
      animate={{ height: 'auto', opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, y: -10 }}
      className="overflow-visible mt-2"
    >
      <div className="rounded-2xl bg-[#1c1c1c] border border-gray-800 shadow-lg p-3 mb-2 transition-all duration-200 hover:shadow-agendaAccent/30 hover:border-agendaAccent/40">
        <div className="mb-2 space-y-1 max-h-32 overflow-y-auto pr-1">
          {(!comments || comments.length === 0) ? (
            <div className="text-gray-400 italic text-xs">No comments yet.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1 mb-1">
                <span className="flex-shrink-0 text-agendaAccent">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><circle cx="12" cy="12" r="4" strokeWidth="2" /></svg>
                </span>
                <span className="flex-1 text-xs text-gray-200 text-left">{c.text}</span>
                <button
                  className="ml-2 text-red-400 hover:text-red-600 text-xs"
                  onClick={() => onDelete(taskId, c.id)}
                  title="Delete comment"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><circle cx="12" cy="12" r="4" strokeWidth="2" /></svg>
          </span>
          <input
            className="flex-1 rounded-lg px-3 py-2 bg-[#181818] text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent text-xs placeholder-gray-500 border border-transparent focus:border-agendaAccent transition-all"
            type="text"
            placeholder="Add a comment..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <button
            className="rounded-lg px-3 py-1 bg-agendaAccent hover:bg-agendaGreen text-white font-semibold text-xs"
            onClick={handleAdd}
          >
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    return localStorage.getItem("logged-in") === "true";
  });
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem("current-date");
    if (saved) {
      const date = new Date(saved);
      return date;
    }
    return new Date();
  });
  const [quickInput, setQuickInput] = useState("");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [midnightToast, setMidnightToast] = useState(null);

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

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("tasks-by-date");
    if (saved) return JSON.parse(saved);
    return {};
  });
  const [inputs, setInputs] = useState({});
  const [comments, setComments] = useState(getInitialComments());
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [labels, setLabels] = useState(getInitialLabels());
  const [editingAll, setEditingAll] = useState(false);
  const [labelInputs, setLabelInputs] = useState(labels);
  const [lastReset, setLastReset] = useState(localStorage.getItem("last-reset") || getTodayKey());

  // Save current date to localStorage
  React.useEffect(() => {
    localStorage.setItem("current-date", currentDate.toISOString());
  }, [currentDate]);

  // Save tasks to localStorage
  React.useEffect(() => {
    localStorage.setItem("tasks-by-date", JSON.stringify(tasks));
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

  const navigateDate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getCurrentTasks = () => {
    const dateKey = getDateKey(currentDate);
    if (!tasks[dateKey]) {
      return {
        morning: [],
        afternoon: [],
        evening: [],
        night: [],
      };
    }
    return tasks[dateKey];
  };

  const addTask = (block) => {
    const text = (inputs[block] || "").trim();
    if (!text) return;
    const dateKey = getDateKey(currentDate);
    setTasks((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        }),
        [block]: [
          ...(prev[dateKey]?.[block] || []),
          { text, done: false, id: Date.now() + Math.random() },
        ],
      },
    }));
    setInputs((prev) => ({ ...prev, [block]: "" }));
  };

  const toggleTask = (block, id) => {
    const dateKey = getDateKey(currentDate);
    setTasks((prev) => {
      const updated = { ...prev };
      const items = Array.from(updated[dateKey]?.[block] || []);
      const idx = items.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      // Toggle done
      items[idx] = { ...items[idx], done: !items[idx].done };
      // Move to bottom
      const [task] = items.splice(idx, 1);
      items.push(task);
      updated[dateKey] = {
        ...updated[dateKey],
        [block]: items,
      };
      return updated;
    });
  };

  const deleteTask = (block, id) => {
    const dateKey = getDateKey(currentDate);
    setTasks((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [block]: prev[dateKey]?.[block].filter((t) => t.id !== id),
      },
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

  const addComment = (taskId, text) => {
    setComments((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), { text, id: Date.now() + Math.random() }],
    }));
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

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Dynamic categories
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("categories");
    return saved ? JSON.parse(saved) : ["Work", "School", "Personal"];
  });
  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories));
  }, [categories]);

  // Settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Remove category handler
  const handleRemoveCategory = (cat) => {
    setCategories(prev => prev.filter(c => c !== cat));
  };

  // Modal for task details
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingTask, setPendingTask] = useState(null); // {text, date}
  const [modalCategory, setModalCategory] = useState(categories[0]);
  const [modalUrgency, setModalUrgency] = useState(2);

  // Update quick input to trigger modal
  const handleQuickInput = (e) => {
    if (e.key === 'Enter') {
      const result = parseTaskInput(quickInput);
      if (!result) {
        setErrorMessage("Invalid format. Use: task, MMDD (e.g., 'Finish project, 518')");
        setShowError(true);
        return;
      }
      setPendingTask(result);
      setModalCategory(categories[0]);
      setModalUrgency(2);
      setModalOpen(true);
    }
  };

  // Add new category
  const handleAddCategory = (cat) => {
    if (!categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
    }
  };

  // Handle modal submit
  const handleModalSubmit = () => {
    if (!pendingTask) return;
    const { taskText, date } = pendingTask;
    const dateKey = getDateKey(date);
    setTasks(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        }),
        [getTimeBlock(date)]: [
          ...(prev[dateKey]?.[getTimeBlock(date)] || []),
          {
            text: taskText,
            done: false,
            id: Date.now() + Math.random(),
            category: modalCategory,
            urgency: modalUrgency,
            dueDate: date,
          },
        ],
      },
    }));
    setQuickInput("");
    setModalOpen(false);
    setPendingTask(null);
    setCurrentDate(date);
  };

  const getTasksBySection = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allTasks = Object.entries(tasks).flatMap(([dateKey, dateTasks]) => {
      const taskDate = new Date(dateKey);
      return Object.entries(dateTasks).flatMap(([block, blockTasks]) =>
        blockTasks.map(task => ({
          ...task,
          dueDate: taskDate,
          category: task.category || 'PERSONAL',
          urgency: task.urgency || 'MEDIUM'
        }))
      );
    });

    return {
      overdue: allTasks.filter(task => task.dueDate < today),
      today: allTasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < tomorrow;
      }),
      upcoming: allTasks.filter(task => task.dueDate >= tomorrow)
    };
  };

  const handleTaskToggle = (taskId) => {
    setTasks(prev => {
      const updated = { ...prev };
      Object.entries(updated).forEach(([dateKey, dateTasks]) => {
        Object.entries(dateTasks).forEach(([block, blockTasks]) => {
          const taskIndex = blockTasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            updated[dateKey][block][taskIndex] = {
              ...blockTasks[taskIndex],
              done: !blockTasks[taskIndex].done
            };
          }
        });
      });
      return updated;
    });
  };

  const handleTaskDelete = (taskId) => {
    setTasks(prev => {
      const updated = { ...prev };
      Object.entries(updated).forEach(([dateKey, dateTasks]) => {
        Object.entries(dateTasks).forEach(([block, blockTasks]) => {
          updated[dateKey][block] = blockTasks.filter(t => t.id !== taskId);
        });
      });
      return updated;
    });
  };

  // Helper: get Mountain Time date string (YYYY-MM-DD)
  function getMountainDateString(dt = DateTime.now().setZone('America/Denver')) {
    return dt.toFormat('yyyy-MM-dd');
  }

  // Helper: get Mountain Time start of today
  function getMountainToday() {
    return DateTime.now().setZone('America/Denver').startOf('day');
  }

  // Midnight check and task update logic
  useEffect(() => {
    let lastDate = getMountainDateString();

    function updateTasksForMidnight() {
      const now = DateTime.now().setZone('America/Denver');
      const todayStr = now.toFormat('yyyy-MM-dd');
      const yesterdayStr = now.minus({ days: 1 }).toFormat('yyyy-MM-dd');
      let updated = false;
      setTasks(prev => {
        let newTasks = { ...prev };
        // Move unfinished tasks from yesterday to today as overdue
        if (prev[yesterdayStr]) {
          Object.keys(prev[yesterdayStr]).forEach(block => {
            prev[yesterdayStr][block].forEach(task => {
              if (!task.done) {
                // Move to today as overdue (or keep in overdue section)
                const overdueDateKey = 'overdue';
                if (!newTasks[overdueDateKey]) newTasks[overdueDateKey] = {};
                if (!newTasks[overdueDateKey][block]) newTasks[overdueDateKey][block] = [];
                newTasks[overdueDateKey][block].push({ ...task, dueDate: now.minus({ days: 1 }).toJSDate() });
                updated = true;
              }
            });
          });
        }
        // Remove unfinished tasks from yesterday
        if (prev[yesterdayStr]) {
          newTasks[yesterdayStr] = { ...prev[yesterdayStr] };
          Object.keys(newTasks[yesterdayStr]).forEach(block => {
            newTasks[yesterdayStr][block] = newTasks[yesterdayStr][block].filter(task => task.done);
          });
        }
        // No need to move tasks for today, as they are already in today
        return newTasks;
      });
      if (updated) {
        setMidnightToast(`Tasks updated for ${todayStr}`);
        setTimeout(() => setMidnightToast(null), 3500);
      }
    }

    // Check every minute
    const interval = setInterval(() => {
      const currentDate = getMountainDateString();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        updateTasksForMidnight();
      }
    }, 60000);

    // On mount, check if we need to update (e.g., after reload)
    updateTasksForMidnight();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center py-8 relative">
      {/* Settings and Completed Toggle */}
      <div className="absolute top-6 right-8 z-20 flex items-center">
        <CompletedToggle showCompleted={showCompleted} onToggle={() => setShowCompleted(v => !v)} />
        <button
          className="p-2 text-agendaGold hover:text-agendaAccent rounded transition-colors"
          onClick={() => setSettingsOpen(v => !v)}
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.287.07 2.573-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <SettingsDropdown
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
        />
      </div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">get shit done</h1>
        <MountainTimeClock />
      </div>
      <div className="w-full max-w-2xl px-4 mb-8">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickInput}
            placeholder="Type a task and date (e.g., 'Finish project, 518')"
            className="w-full px-4 py-4 bg-agendaCardDark/80 backdrop-blur-sm rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-agendaAccent transition-all duration-200 shadow-lg text-base"
            style={{ minHeight: '3.1rem', maxHeight: '3.1rem' }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
            Press Enter
          </div>
        </div>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-xl font-bold text-white mb-4">Add Task Details</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Category</label>
          <select
            className="w-full rounded px-3 py-2 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-agendaAccent"
            value={modalCategory}
            onChange={e => setModalCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-1">Urgency</label>
          <div className="flex gap-3">
            {[3,2,1].map(level => (
              <button
                key={level}
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors border-2 focus:outline-none ${modalUrgency===level ? 'border-agendaAccent bg-agendaAccent/10' : 'border-gray-700 bg-gray-900'} ${URGENCY_COLORS[level]}`}
                onClick={() => setModalUrgency(level)}
                title={URGENCY_LABELS[level]}
              >
                {URGENCY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
        <button
          className="w-full rounded-lg px-4 py-2 bg-agendaAccent hover:bg-agendaPurple text-white font-semibold transition-colors"
          onClick={handleModalSubmit}
        >
          Add Task
        </button>
      </Modal>
      {showError && (
        <Toast
          message={errorMessage}
          onClose={() => setShowError(false)}
        />
      )}
      {midnightToast && (
        <Toast
          message={midnightToast}
          onClose={() => setMidnightToast(null)}
        />
      )}
      <div className="w-full max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <TaskSection
          title="Overdue"
          tasks={getTasksBySection().overdue}
          onToggle={handleTaskToggle}
          onDelete={handleTaskDelete}
          boxClass="bg-[#121212] shadow-[0_2px_16px_#00000044] hover:shadow-agendaAccent/20 transition-all duration-200"
          categories={categories}
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          showCompleted={showCompleted}
        />
        <TaskSection
          title="Today"
          tasks={getTasksBySection().today}
          onToggle={handleTaskToggle}
          onDelete={handleTaskDelete}
          boxClass="bg-[#121212] shadow-[0_2px_16px_#00000044] hover:shadow-agendaAccent/20 transition-all duration-200"
          categories={categories}
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          showCompleted={showCompleted}
        />
        <TaskSection
          title="Upcoming"
          tasks={getTasksBySection().upcoming}
          onToggle={handleTaskToggle}
          onDelete={handleTaskDelete}
          boxClass="bg-[#121212] shadow-[0_2px_16px_#00000044] hover:shadow-agendaAccent/20 transition-all duration-200"
          categories={categories}
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          showCompleted={showCompleted}
        />
      </div>
      <footer className="mt-12 text-gray-400 text-sm">fajar <button className="ml-4 text-agendaAccent underline" onClick={handleLogout}>Logout</button></footer>
    </div>
  );
}

// Add these styles to your CSS
const styles = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-in-out {
  animation: fadeInOut 3s ease-in-out forwards;
}
`; 