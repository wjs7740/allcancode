export type User = {
  id: number;
  username: string;
  email: string;
  balance: number;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type DashboardSummary = {
  balance: number;
  todaySpend: number;
  todayRequests: number;
  activeKeys: number;
  totalKeys: number;
  successRate: number;
};

export type TrendPoint = {
  label: string;
  spend: number;
  requests: number;
};

export type OrderSummary = {
  id: number;
  orderNo: string;
  packageName: string;
  amount: number;
  bonusAmount: number;
  methodCode: string;
  status: string;
  createdAt: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  trend: TrendPoint[];
  recentOrders: OrderSummary[];
  recentActivity: string[];
};

export type ApiKeyItem = {
  id: number;
  name: string;
  keyValue: string;
  maskedKeyValue?: string;
  scope: string;
  quotaTokens: number;
  usedTokens: number;
  status: "active" | "disabled";
  createdAt: string;
};

export type UsageRecord = {
  id: number;
  model: string;
  endpoint: string;
  statusCode: number;
  requestTokens: number;
  cost: number;
  latencyMs: number;
  createdAt: string;
  apiKeyName: string | null;
};

export type UsageSummary = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  totalTokens: number;
  totalCost: number;
  totalActualCost: number;
  averageDurationMs: number;
};

export type BillingRecord = {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
};

export type BillingSummary = {
  totalCount: number;
  usageSpend: number;
  rechargeIncome: number;
  manualAdjustments: number;
  pendingCount: number;
  failedCount: number;
  usage: UsageSummary;
};

export type PaymentMethod = {
  methodCode: string;
  methodName: string;
  providerName: string;
  providerCode: string;
  currency?: string;
  singleMin?: number;
  singleMax?: number;
  dailyLimit?: number;
};

export type PaymentPlan = {
  id: number;
  groupId: number;
  groupName: string;
  groupPlatform: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  validityDays: number;
  validityUnit: string;
  features: string[];
  productName: string;
};

export type PaymentCheckoutInfo = {
  methods: PaymentMethod[];
  plans: PaymentPlan[];
  globalMin: number;
  globalMax: number;
  balanceDisabled: boolean;
  balanceRechargeMultiplier: number;
  rechargeFeeRate: number;
  helpText: string;
  helpImageUrl: string;
  alipayForceQRCode: boolean;
};

export type CheckoutPayload = {
  mode: "epay_compat" | "sub2api_checkout";
  providerCode: string;
  providerName: string;
  endpoint: string;
  methodCode: string;
  orderNo: string;
  amount: number;
  displayAmount: number;
  submitFields: Record<string, string>;
  submitUrl: string;
  notifyUrl: string;
  returnUrl: string;
  sign: string;
  signType: string;
};

export type Order = {
  id: number;
  orderNo: string;
  packageName: string;
  amount: number;
  bonusAmount: number;
  methodCode: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};

export type UsageListResponse = PaginatedResponse<UsageRecord> & {
  page: number;
  pageSize: number;
  summary: UsageSummary;
  filters: {
    model: string;
    apiKeyId: string;
    startDate: string;
    endDate: string;
  };
};

export type BillingListResponse = PaginatedResponse<BillingRecord> & {
  page: number;
  pageSize: number;
  summary: BillingSummary;
  filters: {
    type: string;
    status: string;
    model: string;
    apiKeyId: string;
    startDate: string;
    endDate: string;
  };
};
