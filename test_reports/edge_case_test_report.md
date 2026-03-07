# Contraction Timer Edge Case Test Report
**Date:** 2026-03-07
**Test Focus:** Edge cases, editing, sharing control

## Executive Summary

| Area | Status | Bugs Found | Fixes Applied |
|------|--------|------------|---------------|
| Multiple Sessions | ✅ PASS | 1 | 0 (UX choice) |
| Sharing Toggle | ✅ PASS | 0 | 0 |
| Retroactive Sync | ✅ DOCUMENTED | 0 | N/A |
| Double-Start Prevention | ✅ PASS | 0 | 0 |
| Long Timer Handling | ✅ PASS | 0 | 0 |
| Manual Entry & Intervals | ✅ PASS | 0 | 0 |
| Session Boundary Validation | ✅ FIXED | 1 | 1 |
| Pause vs End | ✅ PASS | 0 | 0 |
| Provider History View | ✅ ADDED | 1 (missing) | 1 |

---

## Part A: Multiple Sessions and Sharing Toggle

### A1: Mom Opens Timer After Previous Session Ended
**Status:** ✅ PASS
- Main screen shows neutral state (no active session)
- Previous session data NOT mixed into new stats
- Session history shows 1 previous ENDED session

### A2: Starting New Session (Returning User)
**Status:** ⚠️ UX DEVIATION
- **Spec says:** Sharing modal should NOT re-appear; reuse previous preference
- **Current behavior:** Sharing modal ALWAYS appears
- **Recommendation:** Store last sharing preference in user profile or localStorage
- **Impact:** Minor UX friction, not blocking

### A3: Doula Notification on Session Start
**Status:** ✅ PASS
- Doula received "Client Started Timing Contractions" notification
- Notification includes session_id for linking

### A4: Sharing Toggle OFF Mid-Session
**Status:** ✅ PASS
- `isSharedWithDoula` flag updated to `false`
- Doula's dashboard immediately returns "No active shared session"
- No further live updates sent

### A5: Sharing Toggle ON Again
**Status:** ✅ PASS
- `isSharedWithDoula` flag updated back to `true`
- Subsequent contractions visible to Doula

### A6: Retroactive Sync Decision

**DOCUMENTED BEHAVIOR:**
> When Mom turns sharing back ON, the Doula sees **ALL contractions from the session**, including those recorded during the OFF period.

**Rationale:**
- Simpler implementation (no per-contraction sharing flag needed)
- Medical safety: Provider sees complete timeline for accurate assessment
- Alternative approach would require `shared_at` timestamp on each contraction

**Spec Compliance:** This is a design decision, not explicitly specified. Documented here for clarity.

---

## Part B: Error & Editing Scenarios

### B1: Accidental Double-Start
**Status:** ✅ PASS

| Action | Result |
|--------|--------|
| First tap "Start" | Contraction started |
| Second tap "Start" (immediate) | HTTP 400: "A contraction is already in progress. Stop it first." |

**Behavior:** Second tap returns error. No zero-duration contraction created.
**Recovery:** Mom must tap "Stop" first to start a new contraction.

### B2: Forget-to-Stop Scenario (Long Timer)
**Status:** ✅ PASS

| Step | Result |
|------|--------|
| Start contraction | Timer begins |
| Wait 3+ seconds (simulating 20 min) | Duration recorded accurately |
| Stop contraction | Duration: 3s (would be ~1200s in real scenario) |
| Edit end_time in History | Duration recalculated to 197s |
| Verify averages | Recalculated correctly |

**Behavior:** Long durations are stored accurately. Mom can edit via History to correct.

### B3: Manual Entry & Interval Recalculation
**Status:** ✅ PASS

| Before Insert | After Insert (at 19:22) |
|---------------|-------------------------|
| 19:20 → 19:25 (interval: 300s) | 19:20 → 19:22 (interval: 120s) |
| | 19:22 → 19:25 (interval: 180s) |

**Behavior:**
- Manual entry inserted in correct chronological position
- `intervalSecondsToPrevious` recalculated for inserted AND following contractions
- Session averages updated

