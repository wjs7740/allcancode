import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Banknote,
  Bell,
  Ban,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Dices,
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
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
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
  maskedSecret: string;
  scope: string;
  quota: string;
  quotaUsd: number;
  quotaUsedUsd: number;
  quotaRemainingUsd: number | null;
  usage: number;
  created: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  status: "active" | "inactive" | "quota_exhausted" | "expired";
  rateLimit5h: number;
  rateLimit1d: number;
  rateLimit7d: number;
  usage5h: number;
  usage1d: number;
  usage7d: number;
  ipRestricted: boolean;
};

type RequestLog = {
  id: string;
  time: string;
  createdAt: string;
  model: string;
  endpoint: string;
  keyName: string;
  statusCode: number;
  status: string;
  requestType: string;
  tokens: string;
  inputTokens: string;
  outputTokens: string;
  cacheTokens: string;
  cost: string;
  standardCost: string;
  latency: string;
  firstToken: string;
  userAgent: string;
  billingMode: string;
};

type ChannelMonitorStatus = "operational" | "degraded" | "failed" | "error" | "empty" | string;

type ChannelMonitorTimelinePoint = {
  status: ChannelMonitorStatus;
  latencyMs: number | null;
  pingLatencyMs: number | null;
  checkedAt: string | null;
};

type ChannelMonitorItem = {
  id: string;
  name: string;
  provider: string;
  groupName: string;
  primaryModel: string;
  primaryStatus: ChannelMonitorStatus;
  primaryLatencyMs: number | null;
  primaryPingLatencyMs: number | null;
  availability7d: number | null;
  extraModels: { model: string; status: ChannelMonitorStatus; latencyMs: number | null }[];
  timeline: ChannelMonitorTimelinePoint[];
};

type ChannelMonitorDetail = {
  id: string;
  models: {
    model: string;
    latestStatus: ChannelMonitorStatus;
    latestLatencyMs: number | null;
    availability7d: number | null;
    availability15d: number | null;
    availability30d: number | null;
    avgLatency7dMs: number | null;
  }[];
};

type UsageSummary = {
  totalRequests: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  totalActualCost: number;
  averageDurationMs: number;
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
  dailyLimit?: number;
  dailyRemaining?: number;
  feeRate?: number;
  available?: boolean;
};

