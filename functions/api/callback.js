// Prijava v urejevalnik – korak 2: GitHub vrne kodo, zamenjamo jo za žeton in ga predamo urejevalniku.
function page(status, content) {
  const msg = `authorization:github:${status}:${JSON.stringify(content)}`;
  return new Response(
    `<!doctype html><html><body><p>${status === "success" ? "Prijava uspešna – okno se bo zaprlo." : "Prijava ni uspela."}</p><script>
(function () {
  function receive(e) {
    window.opener.postMessage(${JSON.stringify(msg)}, e.origin);
    window.removeEventListener("message", receive, false);
    setTimeout(function () { window.close() }, 300);
  }
  window.addEventListener("message", receive, false);
  window.opener && window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "st_oauth_state=; Path=/api; Max-Age=0" } }
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = (request.headers.get("Cookie") || "").match(/st_oauth_state=([^;]+)/);
  if (!code || !state || !cookie || cookie[1] !== state) return page("error", { message: "Neveljavna zahteva za prijavo." });

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "sonictribe-cms" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!data.access_token) return page("error", { message: data.error_description || "GitHub ni vrnil žetona." });
  return page("success", { token: data.access_token, provider: "github" });
}
