"""End-to-end API tests for bookings, wellness checks, peer support, notifications and admin tools.

Runs against a throwaway SQLite database so the real users.db is never touched:
    python -m unittest test_platform
"""
import os
import tempfile
import unittest
from datetime import datetime, timedelta

_db_file = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["DEFAULT_ADMIN_EMAIL"] = "admin@test.com"
os.environ["DEFAULT_ADMIN_PASSWORD"] = "AdminPass1!"
os.environ.pop("BOOKING_WEBHOOK_URL", None)
os.environ.pop("DOCTOR_FINDER_WEBHOOK_URL", None)

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

main._call_gemini = lambda prompt: None  # keep tests offline and fast

client = TestClient(main.app)

WELLNESS_GOOD = {"mood": 5, "energy": 4, "sleep": 4, "stress": 1, "anxiety": 1, "social": 5, "coping": 4, "motivation": 5}
WELLNESS_BAD = {"mood": 1, "energy": 1, "sleep": 1, "stress": 5, "anxiety": 5, "social": 1, "coping": 1, "motivation": 1}


def register(name):
    email = f"{name}-{datetime.utcnow().timestamp()}@test.com"
    res = client.post("/register", json={"name": name, "email": email, "password": "Password1!"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, res.json()["user"]


def admin_headers():
    res = client.post("/admin/login", json={"email": "admin@test.com", "password": "AdminPass1!"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def future_slot():
    """Find a bookable (date, slot) for the first counselor."""
    tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
    return tomorrow


class TestAuthAndProfile(unittest.TestCase):
    def test_anonymous_chat_allowed(self):
        res = client.post("/api/chat", json={"message": "hello"})
        self.assertEqual(res.status_code, 200)

    def test_profile_update(self):
        headers, _ = register("Asha")
        res = client.put("/profile", params={"name": "Asha K"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Asha K")
        self.assertNotIn("password_hash", res.json())


class TestBookings(unittest.TestCase):
    def test_booking_lifecycle(self):
        headers, _ = register("Ravi")
        counselors = client.get("/api/counselors", headers=headers).json()
        self.assertGreaterEqual(len(counselors), 1)
        c = counselors[0]
        date = future_slot()
        avail = client.get(f"/api/counselors/{c['id']}/availability", params={"date": date}, headers=headers).json()
        slot = avail["available_slots"][0]

        body = {"counselor_id": c["id"], "date": date, "time_slot": slot, "reason": "stress", "urgency": "high",
                "contact_name": "Ravi", "contact_phone": "+919876500000", "contact_email": "ravi@test.com"}
        res = client.post("/api/bookings", json=body, headers=headers)
        self.assertEqual(res.status_code, 200, res.text)
        booking = res.json()
        self.assertEqual(booking["status"], "pending")
        self.assertTrue(booking["reference"].startswith("BK-"))

        # Same slot can't be double-booked
        other_headers, _ = register("Meera")
        self.assertEqual(client.post("/api/bookings", json=body, headers=other_headers).status_code, 409)
        avail_after = client.get(f"/api/counselors/{c['id']}/availability", params={"date": date}, headers=headers).json()
        self.assertNotIn(slot, avail_after["available_slots"])

        # Shows in notifications and in admin queue
        notes = client.get("/api/notifications", headers=headers).json()
        self.assertTrue(any(n["type"] == "appointment" for n in notes))
        admin = admin_headers()
        queue = client.get("/admin/bookings", headers=admin).json()
        self.assertIn(booking["id"], [b["id"] for b in queue])
        confirmed = client.patch(f"/admin/bookings/{booking['id']}", json={"status": "confirmed"}, headers=admin)
        self.assertEqual(confirmed.json()["status"], "confirmed")

        # Student cancels; slot frees up
        cancelled = client.post(f"/api/bookings/{booking['id']}/cancel", headers=headers)
        self.assertEqual(cancelled.json()["status"], "cancelled")
        avail_final = client.get(f"/api/counselors/{c['id']}/availability", params={"date": date}, headers=headers).json()
        self.assertIn(slot, avail_final["available_slots"])

    def test_past_slot_rejected(self):
        headers, _ = register("Past")
        c = client.get("/api/counselors", headers=headers).json()[0]
        yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
        body = {"counselor_id": c["id"], "date": yesterday, "time_slot": "10:00 AM", "reason": "x",
                "contact_name": "P", "contact_phone": "1234567", "contact_email": "p@test.com"}
        self.assertEqual(client.post("/api/bookings", json=body, headers=headers).status_code, 400)

    def test_cannot_cancel_other_users_booking(self):
        headers, _ = register("Owner")
        other, _ = register("Other")
        c = client.get("/api/counselors", headers=headers).json()[1]
        date = future_slot()
        slot = client.get(f"/api/counselors/{c['id']}/availability", params={"date": date}, headers=headers).json()["available_slots"][-1]
        b = client.post("/api/bookings", headers=headers, json={
            "counselor_id": c["id"], "date": date, "time_slot": slot, "reason": "general",
            "contact_name": "O", "contact_phone": "1234567", "contact_email": "o@test.com"}).json()
        self.assertEqual(client.post(f"/api/bookings/{b['id']}/cancel", headers=other).status_code, 404)


class TestWellness(unittest.TestCase):
    def test_scoring_inverts_stress_and_anxiety(self):
        headers, _ = register("Well")
        good = client.post("/api/wellness-checks", json={"responses": WELLNESS_GOOD}, headers=headers).json()
        bad = client.post("/api/wellness-checks", json={"responses": WELLNESS_BAD}, headers=headers).json()
        self.assertGreaterEqual(good["overall_score"], 4.5)
        self.assertEqual(bad["overall_score"], 1.0)
        self.assertTrue(any(r["priority"] == "high" for r in bad["recommendations"]))
        history = client.get("/api/wellness-checks", headers=headers).json()
        self.assertEqual(len(history), 2)

    def test_invalid_answers_rejected(self):
        headers, _ = register("Bad")
        res = client.post("/api/wellness-checks", json={"responses": {**WELLNESS_GOOD, "mood": 9}}, headers=headers)
        self.assertEqual(res.status_code, 400)
        res = client.post("/api/wellness-checks", json={"responses": {"mood": 3}}, headers=headers)
        self.assertEqual(res.status_code, 400)

    def test_reminder_clears_after_checkin(self):
        headers, _ = register("Remind")
        self.assertTrue(any(n["type"] == "wellness" for n in client.get("/api/notifications", headers=headers).json()))
        client.post("/api/wellness-checks", json={"responses": WELLNESS_GOOD}, headers=headers)
        self.assertFalse(any(n["type"] == "wellness" for n in client.get("/api/notifications", headers=headers).json()))


class TestPeerSupport(unittest.TestCase):
    def test_groups_join_leave(self):
        headers, _ = register("Group")
        group = client.get("/api/peer/groups", headers=headers).json()[0]
        client.post(f"/api/peer/groups/{group['id']}/join", headers=headers)
        joined = next(g for g in client.get("/api/peer/groups", headers=headers).json() if g["id"] == group["id"])
        self.assertTrue(joined["joined"])
        self.assertEqual(joined["members"], group["members"] + 1)
        client.post(f"/api/peer/groups/{group['id']}/leave", headers=headers)
        left = next(g for g in client.get("/api/peer/groups", headers=headers).json() if g["id"] == group["id"])
        self.assertFalse(left["joined"])

    def test_post_like_reply_and_anonymity(self):
        author, author_user = register("Author")
        reader, _ = register("Reader")
        post = client.post("/api/peer/posts", json={"content": "Exams are tough but we got this", "category": "Stress"}, headers=author).json()
        self.assertFalse(post["held_for_review"])
        pid = post["post"]["id"]
        feed = client.get("/api/peer/posts", headers=reader).json()
        item = next(p for p in feed if p["id"] == pid)
        self.assertEqual(item["author"], "Anonymous Student")
        self.assertNotIn(author_user["name"], str(item))

        liked = client.post(f"/api/peer/posts/{pid}/like", headers=reader).json()
        self.assertEqual(liked["likes"], 1)
        self.assertTrue(liked["liked_by_me"])
        reply = client.post(f"/api/peer/posts/{pid}/replies", json={"content": "You've got this!"}, headers=reader).json()
        self.assertIsNotNone(reply["reply"])
        self.assertEqual(len(client.get(f"/api/peer/posts/{pid}/replies", headers=author).json()), 1)
        notes = client.get("/api/notifications", headers=author).json()
        self.assertTrue(any(n["type"] == "community" for n in notes))

    def test_crisis_post_held_and_audited(self):
        headers, _ = register("Crisis")
        res = client.post("/api/peer/posts", json={"content": "I want to end my life"}, headers=headers).json()
        self.assertTrue(res["held_for_review"])
        self.assertTrue(res["support"]["emergency_contacts"])
        reader, _ = register("Reader2")
        self.assertNotIn(res["post"]["id"], [p["id"] for p in client.get("/api/peer/posts", headers=reader).json()])
        admin = admin_headers()
        alerts = client.get("/admin/safety-alerts", headers=admin).json()
        self.assertTrue(any(a["risk_level"] == "CRITICAL" for a in alerts))
        flagged = client.get("/admin/peer/posts", headers=admin).json()
        self.assertIn(res["post"]["id"], [p["id"] for p in flagged])

    def test_reports_hide_post(self):
        author, _ = register("Spammer")
        pid = client.post("/api/peer/posts", json={"content": "buy my stuff"}, headers=author).json()["post"]["id"]
        for i in range(main.POST_REPORT_HIDE_THRESHOLD):
            h, _ = register(f"Reporter{i}")
            client.post(f"/api/peer/posts/{pid}/report", json={"reason": "spam"}, headers=h)
        h, _ = register("Viewer")
        self.assertNotIn(pid, [p["id"] for p in client.get("/api/peer/posts", headers=h).json()])
        admin = admin_headers()
        client.post(f"/admin/peer/posts/{pid}/restore", headers=admin)
        self.assertIn(pid, [p["id"] for p in client.get("/api/peer/posts", headers=h).json()])

    def test_live_session_registration(self):
        headers, _ = register("Live")
        session = client.get("/api/peer/sessions", headers=headers).json()[0]
        self.assertTrue(client.post(f"/api/peer/sessions/{session['id']}/register", headers=headers).json()["registered"])
        updated = next(s for s in client.get("/api/peer/sessions", headers=headers).json() if s["id"] == session["id"])
        self.assertTrue(updated["registered"])
        self.assertEqual(updated["participants"], session["participants"] + 1)


class TestAdmin(unittest.TestCase):
    def test_user_management(self):
        headers, user = register("Managed")
        admin = admin_headers()
        users = client.get("/admin/users", params={"sort_by": "email", "sort_order": "asc"}, headers=admin).json()
        self.assertTrue(all("password_hash" not in u for u in users))
        self.assertFalse(client.post(f"/admin/users/{user['id']}/deactivate", headers=admin).json()["is_active"])
        self.assertEqual(client.post("/login", json={"email": user["email"], "password": "Password1!"}).status_code, 400)
        self.assertTrue(client.post(f"/admin/users/{user['id']}/activate", headers=admin).json()["is_active"])
        details = client.get(f"/admin/users/{user['id']}", headers=admin).json()
        self.assertIn("wellness_checks", details)
        client.post("/api/wellness-checks", json={"responses": WELLNESS_GOOD}, headers=headers)
        self.assertEqual(client.delete(f"/admin/users/{user['id']}", headers=admin).status_code, 200)
        self.assertEqual(client.get(f"/admin/users/{user['id']}", headers=admin).status_code, 404)
        self.assertEqual(main.SessionLocal().query(main.WellnessCheckDB).filter_by(user_id=user["id"]).count(), 0)

    def test_student_token_rejected_on_admin_routes(self):
        headers, _ = register("Sneaky")
        self.assertEqual(client.get("/admin/analytics", headers=headers).status_code, 401)

    def test_analytics_reflect_real_checkins(self):
        h1, _ = register("Stat1")
        h2, _ = register("Stat2")
        client.post("/api/wellness-checks", json={"responses": WELLNESS_GOOD}, headers=h1)
        client.post("/api/wellness-checks", json={"responses": WELLNESS_BAD}, headers=h2)
        data = client.get("/admin/analytics", headers=admin_headers()).json()
        overall = {d["name"]: d["value"] for d in data["overall"]}
        self.assertGreaterEqual(overall["Good (4+)"], 1)
        self.assertGreaterEqual(overall["Struggling (below 2)"], 1)
        self.assertEqual(len(data["trend"]), 14)
        self.assertGreaterEqual(data["trend"][-1]["checkins"], 2)

    def test_settings_maintenance_and_export(self):
        admin = admin_headers()
        _, user = register("Maint")
        self.assertTrue(client.put("/admin/settings", json={"maintenance_mode": True}, headers=admin).json()["maintenance_mode"])
        res = client.post("/login", json={"email": user["email"], "password": "Password1!"})
        self.assertEqual(res.status_code, 503)
        self.assertIn("14416", res.json()["detail"])
        client.put("/admin/settings", json={"maintenance_mode": False}, headers=admin)
        self.assertEqual(client.post("/login", json={"email": user["email"], "password": "Password1!"}).status_code, 200)

        export = client.get("/admin/export", headers=admin).json()
        self.assertTrue(export["privacy_protection"])
        self.assertNotIn(user["email"], str(export))
        self.assertNotIn("password", str(export).lower())

    def test_activity_time_filter(self):
        admin = admin_headers()
        acts = client.get("/admin/activities", params={"filter": "login", "time_range": "1h"}, headers=admin).json()
        self.assertTrue(all(a["type"] in main.ACTIVITY_FILTERS["login"] for a in acts))


class TestDoctorFinder(unittest.TestCase):
    def test_guidance_without_fabricated_doctors(self):
        headers, _ = register("Finder")
        res = client.post("/api/doctor-finder", json={"message": "I need help with anxiety", "location": "Pune"}, headers=headers).json()
        self.assertEqual(res["doctors"], [])
        self.assertTrue(res["reply"])
        self.assertTrue(any("Pune" in link["url"] for link in res["search_links"]))

    def test_crisis_message_gets_helplines(self):
        headers, _ = register("Finder2")
        res = client.post("/api/doctor-finder", json={"message": "I want to kill myself"}, headers=headers).json()
        self.assertIn("14416", res["reply"])


if __name__ == "__main__":
    unittest.main()
