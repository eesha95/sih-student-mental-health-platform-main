import unittest
import json
from fastapi.testclient import TestClient
from main import app, analyze_nlp_and_safety, Base, engine, SessionLocal, UserDB, get_password_hash

class TestIndividual2Module(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_nlp_analysis_normal(self):
        result = analyze_nlp_and_safety("I feel pretty calm and happy today.")
        self.assertEqual(result["sentiment"], "positive")
        self.assertEqual(result["risk_level"], "LOW")

    def test_nlp_analysis_stress_anxiety(self):
        result = analyze_nlp_and_safety("I have exam panic and high stress due to my gpa.")
        self.assertEqual(result["emotion"], "anxiety")
        self.assertEqual(result["stress_level"], "high")
        self.assertIn(result["risk_level"], ["MODERATE", "HIGH"])

    def test_nlp_analysis_high_risk_crisis(self):
        result = analyze_nlp_and_safety("I am hopeless and want to end it all suicide.")
        self.assertEqual(result["risk_level"], "CRITICAL")
        self.assertTrue(len(result["flagged_keywords"]) > 0)

    def test_chat_endpoint_public(self):
        response = self.client.post("/api/chat", json={"message": "Hello, how can you help me?"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reply", data)
        self.assertIn("nlp", data)

    def test_support_resources_endpoint(self):
        response = self.client.get("/api/support-resources")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data["emergency_contacts"]) > 0)

if __name__ == "__main__":
    unittest.main()