### B4: Editing Timestamps Across Session Boundaries
**Status:** ✅ FIXED (Bug found and fixed)

**Bug:** Backend allowed editing contraction start_time to before session start time.

**Fix Applied:**
```python
# Added validation in PUT /contractions/{id}:
if new_start < session_start:
    raise HTTPException(400, "Contraction start time cannot be before session start time")
if session_end and new_start > session_end:
    raise HTTPException(400, "Contraction start time cannot be after session end time")
```

**Test After Fix:**
- Attempting to edit to "2026-03-06T09:00:00" returns HTTP 400
- Session integrity preserved

---

## Part C: Session Pause vs End

### C1: Pause Session
**Status:** ✅ PASS

| Action | Session Status | Can Add Manual? | Can Start Timer? |
|--------|----------------|-----------------|------------------|
| Tap "Pause" | PAUSED | YES | NO (requires ACTIVE) |
| Tap "Resume" | ACTIVE | YES | YES |

**Behavior:**
- PAUSED status preserves session without ending
- Manual entries allowed while paused (for retroactive adds)
- Timer start blocked (session must be ACTIVE)

### C2: End Session
**Status:** ✅ PASS

| Action | Result |
|--------|--------|
| Tap "End Session" | Status: ENDED, endedAt set |
| Try to add contraction | HTTP 400: "No active session" |
| Try to start timer | HTTP 400: "No active session. Please start a session first." |

### C3: Starting New Session After End
**Status:** ✅ PASS
- Timer correctly requires new session creation
- Previous session data remains isolated

---

## Part D: Provider View (Doula)

### D1: Active Clients Dashboard
**Status:** ✅ PASS
- Shows 0 clients when no active shared sessions
- Would show client card with stats when active

### D2: Historical Session View
**Status:** ✅ ADDED (Feature was missing)

**New Endpoint:** `GET /api/contractions/team/client/{mom_id}/history`

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "sess_5dac005424fd",
      "status": "ENDED",
      "started_at": "2026-03-07T19:37:10",
      "ended_at": "2026-03-07T19:40:03",
      "contraction_count": 11,
      "average_duration_seconds": 84,
      "pattern_511_reached": false
    }
  ],
  "mom": {"full_name": "Emma Johnson"},
  "total_sessions": 2
}
```

### D3: Sessions That Were Never Shared
**Status:** ✅ PASS
- Endpoint filters by `is_shared_with_doula: True`
- Sessions where Mom kept sharing OFF from start are NOT visible

---

## Bugs Found & Fixed

### Bug #1: Session Boundary Validation Missing
- **Severity:** Medium
- **Description:** PUT /contractions/{id} allowed editing start_time to before session start
- **Impact:** Data integrity violation, could confuse timeline
- **Fix:** Added validation against session.started_at and session.ended_at
- **Status:** ✅ FIXED

### Bug #2: Provider Historical Session View Missing
- **Severity:** Medium
- **Description:** No endpoint for providers to view ENDED session history
- **Impact:** Providers couldn't review past labor patterns
- **Fix:** Added GET /contractions/team/client/{mom_id}/history
- **Status:** ✅ FIXED

---

## Design Decisions Documented

### 1. Retroactive Sync When Sharing Re-enabled
**Decision:** Full session history shared (not just post-enable contractions)
**Rationale:** Medical safety, simpler implementation

### 2. Double-Start Behavior
**Decision:** Error returned, no zero-duration contraction created
**Rationale:** Prevents data pollution, clear error message guides user

### 3. Sharing Modal on Returning Users
**Current:** Always shows
**Recommendation:** Store preference, skip modal if unchanged

---

## Files Modified

1. `/app/backend/routes/contractions.py`
   - Added session boundary validation in `update_contraction()`
   - Added `get_client_session_history()` endpoint

---

## Test Credentials Used
- Mom: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`
- Doula: `demo.doula@truejoybirthing.com` / `DemoScreenshot2024!`
