const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store, max-age=0"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  const absolute = path.normalize(path.join(root, filePath));

  if (!absolute.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(absolute, (error, content) => {
    if (error) {
      if (!path.extname(absolute)) {
        fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackContent) => {
          if (fallbackError) {
            send(res, 404, "Not found");
            return;
          }
          send(res, 200, fallbackContent, mimeTypes[".html"]);
        });
        return;
      }
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, content, mimeTypes[path.extname(absolute)] || "application/octet-stream");
  });
});

function localAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}`);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Kasir GAS berjalan di http://localhost:${port}`);
  localAddresses().forEach((url) => console.log(`Akses HP satu WiFi: ${url}`));
});
