import type {
  ApiKeyItem,
  AuthResponse,
  BillingRecord,
  BillingListResponse,
  DashboardData,
  Order,
  PaginatedResponse,
  PaymentCheckoutInfo,
  PaymentMethod,
  UsageListResponse,
  UsageRecord,
  User
} from "../types/models";

const API_BASE = "/api/app";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    throw new Error(payload?.error ?? "Request failed. Please try again.");
  }

  return (await response.json()) as T;
}

export const appApi = {
  register(input: { username: string; email: string; password: string }) {
    return request<AuthResponse>("/auth/register", { method: "POST", body: input });
  },
  login(input: { identifier: string; password: string }) {
    return request<AuthResponse>("/auth/login", { method: "POST", body: input });
  },
  getMe(token: string) {
    return request<{ user: User }>("/me", { token });
  },
  getDashboard(token: string) {
    return request<DashboardData>("/dashboard", { token });
  },
  listKeys(token: string) {
    return request<{ items: ApiKeyItem[] }>("/keys", { token });
  },
  createKey(token: string, input: { name: string; scope: string; quotaTokens: number }) {
    return request<{ item: ApiKeyItem }>("/keys", { method: "POST", body: input, token });
  },
  updateKey(token: string, id: number, input: { name?: string; status?: "active" | "disabled" }) {
    return request<{ item: ApiKeyItem }>(`/keys/${id}`, { method: "PATCH", body: input, token });
  },
  deleteKey(token: string, id: number) {
    return request<{ ok: true }>(`/keys/${id}`, { method: "DELETE", token });
  },
  listUsage(token: string, query = "") {
    return request<UsageListResponse>(`/usage${query}`, { token });
  },
  listBilling(token: string, query = "") {
    return request<BillingListResponse>(`/billing${query}`, { token });
  },
  getPaymentCheckoutInfo(token: string) {
    return request<PaymentCheckoutInfo>("/payment/checkout-info", { token });
  },
  listPaymentMethods(token: string) {
    return request<{ items: PaymentMethod[] }>("/payment/methods", { token });
  },
  listOrders(token: string, query = "") {
    return request<PaginatedResponse<Order>>(`/orders${query}`, { token });
  },
  createOrder(token: string, input: { packageName: string; amount: number; bonusAmount: number; methodCode: string; orderType?: "balance" | "subscription"; planId?: number }) {
    return request<{ item: Order; checkout: import("../types/models").CheckoutPayload }>("/orders", {
      method: "POST",
      body: input,
      token
    });
  },
  payOrder(token: string, id: number) {
    return request<{ item: Order }>(`/orders/${id}/pay`, { method: "POST", token });
  }
};
