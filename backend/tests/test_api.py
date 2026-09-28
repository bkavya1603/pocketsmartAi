import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


test_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


class PocketSmartApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        test_engine.dispose()

    def setUp(self):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)

    def create_account(self, email):
        response = self.client.post("/api/auth/signup", json={"name": "Sample User", "email": email, "password": "StrongPass123"})
        self.assertEqual(response.status_code, 201, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_finance_records_are_private_and_validated(self):
        owner_headers = self.create_account("owner@example.com")
        other_headers = self.create_account("other@example.com")

        created = self.client.post("/api/transactions", headers=owner_headers, json={
            "type": "Expense", "amount": 1250, "category": "Food", "description": "Groceries", "date": "2026-09-28",
        })
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(len(self.client.get("/api/transactions", headers=owner_headers).json()), 1)
        self.assertEqual(self.client.get("/api/transactions", headers=other_headers).json(), [])
        self.assertEqual(self.client.get("/api/transactions").status_code, 401)

        invalid = self.client.post("/api/transactions", headers=owner_headers, json={
            "type": "Expense", "amount": -1, "category": "Food", "description": "Invalid", "date": "2026-09-28",
        })
        self.assertEqual(invalid.status_code, 422)

    def test_budget_update_and_data_grounded_chat(self):
        headers = self.create_account("budget@example.com")
        response = self.client.put("/api/budgets", headers=headers, json={"monthly": 30000, "Food": 6000})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["monthly"], 30000)
        self.assertEqual(response.json()["Food"], 6000)

        self.client.post("/api/transactions", headers=headers, json={
            "type": "Expense", "amount": 450, "category": "Food", "description": "Lunch", "date": "2026-09-28",
        })
        answer = self.client.post("/api/assistant/chat", headers=headers, json={"question": "How much did I spend on food?"})
        self.assertEqual(answer.status_code, 200, answer.text)
        self.assertIn("₹450", answer.json()["answer"])


if __name__ == "__main__":
    unittest.main()