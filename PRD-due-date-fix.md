# PRD: Fix Due Date Display Bug on Mom Profile

## Problem

When a mom completes onboarding and picks a due date, the date shows a garbled year (e.g., "0018") on the profile screen instead of the correct year (e.g., "2026").

## Root Cause

There is a date format mismatch between the onboarding screen and the profile screen:

1. **Onboarding** (`frontend/app/(auth)/mom-onboarding.tsx`, line 49-54) formats the due date as `MM-DD-YYYY` (e.g., `"03-31-2026"`) before sending it to the backend API.

2. **Backend** (`backend/routes/mom.py`, line 70) stores the due_date as-is — a raw string like `"03-31-2026"`.

3. **Profile** (`frontend/app/(mom)/profile.tsx`, line 72) reads the stored date string and passes it to `new Date(dueDateStr)`. JavaScript's `Date` constructor does NOT correctly parse `MM-DD-YYYY` format with dashes. It either misinterprets it or produces a garbled date (wrong year, like 0003 or 0018).

4. The `formatDueDate` function (profile.tsx line 99-111) and `formatDisplayDate` function (profile.tsx line 157-166) also use `new Date(dateStr)` which has the same parsing issue.

## Solution

Fix both the onboarding format AND the profile parsing to use a consistent, unambiguous date format (ISO `YYYY-MM-DD`).

### Changes Required

### 1. `frontend/app/(auth)/mom-onboarding.tsx`

Change the `formatDate` function (lines 49-55) to output ISO format `YYYY-MM-DD` instead of `MM-DD-YYYY`:

```typescript
// BEFORE (line 49-55):
const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
};

// AFTER:
const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
};
```

Also update the displayed format shown to the user in the onboarding date picker button (line 184) so the user still sees a friendly `MM/DD/YYYY` format. Add a separate display formatter:

```typescript
// Add a display-only formatter for showing the date to the user in onboarding
const formatDateDisplay = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
};
```

Then change line 184 from `formatDate(dueDate)` to `formatDateDisplay(dueDate)` so the user sees a nice date, but the API receives ISO format.

### 2. `frontend/app/(mom)/profile.tsx`

Fix the `fetchData` function's date parsing (around line 71-73). The stored `due_date` from the API may be in `MM-DD-YYYY` (old data) or `YYYY-MM-DD` (new data). Add a robust parser:

```typescript
// In fetchData, replace lines 71-73:
if (dueDateStr) {
    // Handle both old MM-DD-YYYY and new YYYY-MM-DD formats
    let parsedDate: Date;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dueDateStr)) {
        // Old format: MM-DD-YYYY → parse manually
        const [month, day, year] = dueDateStr.split('-').map(Number);
        parsedDate = new Date(year, month - 1, day);
    } else {
        // ISO format: YYYY-MM-DD → safe to parse directly
        // Add T00:00:00 to avoid timezone offset issues
        parsedDate = new Date(dueDateStr + 'T00:00:00');
    }
    setDueDateObj(parsedDate);
    // Normalize storage to YYYY-MM-DD
    const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    setDueDate(normalizedDate);
}
```

Fix `formatDueDate` (lines 99-111) to also handle both formats:

```typescript
const formatDueDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
        let date: Date;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateStr + 'T00:00:00');
        }
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};
```

Fix `formatDisplayDate` (lines 157-166) similarly:

```typescript
const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        let date: Date;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateStr + 'T00:00:00');
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
};
```

## Tasks

- [x] Analyze the bug root cause (date format mismatch between onboarding and profile)
- [ ] Fix `formatDate` in `frontend/app/(auth)/mom-onboarding.tsx` to send `YYYY-MM-DD`
- [ ] Add `formatDateDisplay` in `frontend/app/(auth)/mom-onboarding.tsx` for user-facing display
- [ ] Fix date parsing in `fetchData` in `frontend/app/(mom)/profile.tsx` to handle both old and new formats
- [ ] Fix `formatDueDate` in `frontend/app/(mom)/profile.tsx`
- [ ] Fix `formatDisplayDate` in `frontend/app/(mom)/profile.tsx`
- [ ] Commit changes with a clear message

## Files to Modify

1. `frontend/app/(auth)/mom-onboarding.tsx`
2. `frontend/app/(mom)/profile.tsx`

## Testing

After changes, verify:
1. New onboarding sends `YYYY-MM-DD` format to API
2. Profile screen correctly displays dates from both old `MM-DD-YYYY` and new `YYYY-MM-DD` stored values
3. Editing the due date on the profile screen saves in `YYYY-MM-DD` format
4. The displayed date to the user always shows a friendly format (e.g., "March 31, 2026")
