import "dotenv/config";
import cors from "cors";
import express from "express";
import { pool, sub2apiPool } from "./db/pool.js";
import { getSub2apiApiUrl, Sub2apiRequestError, sub2apiRequest, toSub2apiPagination } from "./lib/sub2api.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.APP_CORS_ORIGIN ?? "http://127.0.0.1:5173";
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:8080";
const paymentResultUrl = `${publicBaseUrl}/payment/result`;

app.use(
  cors({
    origin: corsOrigin,
    credentials: false
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

async function requireUser(request, response, next) {
  const token = getBearerToken(request);
  if (!token) {
    response.status(401).json({ error: "Missing auth token." });
    return;
  }

  try {
    const user = await sub2apiRequest("/auth/me", { token });
    request.sub2apiToken = token;
    request.sub2apiUser = user;
    next();
  } catch (error) {
    const status = error instanceof Sub2apiRequestError && error.status === 401 ? 401 : 401;
    response.status(status).json({ error: error instanceof Error ? error.message : "Auth token is invalid or expired." });
  }
}

function isSub2apiError(error, code) {
  return error instanceof Sub2apiRequestError && error.code === code;
}

function toUser(user) {
  const username = String(user.username ?? "").trim();
  const email = String(user.email ?? "").trim();

  return {
    id: Number(user.id),
    username: username || email || `user-${user.id}`,
    email,
    role: String(user.role ?? "user"),
    balance: Number(user.balance ?? 0),
    createdAt: user.created_at ?? new Date().toISOString()
  };
}

function normalizeKeyStatus(status) {
  return String(status ?? "").toLowerCase() === "active" ? "active" : "inactive";
}

function maskKey(value) {
  if (!value) {
    return "";
  }
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function toApiKeyItem(item) {
  const quotaUsd = Number(item.quota ?? 0);
  const usedUsd = Number(item.quota_used ?? 0);
  const quotaTokens = quotaUsd > 0 ? Math.round(quotaUsd * 1000000) : 0;
  const usedTokens = usedUsd > 0 ? Math.round(usedUsd * 1000000) : 0;
  const groupName = String(item.group?.name ?? item.group?.platform ?? "Default");
  const status = normalizeKeyStatus(item.status);

  return {
    id: Number(item.id),
    name: String(item.name ?? "API Key"),
    keyValue: item.key ?? "",
    maskedKeyValue: maskKey(item.key ?? ""),
    key: item.key ?? "",
    maskedKey: maskKey(item.key ?? ""),
    scope: groupName,
    group: item.group ?? null,
    groupId: item.group_id == null ? null : Number(item.group_id),
    quotaTokens,
    usedTokens,
    quota: quotaUsd,
    quotaUsed: usedUsd,
    quotaRemaining: quotaUsd > 0 ? Math.max(0, quotaUsd - usedUsd) : null,
    rateLimit5h: Number(item.rate_limit_5h ?? 0),
    rateLimit1d: Number(item.rate_limit_1d ?? 0),
    rateLimit7d: Number(item.rate_limit_7d ?? 0),
    usage5h: Number(item.usage_5h ?? 0),
    usage1d: Number(item.usage_1d ?? 0),
    usage7d: Number(item.usage_7d ?? 0),
    reset5hAt: item.reset_5h_at ?? null,
    reset1dAt: item.reset_1d_at ?? null,
    reset7dAt: item.reset_7d_at ?? null,
    expiresAt: item.expires_at ?? null,
    lastUsedAt: item.last_used_at ?? null,
    ipWhitelist: Array.isArray(item.ip_whitelist) ? item.ip_whitelist : [],
    ipBlacklist: Array.isArray(item.ip_blacklist) ? item.ip_blacklist : [],
    status,
    rawStatus: String(item.status ?? status),
    createdAt: item.created_at,
    raw: item
  };
}

function toUsageRecord(item) {
  const inputTokens = Number(item.input_tokens ?? 0);
  const outputTokens = Number(item.output_tokens ?? 0);
  const cacheCreationTokens = Number(item.cache_creation_tokens ?? 0);
  const cacheReadTokens = Number(item.cache_read_tokens ?? 0);
  const imageOutputTokens = Number(item.image_output_tokens ?? 0);
  const requestTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
  const endpoint = item.inbound_endpoint ?? item.upstream_endpoint ?? item.request_type ?? "gateway";
  const actualCost = Number(item.actual_cost ?? item.total_cost ?? 0);
  const statusCode = Number(item.status_code ?? 200);

  return {
    id: Number(item.id),
    model: item.model,
    endpoint,
    inboundEndpoint: item.inbound_endpoint ?? "",
    upstreamEndpoint: item.upstream_endpoint ?? "",
    statusCode,
    statusText: statusCode >= 200 && statusCode < 400 ? "success" : "error",
    requestTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    imageOutputTokens,
    totalTokens: requestTokens + imageOutputTokens,
    inputCost: Number(item.input_cost ?? 0),
    outputCost: Number(item.output_cost ?? 0),
    cacheCreationCost: Number(item.cache_creation_cost ?? 0),
    cacheReadCost: Number(item.cache_read_cost ?? 0),
    imageOutputCost: Number(item.image_output_cost ?? 0),
    standardCost: Number(item.total_cost ?? 0),
    actualCost,
    cost: actualCost,
    latencyMs: Number(item.duration_ms ?? item.first_token_ms ?? 0),
    firstTokenMs: item.first_token_ms == null ? null : Number(item.first_token_ms),
    durationMs: item.duration_ms == null ? null : Number(item.duration_ms),
    requestType: item.request_type ?? (item.stream ? "stream" : "sync"),
    stream: Boolean(item.stream),
    billingMode: item.billing_mode ?? "",
    reasoningEffort: item.reasoning_effort ?? "",
    serviceTier: item.service_tier ?? "",
    rateMultiplier: Number(item.rate_multiplier ?? 1),
    userAgent: item.user_agent ?? "",
    createdAt: item.created_at,
    apiKeyId: item.api_key_id == null ? null : Number(item.api_key_id),
    apiKeyName: item.api_key?.name ?? null,
    apiKey: item.api_key ?? null,
    raw: item
  };
}

function normalizeMonitorStatus(status) {
  const text = String(status ?? "").toLowerCase();
  if (["operational", "degraded", "failed", "error"].includes(text)) {
    return text;
  }
  return text || "empty";
}

function toMonitorTimelinePoint(item) {
  return {
    status: normalizeMonitorStatus(item.status),
    latencyMs: item.latency_ms == null ? null : Number(item.latency_ms),
    pingLatencyMs: item.ping_latency_ms == null ? null : Number(item.ping_latency_ms),
    checkedAt: item.checked_at ?? null
  };
}

function toChannelMonitorItem(item) {
  return {
    id: Number(item.id),
    name: String(item.name ?? ""),
    provider: String(item.provider ?? ""),
    groupName: String(item.group_name ?? ""),
    primaryModel: String(item.primary_model ?? ""),
    primaryStatus: normalizeMonitorStatus(item.primary_status),
    primaryLatencyMs: item.primary_latency_ms == null ? null : Number(item.primary_latency_ms),
    primaryPingLatencyMs: item.primary_ping_latency_ms == null ? null : Number(item.primary_ping_latency_ms),
    availability7d: item.availability_7d == null ? null : Number(item.availability_7d),
    extraModels: Array.isArray(item.extra_models)
      ? item.extra_models.map((model) => ({
          model: String(model.model ?? ""),
          status: normalizeMonitorStatus(model.status),
          latencyMs: model.latency_ms == null ? null : Number(model.latency_ms)
        }))
      : [],
    timeline: Array.isArray(item.timeline) ? item.timeline.map(toMonitorTimelinePoint) : [],
    raw: item
  };
}

function toChannelMonitorDetail(item) {
  return {
    id: Number(item.id),
    name: String(item.name ?? ""),
    provider: String(item.provider ?? ""),
    groupName: String(item.group_name ?? ""),
    models: Array.isArray(item.models)
      ? item.models.map((model) => ({
          model: String(model.model ?? ""),
          latestStatus: normalizeMonitorStatus(model.latest_status),
          latestLatencyMs: model.latest_latency_ms == null ? null : Number(model.latest_latency_ms),
          availability7d: model.availability_7d == null ? null : Number(model.availability_7d),
          availability15d: model.availability_15d == null ? null : Number(model.availability_15d),
          availability30d: model.availability_30d == null ? null : Number(model.availability_30d),
          avgLatency7dMs: model.avg_latency_7d_ms == null ? null : Number(model.avg_latency_7d_ms)
        }))
      : [],
    raw: item
  };
}

function toUsageStats(stats) {
  return {
    totalRequests: Number(stats.total_requests ?? 0),
    totalInputTokens: Number(stats.total_input_tokens ?? 0),
    totalOutputTokens: Number(stats.total_output_tokens ?? 0),
    totalCacheTokens: Number(stats.total_cache_tokens ?? 0),
    totalTokens: Number(stats.total_tokens ?? 0),
    totalCost: Number(stats.total_cost ?? 0),
    totalActualCost: Number(stats.total_actual_cost ?? 0),
    averageDurationMs: Number(stats.average_duration_ms ?? 0)
  };
}

function formatActivityTime(value) {
  return new Date(value).toLocaleString("en-US", { hour12: false });
}

function toRecentActivity(item) {
  const endpoint = item.endpoint ?? item.inbound_endpoint ?? item.upstream_endpoint ?? item.request_type ?? "gateway";
  const amount = Number(item.cost ?? item.actual_cost ?? item.total_cost ?? 0);
  const createdAt = item.createdAt ?? item.created_at;
  return `${formatActivityTime(createdAt)} | ${item.model} called ${endpoint} | CNY ${amount.toFixed(2)}`;
}

function normalizeOrderStatus(status) {
  switch (String(status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "PAID":
    case "RECHARGING":
      return "paid";
    case "PENDING":
      return "pending";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "REFUND_REQUESTED":
    case "REFUNDING":
    case "PARTIALLY_REFUNDED":
    case "REFUNDED":
    case "REFUND_FAILED":
      return "refunding";
    default:
      return String(status ?? "pending").toLowerCase();
  }
}

function methodCodeToName(methodCode) {
  const code = String(methodCode ?? "").toLowerCase();
  switch (code) {
    case "alipay":
      return "Alipay";
    case "wxpay":
      return "WeChat Pay";
    case "creditcard":
      return "Credit Card";
    case "crypto":
      return "Crypto";
    case "paynow":
      return "PayNow";
    case "card":
      return "Card";
    case "link":
      return "Link";
    case "stripe":
      return "Stripe";
    case "easypay":
      return "EasyPay";
    default:
      return code ? code.replace(/_/g, " ") : "Payment";
  }
}

function toOrderItem(item, plansById = new Map()) {
  const plan = item.plan_id ? plansById.get(Number(item.plan_id)) : null;
  const amount = Number(item.amount ?? 0);
  const payAmount = Number(item.pay_amount ?? amount);
  const bonusAmount = Math.max(0, amount - payAmount);

  return {
    id: Number(item.id),
    orderNo: item.out_trade_no,
    packageName: plan?.name ?? (item.order_type === "subscription" ? "Subscription order" : "Balance recharge"),
    amount: payAmount,
    bonusAmount,
    methodCode: item.payment_type ?? "unknown",
    status: normalizeOrderStatus(item.status),
    createdAt: item.created_at,
    paidAt: item.paid_at ?? item.completed_at ?? null
  };
}

function buildPaymentMethodItems(checkoutInfo) {
  const methods = checkoutInfo.methods ?? {};
  const methodOrder = ["alipay", "wxpay", "creditcard", "paynow", "crypto", "card", "link", "stripe"];
  const items = [];

  for (const methodCode of Object.keys(methods)) {
    const limits = methods[methodCode] ?? {};
    items.push({
      methodCode,
      methodName: methodCodeToName(methodCode),
      providerName: "sub2api payment",
      providerCode: methodCode,
      currency: limits.currency ?? "CNY",
      singleMin: Number(limits.single_min ?? 0),
      singleMax: Number(limits.single_max ?? 0),
      dailyLimit: Number(limits.daily_limit ?? 0),
      dailyUsed: Number(limits.daily_used ?? 0),
      dailyRemaining: Number(limits.daily_remaining ?? 0),
      feeRate: Number(limits.fee_rate ?? 0),
      available: limits.available !== false
    });
  }

  return items.sort((left, right) => {
    const leftIndex = methodOrder.indexOf(left.methodCode);
    const rightIndex = methodOrder.indexOf(right.methodCode);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function getForwardedOrigin(request) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const forwardedHost = String(request.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  const host = forwardedHost || String(request.headers.host ?? "").trim();
  const protocol = forwardedProto || request.protocol || "http";

  if (!host) {
    return publicBaseUrl;
  }

  return `${protocol}://${host}`;
}

function getPaymentResultUrl(request) {
  return `${getForwardedOrigin(request)}/payment/result`;
}

function getPaymentReferer(request) {
  const origin = getForwardedOrigin(request);
  const currentPath = request.originalUrl || request.url || "/";
  return `${origin}${currentPath.startsWith("/") ? currentPath : `/${currentPath}`}`;
}

function toCheckoutPlan(plan) {
  return {
    id: Number(plan.id),
    groupId: Number(plan.group_id),
    groupName: plan.group_name ?? "",
    groupPlatform: plan.group_platform ?? "",
    name: plan.name,
    description: plan.description ?? "",
    price: Number(plan.price ?? 0),
    originalPrice: plan.original_price == null ? null : Number(plan.original_price),
    validityDays: Number(plan.validity_days ?? 0),
    validityUnit: plan.validity_unit ?? "day",
    features: Array.isArray(plan.features) ? plan.features : [],
    productName: plan.product_name ?? plan.name
  };
}

function toCheckoutInfoResponse(checkoutInfo) {
  const methods = buildPaymentMethodItems(checkoutInfo);
  return {
    methods,
    methodCodes: methods.map((method) => method.methodCode),
    plans: Array.isArray(checkoutInfo.plans) ? checkoutInfo.plans.map(toCheckoutPlan) : [],
    globalMin: Number(checkoutInfo.global_min ?? 0),
    globalMax: Number(checkoutInfo.global_max ?? 0),
    balanceDisabled: Boolean(checkoutInfo.balance_disabled),
    balanceRechargeMultiplier: Number(checkoutInfo.balance_recharge_multiplier ?? 1),
    rechargeFeeRate: Number(checkoutInfo.recharge_fee_rate ?? 0),
    helpText: String(checkoutInfo.help_text ?? ""),
    helpImageUrl: String(checkoutInfo.help_image_url ?? ""),
    alipayForceQRCode: Boolean(checkoutInfo.alipay_force_qrcode)
  };
}

function buildCheckoutPayload(request, order, createdOrder) {
  const submitUrl = createdOrder.pay_url ?? "";
  const returnUrl = createdOrder.return_url ?? getPaymentResultUrl(request);

  return {
    mode: "sub2api_checkout",
    providerCode: createdOrder.payment_type ?? order.methodCode,
    providerName: methodCodeToName(createdOrder.payment_type ?? order.methodCode),
    endpoint: submitUrl,
    methodCode: createdOrder.payment_type ?? order.methodCode,
    orderNo: order.orderNo,
    amount: Number(createdOrder.pay_amount ?? order.amount),
    displayAmount: Number(order.amount + order.bonusAmount),
    submitFields: {
      out_trade_no: order.orderNo,
      order_id: String(createdOrder.order_id ?? order.id),
      payment_type: createdOrder.payment_type ?? order.methodCode,
      result_type: createdOrder.result_type ?? "order_created",
      pay_url: createdOrder.pay_url ?? "",
      qr_code: createdOrder.qr_code ?? "",
      resume_token: createdOrder.resume_token ?? ""
    },
    submitUrl,
    notifyUrl: `${publicBaseUrl}/api/app/payment/callback/sub2api`,
    returnUrl,
    sign: "",
    signType: ""
  };
}

async function listPlansMap(token) {
  const plans = await sub2apiRequest("/payment/plans", { token }).catch(() => []);
  return new Map(plans.map((plan) => [Number(plan.id), plan]));
}

async function listRedeemHistory(token) {
  return sub2apiRequest("/redeem/history", { token }).catch(() => []);
}

function buildBillingItems({ usageItems, orderItems, redeemItems }) {
  const usageEntries = usageItems.map((item) => ({
    id: `usage-${item.id}`,
    type: "usage",
    amount: -Math.abs(Number(item.cost ?? 0)),
    status: item.statusCode >= 400 ? "warning" : "completed",
    description: `${item.model} | ${item.endpoint}`,
    createdAt: item.createdAt
  }));

  const orderEntries = orderItems.map((item) => ({
    id: `order-${item.id}`,
    type: "recharge",
    amount: Number(item.amount + item.bonusAmount),
    status: item.status,
    description: `${item.packageName} | ${item.methodCode}`,
    createdAt: item.paidAt ?? item.createdAt
  }));

  const redeemEntries = redeemItems.map((item) => ({
    id: `redeem-${item.id}`,
    type: item.type ?? "redeem",
    amount: Number(item.value ?? 0),
    status: String(item.status ?? "completed").toLowerCase(),
    description: item.notes ?? `Redeem code ${item.code}`,
    createdAt: item.used_at ?? item.created_at
  }));

  return [...usageEntries, ...orderEntries, ...redeemEntries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeDateQuery(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function parseUsageFilters(request) {
  const page = parsePositiveInt(request.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(request.query.pageSize, 20), 100);
  const model = String(request.query.model ?? "").trim();
  const apiKeyId = String(request.query.apiKeyId ?? "").trim();
  const startDate = normalizeDateQuery(request.query.startDate);
  const endDate = normalizeDateQuery(request.query.endDate);
  const sortBy = String(request.query.sortBy ?? request.query.sort_by ?? "").trim();
  const sortOrder = String(request.query.sortOrder ?? request.query.sort_order ?? "").trim().toLowerCase() === "asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    model,
    apiKeyId,
    startDate,
    endDate,
    sortBy,
    sortOrder
  };
}

function buildUsageQuery(filters) {
  return {
    ...toSub2apiPagination(filters),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.apiKeyId ? { api_key_id: filters.apiKeyId } : {}),
    ...(filters.startDate ? { start_date: filters.startDate } : {}),
    ...(filters.endDate ? { end_date: filters.endDate } : {}),
    ...(filters.sortBy ? { sort_by: filters.sortBy, sort_order: filters.sortOrder } : {})
  };
}

function buildUsageStatsQuery(filters) {
  return {
    ...(filters.apiKeyId ? { api_key_id: filters.apiKeyId } : {}),
    ...(filters.startDate ? { start_date: filters.startDate } : {}),
    ...(filters.endDate ? { end_date: filters.endDate } : {})
  };
}

function parseKeyFilters(request) {
  const page = parsePositiveInt(request.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(request.query.pageSize ?? request.query.page_size, 100), 100);
  const search = String(request.query.search ?? "").trim();
  const status = String(request.query.status ?? "").trim();
  const groupId = String(request.query.groupId ?? request.query.group_id ?? "").trim();
  const sortBy = String(request.query.sortBy ?? request.query.sort_by ?? "created_at").trim();
  const sortOrder = String(request.query.sortOrder ?? request.query.sort_order ?? "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    search,
    status,
    groupId,
    sortBy,
    sortOrder
  };
}

function buildKeyQuery(filters) {
  return {
    ...toSub2apiPagination(filters),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.groupId ? { group_id: filters.groupId } : {}),
    ...(filters.sortBy ? { sort_by: filters.sortBy, sort_order: filters.sortOrder } : {})
  };
}

function paginateItems(items, page, pageSize) {
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    total: items.length
  };
}

function buildBillingSummary(items) {
  const summary = {
    totalCount: items.length,
    usageSpend: 0,
    rechargeIncome: 0,
    manualAdjustments: 0,
    pendingCount: 0,
    failedCount: 0
  };

  for (const item of items) {
    if (item.type === "usage") {
      summary.usageSpend += Math.abs(Number(item.amount ?? 0));
    } else if (item.type === "recharge" || item.type === "balance" || item.type === "redeem") {
      summary.rechargeIncome += Number(item.amount ?? 0);
    } else {
      summary.manualAdjustments += Number(item.amount ?? 0);
    }

    if (item.status === "pending") {
      summary.pendingCount += 1;
    }
    if (item.status === "failed") {
      summary.failedCount += 1;
    }
  }

  return summary;
}

function maskRankingUser({ username, email, id }) {
  const name = String(username ?? "").trim();
  if (name) {
    return name;
  }

  const mail = String(email ?? "").trim();
  if (!mail.includes("@")) {
    return mail || `User ${id}`;
  }

  const [prefix, domain] = mail.split("@");
  const safePrefix = prefix.length <= 2 ? `${prefix[0] ?? "u"}***` : `${prefix.slice(0, 2)}***${prefix.slice(-1)}`;
  return `${safePrefix}@${domain}`;
}

async function listUsageRanking(limit = 10) {
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 50);
  const result = await sub2apiPool.query(
    `
      SELECT
        u.user_id,
        COALESCE(us.username, '') AS username,
        COALESCE(us.email, '') AS email,
        COUNT(*)::bigint AS requests,
        COALESCE(SUM(u.input_tokens + u.output_tokens + u.cache_creation_tokens + u.cache_read_tokens), 0)::bigint AS tokens
      FROM usage_logs u
      LEFT JOIN users us ON u.user_id = us.id
      WHERE u.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.user_id, us.username, us.email
      ORDER BY requests DESC, tokens DESC, u.user_id ASC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => ({
    id: Number(row.user_id),
    name: maskRankingUser({
      username: row.username,
      email: row.email,
      id: row.user_id
    }),
    requests: Number(row.requests ?? 0),
    tokens: Number(row.tokens ?? 0)
  }));
}

app.get(
  "/health",
  asyncRoute(async (_request, response) => {
    await pool.query("select 1");
    await sub2apiPool.query("select 1");
    response.json({ status: "ok" });
  })
);

app.post(
  "/api/app/auth/register",
  asyncRoute(async (request, response) => {
    const email = String(request.body.email ?? "").trim().toLowerCase();
    const password = String(request.body.password ?? "");

    if (!email || !password) {
      response.status(400).json({ error: "Please provide a valid email and password." });
      return;
    }

    const auth = await sub2apiRequest("/auth/register", {
      method: "POST",
      body: {
        email,
        password
      }
    });

    response.status(201).json({
      token: auth.access_token,
      user: toUser(auth.user)
    });
  })
);

app.post(
  "/api/app/auth/login",
  asyncRoute(async (request, response) => {
    const identifier = String(request.body.identifier ?? "").trim();
    const password = String(request.body.password ?? "");

    if (!identifier || !password) {
      response.status(400).json({ error: "Please provide an email and password." });
      return;
    }

    const auth = await sub2apiRequest("/auth/login", {
      method: "POST",
      body: {
        email: identifier,
        password
      }
    });

    response.json({
      token: auth.access_token,
      user: toUser(auth.user)
    });
  })
);

app.get(
  "/api/app/me",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    response.json({ user: toUser(request.sub2apiUser) });
  })
);

app.get(
  "/api/app/dashboard",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const token = request.sub2apiToken;
    const [dashboardStats, dashboardTrend, usageItems, ordersData, plansById] = await Promise.all([
      sub2apiRequest("/usage/dashboard/stats", { token }),
      sub2apiRequest("/usage/dashboard/trend", { token, query: { granularity: "day" } }),
      sub2apiRequest("/usage", {
        token,
        query: {
          page: 1,
          page_size: 4
        }
      }),
      sub2apiRequest("/payment/orders/my", {
        token,
        query: {
          page: 1,
          page_size: 3
        }
      }),
      listPlansMap(token)
    ]);

    const trendItems = Array.isArray(dashboardTrend.trend) ? dashboardTrend.trend : [];
    const recentOrders = (ordersData.items ?? []).map((item) => toOrderItem(item, plansById));
    const recentUsage = (usageItems.items ?? []).map(toUsageRecord);

    response.json({
      summary: {
        balance: Number(request.sub2apiUser.balance ?? 0),
        todaySpend: Number(dashboardStats.today_cost ?? dashboardStats.today_amount ?? 0),
        todayRequests: Number(dashboardStats.today_requests ?? 0),
        activeKeys: Number(dashboardStats.active_api_keys ?? 0),
        totalKeys: Number(dashboardStats.total_api_keys ?? 0),
        successRate: Number(dashboardStats.success_rate ?? 100)
      },
      trend: trendItems.map((item) => ({
        label: item.date ?? item.label ?? "",
        spend: Number(item.cost ?? item.amount ?? item.total_cost ?? 0),
        requests: Number(item.requests ?? item.count ?? 0)
      })),
      recentOrders,
      recentActivity: recentUsage.map(toRecentActivity)
    });
  })
);

app.get(
  "/api/app/channel-monitors",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const result = await sub2apiRequest("/channel-monitors", {
      token: request.sub2apiToken
    });

    const items = (result.items ?? []).map(toChannelMonitorItem);
    const degradedCount = items.filter((item) => item.primaryStatus !== "operational").length;
    response.json({
      items,
      summary: {
        total: items.length,
        operational: items.length - degradedCount,
        degraded: degradedCount,
        overallStatus: degradedCount === 0 ? "operational" : "degraded"
      }
    });
  })
);

app.get(
  "/api/app/channel-monitors/:id/status",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      response.status(404).json({ error: "Channel monitor does not exist." });
      return;
    }

    const detail = await sub2apiRequest(`/channel-monitors/${id}/status`, {
      token: request.sub2apiToken
    });
    response.json({ item: toChannelMonitorDetail(detail) });
  })
);

app.get(
  "/api/app/keys",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const filters = parseKeyFilters(request);
    const result = await sub2apiRequest("/keys", {
      token: request.sub2apiToken,
      query: buildKeyQuery(filters)
    });

    response.json({
      items: (result.items ?? []).map(toApiKeyItem),
      total: Number(result.total ?? 0),
      page: filters.page,
      pageSize: filters.pageSize
    });
  })
);

app.post(
  "/api/app/keys",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const name = String(request.body.name ?? "").trim();
    if (!name) {
      response.status(400).json({ error: "Please provide valid key information." });
      return;
    }

    const groupId = Number(request.body.groupId ?? request.body.group_id ?? 0);
    const quota = Number(request.body.quota ?? 0);
    const expiresInDays = Number(request.body.expiresInDays ?? request.body.expires_in_days ?? 0);
    const rateLimit5h = Number(request.body.rateLimit5h ?? request.body.rate_limit_5h ?? 0);
    const rateLimit1d = Number(request.body.rateLimit1d ?? request.body.rate_limit_1d ?? 0);
    const rateLimit7d = Number(request.body.rateLimit7d ?? request.body.rate_limit_7d ?? 0);
    const item = await sub2apiRequest("/keys", {
      method: "POST",
      token: request.sub2apiToken,
      body: {
        name,
        ...(Number.isFinite(groupId) && groupId > 0 ? { group_id: groupId } : {}),
        ...(Number.isFinite(quota) && quota > 0 ? { quota } : {}),
        ...(Number.isFinite(expiresInDays) && expiresInDays > 0 ? { expires_in_days: expiresInDays } : {}),
        ...(Number.isFinite(rateLimit5h) && rateLimit5h > 0 ? { rate_limit_5h: rateLimit5h } : {}),
        ...(Number.isFinite(rateLimit1d) && rateLimit1d > 0 ? { rate_limit_1d: rateLimit1d } : {}),
        ...(Number.isFinite(rateLimit7d) && rateLimit7d > 0 ? { rate_limit_7d: rateLimit7d } : {})
      }
    });

    response.status(201).json({ item: toApiKeyItem(item) });
  })
);

app.patch(
  "/api/app/keys/:id",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      response.status(400).json({ error: "Key does not exist." });
      return;
    }

    const current = await sub2apiRequest(`/keys/${id}`, {
      token: request.sub2apiToken
    });

    const requestedStatus = String(request.body.status ?? "").toLowerCase();
    const nextStatus = requestedStatus === "active" ? "active" : requestedStatus === "disabled" || requestedStatus === "inactive" ? "inactive" : current.status;
    const nextName = String(request.body.name ?? current.name).trim() || current.name;
    const groupId = Number(request.body.groupId ?? request.body.group_id ?? current.group_id ?? 0);
    const quota = Number(request.body.quota ?? current.quota ?? 0);
    const rateLimit5h = Number(request.body.rateLimit5h ?? request.body.rate_limit_5h ?? current.rate_limit_5h ?? 0);
    const rateLimit1d = Number(request.body.rateLimit1d ?? request.body.rate_limit_1d ?? current.rate_limit_1d ?? 0);
    const rateLimit7d = Number(request.body.rateLimit7d ?? request.body.rate_limit_7d ?? current.rate_limit_7d ?? 0);

    const updated = await sub2apiRequest(`/keys/${id}`, {
      method: "PUT",
      token: request.sub2apiToken,
      body: {
        name: nextName,
        status: nextStatus,
        ...(Number.isFinite(groupId) && groupId > 0 ? { group_id: groupId } : {}),
        ...(Number.isFinite(quota) && quota > 0 ? { quota } : {}),
        ...(Number.isFinite(rateLimit5h) && rateLimit5h > 0 ? { rate_limit_5h: rateLimit5h } : {}),
        ...(Number.isFinite(rateLimit1d) && rateLimit1d > 0 ? { rate_limit_1d: rateLimit1d } : {}),
        ...(Number.isFinite(rateLimit7d) && rateLimit7d > 0 ? { rate_limit_7d: rateLimit7d } : {})
      }
    });

    response.json({ item: toApiKeyItem(updated) });
  })
);

app.delete(
  "/api/app/keys/:id",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const id = Number(request.params.id);
    await sub2apiRequest(`/keys/${id}`, {
      method: "DELETE",
      token: request.sub2apiToken
    });
    response.json({ ok: true });
  })
);

app.get(
  "/api/app/usage",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const filters = parseUsageFilters(request);

    const [result, stats] = await Promise.all([
      sub2apiRequest("/usage", {
        token: request.sub2apiToken,
        query: buildUsageQuery(filters)
      }),
      sub2apiRequest("/usage/stats", {
        token: request.sub2apiToken,
        query: buildUsageStatsQuery(filters)
      })
    ]);

    response.json({
      items: (result.items ?? []).map(toUsageRecord),
      total: Number(result.total ?? 0),
      page: filters.page,
      pageSize: filters.pageSize,
      summary: toUsageStats(stats),
      filters: {
        model: filters.model,
        apiKeyId: filters.apiKeyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      }
    });
  })
);

app.get(
  "/api/app/billing",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const token = request.sub2apiToken;
    const filters = parseUsageFilters(request);

    const [usageResult, usageStats, ordersResult, plansById, redeemItems] = await Promise.all([
      sub2apiRequest("/usage", {
        token,
        query: buildUsageQuery({
          ...filters,
          page: 1,
          pageSize: 100
        })
      }),
      sub2apiRequest("/usage/stats", {
        token,
        query: buildUsageStatsQuery(filters)
      }),
      sub2apiRequest("/payment/orders/my", {
        token,
        query: {
          page: 1,
          page_size: 50
        }
      }),
      listPlansMap(token),
      listRedeemHistory(token)
    ]);

    const usageItems = (usageResult.items ?? []).map(toUsageRecord);
    const orderItems = (ordersResult.items ?? []).map((item) => toOrderItem(item, plansById));
    let billingItems = buildBillingItems({ usageItems, orderItems, redeemItems });

    const type = String(request.query.type ?? "").trim().toLowerCase();
    const status = String(request.query.status ?? "").trim().toLowerCase();
    if (type) {
      billingItems = billingItems.filter((item) => String(item.type).toLowerCase() === type);
    }
    if (status) {
      billingItems = billingItems.filter((item) => String(item.status).toLowerCase() === status);
    }
    const paged = paginateItems(billingItems, filters.page, filters.pageSize);

    response.json({
      items: paged.items,
      total: paged.total,
      page: filters.page,
      pageSize: filters.pageSize,
      summary: {
        ...buildBillingSummary(billingItems),
        usage: toUsageStats(usageStats)
      },
      filters: {
        type,
        status,
        model: filters.model,
        apiKeyId: filters.apiKeyId,
        startDate: filters.startDate,
        endDate: filters.endDate
      }
    });
  })
);

app.get(
  "/api/app/ranking",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const items = await listUsageRanking(request.query.limit);
    response.json({ items });
  })
);

app.get(
  "/api/app/payment/checkout-info",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const checkoutInfo = await sub2apiRequest("/payment/checkout-info", {
      token: request.sub2apiToken
    });

    response.json(toCheckoutInfoResponse(checkoutInfo));
  })
);

app.get(
  "/api/app/payment/methods",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const checkoutInfo = await sub2apiRequest("/payment/checkout-info", {
      token: request.sub2apiToken
    });

    response.json({
      items: buildPaymentMethodItems(checkoutInfo)
    });
  })
);

app.get(
  "/api/app/orders",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const page = Math.max(Number(request.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(request.query.pageSize ?? 20), 1), 100);
    const token = request.sub2apiToken;

    const [result, plansById] = await Promise.all([
      sub2apiRequest("/payment/orders/my", {
        token,
        query: {
          page,
          page_size: pageSize
        }
      }),
      listPlansMap(token)
    ]);

    response.json({
      items: (result.items ?? []).map((item) => toOrderItem(item, plansById)),
      total: Number(result.total ?? 0)
    });
  })
);

app.post(
  "/api/app/orders",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const methodCode = String(request.body.methodCode ?? "").trim();
    const orderType = String(request.body.orderType ?? "balance").trim().toLowerCase();
    const amount = Number(request.body.amount ?? 0);
    const planId = Number(request.body.planId ?? 0);
    const packageName = String(request.body.packageName ?? "").trim() || (orderType === "subscription" ? "Subscription order" : "Balance recharge");
    const bonusAmount = Number(request.body.bonusAmount ?? 0);

    if (!methodCode) {
      response.status(400).json({ error: "Order parameters are incomplete." });
      return;
    }

    if (orderType === "subscription" && (!Number.isFinite(planId) || planId <= 0)) {
      response.status(400).json({ error: "Subscription plan is required." });
      return;
    }

    if (orderType !== "subscription" && amount <= 0) {
      response.status(400).json({ error: "Recharge amount must be greater than 0." });
      return;
    }

    const checkoutInfo = await sub2apiRequest("/payment/checkout-info", {
      token: request.sub2apiToken
    });
    const checkoutConfig = toCheckoutInfoResponse(checkoutInfo);

    if (checkoutConfig.methods.length === 0) {
      response.status(403).json({ error: "Payment is not configured yet. Please contact the administrator." });
      return;
    }

    const selectedMethod = checkoutConfig.methods.find((method) => method.methodCode === methodCode);
    if (!selectedMethod) {
      response.status(400).json({ error: "The selected payment method is not available." });
      return;
    }

    if (orderType === "subscription") {
      const planExists = checkoutConfig.plans.some((plan) => plan.id === planId);
      if (!planExists) {
        response.status(400).json({ error: "The selected subscription plan is not available." });
        return;
      }
    } else {
      if (checkoutConfig.balanceDisabled) {
        response.status(403).json({ error: "Balance recharge is currently disabled." });
        return;
      }
      if (checkoutConfig.globalMin > 0 && amount < checkoutConfig.globalMin) {
        response.status(400).json({ error: `Recharge amount must be at least CNY ${checkoutConfig.globalMin.toFixed(2)}.` });
        return;
      }
      if (checkoutConfig.globalMax > 0 && amount > checkoutConfig.globalMax) {
        response.status(400).json({ error: `Recharge amount must not exceed CNY ${checkoutConfig.globalMax.toFixed(2)}.` });
        return;
      }
      if (selectedMethod.singleMin > 0 && amount < selectedMethod.singleMin) {
        response.status(400).json({ error: `${selectedMethod.methodName} requires at least CNY ${selectedMethod.singleMin.toFixed(2)}.` });
        return;
      }
      if (selectedMethod.singleMax > 0 && amount > selectedMethod.singleMax) {
        response.status(400).json({ error: `${selectedMethod.methodName} allows up to CNY ${selectedMethod.singleMax.toFixed(2)} per order.` });
        return;
      }
    }

    const createdOrder = await sub2apiRequest("/payment/orders", {
      method: "POST",
      token: request.sub2apiToken,
      headers: {
        Referer: getPaymentReferer(request),
        Origin: getForwardedOrigin(request)
      },
      body: {
        amount,
        payment_type: methodCode,
        order_type: orderType,
        ...(orderType === "subscription" ? { plan_id: planId } : {}),
        return_url: getPaymentResultUrl(request)
      }
    });

    const plansById = orderType === "subscription" ? await listPlansMap(request.sub2apiToken) : new Map();
    const selectedPlan = orderType === "subscription" ? plansById.get(planId) : null;
    const displayName = selectedPlan?.name ?? packageName;
    const creditedAmount = Number(createdOrder.amount ?? amount);
    const paidAmount = Number(createdOrder.pay_amount ?? amount);

    const order = {
      id: Number(createdOrder.order_id),
      orderNo: createdOrder.out_trade_no,
      packageName: displayName,
      amount: paidAmount,
      bonusAmount: Math.max(0, creditedAmount - paidAmount) || bonusAmount,
      methodCode,
      status: normalizeOrderStatus(createdOrder.status),
      createdAt: new Date().toISOString(),
      paidAt: null
    };

    response.status(201).json({
      item: order,
      checkout: buildCheckoutPayload(request, order, createdOrder)
    });
  })
);

app.post(
  "/api/app/orders/:id/pay",
  asyncRoute(requireUser),
  asyncRoute(async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      response.status(404).json({ error: "Order does not exist." });
      return;
    }

    const order = await sub2apiRequest(`/payment/orders/${id}`, {
      token: request.sub2apiToken
    });

    const verified = await sub2apiRequest("/payment/orders/verify", {
      method: "POST",
      token: request.sub2apiToken,
      body: {
        out_trade_no: order.out_trade_no
      }
    });

    const item = toOrderItem(verified);
    response.json({ item });
  })
);

app.post(
  "/api/app/payment/callback/sub2api",
  express.urlencoded({ extended: false }),
  asyncRoute(async (request, response) => {
    const upstream = await fetch(getSub2apiApiUrl("/payment/webhook/easypay"), {
      method: "POST",
      headers: {
        "Content-Type": request.headers["content-type"] ?? "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...(request.headers["user-agent"] ? { "User-Agent": request.headers["user-agent"] } : {})
      },
      body: new URLSearchParams(
        Object.entries(request.body ?? {}).map(([key, value]) => [key, String(value ?? "")])
      ).toString()
    });

    const rawText = await upstream.text();
    response.status(upstream.status);
    if (upstream.headers.get("content-type")) {
      response.setHeader("Content-Type", upstream.headers.get("content-type"));
    } else {
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    response.send(rawText || "ok");
  })
);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error instanceof Sub2apiRequestError) {
    response.status(error.status).json({
      error: error.message,
      code: error.code
    });
    return;
  }

  response.status(500).json({ error: error instanceof Error ? error.message : "Server error. Check container logs for details." });
});

app.listen(port, () => {
  console.log(`allcancode-api listening on ${port}`);
});
