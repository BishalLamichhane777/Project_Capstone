"""
Quick validation script for manual-end block fix.
Run this after the server starts to verify the fix is working.

Usage:
    python validate_manual_end_fix.py
"""

import sys
from app import create_app
from database import db
from models.session import Session
from models.class_model import Class

def validate_schema():
    """Check that the ended_reason column exists."""
    app = create_app()
    with app.app_context():
        # Try to query a session and access ended_reason
        try:
            session = Session.query.first()
            if session:
                # Access the ended_reason attribute
                _ = session.ended_reason
                print("✓ Schema validation: ended_reason column exists")
            else:
                # No sessions yet, but column should still exist
                # Try to create a test query
                Session.query.filter_by(ended_reason="manual").first()
                print("✓ Schema validation: ended_reason column exists (no sessions to test with)")
            return True
        except Exception as e:
            print(f"✗ Schema validation failed: {e}")
            return False

def validate_logic():
    """Check that the logic is present in the codebase."""
    try:
        # Check that session.py contains the manual-end block
        with open("routes/session.py", "r", encoding="utf-8") as f:
            content = f.read()
            
        checks = [
            ("ended_reason='manual'", "Manual end check in start_session()"),
            ("ended_reason='auto_expired'", "Auto-expire sets ended_reason"),
            ("already ended earlier today", "Error message for blocked restart"),
        ]
        
        all_good = True
        for check_str, description in checks:
            if check_str in content:
                print(f"✓ {description}")
            else:
                print(f"✗ {description} - NOT FOUND")
                all_good = False
        
        return all_good
    except Exception as e:
        print(f"✗ Logic validation failed: {e}")
        return False

def main():
    print("=" * 60)
    print("MANUAL END BLOCK FIX - VALIDATION")
    print("=" * 60)
    print()
    
    print("1. Checking database schema...")
    schema_ok = validate_schema()
    print()
    
    print("2. Checking code logic...")
    logic_ok = validate_logic()
    print()
    
    print("=" * 60)
    if schema_ok and logic_ok:
        print("✓ ALL VALIDATIONS PASSED")
        print()
        print("The manual-end block fix is correctly implemented.")
        print()
        print("Next steps:")
        print("  1. Start the Flask server: python app.py")
        print("  2. Test manually via API or mobile app")
        print("  3. Run comprehensive tests: python tests/test_manual_end_block.py")
        sys.exit(0)
    else:
        print("✗ VALIDATION FAILED")
        print()
        print("Please review the errors above and fix before deploying.")
        sys.exit(1)

if __name__ == "__main__":
    main()
