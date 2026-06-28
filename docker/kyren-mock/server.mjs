import crypto from "node:crypto";
import http from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT ?? 9000);
const publicBaseUrl = (process.env.MOCK_PUBLIC_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const defaultPid = process.env.MOCK_EASYPAY_PID ?? "demo-pid";
const secret = process.env.MOCK_EASYPAY_PKEY ?? "demo-pkey";

const orders = new Map();

function signParams(params) {
  const payload = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("md5").update(payload + secret).digest("hex");
}

function parseForm(bodyText) {
  const params = new URLSearchParams(bodyText);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, html, status = 200) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(html);
}

function sendText(response, text, status = 200) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(text);
}

function getOrderByTradeNo(outTradeNo, tradeNo) {
  for (const order of orders.values()) {
    if (order.outTradeNo === outTradeNo || (tradeNo && order.tradeNo === tradeNo)) {
      return order;
    }
  }
  return null;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function notifyUpstream(order) {
  if (!order.notifyUrl || order.notifiedAt) {
    return;
  }

  const payload = {
    pid: order.pid,
    type: order.type,
    out_trade_no: order.outTradeNo,
    trade_no: order.tradeNo,
    trade_status: "TRADE_SUCCESS",
    money: order.amount,
    name: order.name
  };
  payload.sign = signParams(payload);
  payload.sign_type = "MD5";

  const body = new URLSearchParams(payload).toString();
  try {
    const response = await fetch(order.notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (response.ok) {
      order.notifiedAt = new Date().toISOString();
    }
  } catch (error) {
    console.error("mock-easypay notify failed", error);
  }
}

async function handleCreatePayment(request, response) {
  const body = parseForm(await readBody(request));
  const outTradeNo = String(body.out_trade_no ?? "").trim();
  if (!outTradeNo) {
    sendJson(response, { code: 0, msg: "missing out_trade_no" }, 400);
    return;
  }

  const tradeNo = `mock-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const payUrl = `${publicBaseUrl}/mock-pay/${encodeURIComponent(outTradeNo)}`;

  const order = {
    pid: String(body.pid ?? defaultPid),
    outTradeNo,
    tradeNo,
    amount: String(body.money ?? "0"),
    type: String(body.type ?? "alipay"),
    name: String(body.name ?? "Recharge"),
    notifyUrl: String(body.notify_url ?? ""),
    returnUrl: String(body.return_url ?? ""),
    status: "pending",
    createdAt: new Date().toISOString(),
    notifiedAt: null
  };

  orders.set(outTradeNo, order);
  sendJson(response, {
    code: 1,
    msg: "success",
    trade_no: tradeNo,
    payurl: payUrl,
    qrcode: payUrl
  });
}

async function handleOrderQuery(request, response, routeUrl) {
  const body = parseForm(await readBody(request));
  const outTradeNo = String(body.out_trade_no ?? routeUrl.searchParams.get("out_trade_no") ?? "").trim();
  const tradeNo = String(body.trade_no ?? routeUrl.searchParams.get("trade_no") ?? "").trim();
  const order = getOrderByTradeNo(outTradeNo, tradeNo);

  if (!order) {
    sendJson(response, { code: 0, msg: "order not found" }, 404);
    return;
  }

  sendJson(response, {
    code: 1,
    msg: "success",
    trade_status: order.status === "paid" ? "TRADE_SUCCESS" : "WAIT_BUYER_PAY",
    status: order.status === "paid" ? 1 : 0,
    money: order.amount,
    trade_no: order.tradeNo
  });
}

async function handleRefund(request, response) {
  const body = parseForm(await readBody(request));
  sendJson(response, {
    code: 1,
    msg: "refund accepted",
    out_trade_no: body.out_trade_no ?? "",
    trade_no: body.trade_no ?? ""
  });
}

async function handleMockPay(response, routeUrl) {
  const orderId = decodeURIComponent(routeUrl.pathname.replace(/^\/mock-pay\//, ""));
  const order = orders.get(orderId);
  if (!order) {
    sendHtml(response, "<h1>Order not found</h1>", 404);
    return;
  }

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  await notifyUpstream(order);

  const returnUrl = order.returnUrl || `${publicBaseUrl}/payment/result?status=success&out_trade_no=${encodeURIComponent(order.outTradeNo)}`;
  sendHtml(
    response,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="1;url=${returnUrl}" />
    <title>Mock EasyPay</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f6f2; color: #1d2a32; }
      main { width: min(640px, 92vw); background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(29,42,50,.12); }
      a { color: #0b7a75; }
      .code { font-family: monospace; background: #eff6f6; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Local EasyPay Mock</h1>
      <p>Payment for <span class="code">${order.outTradeNo}</span> has been marked as paid.</p>
      <p>The mock service has already notified <span class="code">${order.notifyUrl}</span>.</p>
      <p>You will be redirected back to the app shortly.</p>
      <p><a href="${returnUrl}">Return now</a></p>
    </main>
  </body>
</html>`
  );
}

const server = http.createServer(async (request, response) => {
  const routeUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? `127.0.0.1:${port}`}`);

  if (request.method === "GET" && routeUrl.pathname === "/health") {
    sendJson(response, { status: "ok", orders: orders.size });
    return;
  }

  if (request.method === "POST" && routeUrl.pathname === "/mapi.php") {
    await handleCreatePayment(request, response);
    return;
  }

  if (request.method === "POST" && routeUrl.pathname === "/api.php" && routeUrl.searchParams.get("act") === "order") {
    await handleOrderQuery(request, response, routeUrl);
    return;
  }

  if (request.method === "POST" && routeUrl.pathname === "/api.php" && routeUrl.searchParams.get("act") === "refund") {
    await handleRefund(request, response);
    return;
  }

  if (request.method === "GET" && routeUrl.pathname.startsWith("/mock-pay/")) {
    await handleMockPay(response, routeUrl);
    return;
  }

  sendText(response, "not found", 404);
});

server.listen(port, () => {
  console.log(`mock-easypay listening on ${port}`);
});
