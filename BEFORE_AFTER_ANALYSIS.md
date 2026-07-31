# Step 5: Before/After Performance Analysis

## Instructions

1. **Restart Docker** with all optimizations: `docker-compose down && docker-compose up`
2. **Run tests** as described below
3. **Fill in the "Actual Results" column** with real timing data from logs
4. **Analyze** if we're comfortably under 1 second for live scans

---

## Test Scenarios

### Test A: No Face in Frame (Empty Doorway)

**Setup:** Point camera at empty doorway, run 10 scans, take average

**Baseline (Before Optimizations):**
```
[TIMING] detect_faces: MTCNN_raw=287ms, total=290ms
[TIMING] recognize_face: total=295ms (no faces)
[TIMING] /scan COMPLETE | TOTAL=310ms
```

**Expected (After Optimizations):**
```
[TIMING] fast_face_precheck: 8ms, result=EMPTY
[TIMING] detect_faces: SKIPPED MTCNN | total=8ms | SAVED ~300ms
[TIMING] recognize_face: total=13ms (no faces)
[TIMING] /scan COMPLETE | TOTAL=28ms
```

**Fill in YOUR results:**

| Metric | Baseline | Expected | Actual | Notes |
|--------|----------|----------|--------|-------|
| fast_face_precheck | N/A | 5-20ms | _____ ms | Should say "EMPTY" |
| MTCNN status | Always ran | SKIPPED | _______ | Should see "SKIPPED MTCNN" |
| recognize_face total | 295ms | 10-15ms | _____ ms | |
| /scan TOTAL | 310ms | 25-35ms | _____ ms | **Target: <50ms** |

**✅ SUCCESS CRITERIA:** Total time < 50ms (was 310ms)

---

### Test B: Unknown Face (Stranger in Frame)

**Setup:** Point camera at someone NOT enrolled, run 10 scans, take average

**Baseline (Before Optimizations):**
```
[TIMING] detect_faces: MTCNN_raw=287ms
[TIMING] Face 1 FaceNet512: FaceNet512=412ms
[TIMING] Face 1 ArcFace: ArcFace=298ms
[TIMING] Face 1: REJECTED
[TIMING] recognize_face: total=850ms
[TIMING] /scan COMPLETE | TOTAL=865ms
```

**Expected (After Optimizations):**
```
[TIMING] fast_face_precheck: 12ms, result=FACE_FOUND
[TIMING] detect_faces: MTCNN_raw=287ms, total=302ms
[TIMING] Face 1 FaceNet512: FaceNet512=412ms
[TIMING] Face 1: SHORT-CIRCUIT | (ArcFace SKIPPED)
[TIMING] Face 1: total_face=425ms
[TIMING] recognize_face: total=440ms
[TIMING] /scan COMPLETE | TOTAL=455ms
```

**Fill in YOUR results:**

| Metric | Baseline | Expected | Actual | Notes |
|--------|----------|----------|--------|-------|
| fast_face_precheck | N/A | 10-20ms | _____ ms | Should say "FACE_FOUND" |
| MTCNN_raw | 287ms | 250-400ms | _____ ms | Should still run |
| FaceNet512 | 412ms | 350-500ms | _____ ms | First model |
| ArcFace status | Always ran | SKIPPED | _______ | Should see "SHORT-CIRCUIT" |
| ArcFace time | 298ms | 0ms | _____ ms | Should be 0 (skipped) |
| Face total | 735ms | 400-500ms | _____ ms | |
| /scan TOTAL | 865ms | 450-550ms | _____ ms | **Target: <600ms** |

**✅ SUCCESS CRITERIA:** Total time < 600ms (was 865ms)

---

### Test C: Known Student (Enrolled Face)

**Setup:** Scan YOUR face (enrolled student), run 10 scans, take average

**Baseline (Before Optimizations - First Scan):**
```
[TIMING] detect_faces: MTCNN_raw=1200ms (loading model)
[TIMING] Face 1 FaceNet512: FaceNet512=1800ms (loading model)
[TIMING] Face 1 ArcFace: ArcFace=1500ms (loading model)
[TIMING] /scan COMPLETE | TOTAL=4800ms (COLD START)
```

**Baseline (Before Optimizations - Steady State):**
```
[TIMING] detect_faces: MTCNN_raw=287ms
[TIMING] Face 1 FaceNet512: FaceNet512=412ms
[TIMING] Face 1 ArcFace: ArcFace=298ms
[TIMING] Face 1: RECOGNIZED student_3004
[TIMING] recognize_face: total=850ms
[TIMING] /scan COMPLETE | TOTAL=865ms
```

