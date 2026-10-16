const WITHDRAWN = new Set([
  "dungeon-wake",
  "dungeon-wake.html",
  "progress-summary",
  "progress-summary.html",
  "gift-notice",
  "gift-notice.html",
]);

export function onRequest(context) {
  const file = context.params.file;
  const name = Array.isArray(file) ? file.join("/") : String(file ?? "");
  if (WITHDRAWN.has(name)) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return context.next();
}