type CheckoutInfo = {
  globalMin: number;
  globalMax: number;
  balanceDisabled: boolean;
  balanceRechargeMultiplier: number;
  rechargeFeeRate: number;
  helpText: string;
  helpImageUrl: string;
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
        health: "渠道监控",
        healthText: "监控数据来自 sub2api 渠道状态页。",
        activity: "可用性",
        spend: "最近检测",
        window7d: "7 天",
        window15d: "15 天",
        window30d: "30 天",
        operational: "全部正常",
        degraded: "部分异常",
        availability: "可用率",
        latency: "请求延迟",
        ping: "入口延迟",
        history: "最近 60 次",
        extraModels: "扩展模型",
        empty: "暂无渠道监控数据，请在 sub2api 后台添加渠道监控。"
      },
      keys: {
        title: "我的密钥",
        subtitle: "按 sub2api 密钥管理字段展示当前账户的 API Key。",
        create: "新建密钥",
        createPlaceholder: "新密钥名称",
        search: "搜索名称或 Key",
        allStatus: "全部状态",
        copy: "复制",
        copied: "已复制",
        rename: "改名",
        delete: "删除",
        use: "使用",
        rotate: "重置",
        disable: "停用",
        enable: "启用",
        active: "启用中",
        inactive: "已停用",
        quotaExhausted: "配额耗尽",
        expired: "已过期",
        group: "分组",
        rateLimit: "限额",
        lastUsed: "最后使用",
        expires: "过期时间",
        never: "永不过期",
        noLimit: "不限",
        quota: "配额",
        created: "创建",
        usage: "使用率"
      },
      requests: {
        title: "请求记录",
        subtitle: "数据来自 sub2api 请求记录，包含模型、端点、Token、计费与延迟。",
        refresh: "刷新",
        allKeys: "全部密钥",
        startDate: "开始日期",
        endDate: "结束日期",
        time: "时间",
        model: "模型",
        endpoint: "端点",
        key: "密钥",
        type: "类型",
        status: "状态",
        tokens: "Tokens",
        input: "输入",
        output: "输出",
        cache: "缓存",
        cost: "费用",
        latency: "总耗时",
        firstToken: "首包",
        userAgent: "User Agent"
      },
      recharge: {
        title: "账户充值",
        subtitle: "Kyren EasyPay 已接入全部兼容支付方式，创建订单后会跳转到支付页。",
        balance: "当前余额",
        amount: "充值金额",
        credited: "预计到账",
        payAmount: "支付金额",
        fee: "手续费",
        limit: "单笔限额",
        method: "支付方式",
        submit: "确认充值",
        done: "充值已创建",
        openPay: "打开支付页",
        unavailable: "该支付方式当前不可用",
        methods: ["支付宝", "微信支付", "信用卡", "Crypto", "PayNow"],
        packages: [
          { id: "starter", amount: 10, bonus: "快速测试", label: "体验" },
          { id: "team", amount: 50, bonus: "常用金额", label: "标准" },
          { id: "scale", amount: 200, bonus: "团队充值", label: "团队" },
          { id: "max", amount: 500, bonus: "高频调用", label: "高频" }
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
        health: "Channel Monitor",
        healthText: "Monitor data is synced from the sub2api channel status page.",
        activity: "Availability",
        spend: "Latest Checks",
        window7d: "7D",
        window15d: "15D",
        window30d: "30D",
        operational: "Operational",
        degraded: "Degraded",
        availability: "Availability",
        latency: "Request latency",
        ping: "Endpoint ping",
        history: "Last 60 checks",
        extraModels: "Extra models",
        empty: "No channel monitors yet. Add monitors in the sub2api admin panel."
      },
      keys: {
        title: "My Keys",
        subtitle: "API key management fields are synced from sub2api.",
        create: "New key",
        createPlaceholder: "New key name",
        search: "Search name or key",
        allStatus: "All status",
        copy: "Copy",
        copied: "Copied",
        rename: "Rename",
        delete: "Delete",
        use: "Use",
        rotate: "Rotate",
        disable: "Disable",
        enable: "Enable",
        active: "Active",
        inactive: "Inactive",
        quotaExhausted: "Quota exhausted",
        expired: "Expired",
        group: "Group",
        rateLimit: "Rate limit",
        lastUsed: "Last used",
        expires: "Expires",
        never: "Never",
        noLimit: "Unlimited",
        quota: "Quota",
        created: "Created",
        usage: "Usage"
      },
      requests: {
        title: "Request Records",
        subtitle: "Request log data comes from sub2api usage records.",
        refresh: "Refresh",
        allKeys: "All keys",
        startDate: "Start date",
        endDate: "End date",
        time: "Time",
        model: "Model",
        endpoint: "Endpoint",
        key: "Key",
        type: "Type",
        status: "Status",
        tokens: "Tokens",
        input: "Input",
        output: "Output",
        cache: "Cache",
        cost: "Cost",
        latency: "Duration",
        firstToken: "First token",
        userAgent: "User Agent"
      },
      recharge: {
        title: "Recharge",
        subtitle: "Kyren EasyPay methods are connected. Orders open the hosted payment page.",
        balance: "Current balance",
        amount: "Recharge amount",
        credited: "Credited balance",
        payAmount: "Pay amount",
        fee: "Fee",
        limit: "Per-order limit",
        method: "Payment method",
        submit: "Confirm recharge",
        done: "Order created",
        openPay: "Open payment page",
        unavailable: "This method is unavailable",
        methods: ["Alipay", "WeChat Pay", "Credit Card", "Crypto", "PayNow"],
        packages: [
          { id: "starter", amount: 10, bonus: "Quick test", label: "Trial" },
          { id: "team", amount: 50, bonus: "Common amount", label: "Standard" },
          { id: "scale", amount: 200, bonus: "Team recharge", label: "Team" },
          { id: "max", amount: 500, bonus: "High volume", label: "Scale" }
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
  if (!secret) return "";
  if (secret.includes("...") || secret.length <= 14) return secret;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { hour12: false });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatUsd(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "$0.0000";
  return `$${value.toFixed(digits)}`;
}

function formatDuration(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function normalizeStatusText(value: string) {
  const status = value.toLowerCase();
  if (["disabled", "paused"].includes(status)) return "inactive";
  return status || "inactive";
}

function toDashboardKey(item: any): ApiKeyItem {
  const quota = Number(item.quotaTokens ?? 0);
  const used = Number(item.usedTokens ?? 0);
  const quotaUsd = Number(item.quota ?? 0);
  const quotaUsedUsd = Number(item.quotaUsed ?? item.quota_used ?? 0);
  const secret = String(item.keyValue ?? item.key ?? item.maskedKeyValue ?? item.maskedKey ?? "");
  const status = normalizeStatusText(String(item.status ?? item.rawStatus ?? ""));
  return {
    id: String(item.id),
    name: String(item.name ?? "API Key"),
    secret,
    maskedSecret: String(item.maskedKeyValue ?? item.maskedKey ?? maskKey(secret)),
    scope: String(item.scope ?? "All models"),
    quota: quotaUsd > 0 ? `${formatUsd(quotaUsedUsd, 2)} / ${formatUsd(quotaUsd, 2)}` : "Unlimited",
    quotaUsd,
    quotaUsedUsd,
    quotaRemainingUsd: item.quotaRemaining == null ? null : Number(item.quotaRemaining),
    usage: quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0,
    created: formatDate(String(item.createdAt ?? "")),
    createdAt: String(item.createdAt ?? ""),
    lastUsed: formatDateTime(item.lastUsedAt),
    expiresAt: item.expiresAt ? formatDateTime(item.expiresAt) : "",
    status: (["active", "inactive", "quota_exhausted", "expired"].includes(status) ? status : "inactive") as ApiKeyItem["status"],
    rateLimit5h: Number(item.rateLimit5h ?? 0),
    rateLimit1d: Number(item.rateLimit1d ?? 0),
    rateLimit7d: Number(item.rateLimit7d ?? 0),
    usage5h: Number(item.usage5h ?? 0),
    usage1d: Number(item.usage1d ?? 0),
    usage7d: Number(item.usage7d ?? 0),
    ipRestricted: (Array.isArray(item.ipWhitelist) && item.ipWhitelist.length > 0) || (Array.isArray(item.ipBlacklist) && item.ipBlacklist.length > 0)
  };
}

function toRequestLog(item: any): RequestLog {
  const inputTokens = Number(item.inputTokens ?? 0);
  const outputTokens = Number(item.outputTokens ?? 0);
  const cacheTokens = Number(item.cacheCreationTokens ?? 0) + Number(item.cacheReadTokens ?? 0);
  const statusCode = Number(item.statusCode ?? 0);
  return {
    id: String(item.id),
    time: formatTime(String(item.createdAt ?? "")),
    createdAt: String(item.createdAt ?? ""),
    model: String(item.model ?? "-"),
    endpoint: String(item.inboundEndpoint ?? item.endpoint ?? "-"),
    keyName: String(item.apiKeyName ?? "-"),
    statusCode,
    status: statusCode > 0 ? String(statusCode) : "-",
    requestType: String(item.requestType ?? (item.stream ? "stream" : "sync")),
    tokens: formatTokenCount(Number(item.requestTokens ?? 0)),
    inputTokens: formatTokenCount(inputTokens),
    outputTokens: formatTokenCount(outputTokens),
    cacheTokens: formatTokenCount(cacheTokens),
    cost: formatUsd(Number(item.actualCost ?? item.cost ?? 0), 6),
    standardCost: formatUsd(Number(item.standardCost ?? 0), 6),
    latency: formatDuration(Number(item.durationMs ?? item.latencyMs ?? 0)),
    firstToken: formatDuration(item.firstTokenMs),
    userAgent: String(item.userAgent ?? "-") || "-",
    billingMode: String(item.billingMode ?? "-") || "-"
  };
}

function toChannelMonitor(item: any): ChannelMonitorItem {
  return {
    id: String(item.id),
    name: String(item.name ?? ""),
    provider: String(item.provider ?? ""),
    groupName: String(item.groupName ?? ""),
    primaryModel: String(item.primaryModel ?? ""),
    primaryStatus: String(item.primaryStatus ?? "empty"),
    primaryLatencyMs: item.primaryLatencyMs == null ? null : Number(item.primaryLatencyMs),
    primaryPingLatencyMs: item.primaryPingLatencyMs == null ? null : Number(item.primaryPingLatencyMs),
    availability7d: item.availability7d == null ? null : Number(item.availability7d),
    extraModels: Array.isArray(item.extraModels) ? item.extraModels : [],
    timeline: Array.isArray(item.timeline) ? item.timeline : []
  };
}

function toChannelMonitorDetail(item: any): ChannelMonitorDetail {
  return {
    id: String(item.id),
    models: Array.isArray(item.models) ? item.models : []
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

function getStatusLabel(status: string, copy: PageCopy) {
  const key = normalizeStatusText(status);
  if (key === "active") return copy.dashboard.keys.active;
  if (key === "quota_exhausted") return copy.dashboard.keys.quotaExhausted;
  if (key === "expired") return copy.dashboard.keys.expired;
  return copy.dashboard.keys.inactive;
}

function getMonitorStatusLabel(status: ChannelMonitorStatus, copy: PageCopy) {
  const value = String(status).toLowerCase();
  if (value === "operational") return copy.dashboard.overview.operational;
  if (value === "degraded") return copy.dashboard.overview.degraded;
  if (value === "failed") return "Failed";
  if (value === "error") return "Error";
  return "-";
}

function getPaymentMethodLabel(methodCode: string, locale: Locale) {
  const code = methodCode.toLowerCase();
  const zh: Record<string, string> = {
    alipay: "支付宝",
    wxpay: "微信支付",
    creditcard: "信用卡",
    crypto: "Crypto",
    paynow: "PayNow",
    card: "银行卡",
    link: "Link",
    stripe: "Stripe"
  };
  const en: Record<string, string> = {
    alipay: "Alipay",
    wxpay: "WeChat Pay",
    creditcard: "Credit Card",
    crypto: "Crypto",
    paynow: "PayNow",
    card: "Card",
    link: "Link",
    stripe: "Stripe"
  };
  return (locale === "zh" ? zh : en)[code] ?? methodCode;
}

function getPaymentMethodIcon(methodCode: string) {
  const code = methodCode.toLowerCase();
  if (code === "creditcard" || code === "card" || code === "stripe") return CreditCard;
  if (code === "crypto") return Globe2;
  if (code === "paynow") return Wallet;
  if (code === "wxpay") return MessageSquare;
  return Banknote;
}

function buildUsageSummary(payload: any): UsageSummary {
  const summary = payload?.summary ?? {};
  return {
    totalRequests: Number(summary.totalRequests ?? 0),
    totalTokens: Number(summary.totalTokens ?? 0),
    totalInputTokens: Number(summary.totalInputTokens ?? 0),
    totalOutputTokens: Number(summary.totalOutputTokens ?? 0),
    totalCacheTokens: Number(summary.totalCacheTokens ?? 0),
    totalActualCost: Number(summary.totalActualCost ?? 0),
    averageDurationMs: Number(summary.averageDurationMs ?? 0)
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
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({
    totalRequests: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheTokens: 0,
    totalActualCost: 0,
    averageDurationMs: 0
  });
  const [channelMonitors, setChannelMonitors] = useState<ChannelMonitorItem[]>([]);
  const [monitorDetails, setMonitorDetails] = useState<Record<string, ChannelMonitorDetail>>({});
  const [monitorWindow, setMonitorWindow] = useState<"7d" | "15d" | "30d">("7d");
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo>({
    globalMin: 0,
    globalMax: 0,
    balanceDisabled: false,
    balanceRechargeMultiplier: 1,
    rechargeFeeRate: 0,
    helpText: "",
    helpImageUrl: ""
  });
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
  const [rechargeAmount, setRechargeAmount] = useState<number>(d.recharge.packages[1].amount);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [rechargeStatus, setRechargeStatus] = useState("");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [keySearch, setKeySearch] = useState("");
  const [keyStatusFilter, setKeyStatusFilter] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [requestKeyFilter, setRequestKeyFilter] = useState("");
  const [requestStartDate, setRequestStartDate] = useState("");
  const [requestEndDate, setRequestEndDate] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [drawsLeft, setDrawsLeft] = useState(2);
  const [latestPrize, setLatestPrize] = useState<LotteryPrize | null>(null);
  const [copiedPrizeCode, setCopiedPrizeCode] = useState(false);

  const selectedPackage = d.recharge.packages.find((item) => item.id === selectedPackageId) ?? d.recharge.packages[0];
  const activeKeys = dashboard.activeKeys || keys.filter((item) => item.status === "active").length;
  const totalKeys = dashboard.totalKeys || keys.length;
  const balance = user?.balance ?? dashboard.balance;
  const methodOptions = useMemo<PaymentMethodItem[]>(
    () =>
      paymentMethods.length > 0
        ? paymentMethods
        : ["alipay", "wxpay", "creditcard", "crypto", "paynow"].map((methodCode) => ({
            methodCode,
            methodName: getPaymentMethodLabel(methodCode, locale),
            available: true
          })),
    [locale, paymentMethods]
  );
  const selectedMethod = methodOptions.find((method) => method.methodCode === paymentMethod) ?? methodOptions[0];
  const feeAmount = checkoutInfo.rechargeFeeRate > 0 ? Math.ceil(((rechargeAmount * checkoutInfo.rechargeFeeRate) / 100) * 100) / 100 : 0;
  const payAmount = Math.round((rechargeAmount + feeAmount) * 100) / 100;
  const creditedAmount = Math.round(rechargeAmount * Math.max(checkoutInfo.balanceRechargeMultiplier, 0) * 100) / 100;
  const amountError = useMemo(() => {
    if (rechargeAmount <= 0) return locale === "zh" ? "请输入有效充值金额。" : "Enter a valid recharge amount.";
    if (checkoutInfo.globalMin > 0 && rechargeAmount < checkoutInfo.globalMin) return locale === "zh" ? `最低充值 ¥${checkoutInfo.globalMin.toFixed(2)}。` : `Minimum recharge is CNY ${checkoutInfo.globalMin.toFixed(2)}.`;
    if (checkoutInfo.globalMax > 0 && rechargeAmount > checkoutInfo.globalMax) return locale === "zh" ? `最高充值 ¥${checkoutInfo.globalMax.toFixed(2)}。` : `Maximum recharge is CNY ${checkoutInfo.globalMax.toFixed(2)}.`;
    if (selectedMethod?.singleMin && rechargeAmount < selectedMethod.singleMin) return locale === "zh" ? `${getPaymentMethodLabel(selectedMethod.methodCode, locale)} 最低 ¥${selectedMethod.singleMin.toFixed(2)}。` : `${getPaymentMethodLabel(selectedMethod.methodCode, locale)} minimum is CNY ${selectedMethod.singleMin.toFixed(2)}.`;
    if (selectedMethod?.singleMax && rechargeAmount > selectedMethod.singleMax) return locale === "zh" ? `${getPaymentMethodLabel(selectedMethod.methodCode, locale)} 最高 ¥${selectedMethod.singleMax.toFixed(2)}。` : `${getPaymentMethodLabel(selectedMethod.methodCode, locale)} maximum is CNY ${selectedMethod.singleMax.toFixed(2)}.`;
    if (selectedMethod && selectedMethod.available === false) return d.recharge.unavailable;
    return "";
  }, [checkoutInfo.globalMax, checkoutInfo.globalMin, d.recharge.unavailable, locale, rechargeAmount, selectedMethod]);
  const visibleKeys = useMemo(() => {
    const query = keySearch.trim().toLowerCase();
    return keys.filter((item) => {
      if (keyStatusFilter && item.status !== keyStatusFilter) return false;
      if (!query) return true;
      return `${item.name} ${item.secret} ${item.maskedSecret} ${item.scope}`.toLowerCase().includes(query);
    });
  }, [keySearch, keyStatusFilter, keys]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [locale]
  );

  useEffect(() => {
    setPaymentMethod((current) => (methodOptions.some((method) => method.methodCode === current) ? current : methodOptions[0]?.methodCode ?? ""));
    setRechargeStatus("");
  }, [methodOptions]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      apiRequest<any>("/dashboard", { token }),
      apiRequest<{ items: any[] }>("/keys", { token }),
      apiRequest<any>("/usage?page=1&pageSize=20&sortBy=created_at&sortOrder=desc", { token }),
      apiRequest<{ items: any[]; summary?: unknown }>("/channel-monitors", { token }).catch(() => ({ items: [] })),
      apiRequest<{ items: any[] }>("/ranking?limit=10", { token }),
      apiRequest<{ methods: PaymentMethodItem[] } & CheckoutInfo>("/payment/checkout-info", { token }).catch(() => ({
        methods: [],
        globalMin: 0,
        globalMax: 0,
        balanceDisabled: false,
        balanceRechargeMultiplier: 1,
        rechargeFeeRate: 0,
        helpText: "",
        helpImageUrl: ""
      }))
    ])
      .then(([dashboardPayload, keyPayload, usagePayload, monitorPayload, rankingPayload, checkoutPayload]) => {
        if (cancelled) return;
        setDashboard(toSnapshot(dashboardPayload));
        setKeys((keyPayload.items ?? []).map(toDashboardKey));
        setRequestItems((usagePayload.items ?? []).map(toRequestLog));
        setUsageSummary(buildUsageSummary(usagePayload));
        setChannelMonitors((monitorPayload.items ?? []).map(toChannelMonitor));
        setRankingItems((rankingPayload.items ?? []).map(toRankingItem));
        setPaymentMethods(checkoutPayload.methods ?? []);
        setCheckoutInfo({
          globalMin: Number(checkoutPayload.globalMin ?? 0),
          globalMax: Number(checkoutPayload.globalMax ?? 0),
          balanceDisabled: Boolean(checkoutPayload.balanceDisabled),
          balanceRechargeMultiplier: Number(checkoutPayload.balanceRechargeMultiplier ?? 1),
          rechargeFeeRate: Number(checkoutPayload.rechargeFeeRate ?? 0),
          helpText: String(checkoutPayload.helpText ?? ""),
          helpImageUrl: String(checkoutPayload.helpImageUrl ?? "")
        });
      })
      .catch((error) => {
        if (!cancelled) setRechargeStatus(error instanceof Error ? error.message : "Unable to sync account data.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || monitorWindow === "7d" || channelMonitors.length === 0) return;
    const missing = channelMonitors.filter((item) => !monitorDetails[item.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((item) =>
        apiRequest<{ item: any }>(`/channel-monitors/${item.id}/status`, { token })
          .then((payload) => [item.id, toChannelMonitorDetail(payload.item)] as const)
          .catch(() => null)
      )
    ).then((entries) => {
      if (cancelled) return;
      setMonitorDetails((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [channelMonitors, monitorDetails, monitorWindow, token]);

  const createKey = () => {
    if (!token) {
      setRechargeStatus(locale === "zh" ? "请先登录后再创建 Key。" : "Please sign in before creating a key.");
      return;
    }

    const name = newKeyName.trim() || (locale === "zh" ? "个人密钥" : "Personal Key");
    apiRequest<{ item: any }>("/keys", {
      method: "POST",
      token,
      body: {
        name
      }
    })
      .then((payload) => {
        setKeys((current) => [toDashboardKey(payload.item), ...current]);
        setNewKeyName("");
      })
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to create key."));
    onSectionChange("keys");
  };

  const toggleKeyStatus = (id: string) => {
    const item = keys.find((key) => key.id === id);
    if (!token || !item) {
      setRechargeStatus(locale === "zh" ? "请先登录后再更新 Key。" : "Please sign in before updating a key.");
      return;
    }

    const nextStatus = item.status === "active" ? "inactive" : "active";
    setBusyKeyId(id);
    apiRequest<{ item: any }>(`/keys/${id}`, { method: "PATCH", token, body: { status: nextStatus } })
      .then((payload) => setKeys((current) => current.map((key) => (key.id === id ? toDashboardKey(payload.item) : key))))
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to update key."))
      .finally(() => setBusyKeyId(null));
  };

  const renameKey = (item: ApiKeyItem) => {
    if (!token) return;
    const nextName = window.prompt(locale === "zh" ? "输入新的密钥名称" : "Enter a new key name", item.name)?.trim();
    if (!nextName || nextName === item.name) return;
    setBusyKeyId(item.id);
    apiRequest<{ item: any }>(`/keys/${item.id}`, { method: "PATCH", token, body: { name: nextName, status: item.status } })
      .then((payload) => setKeys((current) => current.map((key) => (key.id === item.id ? toDashboardKey(payload.item) : key))))
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to rename key."))
      .finally(() => setBusyKeyId(null));
  };

  const deleteKey = (item: ApiKeyItem) => {
    if (!token) return;
    const confirmed = window.confirm(locale === "zh" ? `确定删除 ${item.name}？` : `Delete ${item.name}?`);
    if (!confirmed) return;
    setBusyKeyId(item.id);
    apiRequest<{ ok: boolean }>(`/keys/${item.id}`, { method: "DELETE", token })
      .then(() => setKeys((current) => current.filter((key) => key.id !== item.id)))
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to delete key."))
      .finally(() => setBusyKeyId(null));
  };

  const refreshUsageRecords = () => {
    if (!token) return;
    const params = new URLSearchParams({
      page: "1",
      pageSize: "20",
      sortBy: "created_at",
      sortOrder: "desc"
    });
    if (requestKeyFilter) params.set("apiKeyId", requestKeyFilter);
    if (requestStartDate) params.set("startDate", requestStartDate);
    if (requestEndDate) params.set("endDate", requestEndDate);
    setRequestLoading(true);
    apiRequest<any>(`/usage?${params.toString()}`, { token })
      .then((payload) => {
        setRequestItems((payload.items ?? []).map(toRequestLog));
        setUsageSummary(buildUsageSummary(payload));
      })
      .catch((error) => setRechargeStatus(error instanceof Error ? error.message : "Unable to load usage records."))
      .finally(() => setRequestLoading(false));
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
    if (!selectedMethod || amountError) {
      setRechargeStatus(amountError || (locale === "zh" ? "请选择支付方式。" : "Select a payment method."));
      return;
    }

    apiRequest<{ checkout?: { submitUrl?: string }; item?: unknown }>("/orders", {
      method: "POST",
      token,
      body: {
        packageName: selectedPackage.label,
        amount: rechargeAmount,
        bonusAmount: 0,
        methodCode: selectedMethod.methodCode
      }
    })
      .then((payload) => {
        setRechargeStatus(`${d.recharge.done} · ${getPaymentMethodLabel(selectedMethod.methodCode, locale)}`);
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

  const degradedMonitorCount = channelMonitors.filter((item) => item.primaryStatus !== "operational").length;
  const overallMonitorStatus = degradedMonitorCount === 0 ? "operational" : "degraded";
  const resolveMonitorAvailability = (item: ChannelMonitorItem) => {
    if (monitorWindow === "7d") return item.availability7d;
    const detail = monitorDetails[item.id];
    const model = detail?.models.find((entry) => entry.model === item.primaryModel);
    if (!model) return item.availability7d;
    return monitorWindow === "15d" ? model.availability15d : model.availability30d;
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

              <section className="monitor-section">
                <div className="monitor-toolbar">
                  <div className="monitor-tabs" role="tablist" aria-label={d.overview.availability}>
                    {[
                      ["7d", d.overview.window7d],
                      ["15d", d.overview.window15d],
                      ["30d", d.overview.window30d]
                    ].map(([id, label]) => (
                      <button className={monitorWindow === id ? "is-active" : ""} key={id} type="button" role="tab" aria-selected={monitorWindow === id} onClick={() => setMonitorWindow(id as "7d" | "15d" | "30d")}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className={`monitor-status-chip status-${overallMonitorStatus}`}>
                    <i />
                    {getMonitorStatusLabel(overallMonitorStatus, copy)}
                  </span>
                  <button className="icon-action" type="button" onClick={() => window.location.reload()} title={locale === "zh" ? "刷新" : "Refresh"}>
                    <RefreshCw size={17} />
                  </button>
                </div>

                {channelMonitors.length > 0 ? (
                  <div className="monitor-grid">
                    {channelMonitors.map((item) => (
                      <article className="monitor-card" key={item.id}>
                        <div className="monitor-card-head">
                          <span className={`monitor-provider-icon provider-${item.provider}`}>
                            <Globe2 size={19} />
                          </span>
                          <div>
                            <h3>{item.name}</h3>
                            <p>
                              <span className="provider-badge">{item.provider || "-"}</span>
                              <code>{item.primaryModel || "-"}</code>
                              {item.groupName && <span className="group-chip">{item.groupName}</span>}
                            </p>
                          </div>
                          <span className={`status-badge status-${item.primaryStatus}`}>{getMonitorStatusLabel(item.primaryStatus, copy)}</span>
                        </div>

                        <div className="monitor-metrics">
                          <div>
                            <span>{d.overview.latency}</span>
                            <strong>{formatDuration(item.primaryLatencyMs)}</strong>
                          </div>
                          <div>
                            <span>{d.overview.ping}</span>
                            <strong>{formatDuration(item.primaryPingLatencyMs)}</strong>
                          </div>
                        </div>

                        <div className="monitor-availability">
                          <span>{d.overview.availability} · {monitorWindow.toUpperCase()}</span>
                          <strong>{formatPercent(resolveMonitorAvailability(item))}</strong>
                          {item.extraModels.length > 0 && <small>{d.overview.extraModels} {item.extraModels.length}</small>}
                        </div>

                        <div className="monitor-timeline" aria-label={d.overview.history}>
                          <div className="timeline-labels">
                            <span>{d.overview.history}</span>
                            <span>{d.overview.spend}</span>
                          </div>
                          <div className="timeline-bars">
                            {Array.from({ length: 60 }).map((_, index) => {
                              const points = [...item.timeline].slice(0, 60).reverse();
                              const point = points[index - Math.max(0, 60 - points.length)];
                              const status = point?.status ?? "empty";
                              return <i className={`timeline-bar status-${status}`} key={index} title={point ? `${formatDateTime(point.checkedAt)} · ${getMonitorStatusLabel(status, copy)} · ${formatDuration(point.latencyMs)}` : ""} />;
                            })}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">{d.overview.empty}</p>
                )}
              </section>
            </motion.div>
          )}

          {activeSection === "keys" && (
            <motion.div key="keys" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.keys.title} subtitle={d.keys.subtitle}>
                <button className="section-action" type="button" onClick={createKey} disabled={busyKeyId === "new"}>
                  <Plus size={17} />
                  <span>{d.keys.create}</span>
                </button>
              </SectionHeading>

              <div className="key-toolbar">
                <label className="table-filter">
                  <Search size={16} />
                  <input value={keySearch} onChange={(event) => setKeySearch(event.currentTarget.value)} placeholder={d.keys.search} />
                </label>
                <select value={keyStatusFilter} onChange={(event) => setKeyStatusFilter(event.currentTarget.value)} aria-label={d.keys.allStatus}>
                  <option value="">{d.keys.allStatus}</option>
                  <option value="active">{d.keys.active}</option>
                  <option value="inactive">{d.keys.inactive}</option>
                  <option value="quota_exhausted">{d.keys.quotaExhausted}</option>
                  <option value="expired">{d.keys.expired}</option>
                </select>
                <label className="table-filter create-key-filter">
                  <KeyRound size={16} />
                  <input value={newKeyName} onChange={(event) => setNewKeyName(event.currentTarget.value)} placeholder={d.keys.createPlaceholder} />
                </label>
              </div>

              <div className="data-table management-table key-management-table">
                <div className="table-row table-head">
                  <span>{d.keys.created}</span>
                  <span>{d.keys.create}</span>
                  <span>API Key</span>
                  <span>{d.keys.group}</span>
                  <span>{d.keys.quota}</span>
                  <span>{d.keys.rateLimit}</span>
                  <span>{d.keys.expires}</span>
                  <span>{d.keys.lastUsed}</span>
                  <span>{d.requests.status}</span>
                  <span>{locale === "zh" ? "操作" : "Actions"}</span>
                </div>
                {visibleKeys.length > 0 ? visibleKeys.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.created}</span>
                    <strong className="key-name-cell">
                      {item.name}
                      {item.ipRestricted && <ShieldCheck size={14} />}
                    </strong>
                    <code>{item.maskedSecret || maskKey(item.secret)}</code>
                    <span>{item.scope || "-"}</span>
                    <span className="quota-stack">
                      <strong>{item.quotaUsd > 0 ? item.quota : d.keys.noLimit}</strong>
                      {item.quotaUsd > 0 && (
                        <span className="usage-track" aria-label={`${d.keys.usage} ${item.usage}%`}>
                          <span style={{ width: `${item.usage}%` }} />
                        </span>
                      )}
                    </span>
                    <span className="rate-stack">
                      {item.rateLimit5h > 0 && <small>5h {formatUsd(item.usage5h, 2)}/{formatUsd(item.rateLimit5h, 2)}</small>}
                      {item.rateLimit1d > 0 && <small>1d {formatUsd(item.usage1d, 2)}/{formatUsd(item.rateLimit1d, 2)}</small>}
                      {item.rateLimit7d > 0 && <small>7d {formatUsd(item.usage7d, 2)}/{formatUsd(item.rateLimit7d, 2)}</small>}
                      {item.rateLimit5h <= 0 && item.rateLimit1d <= 0 && item.rateLimit7d <= 0 && <small>{d.keys.noLimit}</small>}
                    </span>
                    <span>{item.expiresAt || d.keys.never}</span>
                    <span>{item.lastUsed}</span>
                    <span className={`status-badge status-${item.status}`}>{getStatusLabel(item.status, copy)}</span>
                    <span className="row-actions">
                      <button type="button" onClick={() => copyKey(item)} title={d.keys.copy}>
                        {copiedKeyId === item.id ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                        <span>{copiedKeyId === item.id ? d.keys.copied : d.keys.copy}</span>
                      </button>
                      <button type="button" onClick={() => copyKey(item)} title={d.keys.use}>
                        <Terminal size={15} />
                        <span>{d.keys.use}</span>
                      </button>
                      <button type="button" disabled={busyKeyId === item.id} onClick={() => toggleKeyStatus(item.id)}>
                        {item.status === "active" ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                        <span>{item.status === "active" ? d.keys.disable : d.keys.enable}</span>
                      </button>
                      <button type="button" disabled={busyKeyId === item.id} onClick={() => renameKey(item)}>
                        <Bell size={15} />
                        <span>{d.keys.rename}</span>
                      </button>
                      <button type="button" disabled={busyKeyId === item.id} onClick={() => deleteKey(item)}>
                        <Trash2 size={15} />
                        <span>{d.keys.delete}</span>
                      </button>
                    </span>
                  </div>
                )) : <p className="empty-state">{locale === "zh" ? "暂无匹配的 Key。" : "No matching keys."}</p>}
              </div>
            </motion.div>
          )}

          {activeSection === "requests" && (
            <motion.div key="requests" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.requests.title} subtitle={d.requests.subtitle}>
                <button className="section-action" type="button" onClick={refreshUsageRecords} disabled={requestLoading}>
                  <RefreshCw size={17} className={requestLoading ? "spin-icon" : ""} />
                  <span>{d.requests.refresh}</span>
                </button>
              </SectionHeading>

              <section className="usage-summary-grid">
                <MetricCard icon={History} label={d.requests.status} value={formatTokenCount(usageSummary.totalRequests)} tone="neutral" />
                <MetricCard icon={Zap} label={d.requests.tokens} value={formatTokenCount(usageSummary.totalTokens)} tone="green" />
                <MetricCard icon={Banknote} label={d.requests.cost} value={formatUsd(usageSummary.totalActualCost, 4)} tone="gold" />
                <MetricCard icon={Clock} label={d.requests.latency} value={formatDuration(usageSummary.averageDurationMs)} tone="rose" />
              </section>

              <div className="request-filter-strip">
                <select value={requestKeyFilter} onChange={(event) => setRequestKeyFilter(event.currentTarget.value)} aria-label={d.requests.allKeys}>
                  <option value="">{d.requests.allKeys}</option>
                  {keys.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <label>
                  <span>{d.requests.startDate}</span>
                  <input type="date" value={requestStartDate} onChange={(event) => setRequestStartDate(event.currentTarget.value)} />
                </label>
                <label>
                  <span>{d.requests.endDate}</span>
                  <input type="date" value={requestEndDate} onChange={(event) => setRequestEndDate(event.currentTarget.value)} />
                </label>
              </div>

              <div className="data-table request-table request-records-table">
                <div className="table-row table-head">
                  <span>{d.requests.time}</span>
                  <span>{d.requests.key}</span>
                  <span>{d.requests.model}</span>
                  <span>{d.requests.endpoint}</span>
                  <span>{d.requests.type}</span>
                  <span>{d.requests.status}</span>
                  <span>{d.requests.tokens}</span>
                  <span>{d.requests.cost}</span>
                  <span>{d.requests.latency}</span>
                  <span>{d.requests.firstToken}</span>
                  <span>{d.requests.userAgent}</span>
                </div>
                {requestItems.length > 0 ? requestItems.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span>{item.keyName}</span>
                    <strong>{item.model}</strong>
                    <code>{item.endpoint}</code>
                    <span className="type-chip">{item.requestType}</span>
                    <span className={item.statusCode >= 200 && item.statusCode < 400 ? "status-ok" : "status-warn"}>{item.status}</span>
                    <span className="token-stack">
                      <strong>{item.tokens}</strong>
                      <small>{d.requests.input} {item.inputTokens} · {d.requests.output} {item.outputTokens} · {d.requests.cache} {item.cacheTokens}</small>
                    </span>
                    <span className="cost-stack">
                      <strong>{item.cost}</strong>
                      <small>{item.billingMode}</small>
                    </span>
                    <span>{item.latency}</span>
                    <span>{item.firstToken}</span>
                    <span className="user-agent-cell">{item.userAgent}</span>
                  </div>
                )) : <p className="empty-state">{locale === "zh" ? "暂无使用记录。" : "No usage records yet."}</p>}
              </div>
            </motion.div>
          )}

          {activeSection === "recharge" && (
            <motion.div key="recharge" className="dashboard-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SectionHeading title={d.recharge.title} subtitle={d.recharge.subtitle} />
              <section className="recharge-layout friendly-recharge">
                <article className="dashboard-panel recharge-summary">
                  <span>{d.recharge.balance}</span>
                  <strong>¥{currencyFormatter.format(balance)}</strong>
                  <p>{rechargeStatus || checkoutInfo.helpText || selectedPackage.bonus}</p>
                  <div className="selected-package">
                    <span>{d.recharge.credited}</span>
                    <strong>¥{currencyFormatter.format(creditedAmount)}</strong>
                  </div>
                </article>
                <article className="dashboard-panel recharge-checkout">
                  <div className="checkout-heading">
                    <span>{d.recharge.payAmount}</span>
                    <strong>¥{currencyFormatter.format(payAmount)}</strong>
                  </div>
                  <div className="amount-entry">
                    <label>
                      <span>{d.recharge.amount}</span>
                      <input type="number" min={checkoutInfo.globalMin || 1} max={checkoutInfo.globalMax || undefined} step="1" value={rechargeAmount} onChange={(event) => setRechargeAmount(Number(event.currentTarget.value))} />
                    </label>
                    {amountError && <p className="form-hint is-warning">{amountError}</p>}
                  </div>
                  <div className="recharge-options">
                    {d.recharge.packages.map((item) => (
                      <button className={selectedPackageId === item.id ? "is-active" : ""} type="button" key={item.id} onClick={() => { setSelectedPackageId(item.id); setRechargeAmount(item.amount); }}>
                        <strong>¥{item.amount}</strong>
                        <span>{item.label}</span>
                        <small>{item.bonus}</small>
                      </button>
                    ))}
                  </div>
                  <div className="payment-method-grid" aria-label={d.recharge.method}>
                    {methodOptions.map((method) => (
                      <button className={paymentMethod === method.methodCode ? "is-active" : ""} type="button" key={method.methodCode} onClick={() => setPaymentMethod(method.methodCode)} disabled={method.available === false}>
                        {(() => {
                          const Icon = getPaymentMethodIcon(method.methodCode);
                          return <Icon size={19} />;
                        })()}
                        <span>{getPaymentMethodLabel(method.methodCode, locale)}</span>
                        <small>
                          {method.singleMin || method.singleMax
                            ? `¥${Number(method.singleMin ?? 0).toFixed(0)}-${method.singleMax ? `¥${Number(method.singleMax).toFixed(0)}` : "∞"}`
                            : d.keys.noLimit}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="checkout-summary">
                    <div>
                      <span>{d.recharge.amount}</span>
                      <strong>¥{currencyFormatter.format(rechargeAmount)}</strong>
                    </div>
                    <div>
                      <span>{d.recharge.fee}{checkoutInfo.rechargeFeeRate > 0 ? ` ${checkoutInfo.rechargeFeeRate}%` : ""}</span>
                      <strong>¥{currencyFormatter.format(feeAmount)}</strong>
                    </div>
                    <div>
                      <span>{d.recharge.method}</span>
                      <strong>{selectedMethod ? getPaymentMethodLabel(selectedMethod.methodCode, locale) : "-"}</strong>
                    </div>
                  </div>
                  <button className="wide-action" type="button" onClick={submitRecharge} disabled={Boolean(amountError) || checkoutInfo.balanceDisabled || !selectedMethod}>
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
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFormValues((current) => ({ ...current, [id]: value }));
                  }}
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
