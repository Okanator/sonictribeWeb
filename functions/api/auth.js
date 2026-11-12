// Prijava v urejevalnik (Decap CMS) z GitHub računom – korak 1: preusmeri na GitHub.
// Potrebni spremenljivki v Cloudflare Pages: GITHUB_CLIENT_ID in GITHUB_CLIENT_SECRET (skrivnost).
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) return new Response("Manjka GITHUB_CLIENT_ID v nastavitvah Cloudflare Pages.", { status: 500 });
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  gh.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
  gh.searchParams.set("scope", url.searchParams.get("scope") || "repo,user");
  gh.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: gh.toString(),
      "Set-Cookie": `st_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
