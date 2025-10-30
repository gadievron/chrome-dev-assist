#!/usr/bin/env python3
"""
Test 1: Verify YAML syntax is valid in all modified workflow files

This test validates that Phase 1b changes (on: → 'on':) didn't break YAML syntax.
"""

import yaml
import sys
from pathlib import Path

def test_yaml_syntax():
    """Test that all workflow files have valid YAML syntax"""
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
    print("TEST 1: YAML Syntax Validation")
    print("=" * 60)
    print()

    all_valid = True
    for file_path in files:
        try:
            with open(file_path, 'r') as f:
                data = yaml.safe_load(f)

            # Verify it's a dict (valid GitHub Actions workflow)
            if not isinstance(data, dict):
                print(f"❌ {file_path.name} - Not a valid dict")
                all_valid = False
                continue

            print(f"✅ {file_path.name} - Valid YAML")

        except yaml.YAMLError as e:
            print(f"❌ {file_path.name} - INVALID YAML: {e}")
            all_valid = False
        except FileNotFoundError:
            print(f"❌ {file_path.name} - File not found")
            all_valid = False

    print()
    print("=" * 60)
    if all_valid:
        print("✅ ALL FILES VALID")
        return 0
    else:
        print("❌ SOME FILES INVALID")
        return 1

if __name__ == '__main__':
    sys.exit(test_yaml_syntax())
