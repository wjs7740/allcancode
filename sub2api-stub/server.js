import http from "node:http";

const port = Number(process.env.PORT ?? 3002);

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === "/health") {
    sendJson(response, { status: "ok", service: "sub2api-stub" });
    return;
  }

  if (url.pathname.startsWith("/v1/")) {
    sendJson(response, {
      service: "sub2api-stub",
      route: url.pathname,
      message: "Gateway route placeholder. Replace this container with real sub2api later."
    });
    return;
  }

  if (url.pathname.startsWith("/admin")) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>sub2api Admin Stub</title>
    <style>
      body { margin:0; font-family: system-ui, sans-serif; background:#0d1520; color:#f3f6fb; }
      main { max-width: 760px; margin: 0 auto; padding: 48px 20px; }
      .card { background:#142131; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; }
      code { background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:6px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>sub2api admin stub</h1>
        <p>This local service reserves the <code>/admin/*</code> and <code>/v1/*</code> boundaries required by GOAL.md.</p>
        <p>Replace this container with the real sub2api service when integrating the actual admin backend and gateway core.</p>
      </div>
    </main>
  </body>
</html>`);
    return;
  }

  sendJson(response, { error: "not found", path: url.pathname }, 404);
});

server.listen(port, () => {
  console.log(`sub2api-stub listening on ${port}`);
});
