// Maestro runScript: resolve the seeded E2E client's REAL client_id from the
// local e2e backend, so the flow can tap client-row-<id> by resource-id.
// (Text matching is unavailable on iOS 26 — RN hierarchy exposes ids, not text.)
const login = http.post("http://127.0.0.1:8011/api/auth/login", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "midwife@test.com", password: "password123" }),
});
const auth = json(login.body);
var token = auth.session_token || auth.access_token || auth.token;
if (!token) throw new Error("login failed, no token in response");
const res = http.get("http://127.0.0.1:8011/api/midwife/clients", {
  headers: { Authorization: "Bearer " + token },
});
const list = json(res.body);
var e2e = null;
for (var i = 0; i < list.length; i++) {
  if (list[i].name === "E2E Mom Client") { e2e = list[i]; break; }
}
if (!e2e) throw new Error("E2E Mom Client not found in seeded clients");
output.rowId = "client-row-" + e2e.client_id;
output.clientId = e2e.client_id;