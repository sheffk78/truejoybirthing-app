// Maestro runScript (final step of contract_flow.yaml): assert the API sign
// SUCCEEDED for THIS run's contract — not just that the success alert showed.
// Until 10/02 Phase 4 only checked "some Signed contract exists", and the
// pre-run sweep already set stale Sent contracts to Signed, so a sign failure
// passed vacuously. This script pins the assertion to output.contractId.
const login = http.post("http://127.0.0.1:8011/api/auth/login", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "midwife@test.com", password: "password123" }),
});
const token = json(login.body).session_token;
if (!token) throw new Error("login failed, no token in response");
const res = http.get("http://127.0.0.1:8011/api/midwife/contracts", {
  headers: { Authorization: "Bearer " + token },
});
const list = json(res.body);
var mine = null;
for (var i = 0; i < list.length; i++) {
  if (list[i].contract_id === output.contractId) { mine = list[i]; break; }
}
if (!mine) throw new Error("sign assertion: contract " + output.contractId + " not found");
if (mine.status !== "Signed")
  throw new Error("sign assertion FAILED: contract " + output.contractId + " status=" + mine.status + " — API sign did not succeed");
var sig = (mine.client_signature || {}).signer_name || "";
if (sig !== "Test Mom")
  throw new Error("sign assertion FAILED: client_signature.signer_name=" + sig + " (expected Test Mom)");
// Marker consumed by run_e2e.sh Phase 4 (verify_backend.py --contract-id pin).
console.log("E2E_SIGN_ASSERT contract_id=" + output.contractId + " signer=" + sig);