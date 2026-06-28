const sub2apiBaseUrl = (process.env.SUB2API_INTERNAL_URL ?? "http://sub2api:8080").replace(/\/$/, "");
const apiBaseUrl = `${sub2apiBaseUrl}/api/v1`;

export class Sub2apiRequestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "Sub2apiRequestError";
    this.status = Number(options.status ?? 502);
    this.code = options.code ?? null;
    this.payload = options.payload ?? null;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${apiBaseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export function getSub2apiApiUrl(path, query) {
  return buildUrl(path, query).toString();
}

function getErrorMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    for (const key of ["message", "msg", "error"]) {
      if (typeof payload[key] === "string" && payload[key].trim()) {
        return payload[key];
      }
    }
  }
  return fallback;
}

function getErrorCode(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  for (const key of ["error_code", "code"]) {
    if (typeof payload[key] === "string" || typeof payload[key] === "number") {
      return String(payload[key]);
    }
  }
  return null;
}

export async function sub2apiRequest(path, options = {}) {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const rawText = await response.text();
  let payload = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    throw new Sub2apiRequestError(getErrorMessage(payload, `sub2api request failed with status ${response.status}`), {
      status: response.status,
      code: getErrorCode(payload),
      payload
    });
  }

  if (!payload || typeof payload !== "object") {
    throw new Sub2apiRequestError("sub2api returned an invalid response.", {
      status: 502
    });
  }

  if (payload.code !== 0) {
    throw new Sub2apiRequestError(getErrorMessage(payload, "sub2api request failed."), {
      status: Number(payload.status ?? payload.http_status ?? 502),
      code: getErrorCode(payload),
      payload
    });
  }

  return payload.data;
}

export function toSub2apiPagination(query = {}) {
  return {
    page: query.page ?? 1,
    page_size: query.pageSize ?? 20
  };
}
