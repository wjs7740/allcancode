import crypto from "node:crypto";

function sortAndJoin(params) {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== "" && params[key] !== null && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

export function createEpaySignature(params, secret) {
  const payload = sortAndJoin(params) + secret;
  return crypto.createHash("md5").update(payload).digest("hex");
}

export function verifyEpaySignature(params, secret) {
  const provided = String(params.sign ?? "").toLowerCase();
  if (!provided) {
    return false;
  }
  return createEpaySignature(params, secret) === provided;
}

export function buildKyrenCheckout({
  provider,
  methodCode,
  orderNo,
  title,
  amount,
  notifyUrl,
  returnUrl
}) {
  const baseFields = {
    pid: provider.merchant_id,
    type: methodCode,
    out_trade_no: orderNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: title,
    money: amount.toFixed(2),
    clientip: "127.0.0.1"
  };

  const secret = provider.resolved_secret || "";
  const sign = createEpaySignature(baseFields, secret);

  return {
    mode: "epay_compat",
    providerCode: provider.provider_code,
    providerName: provider.display_name,
    endpoint: provider.endpoint,
    methodCode,
    orderNo,
    amount,
    displayAmount: amount,
    submitFields: {
      ...baseFields,
      sign,
      sign_type: "MD5"
    },
    submitUrl: provider.endpoint,
    notifyUrl,
    returnUrl,
    sign,
    signType: "MD5"
  };
}

export function resolveSecretFromRef(secretRef) {
  if (!secretRef) {
    return "";
  }
  if (secretRef.startsWith("env:")) {
    return process.env[secretRef.slice(4)] ?? "";
  }
  return secretRef;
}