**Expected (After Optimizations - First Scan):**
```
[TIMING] fast_face_precheck: 12ms, result=FACE_FOUND
[TIMING] detect_faces: MTCNN_raw=287ms (PRE-WARMED)
[TIMING] Face 1 FaceNet512: FaceNet512=412ms (PRE-WARMED)
[TIMING] Face 1 ArcFace: ArcFace=298ms (PRE-WARMED)
[TIMING] Face 1: RECOGNIZED student_3004
[TIMING] /scan COMPLETE | TOTAL=880ms
```

**Expected (After Optimizations - Steady State):**
```
[TIMING] fast_face_precheck: 12ms, result=FACE_FOUND
[TIMING] detect_faces: MTCNN_raw=287ms
[TIMING] Face 1 FaceNet512: FaceNet512=412ms
[TIMING] Face 1 ArcFace: ArcFace=298ms
[TIMING] Face 1: RECOGNIZED student_3004
[TIMING] /scan COMPLETE | TOTAL=880ms
```

**Fill in YOUR results:**

#### First Scan After Docker Restart:

| Metric | Baseline | Expected | Actual | Notes |
|--------|----------|----------|--------|-------|
| MTCNN_raw | 1200ms | 250-400ms | _____ ms | Should be fast (warmed up) |
| FaceNet512 | 1800ms | 350-500ms | _____ ms | Should be fast (warmed up) |
| ArcFace | 1500ms | 250-400ms | _____ ms | Should be fast (warmed up) |
| /scan TOTAL | 4800ms | 850-950ms | _____ ms | **Target: <1200ms** |

**✅ FIRST SCAN SUCCESS:** Total time < 1200ms (was 4800ms)

#### Steady State (2nd, 3rd scan):

| Metric | Baseline | Expected | Actual | Notes |
|--------|----------|----------|--------|-------|
| fast_face_precheck | N/A | 10-20ms | _____ ms | |
| MTCNN_raw | 287ms | 250-400ms | _____ ms | |
| FaceNet512 | 412ms | 350-500ms | _____ ms | |
| ArcFace | 298ms | 250-400ms | _____ ms | Should still run (security) |
| ArcFace status | Ran | RAN | _______ | Should NOT see SHORT-CIRCUIT |
| /scan TOTAL | 865ms | 850-950ms | _____ ms | **Target: <1000ms** |

**✅ STEADY STATE SUCCESS:** Total time < 1000ms (was 865ms)

---

## Performance Summary Table

Fill in with your actual measurements:

| Scenario | Baseline | Expected | Actual | Improvement | Success? |
|----------|----------|----------|--------|-------------|----------|
| **No face** | 310ms | 28ms | _____ ms | _____ % | ⬜ |
| **Unknown face** | 865ms | 455ms | _____ ms | _____ % | ⬜ |
| **First scan (known)** | 4800ms | 880ms | _____ ms | _____ % | ⬜ |
| **Steady scan (known)** | 865ms | 880ms | _____ ms | _____ % | ⬜ |

---

## Decision Tree

### If Known Student Scan is < 1000ms: ✅ SUCCESS!

**Conclusion:** Optimizations are sufficient. System is fast enough for live scanning.

**Next Steps:**
1. Keep ensemble (FaceNet512 + ArcFace) for security
2. Monitor performance in production
3. Consider tuning capture cadence (2s → 1.5s or 2.5s as needed)

---

### If Known Student Scan is 1000-1500ms: ⚠️ BORDERLINE

**Analysis Needed:**

#### Check Pre-Check is Working:
```bash
# Count how many scans skip MTCNN
grep "SKIPPED MTCNN" docker.log | wc -l

# If this is HIGH → pre-check is working ✅
# If this is LOW → pre-check not working ❌
```

#### Check Short-Circuit is Working:
```bash
# Count how many unknown faces skip ArcFace
grep "SHORT-CIRCUIT" docker.log | wc -l

# If this is HIGH → short-circuit working ✅
# If this is LOW → short-circuit not working ❌
```

#### Check Warmup Worked:
```bash
# Look at FIRST scan timing
# If MTCNN_raw > 800ms → warmup failed ❌
# If FaceNet512 > 1000ms → warmup failed ❌
# If ArcFace > 1000ms → warmup failed ❌
```

