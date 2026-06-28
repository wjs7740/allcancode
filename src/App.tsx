import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  Copy,
  CreditCard,
  Crown,
  Dices,
  Gauge,
  Gift,
  GitBranch,
  Globe2,
  History,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MessageSquare,
  PawPrint,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
  Wallet,
  X,
  Zap
} from "lucide-react";
import CodiumLogo from "./components/CodiumLogo";
import RobotScene, { type MascotVariant } from "./components/RobotScene";

type AuthMode = "login" | "register" | null;
type Locale = "zh" | "en";
type DashboardSection = "overview" | "keys" | "requests" | "recharge" | "lottery" | "forum" | "ranking";

const TOKEN_STORAGE_KEY = "allcancode.token";
const API_BASE = "/api/app";

type ApiKeyItem = {
  id: string;
  name: string;
  secret: string;
  scope: string;
  quota: string;
  usage: number;
  created: string;
  status: "active" | "paused";
};

type RequestLog = {
  id: string;
  time: string;
  model: string;
  endpoint: string;
  keyName: string;
  status: string;
  tokens: string;
  cost: string;
  latency: string;
};

type RankingItem = {
  id: string;
  name: string;
  requests: string;
  tokens: string;
};

type LotteryPrize = {
  id: string;
  name: string;
  detail: string;
  code: string;
};

type TypewriterLine = {
  lead: string;
  accent: string;
};

type SessionUser = {
  id: number;
  username: string;
  email: string;
  role?: string;
  balance: number;
  createdAt: string;
};

type DashboardSnapshot = {
  balance: number;
  todayRequests: number;
  successRate: number;
  activeKeys: number;
  totalKeys: number;
  remainingTokens: string;
  activity: string[];
  spendBars: number[];
};

type PaymentMethodItem = {
  methodCode: string;
  methodName: string;
  providerName?: string;
  currency?: string;
  singleMin?: number;
  singleMax?: number;
};

type AuthPayload = {
  identifier?: string;
  username?: string;
  email?: string;
  password: string;
};

const mascotOptions = [
  { id: "robot", icon: Bot },
  { id: "fox", icon: PawPrint }
] satisfies { id: MascotVariant; icon: typeof Bot }[];

const dashboardIcons = {
  overview: LayoutDashboard,
  keys: KeyRound,
  requests: History,
  recharge: Wallet,
  lottery: Dices,
  forum: MessageSquare,
  ranking: Trophy
} satisfies Record<DashboardSection, typeof LayoutDashboard>;

const authFieldConfig = {
  identifier: { type: "text", icon: UserRound },
  email: { type: "email", icon: Mail },
  username: { type: "text", icon: UserRound },
  password: { type: "password", icon: KeyRound }
} as const;

type AuthFieldId = keyof typeof authFieldConfig;

