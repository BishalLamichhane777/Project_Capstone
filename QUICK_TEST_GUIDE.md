# Quick Performance Test Guide

## Goal
Determine if current optimizations are sufficient or if we need to drop to single-model mode.

---

## Quick Test (5 Minutes)

### Step 1: Restart Docker
```bash
docker-compose down
docker-compose up
```

### Step 2: Check Warmup
Look for these 4 lines at startup:
```
✅ DeepFace FaceNet512 model warmed up successfully.
✅ DeepFace ArcFace model warmed up successfully.
✅ Haar cascade pre-filter loaded successfully.
✅ MTCNN detector warmed up successfully.
```

### Step 3: Test Empty Frame (30 seconds)
- Point camera at empty doorway
- Watch logs for `[TIMING]` lines
- Look for: `SKIPPED MTCNN` and `TOTAL=XX ms`

**Record:** Empty frame average = _____ ms
**Target:** < 50ms
**Pass/Fail:** ⬜

### Step 4: Test Unknown Face (30 seconds)
- Point camera at someone NOT enrolled
- Watch logs for `SHORT-CIRCUIT` and `ArcFace SKIPPED`
- Note `total_face=` time

**Record:** Unknown face average = _____ ms
**Target:** < 600ms
**Pass/Fail:** ⬜

### Step 5: Test Your Face (1 minute)
- Scan yourself (enrolled student)
- First scan should be fast (warmup working)
- Subsequent scans should be consistent
- Both FaceNet512 AND ArcFace should run

**Record First scan:** _____ ms
**Target:** < 1200ms
**Pass/Fail:** ⬜

**Record Steady scan:** _____ ms
**Target:** < 1000ms
**Pass/Fail:** ⬜

---

## Decision Matrix

### All Tests Pass (All < targets) ✅
**Action:** Keep current setup
- Ensemble is fast enough
- No further changes needed
- System ready for production

### Steady Scan > 1000ms but < 1500ms ⚠️
**Action:** Investigate before deciding
1. Check Docker CPU allocation
2. Verify optimizations are working
3. Check for other system load
4. Re-test after fixes

### Steady Scan > 1500ms ❌
**Action:** Switch to single-model mode
- Ensemble too slow even with optimizations
- Recommendation: FaceNet512 only for live scanning
- Keep ensemble for enrollment/verification

---

## Quick Benchmark

Expected times after all optimizations:

| Scenario | Expected | Your Time | Status |
|----------|----------|-----------|--------|
| Empty frame | 28ms | _____ ms | ⬜ |
| Unknown face | 455ms | _____ ms | ⬜ |
| Known (first) | 880ms | _____ ms | ⬜ |
| Known (steady) | 880ms | _____ ms | ⬜ |

---

## If Tests Fail

### Empty Frame Still Slow (>100ms)
**Issue:** Pre-check not working
**Check:** Look for "SKIPPED MTCNN" in logs
**If missing:** Haar cascade may not have loaded

### Unknown Face Still Slow (>800ms)
**Issue:** Short-circuit not working
**Check:** Look for "SHORT-CIRCUIT" in logs
**If missing:** ArcFace is running when it shouldn't

### First Scan Still Slow (>2000ms)
**Issue:** Warmup not working
**Check:** First scan times should match steady-state
**If slow:** Models loading on first use instead of at startup

### All Scans Consistently Slow
**Issue:** System resource limitation
**Check:** Docker CPU/memory, other processes
**Action:** Increase Docker resources or reduce load

---

## Report Format

Copy and fill in:

```
QUICK TEST RESULTS:

✅ Warmup: 4/4 messages seen
✅ Pre-check: Saw "SKIPPED MTCNN"
✅ Short-circuit: Saw "SHORT-CIRCUIT"

Timing:
- Empty: ___ms (target <50ms) [PASS/FAIL]
- Unknown: ___ms (target <600ms) [PASS/FAIL]
- Known (1st): ___ms (target <1200ms) [PASS/FAIL]
- Known (steady): ___ms (target <1000ms) [PASS/FAIL]

Decision: [KEEP ENSEMBLE / SINGLE MODEL / INVESTIGATE]
```

---

## Next Steps Based on Results

### If KEEP ENSEMBLE:
1. ✅ System is ready
2. Monitor performance in production
3. Document final configuration

### If SINGLE MODEL:
1. Report back for implementation
2. Will modify recognizer.py to use FaceNet512 only
3. Re-test to confirm <600ms scans
4. ~40-50% speed improvement expected

### If INVESTIGATE:
1. Share full timing logs
2. We'll diagnose specific bottleneck
3. Apply targeted fixes
4. Re-test

---

## Example Good Results

```
[TIMING] fast_face_precheck: 8.2ms, result=EMPTY
[TIMING] detect_faces: SKIPPED MTCNN | total=8.5ms | SAVED ~300ms ✅
[TIMING] /scan COMPLETE | TOTAL=26.3ms

[TIMING] fast_face_precheck: 11.4ms, result=FACE_FOUND
[TIMING] Face 1 FaceNet512: FaceNet512=398.7ms
[TIMING] Face 1: SHORT-CIRCUIT | (ArcFace SKIPPED) ✅
[TIMING] /scan COMPLETE | TOTAL=441.2ms

[TIMING] fast_face_precheck: 12.1ms, result=FACE_FOUND
[TIMING] Face 1 FaceNet512: FaceNet512=412.3ms
[TIMING] Face 1 ArcFace: ArcFace=298.5ms
[TIMING] Face 1: RECOGNIZED student_3004 ✅
[TIMING] /scan COMPLETE | TOTAL=867.9ms
```

These results would be **PASS** - keep ensemble! ✅

---

## Need Help?

Share your results and I'll help analyze:
- Full Docker logs (last 2 minutes)
- System specs (CPU, RAM, Docker allocation)
- Number of enrolled students
- Whether optimizations are triggering

The timing logs will tell us exactly what to do next! 📊
