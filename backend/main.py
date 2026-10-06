from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Text, Integer, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv
import uuid
import json
import os
import asyncio
import bcrypt
import concurrent.futures
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-flash-latest")
app = FastAPI(
    title="Student Mental Health API",
    version="1.0.0"
)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "your-admin-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours

# Database Configuration
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./users.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__truncate_error=False)
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

# Database Models
class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class AdminDB(Base):
    __tablename__ = "admins"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLogDB(Base):
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    type = Column(String, index=True)  # login, logout, register, post_create, etc.
    description = Column(String)
    details = Column(Text, nullable=True)  # JSON string for additional details
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# --- Individual 2 Module Database Models ---
class ConversationDB(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    title = Column(String, default="Mental Health Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatMessageDB(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    conversation_id = Column(String, index=True, nullable=True)
    sender = Column(String)  # 'user' or 'ai'
    message = Column(Text)
    nlp_analysis = Column(Text, nullable=True)  # JSON string of NLP analysis
    risk_level = Column(String, default="LOW")
    timestamp = Column(DateTime, default=datetime.utcnow)

class MoodRecordDB(Base):
    __tablename__ = "mood_records"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    mood = Column(String)  # e.g., "Good", "Stressed", "Sad"
    mood_score = Column(Integer)  # 1 to 5
    emotion = Column(String)  # e.g., "Anxious", "Calm", "Overwhelmed"
    stress_level = Column(Integer)  # 1 to 5
    sleep_quality = Column(Integer, default=3) # 1 to 5
    notes = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RecommendationDB(Base):
    __tablename__ = "recommendations"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    category = Column(String)  # Relaxation, Physical Activity, Sleep, Study/Work Balance, Social Support
    title = Column(String)
    description = Column(Text)
    reason = Column(Text)
    duration_minutes = Column(Integer, default=10)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class SafetyAuditDB(Base):
    __tablename__ = "safety_audits"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    message_snippet = Column(String)
    risk_level = Column(String)  # LOW, MODERATE, HIGH, CRITICAL
    flagged_keywords = Column(String)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

# --- Booking, Wellness, Peer Support & Settings Models ---
class CounselorDB(Base):
    __tablename__ = "counselors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    specialization = Column(String)
    experience_years = Column(Integer, default=0)
    languages = Column(String, default="English, Hindi")
    bio = Column(Text, nullable=True)
    icon = Column(String, default="🧑‍⚕️")
    is_active = Column(Boolean, default=True)

class BookingDB(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    counselor_id = Column(String, index=True)
    counselor_name = Column(String)
    date = Column(String, index=True)  # YYYY-MM-DD
    time_slot = Column(String)  # e.g. "10:00 AM"
    session_type = Column(String, default="phone")
    reason = Column(String)
    urgency = Column(String, default="normal")  # low, normal, high
    notes = Column(Text, nullable=True)
    contact_name = Column(String)
    contact_phone = Column(String)
    contact_email = Column(String)
    status = Column(String, default="pending")  # pending, confirmed, cancelled, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WellnessCheckDB(Base):
    __tablename__ = "wellness_checks"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    responses = Column(Text)  # JSON: {question_id: 1-5}
    overall_score = Column(Integer)  # stored x10 (e.g. 34 == 3.4) to keep integer precision
    recommendations = Column(Text)  # JSON list
    created_at = Column(DateTime, default=datetime.utcnow)

class SupportGroupDB(Base):
    __tablename__ = "support_groups"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    category = Column(String)
    icon = Column(String)
    meeting_time = Column(String)
    moderator = Column(String)
    is_active = Column(Boolean, default=True)

class GroupMembershipDB(Base):
    __tablename__ = "group_memberships"

    id = Column(String, primary_key=True, index=True)
    group_id = Column(String, index=True)
    user_id = Column(String, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

class PeerPostDB(Base):
    __tablename__ = "peer_posts"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    author_name = Column(String)
    is_anonymous = Column(Boolean, default=True)
    content = Column(Text)
    category = Column(String, default="General")
    risk_level = Column(String, default="LOW")
    is_hidden = Column(Boolean, default=False)
    hidden_reason = Column(String, nullable=True)  # safety_review, reported, moderator
    created_at = Column(DateTime, default=datetime.utcnow)

class PostLikeDB(Base):
    __tablename__ = "post_likes"

    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, index=True)
    user_id = Column(String, index=True)

class PostReplyDB(Base):
    __tablename__ = "post_replies"

    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, index=True)
    user_id = Column(String, index=True)
    author_name = Column(String)
    is_anonymous = Column(Boolean, default=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PostReportDB(Base):
    __tablename__ = "post_reports"

    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, index=True)
    user_id = Column(String, index=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LiveSessionDB(Base):
    __tablename__ = "live_sessions"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    weekday = Column(Integer)  # 0 = Monday; sessions recur weekly
    start_time = Column(String)  # "19:00" (IST)
    duration_minutes = Column(Integer, default=45)
    type = Column(String, default="group")  # group, workshop
    facilitator = Column(String)

class SessionRegistrationDB(Base):
    __tablename__ = "session_registrations"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, index=True)
    user_id = Column(String, index=True)
    session_date = Column(String)  # YYYY-MM-DD of the occurrence
    created_at = Column(DateTime, default=datetime.utcnow)

class AppSettingDB(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class MoodCreateRequest(BaseModel):
    mood: str
    mood_score: int
    emotion: str
    stress_level: int
    sleep_quality: Optional[int] = 3
    notes: Optional[str] = ""

class BookingCreateRequest(BaseModel):
    counselor_id: str
    date: str  # YYYY-MM-DD
    time_slot: str
    session_type: Optional[str] = "phone"
    reason: str
    urgency: Optional[str] = "normal"
    notes: Optional[str] = ""
    contact_name: str
    contact_phone: str
    contact_email: EmailStr

class BookingStatusUpdate(BaseModel):
    status: str

class WellnessCheckRequest(BaseModel):
    responses: dict

class PeerPostRequest(BaseModel):
    content: str
    category: Optional[str] = "General"
    is_anonymous: Optional[bool] = True

class PeerReplyRequest(BaseModel):
    content: str
    is_anonymous: Optional[bool] = True

class PeerReportRequest(BaseModel):
    reason: Optional[str] = ""

class DoctorFinderRequest(BaseModel):
    message: str
    location: Optional[str] = ""
    session_id: Optional[str] = None

class SettingsUpdate(BaseModel):
    crisis_alerts: Optional[bool] = None
    privacy_protection: Optional[bool] = None
    maintenance_mode: Optional[bool] = None

class User(BaseModel):
    id: str
    name: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Admin(BaseModel):
    id: str
    name: str
    email: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class AdminToken(BaseModel):
    access_token: str
    token_type: str
    admin: Admin

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper function to log activity
def log_activity(db: Session, user_id: str = None, user_name: str = None, 
                activity_type: str = "", description: str = "", 
                details: dict = None, ip_address: str = None, user_agent: str = None):
    activity = ActivityLogDB(
        id=str(uuid.uuid4()),
        user_id=user_id,
        user_name=user_name,
        type=activity_type,
        description=description,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(activity)
    db.commit()

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    pwd_bytes = plain_password.encode('utf-8')[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = (password or "").encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

# Create default admin user if doesn't exist
def create_default_admin():
    db = SessionLocal()
    try:
        admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "#Admin@123")
        admin_name = os.getenv("DEFAULT_ADMIN_NAME", "System Admin")
        
        admin = db.query(AdminDB).filter(AdminDB.email == admin_email).first()
        if not admin:
            hashed_password = get_password_hash(admin_password)
            admin = AdminDB(
                id=str(uuid.uuid4()),
                name=admin_name,
                email=admin_email,
                password_hash=hashed_password
            )
            db.add(admin)
            db.commit()
            print(f"Default admin created with email: {admin_email}")
    except Exception as e:
        print(f"Error creating default admin: {e}")
    finally:
        db.close()

create_default_admin()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, is_admin: bool = False):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "is_admin": is_admin})
    secret = ADMIN_SECRET_KEY if is_admin else SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security), db: Session = Depends(get_db)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email:
            return db.query(UserDB).filter(UserDB.email == email).first()
    except Exception:
        pass
    return None

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        if email is None or not is_admin:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = db.query(AdminDB).filter(AdminDB.email == email).first()
    if admin is None:
        raise credentials_exception
    return admin

# CORS Configuration
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:4173,http://127.0.0.1:4173,https://sih-student-mental-health-platform.vercel.app"
).split(",")

