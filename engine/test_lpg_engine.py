import subprocess
import unittest


class LpgAcceptanceTests(unittest.TestCase):
    def test_browser_engine_acceptance(self):
        result = subprocess.run(
            ["node", "engine/lpg_acceptance_test.js"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