**Potential Issues:**
1. **Docker CPU allocation too low** - Check Docker settings
2. **Other processes consuming CPU** - Check system load
3. **Image resolution too high** - Check image size in logs
4. **Too many enrolled students** - Check comparison time

**Next Steps:**
1. Fix identified issues
2. Re-test
3. If still slow after fixes → Consider single-model mode

---

### If Known Student Scan is > 1500ms: ❌ TOO SLOW

**Conclusion:** Even with optimizations, ensemble is too slow for live scanning.

**Recommendation:** Switch to single-model mode for live scanning.

#### Option A: FaceNet512 Only (Recommended)
**Pros:**
- 50% faster (~450ms instead of ~900ms)
- Still very accurate (FaceNet512 is robust)
- Ensemble can still be used for enrollment/verification

**Cons:**
- Less security than ensemble
- Slightly higher false positive risk

**Implementation:**
```python
# In recognizer.py, line ~510, change from:
if has_arcface_embeddings and emb_arcface is not None:
    # Ensemble mode...

# To:
if False:  # Disable ensemble for live scanning
    # Ensemble mode...
```

#### Option B: ArcFace Only
**Pros:**
- 50% faster
- Different model characteristics than FaceNet512

**Cons:**
- Less common/tested than FaceNet512
- Would need to verify accuracy

#### Option C: Increase Capture Cadence
**Pros:**
- Keep ensemble
- Less frequent scans = acceptable even if slow

**Cons:**
- Slower response time
- May miss quick walk-bys

**Implementation:**
```javascript
// In StartClassScreen.js, change:
const SCAN_INTERVAL_MS = 2000;  // Current

// To:
const SCAN_INTERVAL_MS = 3000;  // 3 seconds
// or
const SCAN_INTERVAL_MS = 4000;  // 4 seconds
```

**Calculation:**
- 2s cadence @ 900ms scan = 45% busy
- 3s cadence @ 900ms scan = 30% busy ✅
- 4s cadence @ 900ms scan = 22% busy ✅

---

## Detailed Breakdown Analysis

### If You Need to Identify Specific Bottleneck:

Fill in these component times from YOUR logs:

**No Face Scan:**
| Component | Time | % of Total |
|-----------|------|------------|
| fast_face_precheck | _____ ms | _____ % |
| Other | _____ ms | _____ % |
| **TOTAL** | _____ ms | 100% |

**Unknown Face Scan:**
| Component | Time | % of Total |
|-----------|------|------------|
| fast_face_precheck | _____ ms | _____ % |
| MTCNN_raw | _____ ms | _____ % |
| FaceNet512 | _____ ms | _____ % |
| Compare FaceNet | _____ ms | _____ % |
| Other | _____ ms | _____ % |
| **TOTAL** | _____ ms | 100% |

**Known Student Scan:**
| Component | Time | % of Total |
|-----------|------|------------|
| fast_face_precheck | _____ ms | _____ % |
| MTCNN_raw | _____ ms | _____ % |
| FaceNet512 | _____ ms | _____ % |
| Compare FaceNet | _____ ms | _____ % |
| ArcFace | _____ ms | _____ % |
| Compare ArcFace | _____ ms | _____ % |
| Other | _____ ms | _____ % |
| **TOTAL** | _____ ms | 100% |

**Bottleneck Identification:**

If **MTCNN_raw** is > 50% of total:
- Consider lower resolution input
- Increase MIN_FACE_WIDTH to skip distant faces
- Check Docker CPU allocation

If **FaceNet512** is > 50% of total:
- Check warmup worked (should not be >500ms)
- Check Docker CPU allocation
- Consider GPU acceleration if available

If **ArcFace** is > 40% of total AND it's for unknown faces:
- Short-circuit should have skipped it
- Check SHORT-CIRCUIT logic is working
- Verify distance > 1.5× threshold check

If **Comparison** is > 10% of total:
- Too many enrolled students (>100?)
- Database query slow
- Embedding comparison not vectorized

---

## Hardware Context

Fill in your system specs for analysis:

**Docker Configuration:**
- CPU cores allocated: _____ cores
- Memory allocated: _____ GB
- GPU available: YES / NO
- Docker version: _____

**Host System:**
- OS: Windows
- CPU: _____
- Total RAM: _____ GB
- Other heavy processes running: _____

**Database:**
- Number of enrolled students: _____
- Number of classes: _____
- Database size: _____ MB

---

## Final Recommendation Template

After filling in all measurements, use this template:

### RESULTS:

**No Face Scans:**
- Baseline: 310ms
- Actual: _____ ms
- Improvement: _____ %
- ✅ / ❌ Target met (<50ms)

**Unknown Face Scans:**
- Baseline: 865ms
- Actual: _____ ms
- Improvement: _____ %
- ✅ / ❌ Target met (<600ms)

**Known Student Scans (First):**
- Baseline: 4800ms
- Actual: _____ ms
- Improvement: _____ %
- ✅ / ❌ Target met (<1200ms)

**Known Student Scans (Steady):**
- Baseline: 865ms
- Actual: _____ ms
- Improvement: _____ %
- ✅ / ❌ Target met (<1000ms)

### DECISION:

⬜ **Keep Ensemble** - All scans comfortably under 1000ms
⬜ **Single Model Mode** - Ensemble too slow (>1500ms)
⬜ **Increase Cadence** - Keep ensemble, scan less frequently
⬜ **Further Investigation** - Issues found, need to fix first

### NEXT STEPS:

1. _____
2. _____
3. _____

---

## How to Collect Timing Data

### Method 1: Manual Collection (Quick)

1. Restart Docker: `docker-compose down && docker-compose up`
2. Open app, start class session
3. Point camera at empty space, watch logs for 10 seconds
4. Copy timing lines, calculate average
5. Point camera at unknown face, repeat
6. Point camera at your face (enrolled), repeat

### Method 2: Automated Collection (Better)

```bash
# Save 2 minutes of logs to file
docker-compose logs --follow attendance_backend > timing_logs.txt
# (Run for 2 minutes, then Ctrl+C)

# Extract "no face" timings
grep "no faces" timing_logs.txt | grep -oP "total=\K[0-9.]+" | # calculate average

# Extract "SHORT-CIRCUIT" timings (unknown faces)
grep "SHORT-CIRCUIT" timing_logs.txt | grep -oP "total_face=\K[0-9.]+" | # calculate average

# Extract "RECOGNIZED" timings (known students)
grep "RECOGNIZED" timing_logs.txt | grep -oP "total_face=\K[0-9.]+" | # calculate average
```

### Method 3: Use Test Script

Create `test_performance.py`:
```python
import re
import statistics

# Read logs
with open('timing_logs.txt', 'r') as f:
    logs = f.readlines()

# Extract timings
no_face = []
unknown = []
known = []

for line in logs:
    if 'no faces' in line and 'recognize_face:' in line:
        match = re.search(r'total=([0-9.]+)ms', line)
        if match:
            no_face.append(float(match.group(1)))
    
    elif 'SHORT-CIRCUIT' in line:
        match = re.search(r'total_face=([0-9.]+)ms', line)
        if match:
            unknown.append(float(match.group(1)))
    
    elif 'RECOGNIZED' in line and 'total_face=' in line:
        match = re.search(r'total_face=([0-9.]+)ms', line)
        if match:
            known.append(float(match.group(1)))

# Print results
print(f"No Face Scans: {len(no_face)} samples")
print(f"  Average: {statistics.mean(no_face):.1f}ms")
print(f"  Median: {statistics.median(no_face):.1f}ms")
print()
print(f"Unknown Face Scans: {len(unknown)} samples")
print(f"  Average: {statistics.mean(unknown):.1f}ms")
print(f"  Median: {statistics.median(unknown):.1f}ms")
print()
print(f"Known Student Scans: {len(known)} samples")
print(f"  Average: {statistics.mean(known):.1f}ms")
print(f"  Median: {statistics.median(known):.1f}ms")
```

Run: `python test_performance.py`

---

## Report Back Format

Once you have the data, report back in this format:

```
PERFORMANCE TEST RESULTS:

Hardware:
- Docker: X cores, X GB RAM
- Enrolled students: X

Timing Results (average of 10 samples each):

1. No Face: _____ ms (target <50ms) - ✅/❌
2. Unknown Face: _____ ms (target <600ms) - ✅/❌
3. Known Student (first): _____ ms (target <1200ms) - ✅/❌
4. Known Student (steady): _____ ms (target <1000ms) - ✅/❌

Optimization Verification:
- Pre-check working: YES/NO (saw "SKIPPED MTCNN")
- Short-circuit working: YES/NO (saw "SHORT-CIRCUIT")
- Warmup working: YES/NO (first scan ~same as steady)

Recommendation: [Keep Ensemble / Single Model / Increase Cadence]

Full logs attached: [yes/no]
```

This will help us make the final decision on whether to keep the ensemble or switch to single-model mode! 📊