const copy = {
  zh: {
    htmlLang: "zh-CN",
    documentTitle: "AllCanCode - AI 中转站",
    metaDescription: "AllCanCode 是面向 AI 开发者的模型中转站，统一接入、低成本调用、稳定转发。",
    navLabel: "站点导航",
    homeLabel: "AllCanCode 首页",
    languageCode: "ZH",
    switchLanguageLabel: "Switch to English",
    mascotLabel: "3D 角色切换",
    mascots: {
      robot: "机器人",
      fox: "小狐狸"
    },
    heroLabel: "AllCanCode",
    tagline: "一个入口，连通主流 AI 模型。",
    typewriter: [
      { lead: "AI 接入", accent: "更快上线" },
      { lead: "模型调用", accent: "更低成本" },
      { lead: "中转路由", accent: "更稳更省" },
      { lead: "开发提效", accent: "从这里开始" }
    ],
    description: "统一管理 Key、余额、用量与支付，把复杂模型接入变成一次配置。",
    emphasis: "GPT / Claude / Gemini 多模型中转，低价、稳定、方便接入。",
    actionsLabel: "账户操作",
    loginCta: "立即登录",
    registerCta: "注册账户",
    footer: "下滑了解更多",
    footerLabel: "查看模型列表",
    models: {
      label: "模型列表",
      title: "接入一次，多模型可用",
      description: "AllCanCode 统一接入 GPT、Claude、Gemini 等模型。一个账户管理密钥、余额、支付和调用记录。",
      cta: "立即接入",
      groups: [
        {
          id: "gpt",
          provider: "GPT",
          summary: "通用推理、代码和高并发调用",
          models: ["gpt-5.5", "gpt-5.4", "gpt-5.3", "gpt-5-mini", "gpt-5-fast"]
        },
        {
          id: "claude",
          provider: "Claude",
          summary: "长上下文、文档分析和复杂对话",
          models: ["claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-8", "claude-haiku-4-6"]
        },
        {
          id: "gemini",
          provider: "Gemini",
          summary: "多模态理解、图片输入和轻量助手",
          models: ["gemini-pro", "gemini-flash", "gemini-vision", "gemini-lite"]
        }
      ]
    },
    auth: {
      closeLabel: "关闭账户面板",
      kicker: "ACCOUNT ACCESS",
      loginTitle: "登录",
      registerTitle: "注册",
      loginSubtitle: "进入您的 AllCanCode 账户",
      registerSubtitle: "创建 AllCanCode 账户",
      submitLogin: "登录",
      submitRegister: "注册",
      oauthLabel: "第三方登录",
      switchToRegister: "还没有账户？注册",
      switchToLogin: "已有账户？登录",
      fields: {
        identifier: { label: "用户名或邮箱", placeholder: "请输入用户名或邮箱" },
        email: { label: "邮箱", placeholder: "请输入邮箱" },
        username: { label: "用户名", placeholder: "请输入用户名" },
        password: { label: "密码", placeholder: "请输入密码" }
      },
      agreement: {
        prefix: "我已阅读并同意",
        terms: "服务条款",
        policy: "使用政策",
        regions: "支持地区",
        connector: "和"
      }
    },
    dashboard: {
      ariaLabel: "用户控制台",
      navLabel: "控制台导航",
      title: "控制台",
      welcome: "欢迎回来，开发者",
      subtitle: "路由健康、余额、密钥与消费数据已同步。",
      status: "ONLINE",
      logout: "退出",
      nav: {
        overview: "总览",
        keys: "密钥",
        requests: "请求记录",
        recharge: "充值",
        lottery: "抽奖",
        forum: "论坛",
        ranking: "消费排行"
      },
      stats: {
        balance: "账户余额",
        tokens: "剩余额度",
        requests: "今日请求",
        success: "成功率"
      },
      overview: {
        health: "账号组健康",
        healthText: "核心账号组正常，备用组待命，熔断队列为空。",
        activity: "实时动向",
        spend: "消费趋势"
      },
      keys: {
        title: "我的密钥",
        subtitle: "当前账户下的 API Key 与调用配额。",
        create: "新建密钥",
        copy: "复制",
        copied: "已复制",
        rotate: "重置",
        disable: "停用",
        enable: "启用",
        active: "启用中",
        paused: "已停用",
        quota: "配额",
        created: "创建",
        usage: "使用率"
      },
      requests: {
        title: "请求记录",
        subtitle: "最近网关请求、消耗、状态与延迟。",
        time: "时间",
        model: "模型",
        endpoint: "端点",
        key: "密钥",
        status: "状态",
        tokens: "Tokens",
        cost: "费用",
        latency: "延迟"
      },
      recharge: {
        title: "账户充值",
        subtitle: "余额会用于模型转发、重试和高优先级路由。",
        balance: "当前余额",
        method: "支付方式",
        submit: "确认充值",
        done: "充值已入账",
        methods: ["支付宝", "微信支付", "银行卡"],
        packages: [
          { id: "starter", amount: 50, bonus: "赠送 3%", label: "轻量接入" },
          { id: "team", amount: 200, bonus: "赠送 8%", label: "团队常用" },
          { id: "scale", amount: 500, bonus: "赠送 15%", label: "高频调用" }
        ]
      },
      lottery: {
        title: "每日抽奖",
        subtitle: "每天 2 次，中奖后获得可复制的兑换码。",
        remaining: "今日剩余",
        draw: "抽取兑换码",
        empty: "今日次数已用完",
        latest: "本次兑换码",
        pool: "可抽兑换码",
        hint: "中奖后复制兑换码，可在充值页兑换到账户。",
        waiting: "点击抽取后显示兑换码",
        copyCode: "复制",
        copiedCode: "已复制",
        prizes: [
          { id: "redeem-18", name: "18 元兑换码", detail: "充值页兑换余额", code: "CODIUM-18-Q7K2" },
          { id: "redeem-100k", name: "100K Tokens 兑换码", detail: "本月额度兑换", code: "CODIUM-100K-M8V6" },
          { id: "redeem-priority", name: "优先路由兑换码", detail: "24 小时有效", code: "CODIUM-FAST-N9P4" },
          { id: "redeem-6", name: "6 元兑换码", detail: "充值页兑换余额", code: "CODIUM-6-Z3H7" }
        ]
      },
      forum: {
        title: "论坛",
        subtitle: "公告、模型接入和开发经验。",
        hot: "热门",
        latest: "最新",
        replies: "回复",
        compose: "发布话题",
        posts: [
          { id: "p1", title: "Codex 高并发路由最佳实践", author: "Liam", tag: "Gateway", replies: 28, time: "12 分钟前" },
          { id: "p2", title: "Claude 长上下文消耗如何估算", author: "Mika", tag: "Billing", replies: 16, time: "38 分钟前" },
          { id: "p3", title: "Gemini 图文请求的稳定重试策略", author: "Noah", tag: "Model", replies: 11, time: "1 小时前" }
        ]
      },
      ranking: {
        title: "调用排行榜",
        subtitle: "近 30 天用户请求量与 Token 调用排行。",
        rank: "排名",
        user: "用户",
        requests: "请求量",
        tokens: "Token 数"
      }
    }
  },
  en: {
    htmlLang: "en",
    documentTitle: "AllCanCode - AI Gateway Hub",
    metaDescription: "AllCanCode is an AI gateway hub for developers: easy access, lower cost, stable routing.",
    navLabel: "Site navigation",
    homeLabel: "AllCanCode home",
    languageCode: "EN",
    switchLanguageLabel: "切换到中文",
    mascotLabel: "3D character switcher",
    mascots: {
      robot: "Robot",
      fox: "Fox"
    },
    heroLabel: "AllCanCode",
    tagline: "One gateway for every AI build.",
    typewriter: [
      { lead: "AI access", accent: "launch faster" },
      { lead: "Model calls", accent: "cost less" },
      { lead: "Smart routing", accent: "stay stable" },
      { lead: "AI coding", accent: "ship more" }
    ],
    description: "Manage keys, balance, usage, and payment in one place. Turn model integration into one clean setup.",
    emphasis: "GPT / Claude / Gemini gateway routing with low-cost, reliable access.",
    actionsLabel: "Account actions",
    loginCta: "Sign in",
    registerCta: "Create account",
    footer: "Scroll to learn more",
    footerLabel: "View model list",
    models: {
      label: "Model list",
      title: "Connect once. Use more models.",
      description: "AllCanCode routes GPT, Claude, Gemini, and more through one account with shared keys, balance, payment, and usage records.",
      cta: "Start building",
      groups: [
        {
          id: "gpt",
          provider: "GPT",
          summary: "General reasoning, coding, and high-throughput calls",
          models: ["gpt-5.5", "gpt-5.4", "gpt-5.3", "gpt-5-mini", "gpt-5-fast"]
        },
        {
          id: "claude",
          provider: "Claude",
          summary: "Long context, document analysis, and complex conversations",
          models: ["claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-8", "claude-haiku-4-6"]
        },
        {
          id: "gemini",
          provider: "Gemini",
          summary: "Multimodal understanding, image input, and lightweight assistants",
          models: ["gemini-pro", "gemini-flash", "gemini-vision", "gemini-lite"]
        }
      ]
    },
    auth: {
      closeLabel: "Close account panel",
      kicker: "ACCOUNT ACCESS",
      loginTitle: "Sign in",
      registerTitle: "Create account",
      loginSubtitle: "Access your AllCanCode account",
      registerSubtitle: "Create your AllCanCode account",
      submitLogin: "Sign in",
      submitRegister: "Create account",
      oauthLabel: "Third-party sign-in",
      switchToRegister: "No account yet? Create one",
      switchToLogin: "Already have an account? Sign in",
      fields: {
        identifier: { label: "Username or email", placeholder: "Enter username or email" },
        email: { label: "Email", placeholder: "Enter email" },
        username: { label: "Username", placeholder: "Enter username" },
        password: { label: "Password", placeholder: "Enter password" }
      },
      agreement: {
        prefix: "I have read and agree to the",
        terms: "Terms of Service",
        policy: "Usage Policy",
        regions: "Supported Regions",
        connector: "and"
      }
    },
    dashboard: {
      ariaLabel: "User console",
      navLabel: "Console navigation",
      title: "Console",
      welcome: "Welcome back, developer",
      subtitle: "Routing health, balance, keys, and spend are synced.",
      status: "ONLINE",
      logout: "Sign out",
      nav: {
        overview: "Overview",
        keys: "Keys",
        requests: "Requests",
        recharge: "Recharge",
        lottery: "Lottery",
        forum: "Forum",
        ranking: "Ranking"
      },
      stats: {
        balance: "Balance",
        tokens: "Remaining quota",
        requests: "Requests today",
        success: "Success rate"
      },
      overview: {
        health: "Account Group Health",
        healthText: "Core account groups are normal, standby groups are ready, and failover queue is empty.",
        activity: "Live Activity",
        spend: "Spend Trend"
      },
      keys: {
        title: "My Keys",
        subtitle: "API keys and quotas under the current account.",
        create: "New key",
        copy: "Copy",
        copied: "Copied",
        rotate: "Rotate",
        disable: "Disable",
        enable: "Enable",
        active: "Active",
        paused: "Paused",
        quota: "Quota",
        created: "Created",
        usage: "Usage"
      },
      requests: {
        title: "Request Records",
        subtitle: "Recent gateway requests, usage, status, and latency.",
        time: "Time",
        model: "Model",
        endpoint: "Endpoint",
        key: "Key",
        status: "Status",
        tokens: "Tokens",
        cost: "Cost",
        latency: "Latency"
      },
      recharge: {
        title: "Recharge",
        subtitle: "Balance covers model routing, retries, and priority traffic.",
        balance: "Current balance",
        method: "Payment method",
        submit: "Confirm recharge",
        done: "Balance updated",
        methods: ["Alipay", "WeChat Pay", "Bank card"],
        packages: [
          { id: "starter", amount: 50, bonus: "3% bonus", label: "Starter" },
          { id: "team", amount: 200, bonus: "8% bonus", label: "Team" },
          { id: "scale", amount: 500, bonus: "15% bonus", label: "Scale" }
        ]
      },
      lottery: {
        title: "Daily Lottery",
        subtitle: "Two chances daily. Winners receive a redeemable code.",
        remaining: "Left today",
        draw: "Draw code",
        empty: "No draws left today",
        latest: "Redeem code",
        pool: "Available codes",
        hint: "Copy the winning code and redeem it on the recharge page.",
        waiting: "Draw once to reveal a code",
        copyCode: "Copy",
        copiedCode: "Copied",
        prizes: [
          { id: "redeem-18", name: "18 CNY code", detail: "Redeem balance", code: "CODIUM-18-Q7K2" },
          { id: "redeem-100k", name: "100K Tokens code", detail: "Monthly quota", code: "CODIUM-100K-M8V6" },
          { id: "redeem-priority", name: "Priority routing code", detail: "Valid for 24 hours", code: "CODIUM-FAST-N9P4" },
          { id: "redeem-6", name: "6 CNY code", detail: "Redeem balance", code: "CODIUM-6-Z3H7" }
        ]
      },
      forum: {
        title: "Forum",
        subtitle: "Announcements, model access, and developer notes.",
        hot: "Hot",
        latest: "Latest",
        replies: "Replies",
        compose: "New topic",
        posts: [
          { id: "p1", title: "Best practices for Codex high-concurrency routing", author: "Liam", tag: "Gateway", replies: 28, time: "12 min ago" },
          { id: "p2", title: "Estimating Claude long-context usage", author: "Mika", tag: "Billing", replies: 16, time: "38 min ago" },
          { id: "p3", title: "Stable retry strategy for Gemini image requests", author: "Noah", tag: "Model", replies: 11, time: "1 hour ago" }
        ]
      },
      ranking: {
        title: "Usage Ranking",
        subtitle: "Top users by requests and tokens in the last 30 days.",
        rank: "Rank",
        user: "User",
        requests: "Requests",
        tokens: "Tokens"
      }
    }
  }
} as const;

