#!/usr/bin/env python3
"""
Test script for face alignment functionality.

Tests that the align_face() function correctly rotates faces so that
eyes are horizontal, both for enrollment and recognition paths.
"""

import cv2
import numpy as np
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.face_recognition.detector import detect_faces, get_largest_face, crop_face, align_face


def test_alignment_with_webcam():
    """
    Interactive test using webcam to verify alignment works on live faces.
    Shows original face, cropped face, and aligned face side by side.
    """
    print("=" * 70)
    print("  FACE ALIGNMENT TEST")
    print("=" * 70)
    print("\nThis test will:")
    print("  1. Detect your face using MTCNN")
    print("  2. Show the original cropped face")
    print("  3. Show the aligned face (eyes horizontal)")
    print("\nTilt your head left/right to see the alignment correction in action!")
    print("\nPress 'q' to quit\n")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam!")
        return False
    
    print("Webcam opened successfully. Starting test...\n")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect face
        detections = detect_faces(frame)
        
        if not detections:
            # No face detected
            cv2.putText(frame, "No face detected", (20, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.imshow("Face Alignment Test - Press Q to quit", frame)
        else:
            # Get largest face
            best = get_largest_face(detections)
            x, y, w, h = best['box']
            
            # Draw rectangle on original frame
            display_frame = frame.copy()
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Draw eye keypoints
            if 'keypoints' in best:
                left_eye = best['keypoints'].get('left_eye')
                right_eye = best['keypoints'].get('right_eye')
                
                if left_eye and right_eye:
                    cv2.circle(display_frame, left_eye, 3, (255, 0, 0), -1)
                    cv2.circle(display_frame, right_eye, 3, (255, 0, 0), -1)
                    cv2.line(display_frame, left_eye, right_eye, (255, 255, 0), 2)
                    
                    # Calculate and display angle
                    delta_x = right_eye[0] - left_eye[0]
                    delta_y = right_eye[1] - left_eye[1]
                    angle = np.degrees(np.arctan2(delta_y, delta_x))
                    cv2.putText(display_frame, f"Tilt: {angle:.1f} deg", 
                               (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Crop face
            face_crop = crop_face(frame, best, padding=0.1)
            
            if face_crop is not None and face_crop.size > 0:
                # Align face
                face_aligned = align_face(face_crop, best.get('keypoints', {}))
                
                # Resize for display
                crop_h, crop_w = face_crop.shape[:2]
                display_size = 200
                
                face_crop_display = cv2.resize(face_crop, (display_size, display_size))
                face_aligned_display = cv2.resize(face_aligned, (display_size, display_size))
                
                # Add labels
                cv2.putText(face_crop_display, "Original Crop", (10, 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(face_aligned_display, "Aligned (Eyes Level)", (10, 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Combine displays horizontally
                combined = np.hstack([face_crop_display, face_aligned_display])
                
                # Show results
                cv2.imshow("Face Alignment Test - Press Q to quit", display_frame)
                cv2.imshow("Crop vs Aligned", combined)
            else:
                cv2.imshow("Face Alignment Test - Press Q to quit", display_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    print("\nTest completed successfully!")
    return True


def test_alignment_with_image(image_path):
    """
    Test alignment on a single image file.
    """
    print(f"\nTesting alignment on image: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"ERROR: Image not found: {image_path}")
        return False
    
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        print(f"ERROR: Could not load image: {image_path}")
        return False
    
    print(f"  Image loaded: {image.shape[1]}x{image.shape[0]}")
    
    # Detect face
    print("  Detecting face with MTCNN...")
    detections = detect_faces(image)
    
    if not detections:
        print("  ERROR: No face detected in image")
        return False
    
    print(f"  Found {len(detections)} face(s)")
    best = get_largest_face(detections)
    
    # Display keypoint info
    if 'keypoints' in best:
        left_eye = best['keypoints'].get('left_eye')
        right_eye = best['keypoints'].get('right_eye')
        if left_eye and right_eye:
            delta_x = right_eye[0] - left_eye[0]
            delta_y = right_eye[1] - left_eye[1]
            angle = np.degrees(np.arctan2(delta_y, delta_x))
            print(f"  Head tilt angle: {angle:.2f} degrees")
    
    # Crop and align
    print("  Cropping face...")
    face_crop = crop_face(image, best, padding=0.1)
    
    if face_crop is None or face_crop.size == 0:
        print("  ERROR: Face crop failed")
        return False
    
    print("  Aligning face...")
    face_aligned = align_face(face_crop, best.get('keypoints', {}))
    
    if face_aligned is None or face_aligned.size == 0:
        print("  ERROR: Face alignment failed")
        return False
    
    print(f"  ✓ Alignment successful! Shape: {face_aligned.shape}")
    
    # Save results
    output_dir = os.path.join(os.path.dirname(image_path), "alignment_test_output")
    os.makedirs(output_dir, exist_ok=True)
    
    basename = os.path.splitext(os.path.basename(image_path))[0]
    crop_path = os.path.join(output_dir, f"{basename}_cropped.jpg")
    aligned_path = os.path.join(output_dir, f"{basename}_aligned.jpg")
    
    cv2.imwrite(crop_path, face_crop)
    cv2.imwrite(aligned_path, face_aligned)
    
    print(f"\n  Results saved:")
    print(f"    Cropped: {crop_path}")
    print(f"    Aligned: {aligned_path}")
    
    return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Test with provided image file
        image_path = sys.argv[1]
        success = test_alignment_with_image(image_path)
        sys.exit(0 if success else 1)
    else:
        # Test with webcam
        success = test_alignment_with_webcam()
        sys.exit(0 if success else 1)
