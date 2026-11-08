// Container health check: exits 0 if the app answers, 1 if not. A script
// rather than an inline `node -e "..."`, because Quadlet's HealthCmd= and
// the shell podman runs it with each strip a layer of quotes.
const port = process.env.PORT || "8787";
fetch(`http://127.0.0.1:${port}/robots.txt`, { signal: AbortSignal.timeout(5000) }).then(
  (response) => process.exit(response.ok ? 0 : 1),
  () => process.exit(1),
);
