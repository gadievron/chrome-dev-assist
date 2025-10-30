#!/usr/bin/env python3
"""
Test 2: Verify 'on' key is preserved correctly

This test validates that quoted 'on' is still parsed as the trigger key.
"""

import yaml
import sys
from pathlib import Path

def test_on_key():
    """Test that 'on' key is preserved and parses correctly"""
    base_dir = Path(__file__).parent.parent
    files = [
        base_dir / '.github/workflows/codeql.yml',
        base_dir / '.github/workflows/critical-checks.yml',
        base_dir / '.github/workflows/labeler.yml',
        base_dir / '.github/workflows/lint.yml',
        base_dir / '.github/workflows/pr-title-check.yml',
        base_dir / '.github/workflows/test-coverage.yml',
    ]

    print("=" * 60)
    print("TEST 2: 'on' Key Preservation")
    print("=" * 60)
    print()

    all_valid = True
    for file_path in files:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)

        # Check if 'on' key exists
        if 'on' not in data:
            print(f"❌ {file_path.name} - Missing 'on' key!")
            all_valid = False
            continue

        # Verify 'on' has expected triggers
        on_config = data['on']
        if not isinstance(on_config, dict):
            print(f"❌ {file_path.name} - 'on' is not a dict: {type(on_config)}")
            all_valid = False
            continue

        triggers = list(on_config.keys())
        print(f"✅ {file_path.name} - 'on' key present")
        print(f"   Triggers: {', '.join(triggers)}")

    print()
    print("=" * 60)
    if all_valid:
        print("✅ ALL FILES HAVE 'on' KEY")
        return 0
    else:
        print("❌ SOME FILES MISSING 'on' KEY")
        return 1

if __name__ == '__main__':
    sys.exit(test_on_key())
