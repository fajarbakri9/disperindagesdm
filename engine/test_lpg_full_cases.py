import pathlib
import unittest


class LpgStaticIntegrityTests(unittest.TestCase):
    def test_firestore_ledger_is_immutable(self):
        rules = pathlib.Path("firestore.rules").read_text(encoding="utf-8")
        ledger = rules.split("match /lpg_events/{eventId}", 1)[1].split("match /lpg_balances", 1)[0]
        self.assertIn("allow update, delete: if false", ledger)
        self.assertIn("request.resource.data.createdAt == request.time", ledger)

    def test_spark_only_architecture(self):
        config = pathlib.Path("firebase.json").read_text(encoding="utf-8")
        self.assertNotIn('"functions"', config)
        self.assertNotIn('"storage"', config)

    def test_no_literal_production_password(self):
        candidates = [pathlib.Path("login.html"), pathlib.Path("js/auth.js")]
        content = "\n".join(path.read_text(encoding="utf-8") for path in candidates)
        self.assertNotIn("Pinrang2026!", content)


if __name__ == "__main__":
    unittest.main()
