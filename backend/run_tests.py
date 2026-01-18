import pytest
import sys
import os

def run_tests():
    # Ensure test_output directory exists
    os.makedirs("test_output", exist_ok=True)
    
    # Run pytest and generate JUnit XML report
    args = [
        "-v",
        "--junitxml=test_output/backend_results.xml",
        "tests"
    ]
    
    return_code = pytest.main(args)
    sys.exit(return_code)

if __name__ == "__main__":
    run_tests()