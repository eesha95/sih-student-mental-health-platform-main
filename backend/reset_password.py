"""Reset a student or admin password directly in the database.

Usage (from the backend folder):
    python reset_password.py <email> <new-password>          # student account
    python reset_password.py <email> <new-password> --admin  # admin account
    python reset_password.py --list                          # show registered emails

Uses the same DATABASE_URL and hashing as the API, so the new password works immediately.
"""
import sys

from main import SessionLocal, UserDB, AdminDB, get_password_hash, func


def main(argv):
    db = SessionLocal()
    try:
        if argv == ["--list"]:
            for model, label in ((UserDB, "student"), (AdminDB, "admin")):
                for account in db.query(model).order_by(model.created_at).all():
                    print(f"{label:8} {account.email}")
            return 0

        if len(argv) < 2:
            print(__doc__)
            return 1

        email, new_password = argv[0], argv[1]
        model = AdminDB if "--admin" in argv[2:] else UserDB
        if len(new_password) < 6:
            print("Password must be at least 6 characters.")
            return 1

        account = db.query(model).filter(func.lower(model.email) == email.lower()).first()
        if not account:
            print(f"No {'admin' if model is AdminDB else 'student'} account found for {email}. Run with --list to see accounts.")
            return 1

        account.password_hash = get_password_hash(new_password)
        if model is UserDB:
            account.is_active = True
        db.commit()
        print(f"Password updated for {account.email}. You can log in now.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