type PageCopy = (typeof copy)[Locale];

function useTypewriter(lines: readonly TypewriterLine[]) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const currentLine = lines[lineIndex] ?? lines[0];
  const fullText = `${currentLine.lead} · ${currentLine.accent}`;

  useEffect(() => {
    const delay = deleting ? 34 : charIndex === fullText.length ? 1300 : 72;
    const timer = window.setTimeout(() => {
      if (!deleting && charIndex < fullText.length) {
        setCharIndex((current) => current + 1);
        return;
      }
      if (!deleting && charIndex >= fullText.length) {
        setDeleting(true);
        return;
      }
      if (deleting && charIndex > 0) {
        setCharIndex((current) => current - 1);
        return;
      }
      setDeleting(false);
      setLineIndex((current) => (current + 1) % lines.length);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [charIndex, deleting, fullText.length, lines.length]);

  return {
    lead: currentLine.lead,
    accent: currentLine.accent,
    text: fullText.slice(0, charIndex)
  };
}

function getInitialLocale(): Locale {
  try {
    return localStorage.getItem("codium-locale") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function maskKey(secret: string) {
  return `${secret.slice(0, 8)}••••••${secret.slice(-4)}`;
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; token?: string | null } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

function formatTokenCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toDashboardKey(item: any): ApiKeyItem {
  const quota = Number(item.quotaTokens ?? 0);
  const used = Number(item.usedTokens ?? 0);
  return {
    id: String(item.id),
    name: String(item.name ?? "API Key"),
    secret: String(item.keyValue ?? item.maskedKeyValue ?? ""),
    scope: String(item.scope ?? "All models"),
    quota: `${formatTokenCount(quota)} tokens`,
    usage: quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0,
    created: formatDate(String(item.createdAt ?? "")),
    status: item.status === "disabled" ? "paused" : "active"
  };
}

function toRequestLog(item: any): RequestLog {
  return {
    id: String(item.id),
    time: formatTime(String(item.createdAt ?? "")),
    model: String(item.model ?? "-"),
    endpoint: String(item.endpoint ?? "-"),
    keyName: String(item.apiKeyName ?? "-"),
    status: String(item.statusCode ?? "-"),
    tokens: formatTokenCount(Number(item.requestTokens ?? 0)),
    cost: `¥${Number(item.cost ?? 0).toFixed(2)}`,
    latency: `${Number(item.latencyMs ?? 0)}ms`
  };
}

function toRankingItem(item: any): RankingItem {
  return {
    id: String(item.id),
    name: String(item.name ?? "-"),
    requests: formatTokenCount(Number(item.requests ?? 0)),
    tokens: formatTokenCount(Number(item.tokens ?? 0))
  };
}

function toSnapshot(payload: any): DashboardSnapshot {
  const summary = payload?.summary ?? {};
  const trend = Array.isArray(payload?.trend) ? payload.trend : [];
  const maxRequests = Math.max(1, ...trend.map((item: any) => Number(item.requests ?? 0)));
  return {
    balance: Number(summary.balance ?? 0),
    todayRequests: Number(summary.todayRequests ?? 0),
    successRate: Number(summary.successRate ?? 0),
    activeKeys: Number(summary.activeKeys ?? 0),
    totalKeys: Number(summary.totalKeys ?? 0),
    remainingTokens: formatTokenCount(Number(summary.remainingTokens ?? summary.totalTokens ?? 0)),
    activity: Array.isArray(payload?.recentActivity) ? payload.recentActivity : [],
    spendBars: trend.length > 0 ? trend.slice(-7).map((item: any) => Math.max(8, Math.round((Number(item.requests ?? 0) / maxRequests) * 100))) : []
  };
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [mascot, setMascot] = useState<MascotVariant>("robot");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() => readStoredToken());
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [activeDashboardSection, setActiveDashboardSection] = useState<DashboardSection>("overview");
  const heroState = authMode || isAuthenticated ? "auth" : "intro";
  const t = copy[locale];
  const typedLine = useTypewriter(t.typewriter);
  const dashboardNavItems = (Object.keys(t.dashboard.nav) as DashboardSection[]).map((id) => ({
    id,
    label: t.dashboard.nav[id],
    icon: dashboardIcons[id]
  }));

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = t.documentTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", t.documentTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", t.metaDescription);

    try {
      localStorage.setItem("codium-locale", locale);
    } catch {
      // Ignore storage failures; the visible language switch still works for this session.
    }
  }, [locale, t]);

  useEffect(() => {
    let cancelled = false;
    const storedToken = readStoredToken();
    if (!storedToken) return;

    apiRequest<{ user: SessionUser }>("/me", { token: storedToken })
      .then((payload) => {
        if (cancelled) return;
        setSessionToken(storedToken);
        setSessionUser(payload.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setSessionToken(null);
        setSessionUser(null);
        setIsAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLocale = () => setLocale((current) => (current === "zh" ? "en" : "zh"));
  const enterDashboard = (payload: { token: string; user: SessionUser }) => {
    if (payload.user.role === "admin") {
      localStorage.setItem("auth_token", payload.token);
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.assign("/admin/dashboard");
      return;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    setSessionToken(payload.token);
    setSessionUser(payload.user);
    setAuthError("");
    setAuthMode(null);
    setIsAuthenticated(true);
    setActiveDashboardSection("overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const leaveDashboard = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSessionToken(null);
    setSessionUser(null);
    setAuthError("");
    setIsAuthenticated(false);
    setAuthMode(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openAuth = (mode: Exclude<AuthMode, null>) => {
    setAuthError("");
    setAuthMode(mode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className={`app-shell ${isAuthenticated ? "is-dashboard" : ""}`}>
      <RobotScene mode={heroState} mascot={mascot} />

      <header className="topbar" aria-label={t.navLabel}>
        <a className="brand-mark" href="/" aria-label={t.homeLabel}>
          <span className="logo-core">
            <CodiumLogo className="codium-logo" />
          </span>
          <span>
            <strong>AllCanCode</strong>
          </span>
        </a>

        {isAuthenticated && (
          <nav className="top-dashboard-nav" aria-label={t.dashboard.navLabel}>
            {dashboardNavItems.map(({ id, label, icon: Icon }) => (
              <button className={activeDashboardSection === id ? "is-active" : ""} key={id} type="button" onClick={() => setActiveDashboardSection(id)}>
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="top-actions">
          {!isAuthenticated && (
            <div className="mascot-switch" aria-label={t.mascotLabel}>
              {mascotOptions.map(({ id, icon: Icon }) => (
                <button
                  className={mascot === id ? "is-active" : ""}
                  type="button"
                  key={id}
                  onClick={() => setMascot(id)}
                  aria-pressed={mascot === id}
                  title={t.mascots[id]}
                >
                  <Icon size={16} />
                  <span>{t.mascots[id]}</span>
                </button>
              ))}
            </div>
          )}
          <button className="icon-pill language-toggle" type="button" onClick={toggleLocale} aria-label={t.switchLanguageLabel} title={t.switchLanguageLabel}>
            <Globe2 size={17} />
            <span>{t.languageCode}</span>
          </button>
          {isAuthenticated && (
            <button className="icon-pill session-pill" type="button" onClick={leaveDashboard}>
              <UserRound size={17} />
              <span>{t.dashboard.logout}</span>
            </button>
          )}
        </div>
      </header>

      {isAuthenticated ? (
        <DashboardPage copy={t} locale={locale} token={sessionToken} user={sessionUser} activeSection={activeDashboardSection} onSectionChange={setActiveDashboardSection} />
      ) : (
        <>
          <section className={`hero-grid ${authMode ? "is-auth" : ""}`} aria-label={t.heroLabel}>
            <AnimatePresence mode="wait">
              {authMode ? (
                <AuthPanel key={authMode} copy={t} mode={authMode} error={authError} onError={setAuthError} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} onSuccess={enterDashboard} />
              ) : (
                <motion.div
                  className="hero-copy"
                  key="hero-copy"
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h1>AllCanCode</h1>
                  <p className="tagline">{t.tagline}</p>
                  <p className="typewriter-line" aria-label={`${typedLine.lead} ${typedLine.accent}`}>
                    <span>{typedLine.text}</span>
                    <i />
                  </p>

                  <div className="hero-actions" aria-label={t.actionsLabel}>
                    <button className="primary-button" type="button" onClick={() => openAuth("login")}>
                      <LockKeyhole size={18} />
                      {t.models.cta}
                    </button>
                    <button className="ghost-button" type="button" onClick={() => openAuth("register")}>
                      {t.registerCta}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <a className="footer-bar" href="#models" aria-label={t.footerLabel}>
            <span>{t.footer}</span>
            <ChevronDown size={16} />
          </a>

          <ModelSection copy={t} onStart={() => openAuth("login")} />
        </>
      )}
    </main>
  );
}

function DashboardPage({
  copy,
  locale,
  token,
  user,
  activeSection,
  onSectionChange
}: {
  copy: PageCopy;
  locale: Locale;
  token: string | null;
  user: SessionUser | null;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
}) {
  const d = copy.dashboard;
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [requestItems, setRequestItems] = useState<RequestLog[]>([]);
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSnapshot>({
    balance: 0,
    todayRequests: 0,
    successRate: 0,
    activeKeys: 0,
    totalKeys: 0,
    remainingTokens: "0",
    activity: [],
    spendBars: []
  });
  const [selectedPackageId, setSelectedPackageId] = useState<string>(d.recharge.packages[1].id);
  const [paymentMethod, setPaymentMethod] = useState<string>(d.recharge.methods[0]);
  const [rechargeStatus, setRechargeStatus] = useState("");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [drawsLeft, setDrawsLeft] = useState(2);
  const [latestPrize, setLatestPrize] = useState<LotteryPrize | null>(null);
  const [copiedPrizeCode, setCopiedPrizeCode] = useState(false);

  const selectedPackage = d.recharge.packages.find((item) => item.id === selectedPackageId) ?? d.recharge.packages[0];
  const activeKeys = dashboard.activeKeys || keys.filter((item) => item.status === "active").length;
  const totalKeys = dashboard.totalKeys || keys.length;
  const balance = user?.balance ?? dashboard.balance;
  const methodOptions = useMemo(
    () => (paymentMethods.length > 0 ? paymentMethods : d.recharge.methods.map((method) => ({ methodCode: method, methodName: method }))),
    [d.recharge.methods, paymentMethods]
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [locale]
  );

  useEffect(() => {
    setPaymentMethod((current) => current || methodOptions[0]?.methodCode || d.recharge.methods[0]);
    setRechargeStatus("");
  }, [d.recharge.methods, methodOptions]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      apiRequest<any>("/dashboard", { token }),
      apiRequest<{ items: any[] }>("/keys", { token }),
      apiRequest<{ items: any[] }>("/usage?page=1&pageSize=20", { token }),
      apiRequest<{ items: any[] }>("/ranking?limit=10", { token }),
      apiRequest<{ items: PaymentMethodItem[] }>("/payment/methods", { token }).catch(() => ({ items: [] }))
    ])
      .then(([dashboardPayload, keyPayload, usagePayload, rankingPayload, methodPayload]) => {
        if (cancelled) return;
        setDashboard(toSnapshot(dashboardPayload));
        setKeys((keyPayload.items ?? []).map(toDashboardKey));
        setRequestItems((usagePayload.items ?? []).map(toRequestLog));
        setRankingItems((rankingPayload.items ?? []).map(toRankingItem));
        setPaymentMethods(methodPayload.items ?? []);
      })
      .catch((error) => {
        if (!cancelled) setRechargeStatus(error instanceof Error ? error.message : "Unable to sync account data.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const createKey = () => {
    if (!token) {
      setRechargeStatus(locale === "zh" ? "请先登录后再创建 Key。" : "Please sign in before creating a key.");
      return;
    }

    apiRequest<{ item: any }>("/keys", {
      method: "POST",
      token,
      body: {
        name: locale === "zh" ? "个人密钥" : "Personal Key"
      }
    })
      .then((payload) => setKeys((current) => [toDashboardKey(payload.item), ...current]))
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to create key."));
    onSectionChange("keys");
  };

  const toggleKeyStatus = (id: string) => {
    const item = keys.find((key) => key.id === id);
    if (!token || !item) {
      setRechargeStatus(locale === "zh" ? "请先登录后再更新 Key。" : "Please sign in before updating a key.");
      return;
    }

    const nextStatus = item.status === "active" ? "disabled" : "active";
    apiRequest<{ item: any }>(`/keys/${id}`, { method: "PATCH", token, body: { status: nextStatus } })
      .then((payload) => setKeys((current) => current.map((key) => (key.id === id ? toDashboardKey(payload.item) : key))))
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to update key."));
  };

  const rotateKey = (id: string) => {
    setRechargeStatus(locale === "zh" ? "sub2api 暂未开放前端重置 Key 接口，请在管理端处理。" : "Key rotation is not available from the user API yet.");
  };

  const copyKey = (key: ApiKeyItem) => {
    navigator.clipboard?.writeText(key.secret).catch(() => undefined);
    setCopiedKeyId(key.id);
    window.setTimeout(() => setCopiedKeyId(null), 1400);
  };

  const submitRecharge = () => {
    if (!token) {
      setRechargeStatus(locale === "zh" ? "请先登录后再发起充值。" : "Please sign in before recharging.");
      return;
    }

    apiRequest<{ checkout?: { submitUrl?: string }; item?: unknown }>("/orders", {
      method: "POST",
      token,
      body: {
        packageName: selectedPackage.label,
        amount: selectedPackage.amount,
        bonusAmount: 0,
        methodCode: paymentMethod
      }
    })
      .then((payload) => {
        setRechargeStatus(`${d.recharge.done} · ${paymentMethod}`);
        if (payload.checkout?.submitUrl) {
          window.open(payload.checkout.submitUrl, "_blank", "noopener,noreferrer");
        }
      })
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to create order."));
  };

  const drawPrize = () => {
    if (drawsLeft <= 0) return;
    const prize = d.lottery.prizes[Math.floor(Math.random() * d.lottery.prizes.length)];
    setDrawsLeft((current) => Math.max(0, current - 1));
    setLatestPrize(prize);
    setCopiedPrizeCode(false);
  };

  const copyPrizeCode = () => {
    if (!latestPrize) return;
    navigator.clipboard?.writeText(latestPrize.code).catch(() => undefined);
    setCopiedPrizeCode(true);
    window.setTimeout(() => setCopiedPrizeCode(false), 1400);
  };

  return (
    <motion.section
      className="dashboard-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      aria-label={d.ariaLabel}
    >
      <div className="dashboard-main">
        <AnimatePresence mode="wait">
          {activeSection === "overview" && (
            <motion.div key="overview" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <header className="dashboard-header">
                <div>
                  <span className="auth-kicker">{d.title}</span>
                  <h2>{d.welcome}</h2>
                  <p>{d.subtitle}</p>
                </div>
                <div className="dashboard-balance">
                  <span>{d.stats.balance}</span>
                  <strong>¥{currencyFormatter.format(balance)}</strong>
                </div>
              </header>

              <section className="metric-grid" aria-label={d.title}>
                <MetricCard icon={Wallet} label={d.stats.balance} value={`¥${currencyFormatter.format(balance)}`} tone="neutral" />
                <MetricCard icon={Zap} label={d.stats.tokens} value={dashboard.remainingTokens} tone="green" />
                <MetricCard icon={Activity} label={d.stats.requests} value={formatTokenCount(dashboard.todayRequests)} tone="rose" />
                <MetricCard icon={ShieldCheck} label={d.stats.success} value={`${dashboard.successRate.toFixed(2)}%`} tone="gold" />
              </section>

              <section className="overview-grid">
                <article className="dashboard-panel health-panel">
                  <div className="panel-heading">
                    <Gauge size={19} />
                    <h3>{d.overview.health}</h3>
                  </div>
                  <div className="health-orbit">
                    <span />
                    <strong>{activeKeys}/{totalKeys}</strong>
                    <small>{d.keys.active}</small>
                  </div>
                  <p>{d.overview.healthText}</p>
                </article>

                <article className="dashboard-panel">
                  <div className="panel-heading">
                    <Activity size={19} />
                    <h3>{d.overview.activity}</h3>
                  </div>
                  <div className="activity-feed">
                    {dashboard.activity.length > 0 ? (
                      dashboard.activity.map((item) => (
                        <div className="activity-item" key={item}>
                          <span />
                          <p>{item}</p>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">{locale === "zh" ? "暂无真实调用记录。" : "No real usage activity yet."}</p>
                    )}
                  </div>
                </article>

                <article className="dashboard-panel spend-panel">
                  <div className="panel-heading">
                    <BarChart3 size={19} />
                    <h3>{d.overview.spend}</h3>
                  </div>
                  <div className="spend-chart" aria-hidden="true">
                    {dashboard.spendBars.length > 0 ? (
                      dashboard.spendBars.map((height, index) => (
                        <span key={index} style={{ height: `${height}%` }} />
                      ))
                    ) : (
                      <p className="empty-state">{locale === "zh" ? "暂无趋势数据。" : "No trend data yet."}</p>
                    )}
                  </div>
                </article>
              </section>
            </motion.div>
          )}

          {activeSection === "keys" && (
            <motion.div key="keys" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.keys.title} subtitle={d.keys.subtitle}>
                <button className="section-action" type="button" onClick={createKey}>
                  <Plus size={17} />
                  <span>{d.keys.create}</span>
                </button>
              </SectionHeading>

              <div className="key-list">
                {keys.length > 0 ? keys.map((item) => (
                  <article className="key-row" key={item.id}>
                    <div className="key-main">
                      <span className={`key-status ${item.status}`} />
                      <div>
                        <h3>{item.name}</h3>
                        <code>{maskKey(item.secret)}</code>
                      </div>
                    </div>
                    <div className="key-meta">
                      <span>{item.scope}</span>
                      <span>
                        {d.keys.quota}: {item.quota}
                      </span>
                      <span>
                        {d.keys.created}: {item.created}
                      </span>
                    </div>
                    <div className="usage-track" aria-label={`${d.keys.usage} ${item.usage}%`}>
                      <span style={{ width: `${item.usage}%` }} />
                    </div>
                    <div className="key-actions">
                      <button type="button" onClick={() => copyKey(item)} title={d.keys.copy}>
                        <Copy size={16} />
                        <span>{copiedKeyId === item.id ? d.keys.copied : d.keys.copy}</span>
                      </button>
                      <button type="button" onClick={() => rotateKey(item.id)} title={d.keys.rotate}>
                        <RefreshCw size={16} />
                        <span>{d.keys.rotate}</span>
                      </button>
                      <button type="button" onClick={() => toggleKeyStatus(item.id)}>
                        <Bell size={16} />
                        <span>{item.status === "active" ? d.keys.disable : d.keys.enable}</span>
                      </button>
                    </div>
                  </article>
                )) : <p className="empty-state">{locale === "zh" ? "暂无 Key，点击上方按钮创建。" : "No keys yet. Create one above."}</p>}
              </div>
            </motion.div>
          )}

          {activeSection === "requests" && (
            <motion.div key="requests" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.requests.title} subtitle={d.requests.subtitle} />
              <div className="data-table request-table">
                <div className="table-row table-head">
                  <span>{d.requests.time}</span>
                  <span>{d.requests.model}</span>
                  <span>{d.requests.endpoint}</span>
                  <span>{d.requests.key}</span>
                  <span>{d.requests.status}</span>
                  <span>{d.requests.tokens}</span>
                  <span>{d.requests.cost}</span>
                  <span>{d.requests.latency}</span>
                </div>
                {requestItems.length > 0 ? requestItems.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.time}</span>
                    <strong>{item.model}</strong>
                    <code>{item.endpoint}</code>
                    <span>{item.keyName}</span>
                    <span className={item.status === "200" ? "status-ok" : "status-warn"}>{item.status}</span>
                    <span>{item.tokens}</span>
                    <span>{item.cost}</span>
                    <span>{item.latency}</span>
                  </div>
                )) : <p className="empty-state">{locale === "zh" ? "暂无使用记录。" : "No usage records yet."}</p>}
              </div>
            </motion.div>
          )}

          {activeSection === "recharge" && (
            <motion.div key="recharge" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.recharge.title} subtitle={d.recharge.subtitle} />
              <section className="recharge-layout">
                <article className="dashboard-panel recharge-summary">
                  <span>{d.recharge.balance}</span>
                  <strong>¥{currencyFormatter.format(balance)}</strong>
                  <p>{rechargeStatus || selectedPackage.bonus}</p>
                  <div className="selected-package">
                    <span>{selectedPackage.label}</span>
                    <strong>¥{selectedPackage.amount}</strong>
                  </div>
                </article>
                <article className="dashboard-panel recharge-checkout">
                  <div className="checkout-heading">
                    <span>{d.recharge.submit}</span>
                    <strong>¥{selectedPackage.amount}</strong>
                  </div>
                  <div className="recharge-options">
                    {d.recharge.packages.map((item) => (
                      <button className={selectedPackageId === item.id ? "is-active" : ""} type="button" key={item.id} onClick={() => setSelectedPackageId(item.id)}>
                        <strong>¥{item.amount}</strong>
                        <span>{item.label}</span>
                        <small>{item.bonus}</small>
                      </button>
                    ))}
                  </div>
                  <div className="payment-methods" aria-label={d.recharge.method}>
                    {methodOptions.map((method) => (
                      <button className={paymentMethod === method.methodCode ? "is-active" : ""} type="button" key={method.methodCode} onClick={() => setPaymentMethod(method.methodCode)}>
                        <CreditCard size={17} />
                        <span>{method.methodName}</span>
                      </button>
                    ))}
                  </div>
                  <button className="wide-action" type="button" onClick={submitRecharge}>
                    <Banknote size={18} />
                    <span>{d.recharge.submit}</span>
                  </button>
                </article>
              </section>
            </motion.div>
          )}

          {activeSection === "lottery" && (
            <motion.div key="lottery" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.lottery.title} subtitle={d.lottery.subtitle} />
              <section className="lottery-layout">
                <article className="lottery-stage">
                  <div className="lottery-core">
                    <span className="lottery-icon">
                      <Dices size={30} />
                    </span>
                    <strong>{drawsLeft}</strong>
                    <span>{d.lottery.remaining}</span>
                  </div>
                  <button className="wide-action" type="button" onClick={drawPrize} disabled={drawsLeft <= 0}>
                    <Gift size={18} />
                    <span>{drawsLeft > 0 ? d.lottery.draw : d.lottery.empty}</span>
                  </button>
                </article>
                <article className="dashboard-panel prize-panel">
                  <div className="panel-heading">
                    <Crown size={19} />
                    <h3>{d.lottery.latest}</h3>
                  </div>
                  {latestPrize ? (
                    <div className="latest-prize">
                      <div>
                        <span>{latestPrize.name}</span>
                        <strong>{latestPrize.code}</strong>
                      </div>
                      <p>{latestPrize.detail}</p>
                      <button className="code-copy-button" type="button" onClick={copyPrizeCode}>
                        <Copy size={16} />
                        <span>{copiedPrizeCode ? d.lottery.copiedCode : d.lottery.copyCode}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="latest-prize">
                      <div>
                        <span>{d.lottery.pool}</span>
                        <strong>{d.lottery.waiting}</strong>
                      </div>
                      <p>{d.lottery.hint}</p>
                    </div>
                  )}
                  <div className="prize-list">
                    {d.lottery.prizes.map((prize) => (
                      <div className="prize-chip" key={prize.id}>
                        <span>{prize.name}</span>
                        <code>{prize.code}</code>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </motion.div>
          )}

          {activeSection === "forum" && (
            <motion.div key="forum" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.forum.title} subtitle={d.forum.subtitle}>
                <button className="section-action" type="button">
                  <MessageSquare size={17} />
                  <span>{d.forum.compose}</span>
                </button>
              </SectionHeading>
              <div className="forum-tabs">
                <button className="is-active" type="button">{d.forum.hot}</button>
                <button type="button">{d.forum.latest}</button>
              </div>
              <div className="forum-list">
                {d.forum.posts.map((post) => (
                  <article className="forum-row" key={post.id}>
                    <span>{post.tag}</span>
                    <div>
                      <h3>{post.title}</h3>
                      <p>
                        {post.author} · {post.time}
                      </p>
                    </div>
                    <strong>
                      {post.replies} {d.forum.replies}
                    </strong>
                  </article>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === "ranking" && (
            <motion.div key="ranking" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.ranking.title} subtitle={d.ranking.subtitle} />
              <div className="data-table ranking-table">
                <div className="table-row table-head">
                  <span>{d.ranking.rank}</span>
                  <span>{d.ranking.user}</span>
                  <span>{d.ranking.requests}</span>
                  <span>{d.ranking.tokens}</span>
                </div>
                {rankingItems.length > 0 ? rankingItems.map((item, index) => (
                  <div className="table-row" key={item.id}>
                    <span className="rank-number">{index + 1}</span>
                    <strong>{item.name}</strong>
                    <span>{item.requests}</span>
                    <span>{item.tokens}</span>
                  </div>
                )) : <p className="empty-state">{locale === "zh" ? "暂无真实排行数据。" : "No real ranking data yet."}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone: "neutral" | "green" | "rose" | "gold" }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SectionHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <header className="section-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </header>
  );
}

function ModelSection({ copy, onStart }: { copy: PageCopy; onStart: () => void }) {
  return (
    <section className="models-section" id="models" aria-label={copy.models.label}>
      <div className="models-inner">
        <div className="models-heading">
          <h2>{copy.models.title}</h2>
          <p>{copy.models.description}</p>
          <button className="model-cta" type="button" onClick={onStart}>
            {copy.models.cta}
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="models-body">
          <div className="model-list">
            {copy.models.groups.map((group) => (
              <article className="model-family" key={group.id}>
                <div>
                  <h3>{group.provider}</h3>
                  <p>{group.summary}</p>
                </div>
                <div className="model-chip-list" aria-label={group.provider}>
                  {group.models.map((model) => (
                    <span key={model}>{model}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthPanel({
  copy,
  mode,
  error,
  onError,
  onClose,
  onSwitch,
  onSuccess
}: {
  copy: PageCopy;
  mode: Exclude<AuthMode, null>;
  error: string;
  onError: (message: string) => void;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  onSuccess: (payload: { token: string; user: SessionUser }) => void;
}) {
  const isLogin = mode === "login";
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<AuthFieldId, string>>({
    identifier: "",
    email: "",
    username: "",
    password: ""
  });
  const title = isLogin ? copy.auth.loginTitle : copy.auth.registerTitle;
  const subtitle = isLogin ? copy.auth.loginSubtitle : copy.auth.registerSubtitle;
  const fieldIds: AuthFieldId[] = isLogin ? ["identifier", "password"] : ["email", "username", "password"];

  async function submitAuth() {
    if (!acceptedAgreement || submitting) return;
    setSubmitting(true);
    onError("");

    const body: AuthPayload = isLogin
      ? { identifier: formValues.identifier.trim(), password: formValues.password }
      : { username: formValues.username.trim(), email: formValues.email.trim(), password: formValues.password };

    try {
      const payload = await apiRequest<{ token: string; user: SessionUser }>(isLogin ? "/auth/login" : "/auth/register", {
        method: "POST",
        body
      });
      onSuccess(payload);
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.aside
      className="auth-panel"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      aria-label={title}
    >
      <button className="close-button" type="button" onClick={onClose} aria-label={copy.auth.closeLabel}>
        <X size={18} />
      </button>
      <span className="auth-kicker">{copy.auth.kicker}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitAuth();
        }}
      >
        {fieldIds.map((id) => {
          const { type, icon: Icon } = authFieldConfig[id];
          const field = copy.auth.fields[id];
          const autoComplete =
            id === "password" ? (isLogin ? "current-password" : "new-password") : id === "identifier" ? "username" : id;

          return (
            <label className="field" key={id} htmlFor={id}>
              <span>{field.label}</span>
              <div className="input-shell">
                <Icon size={18} />
                <input
                  id={id}
                  type={type}
                  placeholder={field.placeholder}
                  autoComplete={autoComplete}
                  value={formValues[id]}
                  onChange={(event) => setFormValues((current) => ({ ...current, [id]: event.currentTarget.value }))}
                />
              </div>
            </label>
          );
        })}

        {error && <p className="auth-error">{error}</p>}

        <label className="agreement" htmlFor="agreement">
          <input id="agreement" type="checkbox" checked={acceptedAgreement} onChange={(event) => setAcceptedAgreement(event.currentTarget.checked)} />
          <span>
            {copy.auth.agreement.prefix} <a href="/terms">{copy.auth.agreement.terms}</a>、<a href="/policy">{copy.auth.agreement.policy}</a>{" "}
            {copy.auth.agreement.connector} <a href="/regions">{copy.auth.agreement.regions}</a>
          </span>
        </label>

        <button className="submit-button" type="submit" disabled={!acceptedAgreement || submitting}>
          {submitting ? "..." : isLogin ? copy.auth.submitLogin : copy.auth.submitRegister}
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="oauth-row" aria-label={copy.auth.oauthLabel}>
        <button type="button" disabled>
          <GitBranch size={18} />
          GitHub
        </button>
        <button type="button" disabled>
          <Globe2 size={18} />
          Google
        </button>
      </div>

      <button className="switch-auth" type="button" onClick={() => onSwitch(isLogin ? "register" : "login")}>
        {isLogin ? copy.auth.switchToRegister : copy.auth.switchToLogin}
      </button>
    </motion.aside>
  );
}

export default App;
