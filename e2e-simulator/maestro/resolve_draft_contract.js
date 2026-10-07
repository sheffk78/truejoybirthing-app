// Maestro runScript: after the provider taps Create Contract (+OK), fetch the
// new Draft contract's id from the e2e backend. Phase 3 cleanup guarantees
// exactly one Draft exists — the one this run just created.
const login = http.post("http://127.0.0.1:8011/api/auth/login", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "midwife@test.com", password: "password123" }),
});
const auth = json(login.body);
var token = auth.session_token || auth.access_token || auth.token;
if (!token) throw new Error("login failed, no token in response");
const res = http.get("http://127.0.0.1:8011/api/midwife/contracts", {
  headers: { Authorization: "Bearer " + token },
});
const list = json(res.body);
var drafts = [];
for (var i = 0; i < list.length; i++) {
  if (list[i].status === "Draft") drafts.push(list[i]);
}
if (drafts.length === 0) throw new Error("no Draft contract found after create");
if (drafts.length > 1) throw new Error("expected 1 draft, found " + drafts.length +
  " — run cleanup before Phase 3");
output.contractId = drafts[0].contract_id;
// The sign endpoint enforces contract.signing_token; the mom-side deep link
// must carry it or the POST /sign returns 403 Invalid signing token.
output.signingToken = drafts[0].signing_token || "";
if (!output.signingToken) throw new Error("created Draft has no signing_token — deep-link sign would 403");