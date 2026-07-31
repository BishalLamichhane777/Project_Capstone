# Performance Testing Guide

## Quick Test Procedure

### Step 1: Restart Docker
```bash
cd C:\Users\bisha\Documents\Project_Capstone
docker-compose down
docker-compose up
```

### Step 2: Verify Warmup
Look for these 3 lines in startup logs:
```
✅ DeepFace FaceNet512 model warmed up successfully.
✅ DeepFace ArcFace model warmed up successfully.
✅ MTCNN detector warmed up successfully.
```

### Step 3: Test First Scan (Cold Start)
1. Open your mobile app
2. Start a class session
3. **Start timer** when you point camera at face
4. **Stop timer** when you see "RECOGNIZED" on screen
5. **Record time:** __________ seconds

**Expected:** 5-7 seconds (down from 15-17 seconds)

### Step 4: Check Timing Logs
In Docker logs, find lines starting with `[TIMING]`:
```
[TIMING] recognize_face: preprocess=X ms, MTCNN_detection=X ms
[TIMING] Face 1 FaceNet512: crop=X ms, align=X ms, FaceNet512=X ms
[TIMING] Face 1: RECOGNIZED student_X | total_face=X ms
```

**Record these times:**
- MTCNN detection: __________ ms
- FaceNet512: __________ ms
- ArcFace: __________ ms (or "SKIPPED")
- Total face: __________ ms

### Step 5: Test Unknown Face (Short-Circuit)
1. Point camera at someone NOT enrolled
2. Check logs for `SHORT-CIRCUIT` message
3. **Record:** Was ArcFace skipped? YES / NO

**Expected log:**
```
[TIMING] Face 1: SHORT-CIRCUIT (FaceNet512 too far) | ... (ArcFace SKIPPED)
```

### Step 6: Test Recognition Frequency
1. Walk in front of camera (ENTRY event)
2. **Record time until recognized:** __________ seconds
3. Walk away and immediately back (EXIT then ENTRY)
4. **Record EXIT detection time:** __________ seconds
5. **Record next ENTRY time:** __________ seconds

**Expected:**
- First ENTRY: ~7 seconds (5s cooldown + 2s processing)
- EXIT: ~5 seconds (3s cooldown + 2s processing)
- Next ENTRY: ~7 seconds

---

## Data Collection Template

### Test Date: __________
### Time: __________

#### 1. Cold Start (First Scan)
- Time to recognition: __________ seconds
- Expected: 5-7 seconds
- ✅ / ❌

#### 2. Known Student Scan
- MTCNN detection: __________ ms
- FaceNet512: __________ ms
- ArcFace: __________ ms
- Total: __________ ms
- Expected total: 700-900 ms
- ✅ / ❌

#### 3. Unknown Face Scan
- FaceNet512: __________ ms
- ArcFace: SKIPPED / RAN
- Total: __________ ms
- Expected: 450-550 ms with skip
- ✅ / ❌

#### 4. Recognition Frequency
- ENTRY #1: __________ seconds
- EXIT: __________ seconds
- ENTRY #2: __________ seconds
- Expected ENTRY: ~7s, EXIT: ~5s
- ✅ / ❌

#### 5. Observations
- [ ] All warmup messages appeared at startup
- [ ] SHORT-CIRCUIT appears for unknown faces
- [ ] Separate cooldowns working (ENTRY vs EXIT)
- [ ] Recognition is noticeably faster

---

## Quick Comparison

### Before Optimizations (Baseline)
- First scan: 15-17 seconds
- Known student: 1000ms
- Unknown face: 1000ms
- Recognition frequency: 17 seconds

### After Optimizations (Target)
- First scan: 5-7 seconds (**60% faster**)
- Known student: 700-900ms (slightly faster)
- Unknown face: 450-550ms (**50% faster**)
- Recognition frequency: 5-7 seconds (**2-3× faster**)

---

## If Results Don't Match Expectations

### First scan still slow (>10 seconds)?
- Check startup logs for warmup messages
- One or more models may not be warming up
- Check Docker logs for errors

### Unknown faces still slow (>800ms)?
- Check for SHORT-CIRCUIT messages in logs
- If missing, the optimization isn't triggering
- Verify FaceNet512 threshold check is working

### Recognition frequency still slow (>10 seconds)?
- Check .env file has EXIT_COOLDOWN_SECONDS=3
- Verify Docker picked up the new .env
- Check logs for cooldown debug messages

### General slowness?
- Check Docker resource allocation (CPU/Memory)
- Verify no other heavy processes running
- Check network latency (app → backend)

---

## Performance Log Example (What to Look For)

### Good Performance (Optimized):
```
2026-07-30 12:15:30 [INFO] [TIMING] recognize_face: preprocess=5.2ms, MTCNN_detection=287.3ms, faces_detected=1
2026-07-30 12:15:30 [INFO] [TIMING] Face 1 FaceNet512: crop=1.8ms, align=4.3ms, resize=1.2ms, FaceNet512=412.5ms
2026-07-30 12:15:30 [INFO] [TIMING] Face 1 ArcFace: ArcFace=298.7ms
2026-07-30 12:15:30 [INFO] [TIMING] Face 1 comparison: FaceNet=8.2ms, ArcFace=7.9ms
2026-07-30 12:15:30 [INFO] [TIMING] Face 1: RECOGNIZED student_3004 | total_face=724.6ms
2026-07-30 12:15:30 [INFO] [TIMING] recognize_face: COMPLETE | total=812.1ms, recognized=1/1 faces
```

### Good Performance (Unknown Face - Short-Circuit):
```
2026-07-30 12:16:15 [INFO] [TIMING] recognize_face: preprocess=5.1ms, MTCNN_detection=291.2ms, faces_detected=1
2026-07-30 12:16:15 [INFO] [TIMING] Face 1 FaceNet512: crop=1.9ms, align=4.1ms, resize=1.3ms, FaceNet512=398.3ms
2026-07-30 12:16:15 [INFO] [TIMING] Face 1: SHORT-CIRCUIT (FaceNet512 too far) | compare_facenet=9.1ms, total_face=414.7ms | best_match=student_3004, dist=0.7234, threshold=0.3500 (ArcFace SKIPPED)
2026-07-30 12:16:15 [INFO] [TIMING] recognize_face: COMPLETE | total=711.0ms, recognized=0/1 faces
```

---

## Next Steps After Testing

1. **Record all measurements** using template above
2. **Share results** with team or in documentation
3. **Decide if further optimization needed** based on:
   - Are times acceptable for your use case?
   - Is accuracy still good?
   - Any issues with false positives/negatives?

4. **If further optimization needed**, consider:
   - Option A: Single model (drop ArcFace) → +300ms speed, -security
   - Option B: Increase MIN_FACE_WIDTH → +detection range, -distant faces
   - Option C: Lower resolution → +50ms speed, -slight accuracy

**Recommendation:** Current optimizations should be sufficient for most use cases!
