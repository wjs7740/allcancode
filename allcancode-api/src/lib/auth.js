import crypto from "node:crypto";

const secret = process.env.APP_JWT_SECRET ?? "allcancode-dev-secret";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export function signToken(userId) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 }));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  if (expected !== signature) {
    return null;
  }

  const parsed = JSON.parse(base64UrlDecode(payload));
  if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    return null;
  }

  if (typeof parsed.userId !== "number") {
    return null;
  }

  return parsed;
}
