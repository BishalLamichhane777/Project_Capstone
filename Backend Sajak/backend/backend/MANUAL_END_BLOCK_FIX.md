# Manual End Block Fix

## Problem
After a teacher manually ended a class session early (before its `scheduled_end_time`), they could immediately call start again and create a brand-new session for the same class on the same day. This allowed teachers to bypass the intended single-session-per-day restriction.

## Root Cause
The `start_session()` function in `routes/session.py` only guarded against existing sessions with `status == "ACTIVE"`. It never checked for sessions that were already CLOSED earlier today for the same class, so ending early and restarting just created a fresh session.

## Solution Implemented

### 1. Database Schema Change (`models/session.py`)
- Added `ended_reason` column to the `Session` model
  - Type: `String(20)`, nullable
  - Values: `"manual"` (teacher ended) or `"auto_expired"` (system closed stale session)
- Updated `to_dict()` method to include `ended_reason` in API responses

### 2. Database Migration (`app.py`)
- Added migration statement to add `ended_reason` column to existing `sessions` table:
  ```python
  "ALTER TABLE sessions ADD COLUMN ended_reason VARCHAR(20)"
  ```
- Migration runs safely on startup (ignores if column already exists)

### 3. Session End Tracking (`routes/session.py`)

#### Manual End (`end_session()`)
- Sets `ended_reason = "manual"` when teacher explicitly ends via `/api/session/end`
- This marks the session as intentionally closed by the teacher

#### Auto-Expiry (`_auto_expire_stale_session()`)
- Sets `ended_reason = "auto_expired"` when system closes stale sessions
- Updated in two places:
  1. Sessions from previous calendar days
  2. Sessions past `scheduled_end_time + STALE_GRACE_MINUTES`

### 4. Restart Block Logic (`start_session()`)
Added new check after ACTIVE session check and before schedule enforcement:

```python
# Query for any CLOSED session with ended_reason='manual' whose start_time
# falls on today's local date
manually_ended_today = Session.query.filter_by(
    class_id=class_id,
    status="CLOSED",
    ended_reason="manual"
).all()

for sess in manually_ended_today:
    # Convert session start_time to local date
    start_aware = sess.start_time
    if start_aware.tzinfo is None:
        start_aware = start_aware.replace(tzinfo=timezone.utc)
    session_date_local = start_aware.astimezone(tz).date()

    if session_date_local == today_local:
        return (
            jsonify({
                "error": (
                    "This class was already ended earlier today and cannot be restarted. "
                    "Contact an admin if you need to reopen it."
                ),
                "status": 403,
            }),
            403,
        )
```

**Key Points:**
- Only blocks if `ended_reason == "manual"` (teacher-initiated)
- Does NOT block if `ended_reason == "auto_expired"` (preserves existing auto-restart behavior)
- Works regardless of whether class has `scheduled_date` configured
- Compares dates in server's local timezone (Asia/Kathmandu)
- Returns clear 403 error with actionable message

### 5. Updated Documentation
- Updated `start_session()` docstring to document the new manual-end blocking rule
- Updated `_auto_expire_stale_session()` docstring to mention `ended_reason` setting

### 6. Frontend Compatibility (`AttendanceApp/screens/StartClassScreen.js`)
- No changes needed
- Existing error handler in `handleStart()` already displays `data.error` in an Alert
- New error message will show: "This class was already ended earlier today and cannot be restarted. Contact an admin if you need to reopen it."

## Behavior Matrix

| Scenario | Can Restart? | Reason |
|----------|--------------|--------|
| Teacher ends early → tries to restart same day | ❌ No | `ended_reason="manual"` blocks restart |
| Session auto-expires → teacher starts again | ✅ Yes | `ended_reason="auto_expired"` allows restart |
| Teacher ends early → starts next day | ✅ Yes | Different calendar date |
| No `scheduled_date` + manual end → restart same day | ❌ No | Block applies to all classes |
| Active session exists → start again | ✅ Yes (resume) | Existing behavior (resume feature) |

## Testing

### Test Coverage (`tests/test_manual_end_block.py`)
Created comprehensive test suite with 6 test cases:

1. **test_manual_end_blocks_restart_same_day**
   - Teacher ends class early → tries to start again same day → 403 blocked

2. **test_auto_expired_session_allows_restart**
   - Session auto-expires past `scheduled_end_time` → starting again works
   - Verifies existing auto-restart behavior not regressed

3. **test_manual_end_without_schedule_blocks_restart**
   - Class with no `scheduled_date`, manually ended → restart blocked
   - Ensures restriction applies universally

4. **test_manual_end_yesterday_allows_today_start**
   - Session manually ended yesterday → starting today is allowed
   - Verifies date boundary logic

5. **test_multiple_start_attempts_after_manual_end**
   - Multiple start attempts after manual end → all blocked same day

6. **test_different_class_not_affected**
   - Manual end of one class doesn't block other classes

### Running Tests
```bash
cd Backend\ Sajak/backend/backend
python tests/test_manual_end_block.py
```

## Files Modified

1. **Backend Sajak/backend/backend/models/session.py**
   - Added `ended_reason` column
   - Updated `to_dict()`

2. **Backend Sajak/backend/backend/routes/session.py**
   - Added manual-end block check in `start_session()`
   - Set `ended_reason="manual"` in `end_session()`
   - Set `ended_reason="auto_expired"` in `_auto_expire_stale_session()` (2 places)
   - Updated docstrings

3. **Backend Sajak/backend/backend/app.py**
   - Added migration for `ended_reason` column

4. **Backend Sajak/backend/backend/tests/test_manual_end_block.py**
   - New comprehensive test file (6 tests)

## Deployment Notes

1. **Database Migration**: The `ended_reason` column migration runs automatically on server startup via `app.py`. Existing sessions will have `NULL` for `ended_reason`, which is safe (they won't block future starts since the check looks for `ended_reason="manual"`).

2. **Backward Compatibility**: Classes without `scheduled_date` continue to work - the manual-end block applies to them as well.

3. **Admin Override**: If a teacher needs to restart a manually-ended class, an admin must:
   - Use the admin panel to delete the closed session, OR
   - Manually update the session's `ended_reason` to `"auto_expired"` or `NULL` in the database

4. **Timezone**: All date comparisons use `SERVER_TIMEZONE` config (Asia/Kathmandu) for consistency.

## Security Considerations

- Teachers cannot bypass the restriction without admin intervention
- The error message guides teachers to contact admin (doesn't expose technical details)
- Auto-expired sessions remain restartable (preserves existing emergency restart capability)

## Future Enhancements

Potential improvements for future versions:
1. Admin API endpoint to "reopen" a manually-closed session
2. Configurable grace period for same-day restarts
3. Audit log for manual session ends
4. Dashboard showing manually-ended sessions for admin review