allowed_origins = [origin.strip().rstrip('/') for origin in allowed_origins_env if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public Endpoints
@app.get("/")
async def root():
    return {"message": "Welcome to Student Mental Health AI Platform API"}

@app.post("/register", response_model=Token)
def register_user(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user"""
    ensure_not_in_maintenance(db)
    existing_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = UserDB(
        id=str(uuid.uuid4()),
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_activity(
        db, new_user.id, new_user.name, "register", 
        f"User registered with email: {user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@app.post("/login", response_model=Token)
def login_user(user: UserLogin, request: Request, db: Session = Depends(get_db)):
    ensure_not_in_maintenance(db)
    db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    db_user.last_login = datetime.utcnow()
    db.commit()
    
    log_activity(
        db, db_user.id, db_user.name, "login", 
        f"User logged in: {user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@app.post("/admin/login", response_model=AdminToken)
def login_admin(admin: AdminLogin, request: Request, db: Session = Depends(get_db)):
    db_admin = db.query(AdminDB).filter(AdminDB.email == admin.email).first()
    if not db_admin or not verify_password(admin.password, db_admin.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect admin email or password")
    
    log_activity(
        db, db_admin.id, db_admin.name, "admin_login", 
        f"Admin logged in: {admin.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = create_access_token(data={"sub": db_admin.email}, is_admin=True)
    return {"access_token": access_token, "token_type": "bearer", "admin": db_admin}

@app.get("/me", response_model=User)
def read_current_user(current_user: UserDB = Depends(get_current_user)):
    return current_user

@app.get("/admin/me", response_model=Admin)
def read_current_admin(current_admin: AdminDB = Depends(get_current_admin)):
    return current_admin

@app.get("/dashboard")
def get_user_dashboard(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    recent_moods = db.query(MoodRecordDB).filter(MoodRecordDB.user_id == current_user.id).order_by(MoodRecordDB.created_at.desc()).limit(5).all()
    completed_recs = db.query(RecommendationDB).filter(RecommendationDB.user_id == current_user.id, RecommendationDB.is_completed == True).count()
    total_chats = db.query(ChatMessageDB).filter(ChatMessageDB.user_id == current_user.id, ChatMessageDB.sender == "user").count()
    return {
        "user": {"id": current_user.id, "name": current_user.name, "email": current_user.email},
        "stats": {
            "recent_mood_count": len(recent_moods),
            "completed_recommendations": completed_recs,
            "total_chat_interactions": total_chats
        }
    }

@app.put("/profile", response_model=User)
def update_profile(name: str, request: Request, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    clean_name = name.strip()
    if not clean_name or len(clean_name) > 100:
        raise HTTPException(status_code=400, detail="Name must be between 1 and 100 characters")
    current_user.name = clean_name
    db.commit()
    db.refresh(current_user)
    log_activity(
        db, current_user.id, current_user.name, "profile_update", "User updated profile name",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    return current_user

@app.get("/admin/dashboard")
def get_admin_dashboard(current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    return {
        "total_users": db.query(UserDB).count(),
        "active_users": db.query(UserDB).filter(UserDB.is_active == True).count(),
        "total_posts": db.query(PeerPostDB).count(),
        "total_activities": db.query(ActivityLogDB).count(),
        "total_bookings": db.query(BookingDB).count(),
        "pending_bookings": db.query(BookingDB).filter(BookingDB.status == "pending").count(),
        "wellness_checks": db.query(WellnessCheckDB).count(),
        "safety_alerts_7d": db.query(SafetyAuditDB).filter(SafetyAuditDB.created_at >= week_ago).count(),
        "posts_needing_review": db.query(PeerPostDB).filter(PeerPostDB.is_hidden == True, PeerPostDB.hidden_reason != "moderator").count(),
    }

USER_SORT_COLUMNS = {
    "created_at": UserDB.created_at,
    "name": UserDB.name,
    "email": UserDB.email,
    "last_login": UserDB.last_login,
}

@app.get("/admin/users")
def get_admin_users(sort_by: str = "created_at", sort_order: str = "desc", current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    column = USER_SORT_COLUMNS.get(sort_by, UserDB.created_at)
    users = db.query(UserDB).order_by(column.desc() if sort_order == "desc" else column.asc()).all()
    return [{**User.model_validate(u).model_dump(), "anonymous_id": anonymous_id(u.id)} for u in users]

def _get_user_or_404(db: Session, user_id: str) -> UserDB:
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/admin/users/{user_id}")
def get_admin_user_details(user_id: str, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    return {
        "user": {**User.model_validate(user).model_dump(), "anonymous_id": anonymous_id(user.id)},
        "mood_entries": db.query(MoodRecordDB).filter(MoodRecordDB.user_id == user_id).count(),
        "wellness_checks": db.query(WellnessCheckDB).filter(WellnessCheckDB.user_id == user_id).count(),
        "bookings": db.query(BookingDB).filter(BookingDB.user_id == user_id).count(),
        "chat_messages": db.query(ChatMessageDB).filter(ChatMessageDB.user_id == user_id, ChatMessageDB.sender == "user").count(),
        "peer_posts": db.query(PeerPostDB).filter(PeerPostDB.user_id == user_id).count(),
    }

@app.post("/admin/users/{user_id}/activate", response_model=User)
def activate_user(user_id: str, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    user.is_active = True
    db.commit()
    db.refresh(user)
    log_activity(db, current_admin.id, current_admin.name, "admin_user_activate", f"Admin activated user {user.id}")
    return user

@app.post("/admin/users/{user_id}/deactivate", response_model=User)
def deactivate_user(user_id: str, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    user.is_active = False
    db.commit()
    db.refresh(user)
    log_activity(db, current_admin.id, current_admin.name, "admin_user_deactivate", f"Admin deactivated user {user.id}")
    return user

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: str, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    post_ids = [p.id for p in db.query(PeerPostDB.id).filter(PeerPostDB.user_id == user_id).all()]
    if post_ids:
        for model in (PostLikeDB, PostReplyDB, PostReportDB):
            db.query(model).filter(model.post_id.in_(post_ids)).delete(synchronize_session=False)
    for model in (ChatMessageDB, ConversationDB, MoodRecordDB, RecommendationDB, WellnessCheckDB, BookingDB,
                  GroupMembershipDB, PeerPostDB, PostLikeDB, PostReplyDB, PostReportDB, SessionRegistrationDB, SafetyAuditDB):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    log_activity(db, current_admin.id, current_admin.name, "admin_user_delete", f"Admin deleted user {user_id} and their data")
    return {"message": "User and associated data deleted"}

ACTIVITY_FILTERS = {
    "login": ["login", "logout", "admin_login"],
    "security": ["admin_login", "admin_user_activate", "admin_user_deactivate", "admin_user_delete", "admin_settings_update", "admin_export"],
    "profile": ["register", "profile_update"],
}
TIME_RANGES = {"1h": timedelta(hours=1), "24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30)}

@app.get("/admin/activities")
def get_admin_activities(filter: str = "all", time_range: str = "24h", current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    query = db.query(ActivityLogDB)
    if filter != "all":
        query = query.filter(ActivityLogDB.type.in_(ACTIVITY_FILTERS.get(filter, [filter])))
    if time_range in TIME_RANGES:
        query = query.filter(ActivityLogDB.timestamp >= datetime.utcnow() - TIME_RANGES[time_range])
    return [
        {
            "id": a.id, "user_id": a.user_id, "anonymous_id": anonymous_id(a.user_id), "user_name": a.user_name, "type": a.type,
            "description": a.description, "ip_address": a.ip_address, "timestamp": a.timestamp,
        }
        for a in query.order_by(ActivityLogDB.timestamp.desc()).limit(100).all()
    ]

# Health check
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        user_count = db.query(UserDB).count()
        admin_count = db.query(AdminDB).count()
        activity_count = db.query(ActivityLogDB).count()
        return {
            "status": "healthy", 
            "users_count": user_count,
            "admins_count": admin_count,
            "activities_count": activity_count
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# --- NLP & SAFETY ENGINE ---
CRITICAL_KEYWORDS = ["suicide", "kill myself", "end my life", "want to die", "hanging", "overdose", "self harm", "cutting myself", "hurt myself"]
HIGH_RISK_KEYWORDS = ["hopeless", "can't go on", "no reason to live", "worthless", "nobody cares", "give up on life", "cant take it anymore"]
ANXIETY_KEYWORDS = ["panic", "anxious", "anxiety", "scared", "terrified", "fear", "nervous", "shaking", "heart racing", "overwhelmed"]
STRESS_KEYWORDS = ["stress", "stressed", "exam", "assignment", "deadline", "pressure", "gpa", "failed", "studying", "workload"]
SADNESS_KEYWORDS = ["sad", "depressed", "lonely", "crying", "upset", "empty", "heartbroken", "gloomy", "miserable"]

def analyze_nlp_and_safety(text: str) -> dict:
    lower_text = text.lower().strip()
    
    # 1. Safety / Risk Level
    flagged = []
    risk_level = "LOW"
    
    for kw in CRITICAL_KEYWORDS:
        if kw in lower_text:
            flagged.append(kw)
            risk_level = "CRITICAL"
            
    if risk_level != "CRITICAL":
        for kw in HIGH_RISK_KEYWORDS:
            if kw in lower_text:
                flagged.append(kw)
                risk_level = "HIGH"
                
    if risk_level not in ["CRITICAL", "HIGH"]:
        for kw in ANXIETY_KEYWORDS + STRESS_KEYWORDS + SADNESS_KEYWORDS:
            if kw in lower_text:
                flagged.append(kw)
                risk_level = "MODERATE"
                break
                
    # 2. Emotion & Sentiment Classification
    emotion = "neutral"
    stress_level = "low"
    sentiment = "neutral"
    recommended_action = "general_wellbeing"
    
    extracted_keywords = list(set([word for word in lower_text.split() if len(word) > 3]))[:5]
    
    if any(k in lower_text for k in ANXIETY_KEYWORDS):
        emotion = "anxiety"
        sentiment = "negative"
        stress_level = "high"
        recommended_action = "deep_breathing_grounding"
    elif any(k in lower_text for k in STRESS_KEYWORDS):
        emotion = "stress"
        sentiment = "negative"
        stress_level = "high"
        recommended_action = "pomodoro_short_break"
    elif any(k in lower_text for k in SADNESS_KEYWORDS):
        emotion = "sadness"
        sentiment = "negative"
        stress_level = "medium"
        recommended_action = "social_reachout_support"
    elif any(k in lower_text for k in ["happy", "good", "great", "awesome", "relaxed", "peaceful", "calm", "excited"]):
        emotion = "positive"
        sentiment = "positive"
        stress_level = "low"
        recommended_action = "maintain_mindfulness"
        
    confidence = 0.92 if flagged else 0.85

    return {
        "sentiment": sentiment,
        "emotion": emotion,
        "confidence": confidence,
        "stress_level": stress_level,
        "risk_level": risk_level,
        "flagged_keywords": flagged,
        "keywords": extracted_keywords,
        "recommended_action": recommended_action
    }

def _call_gemini(prompt: str) -> Optional[str]:
    candidate_models = [
        "models/gemini-3.6-flash",
        "models/gemini-1.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-flash-latest"
    ]
    for model_name in candidate_models:
        try:
            m = genai.GenerativeModel(model_name)
            res = m.generate_content(prompt)
            if res and hasattr(res, 'text') and res.text:
                return res.text
        except Exception as err:
            print(f"Model {model_name} API warning: {err}")
            continue
    return None

def generate_ai_response(user_msg: str, nlp_res: dict) -> str:
    # Safety Check: If CRITICAL or HIGH risk, prioritize safety response
    if nlp_res["risk_level"] in ["CRITICAL", "HIGH"]:
        return (
            "I hear how much pain you are in right now, and I want you to know you are not alone. "
            "Because your safety and health are extremely important, please reach out to professional human support immediately.\n\n"
            "🚨 **Emergency & Crisis Helplines (24/7 Free & Confidential):**\n"
            "- **Tele-MANAS (India):** 14416 / 1800-891-4416\n"
            "- **KIRAN Helpline:** 1800-599-0019\n"
            "- **AASRA:** +91-9820466726\n"
            "- **National Emergency:** 112\n\n"
            "Please talk to a trusted friend, family member, or campus counselor right now. I am here with you, but human support is the best step right now."
        )

    prompt = f"""You are a friendly, compassionate, intelligent AI Mental Health Assistant talking directly with a student in a natural, human way.

Rules:
- Respond in a warm, conversational, empathetic, and natural tone, as a supportive friend and knowledgeable assistant would.
- Address the user's specific concern directly.
- NEVER claim to be a licensed doctor or therapist, and NEVER give medical diagnoses or prescriptions.
- If the user greets you (e.g. "hii", "hello", "hey"), greet them warmly and ask how their day is going or how you can assist them today.
- Offer actionable, realistic coping strategies when appropriate (e.g., 4-7-8 breathing, pomodoro breaks, sleep routines).
- Keep answers conversational, helpful, and naturally structured.

Detected User State: Emotion={nlp_res['emotion']}, Sentiment={nlp_res['sentiment']}, Stress={nlp_res['stress_level']}.
User message: {user_msg}
"""
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini, prompt)
            result = future.result(timeout=12.0)
            if result and len(result.strip()) > 0:
                return result.strip()
    except Exception as e:
        print(f"Gemini API timeout or error: {e}")

    # Dynamic fallback
    lower_msg = user_msg.lower().strip()
    if lower_msg in ["hi", "hii", "hello", "hey", "good morning", "good evening"]:
        return "Hello! I'm your AI mental health companion. How are you feeling today? I'm here to listen, support, or brainstorm practical wellness tips with you."
    
    if nlp_res["emotion"] == "anxiety":
        return "I can hear that you're feeling anxious. Take a deep breath: inhale for 4 seconds, hold for 4, and exhale slowly for 6. Ground yourself by noticing 3 things around you. You are doing your best, and this feeling will pass."
    elif nlp_res["emotion"] == "stress":
        return "Academic or personal stress can feel heavy. Try breaking your current workload into smaller, manageable 20-minute chunks and take a 5-minute break in between. Remember to drink water and give your mind brief resets."
    elif nlp_res["emotion"] == "sadness":
        return "I'm really sorry you're feeling down. Be extra gentle with yourself today. Reaching out to a close friend or taking a calm stroll outside can sometimes give your mind a warm reset."
    
    return f"Thank you for sharing that with me. I hear you loud and clear. Taking things one step at a time, practicing deep breathing, or chatting with a trusted person can help ease your mind right now."

# --- API ENDPOINTS FOR INDIVIDUAL 2 ---

@app.post("/api/nlp/analyze")
def api_nlp_analyze(request: ChatRequest):
    """Modular NLP endpoint extracting sentiment, emotion, stress & risk levels"""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    return analyze_nlp_and_safety(request.message)

@app.post("/api/risk/analyze")
def api_risk_analyze(request: ChatRequest, db: Session = Depends(get_db)):
    """Risk Assessment Endpoint"""
    nlp_res = analyze_nlp_and_safety(request.message)
    if nlp_res["risk_level"] in ["HIGH", "CRITICAL"]:
        audit = SafetyAuditDB(
            id=str(uuid.uuid4()),
            user_id="anonymous",
            message_snippet=request.message[:100],
            risk_level=nlp_res["risk_level"],
            flagged_keywords=json.dumps(nlp_res["flagged_keywords"])
        )
        db.add(audit)
        db.commit()
    return nlp_res

@app.get("/api/support-resources")
def get_support_resources():
    """Configurable emergency contacts & professional help resources"""
    return {
        "emergency_contacts": [
            {"name": "Tele-MANAS (Govt. of India)", "number": "14416 / 1800-891-4416", "available": "24/7 Free"},
            {"name": "KIRAN Mental Health Helpline", "number": "1800-599-0019", "available": "24/7 Free"},
            {"name": "AASRA Suicide Prevention", "number": "+91-9820466726", "available": "24/7"},
            {"name": "Vandrevala Foundation", "number": "+91-9999666555", "available": "24/7"},
            {"name": "National Emergency Services", "number": "112", "available": "24/7"}
        ],
        "guidance": "If you or someone you know is experiencing severe distress, panic, or thoughts of self-harm, please contact one of these resources or visit your institution's counseling center immediately."
    }

@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, current_user: Optional[UserDB] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    clean_message = request.message.strip()
    if len(clean_message) > 4000:
        raise HTTPException(status_code=400, detail="Message is too long. Keep under 4000 characters.")

    user_id = current_user.id if current_user else "anonymous"

    # 1. NLP & Safety Analysis
    nlp_res = analyze_nlp_and_safety(clean_message)

    # 2. Store User Chat Message in DB if authenticated
    if current_user:
        user_chat_msg = ChatMessageDB(
            id=str(uuid.uuid4()),
            user_id=user_id,
            conversation_id=request.conversation_id,
            sender="user",
            message=clean_message,
            nlp_analysis=json.dumps(nlp_res),
            risk_level=nlp_res["risk_level"]
        )
        db.add(user_chat_msg)
        db.commit()

        # Audit if critical
        if nlp_res["risk_level"] in ["HIGH", "CRITICAL"]:
            audit = SafetyAuditDB(
                id=str(uuid.uuid4()),
                user_id=user_id,
                message_snippet=clean_message[:100],
                risk_level=nlp_res["risk_level"],
                flagged_keywords=json.dumps(nlp_res["flagged_keywords"])
            )
            db.add(audit)
            db.commit()

    # 3. Generate AI Response
    reply_text = await asyncio.to_thread(generate_ai_response, clean_message, nlp_res)

    # 4. Store AI Chat Message in DB if authenticated
    if current_user:
        ai_chat_msg = ChatMessageDB(
            id=str(uuid.uuid4()),
            user_id=user_id,
            conversation_id=request.conversation_id,
            sender="ai",
            message=reply_text,
            nlp_analysis=None,
            risk_level=nlp_res["risk_level"]
        )
        db.add(ai_chat_msg)
        db.commit()

    return {
        "reply": reply_text,
        "nlp": nlp_res,
        "timestamp": datetime.utcnow().strftime("%H:%M")
    }

@app.get("/api/chat/history")
def get_chat_history(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(ChatMessageDB).filter(ChatMessageDB.user_id == current_user.id).order_by(ChatMessageDB.timestamp.asc()).all()
    return [
        {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.message,
            "risk_level": msg.risk_level,
            "timestamp": msg.timestamp.strftime("%I:%M %p")
        } for msg in messages
    ]

@app.delete("/api/chat/history")
def clear_chat_history(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ChatMessageDB).filter(ChatMessageDB.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully"}

# --- MOOD ANALYSIS ENDPOINTS ---

@app.post("/api/mood")
def create_mood_entry(req: MoodCreateRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.mood_score < 1 or req.mood_score > 5:
        raise HTTPException(status_code=400, detail="Mood score must be between 1 and 5")
    if req.stress_level < 1 or req.stress_level > 5:
        raise HTTPException(status_code=400, detail="Stress level must be between 1 and 5")

    # Generate AI pattern observation
    ai_obs = "Your mood entry has been logged. "
    if req.stress_level >= 4:
        ai_obs += "High stress detected. Consider taking a 10-minute relaxation or breathing pause."
    elif req.mood_score <= 2:
        ai_obs += "Low mood noted. Be gentle with yourself today and try connecting with a friend."
    else:
        ai_obs += "Great to see a balanced mood! Keep up your healthy daily routines."

    new_mood = MoodRecordDB(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        mood=req.mood,
        mood_score=req.mood_score,
        emotion=req.emotion,
        stress_level=req.stress_level,
        sleep_quality=req.sleep_quality,
        notes=req.notes,
        ai_analysis=ai_obs
    )
    db.add(new_mood)
    db.commit()
    db.refresh(new_mood)
    
    # Auto-generate updated recommendations
    generate_dynamic_recommendations(current_user.id, db)
    
    return new_mood

@app.get("/api/mood/history")
def get_mood_history(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(MoodRecordDB).filter(MoodRecordDB.user_id == current_user.id).order_by(MoodRecordDB.created_at.desc()).all()
    return records

@app.get("/api/mood/analysis")
def get_mood_analysis(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(MoodRecordDB).filter(MoodRecordDB.user_id == current_user.id).order_by(MoodRecordDB.created_at.asc()).all()
    
    if not records:
        return {
            "has_data": False,
            "insight": "No mood entries recorded yet. Complete a mood check-in to see your emotional trends!",
            "avg_mood": 0,
            "avg_stress": 0,
            "pattern": "No pattern identified"
        }
    
    recent_records = records[-7:] # Last 7 entries
    avg_mood = sum(r.mood_score for r in recent_records) / len(recent_records)
    avg_stress = sum(r.stress_level for r in recent_records) / len(recent_records)
    
    pattern = "Stable and balanced mood"
    if len(recent_records) >= 3:
        stress_trend = [r.stress_level for r in recent_records]
        mood_trend = [r.mood_score for r in recent_records]
        
        if stress_trend[-1] > stress_trend[0] and avg_stress >= 3.5:
            pattern = "Your recent entries show an increase in reported stress."
        elif mood_trend[-1] < mood_trend[0] and avg_mood <= 2.5:
            pattern = "Your recent entries indicate consistently low mood."
        elif avg_mood >= 4.0:
            pattern = "Your entries show a consistently positive emotional state!"

    chart_data = [
        {
            "date": r.created_at.strftime("%b %d"),
            "mood": r.mood_score,
            "stress": r.stress_level,
            "emotion": r.emotion
        } for r in records
    ]

    return {
        "has_data": True,
        "avg_mood": round(avg_mood, 1),
        "avg_stress": round(avg_stress, 1),
        "pattern": pattern,
        "chart_data": chart_data,
        "total_entries": len(records)
    }

# --- DYNAMIC RECOMMENDATION ENGINE ---

def generate_dynamic_recommendations(user_id: str, db: Session):
    # Fetch recent mood records
    recent_moods = db.query(MoodRecordDB).filter(MoodRecordDB.user_id == user_id).order_by(MoodRecordDB.created_at.desc()).limit(3).all()
    
    latest_mood_score = recent_moods[0].mood_score if recent_moods else 3
    latest_stress = recent_moods[0].stress_level if recent_moods else 3
    latest_sleep = recent_moods[0].sleep_quality if recent_moods else 3
    
    # Existing incomplete recommendations count
    existing_count = db.query(RecommendationDB).filter(RecommendationDB.user_id == user_id, RecommendationDB.is_completed == False).count()
    if existing_count >= 6:
        return

    new_recs = []

    # High Stress Logic
    if latest_stress >= 4:
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Relaxation", title="4-7-8 Deep Breathing Exercise",
            description="Inhale for 4s, hold for 7s, exhale for 8s to calm your nervous system.",
            reason="You reported high stress levels recently.", duration_minutes=5
        ))
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Study/Work Balance", title="25-Minute Pomodoro Study Break",
            description="Take a 5-minute screen-free rest after 25 minutes of focused study.",
            reason="Helps prevent burnout during high academic pressure.", duration_minutes=15
        ))

    # Low Sleep Logic
    if latest_sleep <= 2:
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Sleep", title="Digital Sunset Routine",
            description="Turn off bright blue screens 30 minutes before bedtime.",
            reason="Your sleep quality score was low.", duration_minutes=30
        ))

    # Low Mood Logic
    if latest_mood_score <= 2:
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Social Support", title="Connect with a Trusted Friend",
            description="Send a message or grab coffee with a close peer or campus mate.",
            reason="Social connection significantly improves low mood episodes.", duration_minutes=20
        ))
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Physical Activity", title="10-Minute Mindful Walk",
            description="Take a short outdoor walk without looking at your phone.",
            reason="Light physical activity boosts dopamine and mood.", duration_minutes=10
        ))

    # General / Positive Default Logic
    if not new_recs:
        new_recs.append(RecommendationDB(
            id=str(uuid.uuid4()), user_id=user_id,
            category="Relaxation", title="Daily Gratitude Journaling",
            description="Write down 3 small things that went well today.",
            reason="Maintains positive psychological momentum.", duration_minutes=5
        ))

    for rec in new_recs:
        db.add(rec)
    db.commit()

@app.get("/api/recommendations")
def get_user_recommendations(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    recs = db.query(RecommendationDB).filter(RecommendationDB.user_id == current_user.id).order_by(RecommendationDB.created_at.desc()).all()
    if not recs:
        generate_dynamic_recommendations(current_user.id, db)
        recs = db.query(RecommendationDB).filter(RecommendationDB.user_id == current_user.id).order_by(RecommendationDB.created_at.desc()).all()
    return recs

@app.post("/api/recommendations/{rec_id}/complete")
def complete_recommendation(rec_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(RecommendationDB).filter(RecommendationDB.id == rec_id, RecommendationDB.user_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_completed = True
    rec.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Recommendation completed!", "recommendation": rec}

# --- APP SETTINGS ---

DEFAULT_SETTINGS = {"crisis_alerts": True, "privacy_protection": True, "maintenance_mode": False}

def get_settings(db: Session) -> dict:
    settings = dict(DEFAULT_SETTINGS)
    for row in db.query(AppSettingDB).all():
        if row.key in settings:
            settings[row.key] = row.value == "true"
    return settings

def ensure_not_in_maintenance(db: Session):
    if get_settings(db)["maintenance_mode"]:
        raise HTTPException(
            status_code=503,
            detail="The platform is under maintenance. If you need urgent help, call Tele-MANAS at 14416 or emergency services at 112."
        )

def anonymous_id(user_id: Optional[str]) -> str:
    if not user_id or user_id == "anonymous":
        return "ANONYMOUS"
    return "USER-" + uuid.uuid5(uuid.NAMESPACE_OID, user_id).hex[:6].upper()

@app.get("/admin/settings")
def read_admin_settings(current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    return get_settings(db)

@app.put("/admin/settings")
def update_admin_settings(update: SettingsUpdate, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    changes = update.model_dump(exclude_none=True)
    for key, value in changes.items():
        row = db.query(AppSettingDB).filter(AppSettingDB.key == key).first()
        if row:
            row.value = "true" if value else "false"
        else:
            db.add(AppSettingDB(key=key, value="true" if value else "false"))
    db.commit()
    log_activity(db, current_admin.id, current_admin.name, "admin_settings_update", "Admin updated settings", details=changes)
    return get_settings(db)

# --- COUNSELOR BOOKING ---

TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"]
BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"]

# Sample profiles so the booking flow works out of the box; replace with your institution's counsellors.
SAMPLE_COUNSELORS = [
    {"name": "Dr. Ananya Iyer", "specialization": "Anxiety & Exam Stress", "experience_years": 8, "languages": "English, Hindi, Tamil", "icon": "👩‍⚕️",
     "bio": "Clinical psychologist focused on academic stress, test anxiety and panic management using CBT."},
    {"name": "Dr. Rohan Mehta", "specialization": "Depression & Mood Disorders", "experience_years": 12, "languages": "English, Hindi, Gujarati", "icon": "👨‍⚕️",
     "bio": "Counselling psychologist supporting students through low mood, motivation loss and burnout."},
    {"name": "Ms. Farah Khan", "specialization": "Relationships, Family & Adjustment", "experience_years": 6, "languages": "English, Hindi, Urdu", "icon": "👩‍⚕️",
     "bio": "Licensed counsellor helping students with homesickness, relationships and campus adjustment."},
    {"name": "Dr. Suresh Nair", "specialization": "Trauma & Grief", "experience_years": 15, "languages": "English, Malayalam, Hindi", "icon": "👨‍⚕️",
     "bio": "Psychotherapist experienced in trauma-informed care, grief and loss."},
]

def seed_reference_data():
    db = SessionLocal()
    try:
        if db.query(CounselorDB).count() == 0:
            for c in SAMPLE_COUNSELORS:
                db.add(CounselorDB(id=str(uuid.uuid4()), **c))
        if db.query(SupportGroupDB).count() == 0:
            for g in [
                ("Anxiety Support Circle", "A safe space to share experiences and coping strategies for anxiety.", "Anxiety", "🤗", "Wednesdays 7:00 PM IST", "Peer Mentor Team"),
                ("Low Mood & Motivation Group", "Connect with others working through low mood, depression and burnout.", "Depression", "💪", "Mondays 6:00 PM IST", "Campus Counselling Cell"),
                ("Exam & Academic Stress", "Strategies for deadlines, exams, GPA pressure and study balance.", "Stress", "📚", "Fridays 5:00 PM IST", "Peer Mentor Team"),
                ("Hostel Life & Homesickness", "For students adjusting to hostel life, a new city or being away from family.", "General", "🏠", "Thursdays 8:00 PM IST", "Student Wellness Club"),
            ]:
                db.add(SupportGroupDB(id=str(uuid.uuid4()), name=g[0], description=g[1], category=g[2], icon=g[3], meeting_time=g[4], moderator=g[5]))
        if db.query(LiveSessionDB).count() == 0:
            for s in [
                ("Mindfulness Monday", "Weekly guided meditation and mindfulness practice.", 0, "19:00", 45, "group", "Campus Counselling Cell"),
                ("Coping Strategies Workshop", "Learn practical techniques for managing difficult emotions.", 2, "16:00", 60, "workshop", "Student Wellness Club"),
                ("Exam Stress Drop-in", "Open session to talk through study pressure and plan breaks.", 4, "17:30", 45, "group", "Peer Mentor Team"),
            ]:
                db.add(LiveSessionDB(id=str(uuid.uuid4()), title=s[0], description=s[1], weekday=s[2], start_time=s[3], duration_minutes=s[4], type=s[5], facilitator=s[6]))
        db.commit()
    finally:
        db.close()

seed_reference_data()

def _slot_datetime(date_str: str, slot: str) -> datetime:
    return datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %I:%M %p")

def _available_slots(db: Session, counselor_id: str, date_str: str) -> List[str]:
    taken = {
        b.time_slot for b in db.query(BookingDB).filter(
            BookingDB.counselor_id == counselor_id, BookingDB.date == date_str, BookingDB.status != "cancelled"
        ).all()
    }
    now = datetime.now()
    return [s for s in TIME_SLOTS if s not in taken and _slot_datetime(date_str, s) > now]

def _post_json(url: str, payload: dict, timeout: int):
    import urllib.request
    req = urllib.request.Request(url, data=json.dumps(payload, default=str).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode()
        return json.loads(body) if body else {}

def _forward_to_webhook(env_var: str, payload: dict):
    """Fire-and-forget POST to an optional external automation (e.g. n8n). Never blocks the request."""
    url = os.getenv(env_var, "").strip()
    if not url:
        return
    def _send():
        try:
            _post_json(url, payload, timeout=15)
        except Exception as err:
            print(f"Webhook {env_var} warning: {err}")
    concurrent.futures.ThreadPoolExecutor(max_workers=1).submit(_send)

def _booking_dict(b: BookingDB) -> dict:
    return {
        "id": b.id, "counselor_id": b.counselor_id, "counselor_name": b.counselor_name, "date": b.date,
        "time_slot": b.time_slot, "session_type": b.session_type, "reason": b.reason, "urgency": b.urgency,
        "notes": b.notes, "contact_name": b.contact_name, "contact_phone": b.contact_phone,
        "contact_email": b.contact_email, "status": b.status, "created_at": b.created_at, "updated_at": b.updated_at,
        "reference": "BK-" + b.id[:8].upper(),
    }

@app.get("/api/counselors")
def list_counselors(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.now().date()
    result = []
    for c in db.query(CounselorDB).filter(CounselorDB.is_active == True).all():
        next_slot = None
        for offset in range(7):
            day = (today + timedelta(days=offset)).isoformat()
            slots = _available_slots(db, c.id, day)
            if slots:
                next_slot = {"date": day, "time_slot": slots[0]}
                break
        result.append({
            "id": c.id, "name": c.name, "specialization": c.specialization, "experience_years": c.experience_years,
            "languages": c.languages, "bio": c.bio, "icon": c.icon, "next_available": next_slot,
        })
    return result

@app.get("/api/counselors/{counselor_id}/availability")
def counselor_availability(counselor_id: str, date: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(CounselorDB).filter(CounselorDB.id == counselor_id).first():
        raise HTTPException(status_code=404, detail="Counselor not found")
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    return {"date": date, "all_slots": TIME_SLOTS, "available_slots": _available_slots(db, counselor_id, date)}

@app.post("/api/bookings")
def create_booking(req: BookingCreateRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    counselor = db.query(CounselorDB).filter(CounselorDB.id == req.counselor_id, CounselorDB.is_active == True).first()
    if not counselor:
        raise HTTPException(status_code=404, detail="Counselor not found")
    if req.time_slot not in TIME_SLOTS:
        raise HTTPException(status_code=400, detail="Invalid time slot")
    try:
        slot_dt = _slot_datetime(req.date, req.time_slot)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    if slot_dt <= datetime.now() or slot_dt.date() > (datetime.now() + timedelta(days=30)).date():
        raise HTTPException(status_code=400, detail="Please choose a future slot within the next 30 days")
    if req.time_slot not in _available_slots(db, counselor.id, req.date):
        raise HTTPException(status_code=409, detail="That slot was just booked. Please pick another time.")
    if not req.contact_name.strip() or len(req.contact_phone.strip()) < 7 or not req.reason.strip():
        raise HTTPException(status_code=400, detail="Name, phone number and reason are required")

    booking = BookingDB(
        id=str(uuid.uuid4()), user_id=current_user.id, counselor_id=counselor.id, counselor_name=counselor.name,
        date=req.date, time_slot=req.time_slot, session_type=req.session_type or "phone", reason=req.reason.strip(),
        urgency=req.urgency if req.urgency in ("low", "normal", "high") else "normal", notes=(req.notes or "").strip(),
        contact_name=req.contact_name.strip(), contact_phone=req.contact_phone.strip(), contact_email=req.contact_email,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    log_activity(db, current_user.id, current_user.name, "booking_create", f"Booking requested with {counselor.name} on {req.date} {req.time_slot}")
    data = _booking_dict(booking)
    _forward_to_webhook("BOOKING_WEBHOOK_URL", {**data, "featureType": "counseling-booking", "counselorSpecialization": counselor.specialization})
    return data

@app.get("/api/bookings")
def list_my_bookings(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    bookings = db.query(BookingDB).filter(BookingDB.user_id == current_user.id).order_by(BookingDB.date.desc(), BookingDB.created_at.desc()).all()
    return [_booking_dict(b) for b in bookings]

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_my_booking(booking_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(BookingDB).filter(BookingDB.id == booking_id, BookingDB.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in ("cancelled", "completed"):
        raise HTTPException(status_code=400, detail=f"Booking is already {booking.status}")
    booking.status = "cancelled"
    db.commit()
    log_activity(db, current_user.id, current_user.name, "booking_cancel", f"Booking {booking.id[:8]} cancelled by student")
    return _booking_dict(booking)

@app.get("/admin/bookings")
def admin_list_bookings(status_filter: str = "all", current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    query = db.query(BookingDB)
    if status_filter != "all":
        query = query.filter(BookingDB.status == status_filter)
    urgency_rank = {"high": 0, "normal": 1, "low": 2}
    bookings = query.order_by(BookingDB.date.asc(), BookingDB.created_at.asc()).all()
    bookings.sort(key=lambda b: (b.status != "pending", urgency_rank.get(b.urgency, 1)))
    return [_booking_dict(b) for b in bookings]

@app.patch("/admin/bookings/{booking_id}")
def admin_update_booking(booking_id: str, update: BookingStatusUpdate, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    if update.status not in BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {BOOKING_STATUSES}")
    booking = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = update.status
    db.commit()
    log_activity(db, current_admin.id, current_admin.name, "admin_booking_update", f"Booking {booking.id[:8]} marked {update.status}")
    return _booking_dict(booking)

# --- WELLNESS CHECK-INS ---

WELLNESS_QUESTIONS = ["mood", "energy", "sleep", "stress", "anxiety", "social", "coping", "motivation"]
NEGATIVE_WELLNESS_ITEMS = {"stress", "anxiety"}  # higher answer == worse, so invert for scoring

def wellness_score(responses: dict) -> float:
    adjusted = [6 - responses[q] if q in NEGATIVE_WELLNESS_ITEMS else responses[q] for q in WELLNESS_QUESTIONS]
    return round(sum(adjusted) / len(adjusted), 1)

def wellness_recommendations(r: dict, score: float) -> List[dict]:
    recs = []
    if r["mood"] <= 2:
        recs.append({"category": "Mood Support", "suggestion": "Do one small activity that usually brings you joy today, and consider talking to a counsellor.", "priority": "high"})
    if r["energy"] <= 2:
        recs.append({"category": "Energy Boost", "suggestion": "Try a short walk, regular meals and enough water; check whether sleep is the root cause.", "priority": "medium"})
    if r["sleep"] <= 2:
        recs.append({"category": "Sleep Hygiene", "suggestion": "Keep a consistent bedtime and put screens away 30 minutes before sleep.", "priority": "high"})
    if r["stress"] >= 4:
        recs.append({"category": "Stress Management", "suggestion": "Break work into 25-minute blocks with 5-minute breaks and try 4-7-8 breathing between them.", "priority": "high"})
    if r["anxiety"] >= 4:
        recs.append({"category": "Anxiety Relief", "suggestion": "Use the 5-4-3-2-1 grounding technique, limit caffeine, and consider booking a counsellor session.", "priority": "high"})
    if r["social"] <= 2:
        recs.append({"category": "Social Connection", "suggestion": "Message one friend or family member today, or join a peer support group.", "priority": "medium"})
    if r["coping"] <= 2 or r["motivation"] <= 2:
        recs.append({"category": "Daily Coping", "suggestion": "Pick just one achievable task for today and celebrate finishing it.", "priority": "medium"})
    if score >= 4:
        recs.append({"category": "Maintenance", "suggestion": "Great job! Keep your current routines going and check in again tomorrow.", "priority": "low"})
    if not recs:
        recs.append({"category": "Balance", "suggestion": "You're doing okay. A short mindfulness break today can help keep things steady.", "priority": "low"})
    return recs

def _wellness_dict(w: WellnessCheckDB) -> dict:
    return {
        "id": w.id, "responses": json.loads(w.responses), "overall_score": w.overall_score / 10,
        "recommendations": json.loads(w.recommendations), "created_at": w.created_at,
    }

@app.post("/api/wellness-checks")
def create_wellness_check(req: WellnessCheckRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    responses = {}
    for q in WELLNESS_QUESTIONS:
        value = req.responses.get(q)
        if not isinstance(value, int) or isinstance(value, bool) or value < 1 or value > 5:
            raise HTTPException(status_code=400, detail=f"Answer for '{q}' must be a number from 1 to 5")
        responses[q] = value
    score = wellness_score(responses)
    check = WellnessCheckDB(
        id=str(uuid.uuid4()), user_id=current_user.id, responses=json.dumps(responses),
        overall_score=int(round(score * 10)), recommendations=json.dumps(wellness_recommendations(responses, score)),
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return _wellness_dict(check)

@app.get("/api/wellness-checks")
def list_wellness_checks(limit: int = 30, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    checks = db.query(WellnessCheckDB).filter(WellnessCheckDB.user_id == current_user.id).order_by(WellnessCheckDB.created_at.desc()).limit(min(limit, 100)).all()
    return [_wellness_dict(c) for c in checks]

# --- PEER SUPPORT COMMUNITY ---

POST_REPORT_HIDE_THRESHOLD = 3

def _next_occurrence(session: LiveSessionDB) -> datetime:
    now = datetime.now()
    hour, minute = map(int, session.start_time.split(":"))
    days_ahead = (session.weekday - now.weekday()) % 7
    start = (now + timedelta(days=days_ahead)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    if start + timedelta(minutes=session.duration_minutes) < now:
        start += timedelta(days=7)
    return start

def _post_dict(p: PeerPostDB, db: Session, user_id: str) -> dict:
    return {
        "id": p.id,
        "author": "Anonymous Student" if p.is_anonymous else p.author_name,
        "is_anonymous": p.is_anonymous,
        "content": p.content,
        "category": p.category,
        "created_at": p.created_at,
        "likes": db.query(PostLikeDB).filter(PostLikeDB.post_id == p.id).count(),
        "liked_by_me": db.query(PostLikeDB).filter(PostLikeDB.post_id == p.id, PostLikeDB.user_id == user_id).first() is not None,
        "replies": db.query(PostReplyDB).filter(PostReplyDB.post_id == p.id).count(),
        "is_mine": p.user_id == user_id,
        "is_hidden": p.is_hidden,
        "hidden_reason": p.hidden_reason,
    }

def _visible_post_or_404(db: Session, post_id: str) -> PeerPostDB:
    post = db.query(PeerPostDB).filter(PeerPostDB.id == post_id, PeerPostDB.is_hidden == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

def _screen_content(db: Session, user: UserDB, text: str) -> dict:
    nlp = analyze_nlp_and_safety(text)
    if nlp["risk_level"] in ("HIGH", "CRITICAL"):
        db.add(SafetyAuditDB(
            id=str(uuid.uuid4()), user_id=user.id, message_snippet=text[:100],
            risk_level=nlp["risk_level"], flagged_keywords=json.dumps(nlp["flagged_keywords"])
        ))
    return nlp

@app.get("/api/peer/groups")
def list_support_groups(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    my_groups = {m.group_id for m in db.query(GroupMembershipDB).filter(GroupMembershipDB.user_id == current_user.id).all()}
    return [
        {
            "id": g.id, "name": g.name, "description": g.description, "category": g.category, "icon": g.icon,
            "meeting_time": g.meeting_time, "moderator": g.moderator, "is_active": g.is_active,
            "members": db.query(GroupMembershipDB).filter(GroupMembershipDB.group_id == g.id).count(),
            "joined": g.id in my_groups,
        }
        for g in db.query(SupportGroupDB).all()
    ]

@app.post("/api/peer/groups/{group_id}/join")
def join_support_group(group_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(SupportGroupDB).filter(SupportGroupDB.id == group_id).first()
    if not group or not group.is_active:
        raise HTTPException(status_code=404, detail="Group not found or inactive")
    if not db.query(GroupMembershipDB).filter(GroupMembershipDB.group_id == group_id, GroupMembershipDB.user_id == current_user.id).first():
        db.add(GroupMembershipDB(id=str(uuid.uuid4()), group_id=group_id, user_id=current_user.id))
        db.commit()
    return {"message": f"Joined {group.name}", "joined": True}

@app.post("/api/peer/groups/{group_id}/leave")
def leave_support_group(group_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(GroupMembershipDB).filter(GroupMembershipDB.group_id == group_id, GroupMembershipDB.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Left group", "joined": False}

@app.get("/api/peer/posts")
def list_peer_posts(category: str = "all", current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(PeerPostDB).filter((PeerPostDB.is_hidden == False) | (PeerPostDB.user_id == current_user.id))
    if category != "all":
        query = query.filter(PeerPostDB.category == category)
    return [_post_dict(p, db, current_user.id) for p in query.order_by(PeerPostDB.created_at.desc()).limit(100).all()]

@app.post("/api/peer/posts")
def create_peer_post(req: PeerPostRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    content = req.content.strip()
    if not content or len(content) > 2000:
        raise HTTPException(status_code=400, detail="Post must be between 1 and 2000 characters")
    nlp = _screen_content(db, current_user, content)
    held = nlp["risk_level"] in ("HIGH", "CRITICAL")
    post = PeerPostDB(
        id=str(uuid.uuid4()), user_id=current_user.id, author_name=current_user.name, is_anonymous=bool(req.is_anonymous),
        content=content, category=(req.category or "General")[:40], risk_level=nlp["risk_level"],
        is_hidden=held, hidden_reason="safety_review" if held else None,
    )
    db.add(post)
    db.commit()
    log_activity(db, current_user.id, current_user.name, "post_create", "Community post created" + (" (held for safety review)" if held else ""))
    return {"post": _post_dict(post, db, current_user.id), "held_for_review": held, "support": get_support_resources() if held else None}

@app.post("/api/peer/posts/{post_id}/like")
def toggle_post_like(post_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    post = _visible_post_or_404(db, post_id)
    existing = db.query(PostLikeDB).filter(PostLikeDB.post_id == post_id, PostLikeDB.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(PostLikeDB(id=str(uuid.uuid4()), post_id=post_id, user_id=current_user.id))
    db.commit()
    return _post_dict(post, db, current_user.id)

@app.get("/api/peer/posts/{post_id}/replies")
def list_post_replies(post_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    _visible_post_or_404(db, post_id)
    replies = db.query(PostReplyDB).filter(PostReplyDB.post_id == post_id).order_by(PostReplyDB.created_at.asc()).all()
    return [
        {"id": r.id, "author": "Anonymous Student" if r.is_anonymous else r.author_name, "content": r.content,
         "created_at": r.created_at, "is_mine": r.user_id == current_user.id}
        for r in replies
    ]

@app.post("/api/peer/posts/{post_id}/replies")
def create_post_reply(post_id: str, req: PeerReplyRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    _visible_post_or_404(db, post_id)
    content = req.content.strip()
    if not content or len(content) > 1000:
        raise HTTPException(status_code=400, detail="Reply must be between 1 and 1000 characters")
    nlp = _screen_content(db, current_user, content)
    if nlp["risk_level"] in ("HIGH", "CRITICAL"):
        db.commit()
        return {"reply": None, "held_for_review": True, "support": get_support_resources()}
    reply = PostReplyDB(id=str(uuid.uuid4()), post_id=post_id, user_id=current_user.id, author_name=current_user.name,
                        is_anonymous=bool(req.is_anonymous), content=content)
    db.add(reply)
    db.commit()
    return {
        "reply": {"id": reply.id, "author": "Anonymous Student" if reply.is_anonymous else reply.author_name,
                  "content": reply.content, "created_at": reply.created_at, "is_mine": True},
        "held_for_review": False, "support": None,
    }

@app.post("/api/peer/posts/{post_id}/report")
def report_post(post_id: str, req: PeerReportRequest, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    post = _visible_post_or_404(db, post_id)
    if not db.query(PostReportDB).filter(PostReportDB.post_id == post_id, PostReportDB.user_id == current_user.id).first():
        db.add(PostReportDB(id=str(uuid.uuid4()), post_id=post_id, user_id=current_user.id, reason=(req.reason or "")[:200]))
        db.commit()
    if db.query(PostReportDB).filter(PostReportDB.post_id == post_id).count() >= POST_REPORT_HIDE_THRESHOLD:
        post.is_hidden = True
        post.hidden_reason = "reported"
        db.commit()
    return {"message": "Thanks — a moderator will review this post."}

@app.delete("/api/peer/posts/{post_id}")
def delete_my_post(post_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(PeerPostDB).filter(PeerPostDB.id == post_id, PeerPostDB.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for model in (PostLikeDB, PostReplyDB, PostReportDB):
        db.query(model).filter(model.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}

@app.get("/api/peer/sessions")
def list_live_sessions(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    result = []
    for s in db.query(LiveSessionDB).all():
        start = _next_occurrence(s)
        date_str = start.date().isoformat()
        regs = db.query(SessionRegistrationDB).filter(SessionRegistrationDB.session_id == s.id, SessionRegistrationDB.session_date == date_str)
        result.append({
            "id": s.id, "title": s.title, "description": s.description, "starts_at": start,
            "duration_minutes": s.duration_minutes, "type": s.type, "facilitator": s.facilitator,
            "participants": regs.count(),
            "registered": regs.filter(SessionRegistrationDB.user_id == current_user.id).first() is not None,
        })
    return sorted(result, key=lambda x: x["starts_at"])

@app.post("/api/peer/sessions/{session_id}/register")
def toggle_session_registration(session_id: str, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LiveSessionDB).filter(LiveSessionDB.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    date_str = _next_occurrence(session).date().isoformat()
    existing = db.query(SessionRegistrationDB).filter(
        SessionRegistrationDB.session_id == session_id, SessionRegistrationDB.user_id == current_user.id,
        SessionRegistrationDB.session_date == date_str
    ).first()
    if existing:
        db.delete(existing)
    else:
        db.add(SessionRegistrationDB(id=str(uuid.uuid4()), session_id=session_id, user_id=current_user.id, session_date=date_str))
    db.commit()
    return {"registered": existing is None}

@app.get("/admin/peer/posts")
def admin_list_flagged_posts(current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    reported_ids = {r.post_id for r in db.query(PostReportDB).all()}
    posts = db.query(PeerPostDB).filter((PeerPostDB.is_hidden == True) | (PeerPostDB.id.in_(reported_ids))).order_by(PeerPostDB.created_at.desc()).all()
    return [
        {"id": p.id, "author": anonymous_id(p.user_id), "content": p.content, "category": p.category,
         "risk_level": p.risk_level, "is_hidden": p.is_hidden, "hidden_reason": p.hidden_reason, "created_at": p.created_at,
         "reports": db.query(PostReportDB).filter(PostReportDB.post_id == p.id).count()}
        for p in posts
    ]

@app.post("/admin/peer/posts/{post_id}/{action}")
def admin_moderate_post(post_id: str, action: str, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    post = db.query(PeerPostDB).filter(PeerPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if action == "hide":
        post.is_hidden, post.hidden_reason = True, "moderator"
    elif action == "restore":
        post.is_hidden, post.hidden_reason = False, None
        db.query(PostReportDB).filter(PostReportDB.post_id == post_id).delete()
    elif action == "delete":
        for model in (PostLikeDB, PostReplyDB, PostReportDB):
            db.query(model).filter(model.post_id == post_id).delete()
        db.delete(post)
    else:
        raise HTTPException(status_code=400, detail="Action must be hide, restore or delete")
    db.commit()
    log_activity(db, current_admin.id, current_admin.name, "admin_post_moderate", f"Admin {action} post {post_id[:8]}")
    return {"message": f"Post {action} done"}

# --- NOTIFICATIONS ---

@app.get("/api/notifications")
def get_notifications(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today = datetime.now().date().isoformat()
    items = []

    for b in db.query(BookingDB).filter(BookingDB.user_id == current_user.id, BookingDB.date >= today, BookingDB.status.in_(["pending", "confirmed"])).all():
        label = "confirmed" if b.status == "confirmed" else "awaiting confirmation"
        items.append({"id": f"booking-{b.id}-{b.status}", "type": "appointment", "link": "/booking", "created_at": b.updated_at or b.created_at,
                      "message": f"Session with {b.counselor_name} on {b.date} at {b.time_slot} ({label})"})
    for b in db.query(BookingDB).filter(BookingDB.user_id == current_user.id, BookingDB.status == "cancelled", BookingDB.updated_at >= now - timedelta(days=7)).all():
        items.append({"id": f"booking-{b.id}-cancelled", "type": "appointment", "link": "/booking", "created_at": b.updated_at,
                      "message": f"Your session with {b.counselor_name} on {b.date} was cancelled"})

    my_post_ids = [p.id for p in db.query(PeerPostDB.id).filter(PeerPostDB.user_id == current_user.id).all()]
    if my_post_ids:
        replies = db.query(PostReplyDB).filter(PostReplyDB.post_id.in_(my_post_ids), PostReplyDB.user_id != current_user.id,
                                               PostReplyDB.created_at >= now - timedelta(days=7)).all()
        if replies:
            latest = max(r.created_at for r in replies)
            items.append({"id": f"replies-{latest.isoformat()}", "type": "community", "link": "/peer-support", "created_at": latest,
                          "message": f"{len(replies)} new repl{'y' if len(replies) == 1 else 'ies'} to your community posts"})

    for s in db.query(LiveSessionDB).all():
        start = _next_occurrence(s)
        date_str = start.date().isoformat()
        if start - datetime.now() < timedelta(days=2) and db.query(SessionRegistrationDB).filter(
                SessionRegistrationDB.session_id == s.id, SessionRegistrationDB.user_id == current_user.id,
                SessionRegistrationDB.session_date == date_str).first():
            items.append({"id": f"session-{s.id}-{date_str}", "type": "community", "link": "/peer-support", "created_at": now,
                          "message": f"{s.title} starts {start.strftime('%a %d %b, %I:%M %p')}"})

    last_check = db.query(WellnessCheckDB).filter(WellnessCheckDB.user_id == current_user.id).order_by(WellnessCheckDB.created_at.desc()).first()
    if not last_check or last_check.created_at < now - timedelta(hours=20):
        items.append({"id": f"wellness-{today}", "type": "wellness", "link": "/wellness-check", "created_at": now,
                      "message": "Daily wellness check-in reminder — it takes about a minute"})

    return sorted(items, key=lambda n: n["created_at"], reverse=True)

# --- DOCTOR FINDER ---

@app.post("/api/doctor-finder")
async def doctor_finder(req: DoctorFinderRequest, current_user: UserDB = Depends(get_current_user)):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    nlp = analyze_nlp_and_safety(message)

    webhook = os.getenv("DOCTOR_FINDER_WEBHOOK_URL", "").strip()
    if webhook and nlp["risk_level"] not in ("HIGH", "CRITICAL"):
        try:
            payload = {"sessionId": req.session_id or current_user.id, "message": message, "location": req.location}
            data = await asyncio.to_thread(_post_json, webhook, payload, 45)
            if isinstance(data, dict) and (data.get("doctors") or data.get("output") or data.get("reply")):
                return {"source": "webhook", "doctors": data.get("doctors") or [], "reply": data.get("output") or data.get("reply") or "",
                        "search_links": [], "risk_level": nlp["risk_level"]}
        except Exception as err:
            print(f"Doctor finder webhook warning: {err}")

    from urllib.parse import quote_plus
    place = (req.location or "").strip() or "near me"
    needs_psychiatrist = any(k in message.lower() for k in ["medication", "medicine", "psychiatrist", "bipolar", "schizo", "hallucinat", "voices"])
    specialist = "psychiatrist" if needs_psychiatrist else "psychologist"
    search_links = [
        {"label": f"{specialist.title()} {place} — Google Maps", "url": f"https://www.google.com/maps/search/{quote_plus(specialist + ' ' + place)}"},
        {"label": f"Mental health clinic {place} — Google Maps", "url": f"https://www.google.com/maps/search/{quote_plus('mental health clinic ' + place)}"},
        {"label": "Tele-MANAS — free government tele-counselling (14416)", "url": "https://telemanas.mohfw.gov.in/"},
    ]

    if nlp["risk_level"] in ("HIGH", "CRITICAL"):
        reply = generate_ai_response(message, nlp)
    else:
        prompt = f"""A university student in India is looking for a mental health professional. Their message: "{message}". Location: "{req.location or 'not given'}".
In 4-6 short sentences: suggest which type of professional fits (counsellor, clinical psychologist, or psychiatrist) and why, what to ask when calling, and remind them that their campus counselling cell and Tele-MANAS (14416) are free options.
Do not invent names, phone numbers or addresses of specific doctors or clinics. Do not diagnose."""
        reply = None
        try:
            reply = await asyncio.wait_for(asyncio.to_thread(_call_gemini, prompt), timeout=15)
        except Exception as err:
            print(f"Doctor finder AI warning: {err}")
        if not reply:
            reply = (f"For what you've described, a {specialist} is a good place to start. "
                     "Use the map searches below to find clinics near you, and check reviews and registration before visiting. "
                     "You can also book a free session with a campus counsellor here, or call Tele-MANAS at 14416 for free tele-counselling.")
    return {"source": "guidance", "doctors": [], "reply": reply.strip(), "search_links": search_links, "risk_level": nlp["risk_level"]}

# --- ADMIN ANALYTICS, SAFETY & EXPORT ---

def _bucket(counts: dict, label: str):
    counts[label] = counts.get(label, 0) + 1

@app.get("/admin/analytics")
def admin_analytics(current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Aggregate, anonymous distribution of each student's most recent self-reported check-in."""
    latest_wellness = {}
    for w in db.query(WellnessCheckDB).order_by(WellnessCheckDB.created_at.asc()).all():
        latest_wellness[w.user_id] = w
    latest_mood = {}
    for m in db.query(MoodRecordDB).order_by(MoodRecordDB.created_at.asc()).all():
        latest_mood[m.user_id] = m

    overall, mood, anxiety, stress = {}, {}, {}, {}
    respondents = set(latest_wellness) | set(latest_mood)
    for user_id in respondents:
        w = latest_wellness.get(user_id)
        if w:
            r = json.loads(w.responses)
            score, mood_v, stress_v, anxiety_v = w.overall_score / 10, r["mood"], r["stress"], r["anxiety"]
        else:
            m = latest_mood[user_id]
            score, mood_v, stress_v, anxiety_v = (m.mood_score + (6 - m.stress_level)) / 2, m.mood_score, m.stress_level, None
        _bucket(overall, "Struggling (below 2)" if score < 2 else "Low (2–3)" if score < 3 else "Fair (3–4)" if score < 4 else "Good (4+)")
        _bucket(mood, "Low mood" if mood_v <= 2 else "Neutral mood" if mood_v == 3 else "Positive mood")
        _bucket(stress, "High stress" if stress_v >= 4 else "Moderate stress" if stress_v == 3 else "Low stress")
        if anxiety_v is not None:
            _bucket(anxiety, "High anxiety" if anxiety_v >= 4 else "Moderate anxiety" if anxiety_v == 3 else "Low anxiety")

    def as_list(counts: dict, order: List[str]):
        return [{"name": k, "value": counts.get(k, 0)} for k in order]

    since = (datetime.utcnow() - timedelta(days=13)).replace(hour=0, minute=0, second=0, microsecond=0)
    daily = {}
    for w in db.query(WellnessCheckDB).filter(WellnessCheckDB.created_at >= since).all():
        daily.setdefault(w.created_at.strftime("%b %d"), []).append(w.overall_score / 10)
    trend = []
    for i in range(14):
        day = (since + timedelta(days=i)).strftime("%b %d")
        scores = daily.get(day, [])
        trend.append({"date": day, "avg_score": round(sum(scores) / len(scores), 2) if scores else None, "checkins": len(scores)})

    return {
        "respondents": len(respondents),
        "overall": as_list(overall, ["Struggling (below 2)", "Low (2–3)", "Fair (3–4)", "Good (4+)"]),
        "mood": as_list(mood, ["Low mood", "Neutral mood", "Positive mood"]),
        "anxiety": as_list(anxiety, ["High anxiety", "Moderate anxiety", "Low anxiety"]),
        "stress": as_list(stress, ["High stress", "Moderate stress", "Low stress"]),
        "trend": trend,
    }

@app.get("/admin/safety-alerts")
def admin_safety_alerts(days: int = 7, current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    privacy = get_settings(db)["privacy_protection"]
    since = datetime.utcnow() - timedelta(days=min(max(days, 1), 90))
    alerts = db.query(SafetyAuditDB).filter(SafetyAuditDB.created_at >= since).order_by(SafetyAuditDB.created_at.desc()).limit(100).all()
    users = {u.id: u for u in db.query(UserDB).filter(UserDB.id.in_({a.user_id for a in alerts})).all()}
    result = []
    for a in alerts:
        u = users.get(a.user_id)
        result.append({
            "id": a.id, "risk_level": a.risk_level, "message_snippet": a.message_snippet,
            "flagged_keywords": json.loads(a.flagged_keywords or "[]"), "created_at": a.created_at,
            "student": anonymous_id(a.user_id) if privacy or not u else f"{u.name} <{u.email}>",
        })
    return result

@app.get("/admin/export")
def admin_export(current_admin: AdminDB = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Export platform data as JSON. Password hashes and chat transcripts are never exported;
    identities are pseudonymised while privacy protection is on."""
    privacy = get_settings(db)["privacy_protection"]

    users = []
    for u in db.query(UserDB).all():
        row = {"id": anonymous_id(u.id), "is_active": u.is_active, "created_at": u.created_at, "last_login": u.last_login}
        if not privacy:
            row.update({"name": u.name, "email": u.email})
        users.append(row)
    bookings = []
    for b in db.query(BookingDB).all():
        row = {k: v for k, v in _booking_dict(b).items() if not (privacy and k.startswith("contact_"))}
        row["student"] = anonymous_id(b.user_id)
        bookings.append(row)
    chat_counts = db.query(ChatMessageDB.user_id, func.count(ChatMessageDB.id)).filter(ChatMessageDB.sender == "user").group_by(ChatMessageDB.user_id).all()

    log_activity(db, current_admin.id, current_admin.name, "admin_export", f"Admin exported data (privacy {'on' if privacy else 'off'})")
    return {
        "exported_at": datetime.utcnow(),
        "privacy_protection": privacy,
        "users": users,
        "mood_records": [{"student": anonymous_id(m.user_id), "mood": m.mood, "mood_score": m.mood_score, "emotion": m.emotion,
                          "stress_level": m.stress_level, "sleep_quality": m.sleep_quality, "created_at": m.created_at}
                         for m in db.query(MoodRecordDB).all()],
        "wellness_checks": [{**_wellness_dict(w), "student": anonymous_id(w.user_id)} for w in db.query(WellnessCheckDB).all()],
        "bookings": bookings,
        "peer_posts": [{"id": p.id, "student": anonymous_id(p.user_id), "content": p.content, "category": p.category,
                        "risk_level": p.risk_level, "is_hidden": p.is_hidden, "created_at": p.created_at} for p in db.query(PeerPostDB).all()],
        "safety_alerts": [{"student": anonymous_id(a.user_id), "risk_level": a.risk_level,
                           "flagged_keywords": json.loads(a.flagged_keywords or "[]"), "created_at": a.created_at}
                          for a in db.query(SafetyAuditDB).all()],
        "chat_message_counts": {anonymous_id(uid): n for uid, n in chat_counts},
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)