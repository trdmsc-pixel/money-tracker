import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  PiggyBank,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Download,
  Upload,
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Share2,
  CreditCard,
  ShieldCheck,
  Moon,
  Sun,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  ShoppingBag,
  Utensils,
  Fuel,
  Receipt,
  Cpu,
  User,
  Heart,
  Plane,
  Activity,
  MoreHorizontal,
  MessageSquare,
  Bell,
  Smartphone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { parseSMS, parseBulkSMS } from './smsParser.js';

// ============================================================================
// STORAGE LAYER & POLYFILL
// Ensures window.storage works in Claude Artifacts (native) and standalone/local browsers
// ============================================================================
if (typeof window !== 'undefined' && !window.storage) {
  const _memoryStore = new Map();
  window.storage = {
    get: async (key) => {
      if (_memoryStore.has(key)) return _memoryStore.get(key);
      try {
        if (typeof window.localStorage !== 'undefined') {
          const item = window.localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        }
      } catch (e) {
        console.warn('Storage fallback get error:', e);
      }
      return _memoryStore.get(key) || null;
    },
    set: async (key, value) => {
      _memoryStore.set(key, value);
      try {
        if (typeof window.localStorage !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (e) {
        console.warn('Storage fallback set error:', e);
      }
      return value;
    },
    delete: async (key) => {
      _memoryStore.delete(key);
      try {
        if (typeof window.localStorage !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('Storage fallback delete error:', e);
      }
      return true;
    },
    list: async (prefix) => {
      const keys = new Set(_memoryStore.keys());
      try {
        if (typeof window.localStorage !== 'undefined') {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k) keys.add(k);
          }
        }
      } catch (e) {
        console.warn('Storage fallback list error:', e);
      }
      const arr = Array.from(keys);
      return prefix ? arr.filter((k) => k && k.startsWith(prefix)) : arr;
    },
  };
}

// Storage keys
const STORAGE_KEY_CORE = 'ledger:core';
const STORAGE_KEY_TX = 'ledger:tx';

// ============================================================================
// INDIAN CURRENCY FORMATTER & HELPERS
// Formats: ₹1,04,150, ₹6,00,000, ₹54,488
// ============================================================================
export function formatINR(amount, showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const s = abs.toString();
  let lastThree = s.substring(s.length - 3);
  const otherNumbers = s.substring(0, s.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (isNegative ? '-' : '') + (showSymbol ? '₹' : '') + res;
}

export function formatUSD(amount, showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '$0' : '0';
  }
  return (showSymbol ? '$' : '') + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Icon mapper for categories
const CATEGORY_ICONS = {
  Utensils: Utensils,
  Fuel: Fuel,
  ShoppingBag: ShoppingBag,
  Receipt: Receipt,
  Cpu: Cpu,
  RotateCw: RefreshCw,
  User: User,
  Heart: Heart,
  Plane: Plane,
  Activity: Activity,
  Briefcase: Briefcase,
  MoreHorizontal: MoreHorizontal,
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#F59E0B', cap: null },
  { id: 'cat-fuel', name: 'Fuel', icon: 'Fuel', color: '#EF4444', cap: null },
  { id: 'cat-groceries', name: 'Groceries', icon: 'ShoppingBag', color: '#10B981', cap: null },
  { id: 'cat-bills', name: 'Bills', icon: 'Receipt', color: '#6366F1', cap: null },
  { id: 'cat-aitools', name: 'AI tools', icon: 'Cpu', color: '#8B5CF6', cap: null },
  { id: 'cat-subs', name: 'Subscriptions', icon: 'RotateCw', color: '#EC4899', cap: null },
  { id: 'cat-personal', name: 'Personal', icon: 'User', color: '#3B82F6', cap: null },
  { id: 'cat-family', name: 'Family', icon: 'Heart', color: '#F43F5E', cap: null },
  { id: 'cat-travel', name: 'Travel', icon: 'Plane', color: '#14B8A6', cap: null },
  { id: 'cat-health', name: 'Health', icon: 'Activity', color: '#06B6D4', cap: null },
  { id: 'cat-biz', name: 'Business', icon: 'Briefcase', color: '#EAB308', cap: null },
  { id: 'cat-other', name: 'Other', icon: 'MoreHorizontal', color: '#94A3B8', cap: null },
];

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeString = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================================
// REUSABLE GLASS CARD COMPONENT
// ============================================================================
function GlassCard({
  children,
  className = '',
  rimVariant = 'default', // 'default' | 'lime' | 'gold' | 'rose' | 'none'
  onClick,
  style = {},
  theme = 'dark',
}) {
  const isDark = theme === 'dark';

  let rimGradient = isDark
    ? 'linear-gradient(135deg, rgba(255,255,255,0.42), rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 70%)'
    : 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.3) 50%, rgba(255,255,255,0))';

  if (rimVariant === 'lime') {
    rimGradient = 'linear-gradient(135deg, rgba(184,241,53,0.85), rgba(184,241,53,0.2) 50%, transparent 80%)';
  } else if (rimVariant === 'gold') {
    rimGradient = 'linear-gradient(135deg, rgba(245,197,66,0.9), rgba(245,197,66,0.25) 50%, transparent 80%)';
  } else if (rimVariant === 'rose') {
    rimGradient = 'linear-gradient(135deg, rgba(255,107,138,0.9), rgba(255,107,138,0.25) 50%, transparent 80%)';
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        borderRadius: '28px',
        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 12px 36px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid transparent',
        backgroundClip: 'padding-box',
        ...style,
      }}
      className={`glass-card transition-all duration-200 ${className}`}
    >
      {/* Specular Rim Light */}
      {rimVariant !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            background: rimGradient,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Internal highlight bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'radial-gradient(60% 50% at 20% 12%, rgba(255,255,255,0.10), transparent 70%)'
            : 'radial-gradient(60% 50% at 20% 12%, rgba(255,255,255,0.50), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}

// ============================================================================
// HAND-BUILT SVG 220° ARC GAUGE
// ============================================================================
function ArcGauge({ percentage = 0, current = 0, target = 0, isOverLimit = false, theme = 'dark' }) {
  const radius = 70;
  const strokeWidth = 14;
  const cx = 90;
  const cy = 90;

  const startAngle = 160;
  const totalAngle = 220;
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  const polarToCartesian = (centerX, centerY, rad, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + rad * Math.cos(angleInRadians),
      y: centerY + rad * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, rad, startAng, endAng) => {
    const start = polarToCartesian(x, y, rad, endAng);
    const end = polarToCartesian(x, y, rad, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', rad, rad, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArc = describeArc(cx, cy, radius, startAngle, startAngle + totalAngle);
  const activeArcEnd = startAngle + (totalAngle * clampedPercent) / 100;
  const activeArc = clampedPercent > 0 ? describeArc(cx, cy, radius, startAngle, activeArcEnd) : '';

  const needleAngle = startAngle + (totalAngle * clampedPercent) / 100;
  const needleTip = polarToCartesian(cx, cy, radius - 18, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 14, needleAngle + 90);
  const needleBase2 = polarToCartesian(cx, cy, 14, needleAngle - 90);

  const arcColor = isOverLimit ? '#FF6B8A' : percentage > 80 ? '#F5C542' : '#B8F135';

  return (
    <div className="relative flex items-center justify-between">
      <div className="relative w-[180px] h-[140px] flex-shrink-0">
        <svg width="180" height="140" viewBox="0 0 180 140" className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B8F135" />
              <stop offset="70%" stopColor="#F5C542" />
              <stop offset="100%" stopColor="#FF6B8A" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={arcColor} floodOpacity="0.4" />
            </filter>
          </defs>

          <path
            d={backgroundArc}
            fill="none"
            stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {clampedPercent > 0 && (
            <path
              d={activeArc}
              fill="none"
              stroke={isOverLimit ? '#FF6B8A' : 'url(#gaugeGradient)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter="url(#glow)"
              className="transition-all duration-700 ease-out"
            />
          )}

          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
            fill={theme === 'dark' ? '#F4F6FB' : '#12141C'}
            opacity="0.9"
          />
          <circle cx={cx} cy={cy} r="5" fill={theme === 'dark' ? '#F4F6FB' : '#12141C'} />
        </svg>
      </div>

      <div className="flex flex-col items-end justify-center pl-2">
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-bold tracking-tight metallic-numeral"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {Math.round(percentage)}%
          </span>
        </div>
        <span className="text-xs text-[#7E8699] font-medium tracking-wide mt-1">
          {target > 0 ? `${formatINR(current)} / ${formatINR(target)} cap` : 'No monthly cap set'}
        </span>
        {isOverLimit && (
          <span className="text-[11px] text-[#FF6B8A] font-medium flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> Over cap by {formatINR(current - target)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HAND-BUILT CIRCULAR PROGRESS RING FOR POTS
// ============================================================================
function PotProgressRing({ percentage = 0, size = 52, stroke = 5, color = '#F5C542' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold metallic-numeral">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT — LEDGER
// ============================================================================
export default function Ledger() {
  // App state
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pots, setPots] = useState([]);
  const [fds, setFds] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [debts, setDebts] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'dark',
    salary: 0,
    salaryDay: 1,
    currencyRate: 86.5,
    categories: DEFAULT_CATEGORIES,
    onboarded: false,
    studioName: 'Chaitravarna Studio',
    reminderEnabled: false,
    reminderTime: '21:30',
  });

  // SMS Ingestion & Approval Inbox state
  const [pendingSMS, setPendingSMS] = useState([]);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsInputText, setSmsInputText] = useState('');
  const [editingPendingItem, setEditingPendingItem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'add' | 'money' | 'insights' | 'share'

  // Selected month state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  // Modals & Sheets
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(getTodayString());
  const [calendarRange, setCalendarRange] = useState({ start: null, end: null });
  const [calendarMode, setCalendarMode] = useState('single');
  const [expandedNetWorth, setExpandedNetWorth] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingPot, setEditingPot] = useState(null);
  const [editingFD, setEditingFD] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [sharePeriod, setSharePeriod] = useState('this-month');
  const [shareSections, setShareSections] = useState({
    summary: true,
    categories: true,
    pulls: true,
    pots: true,
    debts: true,
    insights: true,
  });
  const [sharePreviewTab, setSharePreviewTab] = useState('summary');

  // Add Screen Form State
  const [addType, setAddType] = useState('expense');
  const [addAmount, setAddAmount] = useState('');
  const [addCurrency, setAddCurrency] = useState('INR');
  const [addCategory, setAddCategory] = useState(DEFAULT_CATEGORIES[0]?.id || 'cat-food');
  const [addNeeded, setAddNeeded] = useState(null);
  const [addNote, setAddNote] = useState('');
  const [addDate, setAddDate] = useState(getTodayString());
  const [addTime, setAddTime] = useState(getTimeString());
  const [addAccountId, setAddAccountId] = useState('');
  const [addToAccountId, setAddToAccountId] = useState('');
  const [addPotId, setAddPotId] = useState('');
  const [addSuccessAnim, setAddSuccessAnim] = useState(false);

  // Onboarding Wizard State
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tempAccounts, setTempAccounts] = useState([
    { id: 'acc-co', name: 'Company Current Account (HDFC)', kind: 'company', balance: '' },
    { id: 'acc-per', name: 'Personal Account (ICICI)', kind: 'personal', balance: '' },
  ]);
  const [tempPots, setTempPots] = useState([]);
  const [tempRecurring, setTempRecurring] = useState([]);
  const [tempSalary, setTempSalary] = useState('');
  const [tempSalaryDay, setTempSalaryDay] = useState('1');

  // Debounce refs for storage writes
  const saveTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  // ==========================================================================
  // INITIAL LOAD FROM WINDOW.STORAGE
  // ==========================================================================
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [coreData, txData] = await Promise.all([
          window.storage.get(STORAGE_KEY_CORE),
          window.storage.get(STORAGE_KEY_TX),
        ]);

        if (!isMounted) return;

        if (coreData) {
          if (coreData.accounts) setAccounts(coreData.accounts);
          if (coreData.pots) setPots(coreData.pots);
          if (coreData.fds) setFds(coreData.fds);
          if (coreData.recurring) setRecurring(coreData.recurring);
          if (coreData.debts) setDebts(coreData.debts);
          if (coreData.pendingSMS) setPendingSMS(coreData.pendingSMS);
          if (coreData.settings) {
            setSettings({
              ...settings,
              ...coreData.settings,
              categories: coreData.settings.categories?.length
                ? coreData.settings.categories
                : DEFAULT_CATEGORIES,
            });
          }
        }

        if (txData && Array.isArray(txData)) {
          setTransactions(txData);
        }
      } catch (err) {
        console.error('Failed to read from window.storage:', err);
        showToast('Storage load error. Using local state.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // ==========================================================================
  // DEBOUNCED STORAGE PERSISTENCE (~300ms)
  // ==========================================================================
  const persistState = useCallback(
    (newAccounts, newPots, newFds, newRecurring, newDebts, newSettings, newTx, newPendingSMS) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const corePayload = {
            accounts: newAccounts,
            pots: newPots,
            fds: newFds,
            recurring: newRecurring,
            debts: newDebts,
            settings: newSettings,
            pendingSMS: newPendingSMS,
          };
          await Promise.all([
            window.storage.set(STORAGE_KEY_CORE, corePayload),
            window.storage.set(STORAGE_KEY_TX, newTx),
          ]);
        } catch (err) {
          console.error('Storage write error:', err);
          showToast('Failed to save to storage.');
        }
      }, 300);
    },
    [showToast]
  );

  const updateData = useCallback(
    (updates) => {
      const nextAccounts = updates.accounts !== undefined ? updates.accounts : accounts;
      const nextPots = updates.pots !== undefined ? updates.pots : pots;
      const nextFds = updates.fds !== undefined ? updates.fds : fds;
      const nextRecurring = updates.recurring !== undefined ? updates.recurring : recurring;
      const nextDebts = updates.debts !== undefined ? updates.debts : debts;
      const nextSettings = updates.settings !== undefined ? updates.settings : settings;
      const nextTx = updates.transactions !== undefined ? updates.transactions : transactions;
      const nextPendingSMS = updates.pendingSMS !== undefined ? updates.pendingSMS : pendingSMS;

      if (updates.accounts !== undefined) setAccounts(nextAccounts);
      if (updates.pots !== undefined) setPots(nextPots);
      if (updates.fds !== undefined) setFds(nextFds);
      if (updates.recurring !== undefined) setRecurring(nextRecurring);
      if (updates.debts !== undefined) setDebts(nextDebts);
      if (updates.settings !== undefined) setSettings(nextSettings);
      if (updates.transactions !== undefined) setTransactions(nextTx);
      if (updates.pendingSMS !== undefined) setPendingSMS(nextPendingSMS);

      persistState(
        nextAccounts,
        nextPots,
        nextFds,
        nextRecurring,
        nextDebts,
        nextSettings,
        nextTx,
        nextPendingSMS
      );
    },
    [accounts, pots, fds, recurring, debts, settings, transactions, pendingSMS, persistState]
  );

  // Setup accounts default selection
  useEffect(() => {
    if (!addAccountId && accounts.length > 0) {
      setAddAccountId(accounts[0].id);
    }
    if (!addToAccountId && accounts.length > 1) {
      const personal = accounts.find((a) => a.kind === 'personal');
      setAddToAccountId(personal ? personal.id : accounts[1].id);
    }
    if (!addPotId && pots.length > 0) {
      setAddPotId(pots[0].id);
    }
  }, [accounts, pots, addAccountId, addToAccountId, addPotId]);

  // ==========================================================================
  // NOTIFICATION MANAGER & DAILY REMINDER SCHEDULER
  // ==========================================================================
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications not supported in this browser.');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Daily reminders enabled!');
        updateData({ settings: { ...settings, reminderEnabled: true } });
        return true;
      } else {
        showToast('Notification permission denied.');
        updateData({ settings: { ...settings, reminderEnabled: false } });
        return false;
      }
    } catch (e) {
      console.error('Notification error:', e);
      showToast('Failed to request permission.');
      return false;
    }
  };

  const triggerTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Ledger — Daily Log Reminder', {
        body: "It takes 8 seconds to log today's expenses. Keep the dribbles counted.",
        icon: '/manifest.json',
      });
      showToast('Notification sent to phone/desktop!');
    } else {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          new Notification('Ledger — Daily Log Reminder', {
            body: "It takes 8 seconds to log today's expenses. Keep the dribbles counted.",
          });
        }
      });
    }
  };

  // Periodic Reminder Timer (Checks every 30s)
  useEffect(() => {
    if (!settings.reminderEnabled || !settings.reminderTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentHM === settings.reminderTime) {
        // Trigger notification if not logged today
        const todayStr = getTodayString();
        const hasLoggedToday = transactions.some((t) => t.date === todayStr);
        if (!hasLoggedToday && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Ledger — Reminder', {
            body: "Nothing logged yet today. Take 8 seconds to record today's spending.",
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [settings.reminderEnabled, settings.reminderTime, transactions]);

  // ==========================================================================
  // SMS DETECTION & APPROVAL WORKFLOW
  // ==========================================================================
  const handleParseSMSInput = (textToParse) => {
    const text = textToParse || smsInputText;
    if (!text || text.trim().length === 0) {
      showToast('Please paste SMS text first.');
      return;
    }

    const detected = parseBulkSMS(text, accounts);
    if (detected.length === 0) {
      // Try single SMS
      const single = parseSMS(text, accounts);
      if (single) detected.push(single);
    }

    if (detected.length === 0) {
      showToast('No financial debit/credit SMS detected in this text.');
      return;
    }

    const nextPending = [...detected, ...pendingSMS];
    updateData({ pendingSMS: nextPending });
    setSmsInputText('');
    showToast(`Detected ${detected.length} transaction${detected.length > 1 ? 's' : ''}!`);
  };

  const handleApproveSMS = (smsItem, modifiedData = {}) => {
    const finalItem = { ...smsItem, ...modifiedData };
    const inrVal = finalItem.inrAmount || finalItem.amount;

    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: finalItem.type,
      amount: finalItem.amount,
      currency: 'INR',
      inrAmount: inrVal,
      category: finalItem.type === 'expense' ? finalItem.category || 'cat-other' : null,
      accountId: finalItem.accountId || accounts[0]?.id || '',
      toAccountId: finalItem.type === 'transfer' ? addToAccountId || accounts[1]?.id || '' : null,
      potId: null,
      note: finalItem.note || finalItem.merchant || 'SMS Detected',
      needed: finalItem.type === 'expense' ? finalItem.needed : null,
      date: finalItem.date || getTodayString(),
      time: finalItem.time || getTimeString(),
      createdAt: new Date().toISOString(),
      fromSMS: true,
    };

    // Update balances
    let updatedAccounts = [...accounts];
    if (newTx.type === 'expense') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === newTx.accountId
          ? { ...a, balance: (Number(a.balance) || 0) - inrVal, updatedAt: new Date().toISOString() }
          : a
      );
    } else if (newTx.type === 'income') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === newTx.accountId
          ? { ...a, balance: (Number(a.balance) || 0) + inrVal, updatedAt: new Date().toISOString() }
          : a
      );
    } else if (newTx.type === 'transfer') {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === newTx.accountId) return { ...a, balance: (Number(a.balance) || 0) - inrVal };
        if (a.id === newTx.toAccountId) return { ...a, balance: (Number(a.balance) || 0) + inrVal };
        return a;
      });
    }

    const nextPending = pendingSMS.filter((p) => p.id !== smsItem.id);
    updateData({
      transactions: [newTx, ...transactions],
      accounts: updatedAccounts,
      pendingSMS: nextPending,
    });

    setEditingPendingItem(null);
    showToast('Approved and logged to Ledger.');
  };

  const handleDismissSMS = (smsId) => {
    const nextPending = pendingSMS.filter((p) => p.id !== smsId);
    updateData({ pendingSMS: nextPending });
    showToast('SMS dismissed.');
  };

  // ==========================================================================
  // DERIVED COMPUTATIONS (Never stored)
  // ==========================================================================
  const currentMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(currentMonthKey));
  }, [transactions, currentMonthKey]);

  // Priority #1: Company -> Personal Transfers (Dribble pulls)
  const transferStats = useMemo(() => {
    const pulls = monthTransactions.filter((t) => {
      if (t.type !== 'transfer') return false;
      const fromAcc = accounts.find((a) => a.id === t.accountId);
      const toAcc = accounts.find((a) => a.id === t.toAccountId);
      if (fromAcc && toAcc) {
        return fromAcc.kind === 'company' && toAcc.kind === 'personal';
      }
      return true;
    });

    const count = pulls.length;
    const totalAmount = pulls.reduce((sum, t) => sum + (Number(t.inrAmount) || Number(t.amount) || 0), 0);

    let avgGapDays = null;
    if (count > 1) {
      const sortedDates = pulls
        .map((p) => new Date(`${p.date}T${p.time || '12:00'}`).getTime())
        .sort((a, b) => a - b);
      const first = sortedDates[0];
      const last = sortedDates[sortedDates.length - 1];
      const diffDays = (last - first) / (1000 * 60 * 60 * 24);
      avgGapDays = (diffDays / (count - 1)).toFixed(1);
    }

    return {
      pulls,
      count,
      totalAmount,
      avgGapDays,
    };
  }, [monthTransactions, accounts]);

  // Net Worth
  const netWorthData = useMemo(() => {
    const totalAccounts = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    const totalPots = pots.reduce((sum, p) => sum + (Number(p.saved) || 0), 0);
    const totalFDs = fds.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const total = totalAccounts + totalPots + totalFDs;

    const currentMonthIncomes = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (t.inrAmount || t.amount || 0), 0);
    const currentMonthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.inrAmount || t.amount || 0), 0);

    const netChange = currentMonthIncomes - currentMonthExpenses;

    return {
      total,
      totalAccounts,
      totalPots,
      totalFDs,
      netChange,
    };
  }, [accounts, pots, fds, monthTransactions]);

  // Spend Gauge Data
  const spendGaugeData = useMemo(() => {
    const monthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);

    const totalCaps = settings.categories.reduce((s, c) => s + (Number(c.cap) || 0), 0);
    const percentage = totalCaps > 0 ? (monthExpenses / totalCaps) * 100 : 0;
    const isOverLimit = totalCaps > 0 && monthExpenses > totalCaps;

    return {
      monthExpenses,
      totalCaps,
      percentage,
      isOverLimit,
    };
  }, [monthTransactions, settings.categories]);

  // Runway Data
  const runwayData = useMemo(() => {
    const safetyPot = pots.find((p) => p.kind === 'safety') || pots[0];
    const safetyBalance = safetyPot ? Number(safetyPot.saved) || 0 : 0;

    const last3MonthExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);
    const avgMonthlySpend = last3MonthExpenses > 0 ? Math.max(last3MonthExpenses / 3, 1000) : 35000;
    const monthsCovered = (safetyBalance / avgMonthlySpend).toFixed(1);

    return {
      safetyBalance,
      avgMonthlySpend,
      monthsCovered: safetyBalance > 0 ? monthsCovered : '0',
    };
  }, [pots, transactions]);

  const todayDateStr = getTodayString();
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date === todayDateStr);
  }, [transactions, todayDateStr]);

  const topCategories = useMemo(() => {
    const freq = {};
    transactions.forEach((t) => {
      if (t.category) freq[t.category] = (freq[t.category] || 0) + 1;
    });
    return [...settings.categories].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  }, [transactions, settings.categories]);

  // ==========================================================================
  // INSIGHTS ENGINE
  // ==========================================================================
  const dynamicInsights = useMemo(() => {
    const insightsList = [];
    const now = new Date();
    const daysInCurrentMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const currentDayOfMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
        ? now.getDate()
        : daysInCurrentMonth;

    // 1. Burn Rate
    const currentMonthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);

    const avgDailySpend = currentDayOfMonth > 0 ? Math.round(currentMonthExpenses / currentDayOfMonth) : 0;
    if (avgDailySpend > 0) {
      insightsList.push({
        id: 'burn-rate',
        priority: 2,
        title: 'Daily burn rate',
        body: `You are spending an average of ${formatINR(avgDailySpend)} per day this month across ${currentDayOfMonth} days.`,
        icon: Flame,
        color: '#F5C542',
      });
    }

    // 2. Runway
    const liquidAccounts = accounts
      .filter((a) => a.kind === 'company' || a.kind === 'personal' || a.kind === 'savings')
      .reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const safetyPot = pots.find((p) => p.kind === 'safety') || pots[0];
    const safetyBalance = safetyPot ? Number(safetyPot.saved) || 0 : 0;
    const totalLiquid = liquidAccounts + safetyBalance;
    const estimatedMonthlyBurn = avgDailySpend > 0 ? avgDailySpend * 30 : 40000;
    const runwayMonths = (totalLiquid / estimatedMonthlyBurn).toFixed(1);

    if (totalLiquid > 0) {
      insightsList.push({
        id: 'runway',
        priority: 1,
        title: `${runwayMonths} months of liquid runway`,
        body: `With ${formatINR(totalLiquid)} in liquid accounts and safety pots, your current burn is covered until ${MONTH_NAMES[(now.getMonth() + Math.round(parseFloat(runwayMonths))) % 12]}.`,
        icon: ShieldCheck,
        color: runwayMonths < 2 ? '#FF6B8A' : '#B8F135',
      });
    }

    // 3. Not-Needed Total
    const notNeededExpenses = monthTransactions.filter((t) => t.type === 'expense' && t.needed === false);
    const notNeededSum = notNeededExpenses.reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);
    if (notNeededSum > 0) {
      const annualized = notNeededSum * 12;
      insightsList.push({
        id: 'not-needed',
        priority: 1,
        title: `${formatINR(notNeededSum)} spent on things marked "not needed"`,
        body: `That equates to ${formatINR(annualized)} a year. This is the exact pool where your savings pot contributions can come from.`,
        icon: AlertTriangle,
        color: '#FF6B8A',
      });
    }

    // 4. Pull Pattern Projection
    if (transferStats.count >= 2) {
      const projectedMonthEndPulls = Math.round((transferStats.count / currentDayOfMonth) * daysInCurrentMonth);
      const projectedAmount = Math.round((transferStats.totalAmount / currentDayOfMonth) * daysInCurrentMonth);
      insightsList.push({
        id: 'pull-pattern',
        priority: 1,
        title: `Company-to-personal pull pace: every ${transferStats.avgGapDays || 4} days`,
        body: `At this rate, you will make ~${projectedMonthEndPulls} pulls totaling ${formatINR(projectedAmount)} this month. Keep reasons documented for tax clarity.`,
        icon: ArrowRightLeft,
        color: transferStats.count >= 4 ? '#FF6B8A' : '#F5C542',
      });
    }

    return insightsList.sort((a, b) => a.priority - b.priority);
  }, [
    monthTransactions,
    selectedYear,
    selectedMonth,
    accounts,
    pots,
    transferStats,
  ]);

  // 6-Month chart data
  const sixMonthChartData = useMemo(() => {
    const data = [];
    const d = new Date(selectedYear, selectedMonth, 1);
    d.setMonth(d.getMonth() - 5);

    for (let i = 0; i < 6; i++) {
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthTx = transactions.filter((t) => t.date && t.date.startsWith(key));

      const inc = monthTx
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);
      const exp = monthTx
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);
      const pulls = monthTx
        .filter((t) => t.type === 'transfer')
        .reduce((s, t) => s + (Number(t.inrAmount) || Number(t.amount) || 0), 0);

      data.push({
        month: MONTH_NAMES[m].substring(0, 3),
        income: inc,
        expense: exp,
        pulls: pulls,
      });

      d.setMonth(d.getMonth() + 1);
    }
    return data;
  }, [selectedYear, selectedMonth, transactions]);

  // Category Donut Data
  const categoryDonutData = useMemo(() => {
    const map = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + (Number(t.inrAmount) || Number(t.amount) || 0);
      });

    return Object.entries(map)
      .map(([catId, value]) => {
        const cat = settings.categories.find((c) => c.id === catId);
        return {
          name: cat ? cat.name : 'Other',
          value,
          color: cat ? cat.color : '#94A3B8',
          id: catId,
        };
      })
      .filter((c) => c.value > 0);
  }, [monthTransactions, settings.categories]);

  // ==========================================================================
  // TRANSACTION SAVE HANDLER (<8s logging speed)
  // ==========================================================================
  const handleSaveTransaction = () => {
    const numAmount = parseFloat(addAmount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter an amount.');
      return;
    }

    if (addType === 'transfer' && (!addNote || addNote.trim() === '')) {
      showToast('Reason is required for transfers.');
      return;
    }

    const inrVal = addCurrency === 'USD' ? numAmount * settings.currencyRate : numAmount;

    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: addType,
      amount: numAmount,
      currency: addCurrency,
      inrAmount: inrVal,
      category: addType === 'expense' ? addCategory : null,
      accountId: addAccountId,
      toAccountId: addType === 'transfer' ? addToAccountId : null,
      potId: addType === 'potMove' ? addPotId : null,
      note: addNote.trim(),
      needed: addType === 'expense' ? addNeeded : null,
      date: addDate,
      time: addTime,
      createdAt: new Date().toISOString(),
    };

    let updatedAccounts = [...accounts];
    let updatedPots = [...pots];

    if (addType === 'expense') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === addAccountId
          ? { ...a, balance: (Number(a.balance) || 0) - inrVal, updatedAt: new Date().toISOString() }
          : a
      );
    } else if (addType === 'income') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === addAccountId
          ? { ...a, balance: (Number(a.balance) || 0) + inrVal, updatedAt: new Date().toISOString() }
          : a
      );
    } else if (addType === 'transfer') {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === addAccountId) return { ...a, balance: (Number(a.balance) || 0) - inrVal };
        if (a.id === addToAccountId) return { ...a, balance: (Number(a.balance) || 0) + inrVal };
        return a;
      });
    } else if (addType === 'potMove') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === addAccountId ? { ...a, balance: (Number(a.balance) || 0) - inrVal } : a
      );
      updatedPots = updatedPots.map((p) =>
        p.id === addPotId ? { ...p, saved: (Number(p.saved) || 0) + inrVal } : p
      );
    }

    updateData({
      transactions: [newTx, ...transactions],
      accounts: updatedAccounts,
      pots: updatedPots,
    });

    setAddSuccessAnim(true);
    showToast('Saved.');
    setTimeout(() => {
      setAddSuccessAnim(false);
      setAddAmount('');
      setAddNote('');
      setAddNeeded(null);
    }, 450);
  };

  const handleQuickAdd = (delta) => {
    const cur = parseFloat(addAmount) || 0;
    setAddAmount((cur + delta).toString());
  };

  const handleDeleteTransaction = (txId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    let updatedAccounts = [...accounts];
    let updatedPots = [...pots];
    const inrVal = tx.inrAmount || tx.amount;

    if (tx.type === 'expense') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === tx.accountId ? { ...a, balance: (Number(a.balance) || 0) + inrVal } : a
      );
    } else if (tx.type === 'income') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === tx.accountId ? { ...a, balance: (Number(a.balance) || 0) - inrVal } : a
      );
    } else if (tx.type === 'transfer') {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === tx.accountId) return { ...a, balance: (Number(a.balance) || 0) + inrVal };
        if (a.id === tx.toAccountId) return { ...a, balance: (Number(a.balance) || 0) - inrVal };
        return a;
      });
    } else if (tx.type === 'potMove') {
      updatedAccounts = updatedAccounts.map((a) =>
        a.id === tx.accountId ? { ...a, balance: (Number(a.balance) || 0) + inrVal } : a
      );
      updatedPots = updatedPots.map((p) =>
        p.id === tx.potId ? { ...p, saved: (Number(p.saved) || 0) - inrVal } : p
      );
    }

    updateData({
      transactions: transactions.filter((t) => t.id !== txId),
      accounts: updatedAccounts,
      pots: updatedPots,
    });
    showToast('Entry removed.');
  };

  // ==========================================================================
  // SHARE / ADVISOR REPORT
  // ==========================================================================
  const generateAdvisorReportText = () => {
    const periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const incTotal = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (t.inrAmount || t.amount || 0), 0);
    const expTotal = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.inrAmount || t.amount || 0), 0);
    const notNeededTotal = monthTransactions
      .filter((t) => t.type === 'expense' && t.needed === false)
      .reduce((s, t) => s + (t.inrAmount || t.amount || 0), 0);

    let text = `========================================\n`;
    text += `LEDGER FINANCIAL REPORT — ${settings.studioName.toUpperCase()}\n`;
    text += `Period: ${periodLabel}\n`;
    text += `Generated: ${new Date().toLocaleDateString('en-IN')}\n`;
    text += `========================================\n\n`;

    text += `--- OVERVIEW ---\n`;
    text += `Inflow:             ${formatINR(incTotal)}\n`;
    text += `Outflow:            ${formatINR(expTotal)}\n`;
    text += `Net Cash Flow:      ${formatINR(incTotal - expTotal)}\n`;
    text += `Not-Needed Spend:   ${formatINR(notNeededTotal)}\n`;
    text += `Net Worth:          ${formatINR(netWorthData.total)}\n\n`;

    text += `--- COMPANY-TO-PERSONAL DRIBBLE PULLS ---\n`;
    text += `Total Pulls:        ${transferStats.count}\n`;
    text += `Total Pulled:       ${formatINR(transferStats.totalAmount)}\n`;
    text += `Average Interval:   ${transferStats.avgGapDays ? `${transferStats.avgGapDays} days` : 'N/A'}\n`;
    transferStats.pulls.forEach((p, idx) => {
      text += `  [${idx + 1}] ${p.date} | ${formatINR(p.inrAmount || p.amount)} | Reason: "${p.note || 'None'}"\n`;
    });

    return text;
  };

  const handleCopyReport = () => {
    const text = generateAdvisorReportText();
    navigator.clipboard?.writeText(text);
    showToast('Report copied to clipboard.');
  };

  const handleDownloadJSON = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts,
      transactions,
      pots,
      fds,
      recurring,
      debts,
      settings,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-backup-${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded.');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.accounts || parsed.transactions) {
          updateData({
            accounts: parsed.accounts || [],
            transactions: parsed.transactions || [],
            pots: parsed.pots || [],
            fds: parsed.fds || [],
            recurring: parsed.recurring || [],
            debts: parsed.debts || [],
            settings: parsed.settings || settings,
          });
          showToast('Data imported successfully.');
        }
      } catch (err) {
        showToast('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ==========================================================================
  // ONBOARDING COMPLETION
  // ==========================================================================
  const handleCompleteOnboarding = () => {
    const validAccounts = tempAccounts
      .filter((a) => a.name.trim() !== '')
      .map((a) => ({
        id: a.id || 'acc-' + Date.now(),
        name: a.name.trim(),
        kind: a.kind || 'other',
        balance: parseFloat(a.balance) || 0,
        updatedAt: new Date().toISOString(),
      }));

    updateData({
      accounts: validAccounts.length > 0 ? validAccounts : tempAccounts,
      settings: { ...settings, onboarded: true },
    });

    setActiveTab('add');
    showToast('Welcome to Ledger.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08090C] text-[#F4F6FB]">
        <div className="w-8 h-8 rounded-full border-2 border-[#F5C542] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ==========================================================================
  // ONBOARDING WIZARD
  // ==========================================================================
  if (!settings.onboarded) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#F4F6FB] flex flex-col justify-between p-6 max-w-[430px] mx-auto">
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-semibold text-[#7E8699] uppercase">Step 1 of 4</span>
          <button
            onClick={() => updateData({ settings: { ...settings, onboarded: true } })}
            className="text-xs text-[#7E8699]"
          >
            Skip
          </button>
        </div>

        <div className="my-auto space-y-4">
          <h1 className="text-3xl font-bold text-white">What accounts do you have?</h1>
          <p className="text-sm text-[#7E8699]">
            Add your business and personal accounts to track dribbles.
          </p>

          <div className="space-y-3">
            {tempAccounts.map((acc, index) => (
              <GlassCard key={acc.id} className="p-4">
                <input
                  type="text"
                  value={acc.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempAccounts((prev) =>
                      prev.map((a, i) => (i === index ? { ...a, name: val } : a))
                    );
                  }}
                  className="bg-transparent text-sm text-white focus:outline-none w-full border-b border-white/10 pb-1"
                />
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-[#7E8699]">₹</span>
                  <input
                    type="number"
                    value={acc.balance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempAccounts((prev) =>
                        prev.map((a, i) => (i === index ? { ...a, balance: val } : a))
                      );
                    }}
                    placeholder="Current balance"
                    className="bg-transparent text-base font-bold text-white focus:outline-none w-full"
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        <button
          onClick={handleCompleteOnboarding}
          className="w-full py-4 rounded-full font-bold text-sm bg-[#F5C542] text-black shadow-lg"
        >
          Finish & Start Logging
        </button>
      </div>
    );
  }

  // ==========================================================================
  // MAIN APP INTERFACE
  // ==========================================================================
  const isDark = settings.theme === 'dark';

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#08090C] text-[#F4F6FB]' : 'bg-[#F2F1EC] text-[#12141C]'
      } flex flex-col justify-between font-sans selection:bg-[#F5C542] selection:text-black`}
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
          : 'radial-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap');
        
        .metallic-numeral {
          background: ${
            isDark
              ? 'linear-gradient(180deg, #FFFFFF 0%, #C9CEDA 100%)'
              : 'linear-gradient(180deg, #12141C 0%, #4B5563 100%)'
          };
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Barlow Condensed', sans-serif;
          font-variant-numeric: tabular-nums;
        }

        .gold-pill-active {
          background-color: #F5C542;
          color: #12141C !important;
          box-shadow: 0 4px 20px rgba(245, 197, 66, 0.35);
        }
      `}</style>

      {/* Main Container */}
      <main className="w-full max-w-[430px] mx-auto px-4 pt-4 pb-28 min-h-screen">
        {/* ====================================================================
            TAB 1: HOME
        ==================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Top Bar with SMS & Reminder Quick Badges */}
            <div className="flex items-center justify-between pt-2 pb-1">
              <div>
                <span className="text-xs font-semibold text-[#7E8699] uppercase tracking-wider block">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <h1 className="text-xl font-bold tracking-tight">Studio Ledger</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* SMS Ingest Trigger Button */}
                <button
                  onClick={() => setShowSMSModal(true)}
                  className="relative p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 flex items-center justify-center"
                  title="SMS Expenses Ingest"
                >
                  <MessageSquare className="w-4 h-4 text-[#F5C542]" />
                  {pendingSMS.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B8A] text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {pendingSMS.length}
                    </span>
                  )}
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    const nextTheme = isDark ? 'light' : 'dark';
                    updateData({ settings: { ...settings, theme: nextTheme } });
                  }}
                  className={`p-2.5 rounded-full border transition-all active:scale-95 ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white'
                      : 'bg-black/5 border-black/10 text-black'
                  }`}
                  aria-label="Toggle Theme"
                >
                  {isDark ? <Sun className="w-4 h-4 text-[#F5C542]" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* PENDING SMS APPROVAL CALLOUT BANNER (If any pending SMS) */}
            {pendingSMS.length > 0 && (
              <GlassCard
                theme={settings.theme}
                rimVariant="gold"
                className="p-3.5 cursor-pointer flex items-center justify-between"
                onClick={() => setShowSMSModal(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {pendingSMS.length} SMS {pendingSMS.length === 1 ? 'Transaction' : 'Transactions'} Detected
                    </span>
                    <span className="text-[11px] text-[#7E8699]">
                      Tap to review and approve into Ledger
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#F5C542] px-2.5 py-1 rounded-full bg-[#F5C542]/10">
                  Review
                </span>
              </GlassCard>
            )}

            {/* Month Carousel */}
            <div className="relative py-1">
              <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-4 px-2">
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const targetDate = new Date(selectedYear, selectedMonth + offset, 1);
                  const isCurrent = offset === 0;
                  return (
                    <button
                      key={offset}
                      onClick={() => {
                        setSelectedYear(targetDate.getFullYear());
                        setSelectedMonth(targetDate.getMonth());
                      }}
                      className={`text-sm font-semibold transition-all px-3 py-1 rounded-full whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#F5C542] scale-110 font-bold'
                          : 'text-[#7E8699] opacity-40 hover:opacity-80'
                      }`}
                    >
                      {MONTH_NAMES[targetDate.getMonth()]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hero Net Worth Card */}
            <GlassCard
              theme={settings.theme}
              className="p-6 cursor-pointer"
              onClick={() => setExpandedNetWorth(!expandedNetWorth)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#7E8699]">
                  Total Net Worth
                </span>
                <div className="flex items-center gap-1 text-xs text-[#7E8699]">
                  <span>Breakdown</span>
                  {expandedNetWorth ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div className="text-5xl font-bold tracking-tight metallic-numeral my-1">
                {formatINR(netWorthData.total)}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    netWorthData.netChange >= 0
                      ? 'text-[#B8F135] bg-[#B8F135]/10'
                      : 'text-[#FF6B8A] bg-[#FF6B8A]/10'
                  }`}
                >
                  {netWorthData.netChange >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {netWorthData.netChange >= 0 ? '+' : ''}
                    {formatINR(netWorthData.netChange)} this month
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Action Pill Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <GlassCard
                theme={settings.theme}
                className="py-3 px-4 text-center cursor-pointer hover:scale-[1.02] active:scale-95"
                onClick={() => {
                  setAddType('expense');
                  setActiveTab('add');
                }}
              >
                <div className="flex items-center justify-center gap-2 font-semibold text-sm">
                  <Plus className="w-4 h-4 text-[#F5C542]" />
                  <span>Log spend</span>
                </div>
              </GlassCard>

              <GlassCard
                theme={settings.theme}
                className="py-3 px-4 text-center cursor-pointer hover:scale-[1.02] active:scale-95"
                onClick={() => {
                  setAddType('transfer');
                  setActiveTab('add');
                }}
              >
                <div className="flex items-center justify-center gap-2 font-semibold text-sm">
                  <ArrowRightLeft className="w-4 h-4 text-[#8FB4FF]" />
                  <span>Log transfer</span>
                </div>
              </GlassCard>
            </div>

            {/* PRIORITY #1: THE TRANSFER CARD */}
            <GlassCard
              theme={settings.theme}
              rimVariant={
                transferStats.count === 0
                  ? 'default'
                  : transferStats.count === 1
                  ? 'lime'
                  : transferStats.count <= 3
                  ? 'gold'
                  : 'rose'
              }
              className="p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699]">
                  Company → Personal Pulls
                </span>
                <span className="text-xs font-medium text-[#7E8699]">
                  {transferStats.avgGapDays ? `Avg every ${transferStats.avgGapDays}d` : ''}
                </span>
              </div>

              <div className="flex items-baseline justify-between my-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-bold tracking-tight ${
                      transferStats.count >= 4 ? 'text-[#FF6B8A]' : 'metallic-numeral'
                    }`}
                  >
                    {transferStats.count}
                  </span>
                  <span className="text-sm text-[#7E8699] font-medium">pulls</span>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold metallic-numeral block">
                    {formatINR(transferStats.totalAmount)}
                  </span>
                  <span className="text-[11px] text-[#7E8699]">pulled this month</span>
                </div>
              </div>

              <p className="text-xs font-medium mt-2 leading-relaxed">
                {transferStats.count === 0 && (
                  <span className="text-[#7E8699]">No pulls logged yet this month.</span>
                )}
                {transferStats.count === 1 && (
                  <span className="text-[#B8F135]">
                    One clean transfer. This is exactly how it should look.
                  </span>
                )}
                {transferStats.count >= 2 && transferStats.count <= 3 && (
                  <span className="text-[#F5C542]">
                    {transferStats.count} pulls so far. Try to make the next one your last.
                  </span>
                )}
                {transferStats.count >= 4 && (
                  <span className="text-[#FF6B8A]">
                    {transferStats.count} pulls, {formatINR(transferStats.totalAmount)}. This is the pattern that made ₹54,000 disappear.
                  </span>
                )}
              </p>
            </GlassCard>

            {/* Spend Gauge */}
            <GlassCard theme={settings.theme} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699]">
                  Monthly Limit
                </span>
              </div>
              <ArcGauge
                percentage={spendGaugeData.percentage}
                current={spendGaugeData.monthExpenses}
                target={spendGaugeData.totalCaps}
                isOverLimit={spendGaugeData.isOverLimit}
                theme={settings.theme}
              />
            </GlassCard>

            {/* Runway Strip */}
            <GlassCard theme={settings.theme} className="py-3.5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#B8F135]" />
                <div>
                  <span className="text-xs font-semibold block">
                    Safety pot covers {runwayData.monthsCovered} months
                  </span>
                  <span className="text-[11px] text-[#7E8699]">
                    at current burn of {formatINR(runwayData.avgMonthlySpend)}/mo
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold metallic-numeral">
                {formatINR(runwayData.safetyBalance)}
              </span>
            </GlassCard>

            {/* Today's Activity */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699]">
                  Today's Activity
                </span>
                <span className="text-xs text-[#7E8699]">{todayTransactions.length} entries</span>
              </div>

              {todayTransactions.length > 0 ? (
                <div className="space-y-2">
                  {todayTransactions.map((tx) => (
                    <GlassCard
                      key={tx.id}
                      theme={settings.theme}
                      className="py-3 px-4 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-semibold block">{tx.note || tx.type}</span>
                        <span className="text-[11px] text-[#7E8699]">{tx.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold metallic-numeral">
                          {formatINR(tx.inrAmount || tx.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-[#7E8699] hover:text-[#FF6B8A] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard theme={settings.theme} className="p-6 text-center space-y-3">
                  <p className="text-xs text-[#7E8699]">
                    Nothing logged today. It takes about eight seconds.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-5 py-2.5 rounded-full font-bold text-xs bg-[#F5C542] text-black shadow-md"
                  >
                    + Log now
                  </button>
                </GlassCard>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: ADD SCREEN
        ==================================================================== */}
        {activeTab === 'add' && (
          <div className="space-y-4 pt-2">
            <h1 className="text-xl font-bold tracking-tight px-1">Log Transaction</h1>

            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
              {[
                { id: 'expense', label: 'Spent' },
                { id: 'income', label: 'Received' },
                { id: 'transfer', label: 'Transferred' },
                { id: 'potMove', label: 'Pot' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setAddType(seg.id)}
                  className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                    addType === seg.id ? 'bg-[#F5C542] text-black shadow-md' : 'text-[#7E8699]'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <GlassCard theme={settings.theme} className="p-5 text-center space-y-3">
              <span className="text-xs font-semibold text-[#7E8699] uppercase tracking-wider block">
                Amount
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-bold text-[#7E8699]">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="text-5xl font-bold bg-transparent text-white w-56 text-center focus:outline-none metallic-numeral"
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                {[100, 500, 1000, 5000].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleQuickAdd(chip)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 hover:border-[#F5C542] text-[#F4F6FB] active:scale-95"
                  >
                    +{chip >= 1000 ? `${chip / 1000}k` : chip}
                  </button>
                ))}
              </div>
            </GlassCard>

            {addType === 'expense' && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699] px-1">
                  Category
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {topCategories.map((cat) => {
                    const isSelected = addCategory === cat.id;
                    const IconComp = CATEGORY_ICONS[cat.icon] || MoreHorizontal;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setAddCategory(cat.id)}
                        className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 border ${
                          isSelected
                            ? 'bg-[#F5C542] text-black border-[#F5C542]'
                            : 'bg-white/5 text-[#F4F6FB] border-white/5'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-xs font-semibold truncate w-full text-center">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {addType === 'expense' && (
              <GlassCard theme={settings.theme} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#7E8699]">Did you need this?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddNeeded(true)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        addNeeded === true ? 'bg-[#B8F135] text-black' : 'bg-white/5 text-[#7E8699]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAddNeeded(false)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        addNeeded === false ? 'bg-[#FF6B8A] text-white' : 'bg-white/5 text-[#7E8699]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#7E8699]">
                  Answer truthfully. This one number is where your savings come from.
                </p>
              </GlassCard>
            )}

            <GlassCard theme={settings.theme} className="p-4 space-y-1">
              <span className="text-xs font-semibold text-[#7E8699] block">
                {addType === 'transfer' ? 'Reason for Pull (Required)' : 'Note'}
              </span>
              <input
                type="text"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder={
                  addType === 'transfer' ? 'Why did you need to pull this?' : 'What was this for?'
                }
                className="w-full bg-transparent text-sm text-white focus:outline-none py-1"
              />
            </GlassCard>

            <button
              onClick={handleSaveTransaction}
              className="w-full py-4 rounded-full font-bold text-sm bg-[#F5C542] text-black active:scale-95 shadow-xl"
            >
              Save
            </button>
          </div>
        )}

        {/* ====================================================================
            TAB 3: MONEY & SETTINGS (INCLUDING NOTIFICATIONS & APK)
        ==================================================================== */}
        {activeTab === 'money' && (
          <div className="space-y-6 pt-2">
            <h1 className="text-xl font-bold tracking-tight px-1">Money & Settings</h1>

            {/* DAILY REMINDER & NOTIFICATION SETTINGS */}
            <GlassCard theme={settings.theme} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F5C542]" />
                  <span className="text-sm font-bold text-white">Daily Log Reminder</span>
                </div>
                <button
                  onClick={() => {
                    if (!settings.reminderEnabled) {
                      requestNotificationPermission();
                    } else {
                      updateData({ settings: { ...settings, reminderEnabled: false } });
                      showToast('Reminders turned off.');
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    settings.reminderEnabled
                      ? 'bg-[#B8F135] text-black'
                      : 'bg-white/10 text-[#7E8699]'
                  }`}
                >
                  {settings.reminderEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#7E8699]">Reminder Time</span>
                <input
                  type="time"
                  value={settings.reminderTime || '21:30'}
                  onChange={(e) =>
                    updateData({ settings: { ...settings, reminderTime: e.target.value } })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#7E8699]">Verify notification on device</span>
                <button
                  onClick={triggerTestNotification}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F5C542]/20 text-[#F5C542] hover:bg-[#F5C542]/30 active:scale-95"
                >
                  Send Test Reminder
                </button>
              </div>
            </GlassCard>

            {/* MOBILE APP & ANDROID APK STATUS */}
            <GlassCard theme={settings.theme} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#8FB4FF]" />
                <span className="text-sm font-bold text-white">Mobile App & Android APK</span>
              </div>
              <p className="text-xs text-[#7E8699] leading-relaxed">
                Ledger is packaged with PWA standalone mode and Capacitor Android configuration with SMS read permissions.
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    alert(
                      'To install as an app on your phone:\n1. Open your deployed URL in Chrome on Android or Safari on iOS.\n2. Tap "Add to Home Screen" or "Install".\n3. It runs in full-screen standalone mode with daily notifications!'
                    );
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Install on Phone
                </button>
                <button
                  onClick={() => setShowSMSModal(true)}
                  className="flex-1 py-2 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/30 text-xs font-semibold text-[#F5C542]"
                >
                  SMS Ingest Panel
                </button>
              </div>
            </GlassCard>

            {/* Accounts List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699]">
                  Accounts
                </span>
                <button
                  onClick={() =>
                    setEditingAccount({ id: 'acc-' + Date.now(), name: '', kind: 'personal', balance: 0 })
                  }
                  className="text-xs text-[#F5C542] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {accounts.map((acc) => (
                <GlassCard key={acc.id} theme={settings.theme} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#7E8699]">{acc.kind}</span>
                    <button onClick={() => setEditingAccount(acc)} className="text-[#7E8699] hover:text-white p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-sm">{acc.name}</span>
                    <span className="text-xl font-bold metallic-numeral">{formatINR(acc.balance)}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: INSIGHTS
        ==================================================================== */}
        {activeTab === 'insights' && (
          <div className="space-y-4 pt-2">
            <h1 className="text-xl font-bold tracking-tight px-1">Intelligence</h1>
            <div className="space-y-3">
              {dynamicInsights.map((ins) => {
                const IconC = ins.icon || Sparkles;
                return (
                  <GlassCard key={ins.id} theme={settings.theme} className="p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <IconC className="w-4 h-4" style={{ color: ins.color }} />
                      <h3 className="font-bold text-sm text-white">{ins.title}</h3>
                    </div>
                    <p className="text-xs text-[#7E8699] leading-relaxed pl-6">{ins.body}</p>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 5: SHARE
        ==================================================================== */}
        {activeTab === 'share' && (
          <div className="space-y-4 pt-2">
            <h1 className="text-xl font-bold tracking-tight px-1">Advisor Share</h1>
            <div
              style={{
                backgroundColor: '#F5C542',
                color: '#12141C',
                borderRadius: '28px',
                padding: '24px',
              }}
              className="space-y-4 shadow-xl"
            >
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-black/60 block">
                  {settings.studioName}
                </span>
                <h2 className="text-2xl font-black">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10.5px] font-bold text-black/60 uppercase block">Total Pulls</span>
                  <span className="text-2xl font-black">{transferStats.count}</span>
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-black/60 uppercase block">Amount Pulled</span>
                  <span className="text-2xl font-black">{formatINR(transferStats.totalAmount)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyReport}
              className="w-full py-3.5 rounded-full font-bold text-sm bg-[#F5C542] text-black shadow-lg"
            >
              Copy Advisor Report
            </button>
          </div>
        )}
      </main>

      {/* ====================================================================
          SMS INGEST & PENDING APPROVALS MODAL
      ==================================================================== */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end justify-center p-0">
          <div
            style={{
              backgroundColor: isDark ? '#0E1018' : '#FFFFFF',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            className="w-full max-w-[430px] p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#F5C542]" />
                <h2 className="font-bold text-base text-white">Financial SMS Ingest</h2>
              </div>
              <button onClick={() => setShowSMSModal(false)} className="text-[#7E8699] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Paste Input Box */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#7E8699]">
                Paste Bank / UPI SMS text or notifications:
              </span>
              <textarea
                rows="3"
                value={smsInputText}
                onChange={(e) => setSmsInputText(e.target.value)}
                placeholder="Paste SMS here (e.g. Rs 15,000 debited from HDFC Bank A/c...)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-[#7E8699] focus:outline-none focus:border-[#F5C542]"
              />

              {/* Sample SMS Test Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-[#7E8699] self-center">Try:</span>
                {[
                  {
                    label: 'Swiggy ₹1,250',
                    sms: 'Dear Customer, INR 1,250.00 debited from a/c **8887 on 11-09-26 info: SWIGGY. Avl bal: INR 45,000.00 - HDFC Bank',
                  },
                  {
                    label: 'Company Pull ₹15,000',
                    sms: 'Alert: Rs 15,000.00 debited from HDFC Bank A/c xx8887 on 11-SEP-26 to VPA shyam@icici (UPI Ref 425512345678). Bal: Rs 2,45,100.',
                  },
                  {
                    label: 'Client Project ₹6L',
                    sms: 'Rs 6,00,000.00 credited to HDFC Bank A/c xx8887 on 05-SEP-26 by A/c linked to VPA client@hdfcbank (UPI Ref 424911223344).',
                  },
                ].map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => handleParseSMSInput(sample.sms)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 hover:border-[#F5C542] text-white active:scale-95"
                  >
                    + {sample.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleParseSMSInput()}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#F5C542] text-black active:scale-95 shadow"
              >
                Detect & Parse SMS
              </button>
            </div>

            {/* Pending Approvals Queue */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E8699]">
                  Pending Approvals ({pendingSMS.length})
                </span>
                {pendingSMS.length > 0 && (
                  <button
                    onClick={() => {
                      updateData({ pendingSMS: [] });
                      showToast('Cleared pending list.');
                    }}
                    className="text-[11px] text-[#7E8699] hover:text-[#FF6B8A]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {pendingSMS.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingSMS.map((item) => (
                    <GlassCard
                      key={item.id}
                      theme={settings.theme}
                      rimVariant={item.isDribbleTransfer ? 'rose' : item.type === 'income' ? 'lime' : 'default'}
                      className="p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                item.isDribbleTransfer
                                  ? 'bg-[#FF6B8A]/20 text-[#FF6B8A]'
                                  : item.type === 'income'
                                  ? 'bg-[#B8F135]/20 text-[#B8F135]'
                                  : 'bg-white/10 text-white'
                              }`}
                            >
                              {item.isDribbleTransfer ? 'Dribble Transfer' : item.type}
                            </span>
                            <span className="text-xs font-bold text-white">{item.merchant}</span>
                          </div>
                          <span className="text-[10.5px] text-[#7E8699] block mt-0.5">
                            {item.date} • {item.accountRef ? `A/c *${item.accountRef}` : 'Auto-detected'}
                          </span>
                        </div>

                        <span className="text-lg font-bold metallic-numeral">
                          {formatINR(item.amount)}
                        </span>
                      </div>

                      {/* Raw text snippet */}
                      <div className="p-2 rounded-lg bg-black/30 text-[10px] font-mono text-[#7E8699] truncate">
                        "{item.rawSms}"
                      </div>

                      {/* 1-Tap Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleDismissSMS(item.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-[#7E8699]"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleApproveSMS(item)}
                          className="flex-1 py-1.5 rounded-xl font-bold text-xs bg-[#F5C542] text-black active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Log</span>
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#7E8699] border border-dashed border-white/10 rounded-2xl">
                  No pending SMS transactions. Paste SMS above to detect and log.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-3 left-0 right-0 max-w-[390px] mx-auto px-4 z-40">
        <div
          style={{
            backgroundColor: isDark ? 'rgba(20,22,30,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(32px) saturate(160%)',
            WebkitBackdropFilter: 'blur(32px) saturate(160%)',
            borderRadius: '40px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          className="p-1.5 flex items-center justify-between"
        >
          {[
            { id: 'home', label: 'Home', icon: Wallet },
            { id: 'add', label: 'Add', icon: Plus },
            { id: 'money', label: 'Money', icon: PiggyBank },
            { id: 'insights', label: 'Insights', icon: Sparkles },
            { id: 'share', label: 'Share', icon: Share2 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 px-1 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 ${
                  isActive ? 'gold-pill-active' : 'text-[#7E8699] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-0 right-0 max-w-[340px] mx-auto z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-[#0E1018]/90 border border-white/15 backdrop-blur-xl text-white text-xs font-semibold py-2.5 px-4 rounded-full shadow-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F5C542]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
