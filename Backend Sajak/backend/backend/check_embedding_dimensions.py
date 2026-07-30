#!/usr/bin/env python3
"""
Embedding Dimension Checker

This script checks the dimensions of existing embeddings to help with
the migration from FaceNet (128-dim) to FaceNet512 (512-dim).

After upgrading to FaceNet512, all old 128-dim embeddings must be
regenerated through re-enrollment.
"""

import os
import numpy as np
import json

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EMBEDDINGS_FOLDER = os.path.join(SCRIPT_DIR, "services", "face_recognition", "embeddings")
LABELS_FILE = os.path.join(EMBEDDINGS_FOLDER, "labels.json")


def check_embeddings():
    """
    Scans the embeddings folder and reports on embedding dimensions.
    """
    print("=" * 70)
    print("  EMBEDDING DIMENSION CHECKER")
    print("=" * 70)
    print()
    
    if not os.path.exists(EMBEDDINGS_FOLDER):
        print(f"❌ ERROR: Embeddings folder not found!")
        print(f"   Expected: {EMBEDDINGS_FOLDER}")
        print()
        print("   This is normal if no students have been enrolled yet.")
        return
    
    # Load labels
    labels = {}
    if os.path.exists(LABELS_FILE):
        try:
            with open(LABELS_FILE, 'r') as f:
                labels = json.load(f)
            print(f"✓ Labels file found: {len(labels)} student(s) registered")
        except Exception as e:
            print(f"⚠ Warning: Could not read labels.json: {e}")
    else:
        print("⚠ No labels.json file found")
    
    print()
    
    # Scan for embedding files
    npz_files = []
    npy_files = []
    
    for fname in os.listdir(EMBEDDINGS_FOLDER):
        if fname.endswith('_data.npz'):
            npz_files.append(fname)
        elif fname.endswith('_mean.npy'):
            npy_files.append(fname)
    
    print(f"Found {len(npz_files)} .npz files and {len(npy_files)} .npy files")
    print()
    
    if not npz_files and not npy_files:
        print("ℹ No embedding files found. Students need to be enrolled first.")
        return
    
    # Check dimensions
    print("─" * 70)
    print("CHECKING EMBEDDING DIMENSIONS:")
    print("─" * 70)
    print()
    
    facenet128_count = 0
    facenet512_count = 0
    unknown_count = 0
    
    # Check .npz files (primary format)
    for fname in sorted(npz_files):
        student_id = fname[:-9]  # Remove '_data.npz'
        fpath = os.path.join(EMBEDDINGS_FOLDER, fname)
        
        try:
            data = np.load(fpath, allow_pickle=False)
            
            if 'embeddings' in data:
                # NEW format (Change #3): Array of all embeddings
                emb_array = data['embeddings']
                num_photos = len(emb_array)
                dim = len(emb_array[0]) if num_photos > 0 else 0
                threshold = float(data.get('threshold', 0.40))
                
                print(f"  {student_id}")
                print(f"    File: {fname}")
                print(f"    Format: ALL PHOTOS (Change #3 ✓)")
                print(f"    Photos: {num_photos}")
                print(f"    Dimension: {dim}")
                print(f"    Threshold: {threshold:.4f}")
                
                if dim == 128:
                    print(f"    Model: FaceNet (OLD - NEEDS RE-ENROLLMENT)")
                    facenet128_count += 1
                elif dim == 512:
                    print(f"    Model: FaceNet512 (NEW - OK ✓)")
                    facenet512_count += 1
                else:
                    print(f"    Model: Unknown ({dim}-dim)")
                    unknown_count += 1
                
                print()
            
            elif 'mean_embedding' in data:
                # OLD format (pre-Change #3): Single mean embedding
                emb = data['mean_embedding']
                dim = len(emb)
                threshold = float(data.get('threshold', 0.40))
                
                print(f"  {student_id}")
                print(f"    File: {fname}")
                print(f"    Format: AVERAGED (OLD - before Change #3)")
                print(f"    Dimension: {dim}")
                print(f"    Threshold: {threshold:.4f}")
                
                if dim == 128:
                    print(f"    Model: FaceNet (OLD - NEEDS RE-ENROLLMENT)")
                    facenet128_count += 1
                elif dim == 512:
                    print(f"    Model: FaceNet512 (NEW - OK ✓)")
                    facenet512_count += 1
                else:
                    print(f"    Model: Unknown ({dim}-dim)")
                    unknown_count += 1
                
                print()
            else:
                print(f"  {student_id}: ⚠ .npz file missing both 'embeddings' and 'mean_embedding' key")
                print()
                unknown_count += 1
                
        except Exception as e:
            print(f"  {student_id}: ❌ Error reading .npz file: {e}")
            print()
            unknown_count += 1
    
    # Check .npy files (legacy format)
    for fname in sorted(npy_files):
        student_id = fname[:-9]  # Remove '_mean.npy'
        
        # Skip if we already checked a .npz for this student
        if f"{student_id}_data.npz" in npz_files:
            continue
        
        fpath = os.path.join(EMBEDDINGS_FOLDER, fname)
        
        try:
            emb = np.load(fpath)
            dim = len(emb)
            
            print(f"  {student_id}")
            print(f"    File: {fname} (legacy format)")
            print(f"    Dimension: {dim}")
            
            if dim == 128:
                print(f"    Model: FaceNet (OLD - NEEDS RE-ENROLLMENT)")
                facenet128_count += 1
            elif dim == 512:
                print(f"    Model: FaceNet512 (NEW - OK ✓)")
                facenet512_count += 1
            else:
                print(f"    Model: Unknown ({dim}-dim)")
                unknown_count += 1
            
            print()
            
        except Exception as e:
            print(f"  {student_id}: ❌ Error reading .npy file: {e}")
            print()
            unknown_count += 1
    
    # Summary
    print("=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    print()
    print(f"  FaceNet (128-dim, OLD):     {facenet128_count} student(s)")
    print(f"  FaceNet512 (512-dim, NEW):  {facenet512_count} student(s)")
    
    if unknown_count > 0:
        print(f"  Unknown/Error:              {unknown_count} student(s)")
    
    print()
    
    # Recommendations
    if facenet128_count > 0:
        print("⚠ ACTION REQUIRED:")
        print()
        print(f"  {facenet128_count} student(s) have OLD 128-dimensional embeddings.")
        print("  These were generated with the old FaceNet model and will NOT")
        print("  work correctly with the new FaceNet512 model.")
        print()
        print("  SOLUTION: Re-enroll all students via the admin panel:")
        print("    1. Go to admin panel")
        print("    2. Navigate to 'Enroll Face' for each student")
        print("    3. Upload 5+ photos and submit")
        print()
        print("  OR delete all embeddings and start fresh:")
        print(f"    - Delete all files in: {EMBEDDINGS_FOLDER}")
        print("    - Re-enroll all students")
        print()
    elif facenet512_count > 0:
        print("✅ ALL GOOD!")
        print()
        print(f"  All {facenet512_count} student(s) have 512-dimensional embeddings")
        print("  and are compatible with FaceNet512.")
        print()
    else:
        print("ℹ No students enrolled yet.")
        print()
        print("  Students can be enrolled via:")
        print("    - Admin panel: POST /api/admin/enroll-face")
        print("    - Command line: python services/face_recognition/enroll.py")
        print()


if __name__ == "__main__":
    check_embeddings()
