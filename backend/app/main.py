import os
import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Budget, Expense, Income, Recommendation, User
from .schemas import ChatInput, Credentials, ProfileUpdate, SignUp, TransactionInput
from .security import create_access_token, get_current_user, hash_password, verify_password


app = FastAPI(title="PocketSmart AI API", version="1.0.0", description="Private personal finance and spending insights API.")
origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

CATEGORIES = ["Food", "Transport", "Education", "Shopping", "Bills", "Entertainment", "Healthcare", "Others"]
DEFAULT_BUDGETS = {"monthly": 42000, "Food": 9000, "Transport": 5000, "Education": 5000, "Shopping": 5500, "Bills": 6500, "Entertainment": 3500, "Healthcare": 3000, "Others": 2500}
DEMO_EMAIL = "demo@pocketsmart.com"
DEMO_PASSWORD = "PocketSmart123!"


@app.on_event("startup")
def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_account(db)
    finally:
        db.close()


def seed_demo_account(db: Session) -> None:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user:
        month_start = date.today().replace(day=1)
        history_exists = db.query(Income.id).filter(Income.user_id == user.id, Income.date < month_start).first() or db.query(Expense.id).filter(Expense.user_id == user.id, Expense.date < month_start).first()
        if not history_exists:
            add_demo_history(db, user.id)
        return
    legacy_demo_user = db.query(User).filter(User.email == "demo@pocketsmart.local").first()
    if legacy_demo_user:
        legacy_demo_user.email = DEMO_EMAIL
        add_demo_history(db, legacy_demo_user.id)
        db.commit()
        return
    user = User(name="Aarav Mehta", email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD))
    db.add(user)
    db.flush()
    for category, amount in DEFAULT_BUDGETS.items():
        db.add(Budget(user_id=user.id, category=category, amount=amount))
    demo_rows = [
        ("Income", "Salary", "Monthly salary", 62000, 2), ("Income", "Freelance", "Brand design project", 8500, 8),
        ("Expense", "Food", "Groceries & market", 4820, 1), ("Expense", "Bills", "Electricity and internet", 2650, 3),
        ("Expense", "Transport", "Metro pass", 1450, 4), ("Expense", "Shopping", "New running shoes", 3890, 6),
        ("Expense", "Food", "Dinner with friends", 1650, 9), ("Expense", "Education", "Online course", 2200, 12),
        ("Expense", "Entertainment", "Cinema tickets", 960, 14), ("Expense", "Healthcare", "Pharmacy", 740, 17),
        ("Expense", "Transport", "Cab rides", 1180, 20), ("Expense", "Food", "Weekly groceries", 3170, 23),
    ]
    for kind, category, description, amount, days_ago in demo_rows:
        record = Income if kind == "Income" else Expense
        db.add(record(user_id=user.id, category=category, description=description, amount=amount, date=date.today() - timedelta(days=days_ago)))
    add_demo_history(db, user.id)
    db.commit()


def add_demo_history(db: Session, user_id: int) -> None:
    today = date.today().replace(day=1)
    categories = ["Food", "Bills", "Transport", "Shopping", "Education"]
    for months_ago in range(1, 6):
        month_index = today.month - months_ago
        year = today.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        last_day = calendar.monthrange(year, month_index)[1]
        salary_day = date(year, month_index, min(2, last_day))
        spending_day = date(year, month_index, min(18, last_day))
        db.add(Income(user_id=user_id, category="Salary", description="Monthly salary", amount=60000 + months_ago * 1200, date=salary_day))
        db.add(Expense(user_id=user_id, category=categories[months_ago - 1], description="Monthly spending", amount=28500 + months_ago * 950, date=spending_day))
    db.commit()


def token_response(user: User) -> dict[str, Any]:
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "id": user.id, "name": user.name, "email": user.email}


def serialize_transaction(record: Income | Expense, kind: str) -> dict[str, Any]:
    return {"id": f"{kind.lower()}-{record.id}", "type": kind, "category": record.category, "description": record.description, "amount": float(record.amount), "date": record.date.isoformat()}


def user_transactions(db: Session, user_id: int, kind: str | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if kind in (None, "Income"):
        rows.extend(serialize_transaction(record, "Income") for record in db.query(Income).filter(Income.user_id == user_id).all())
    if kind in (None, "Expense"):
        rows.extend(serialize_transaction(record, "Expense") for record in db.query(Expense).filter(Expense.user_id == user_id).all())
    return sorted(rows, key=lambda row: (row["date"], row["id"]), reverse=True)


def parse_transaction_id(transaction_id: str) -> tuple[type[Income] | type[Expense], int]:
    try:
        prefix, raw_id = transaction_id.split("-", maxsplit=1)
        model = {"income": Income, "expense": Expense}[prefix.lower()]
        return model, int(raw_id)
    except (ValueError, KeyError):
        raise HTTPException(status_code=404, detail="Transaction not found.")


def user_budgets(db: Session, user_id: int) -> dict[str, float]:
    result = dict(DEFAULT_BUDGETS)
    for row in db.query(Budget).filter(Budget.user_id == user_id).all():
        key = "monthly" if row.category.lower() == "monthly" else row.category
        result[key] = float(row.amount)
    return result


def finance_summary(db: Session, user_id: int) -> dict[str, Any]:
    tx = user_transactions(db, user_id)
    current_month = date.today().strftime("%Y-%m")
    month_tx = [row for row in tx if row["date"].startswith(current_month)]
    income_rows = [row for row in month_tx if row["type"] == "Income"]
    expense_rows = [row for row in month_tx if row["type"] == "Expense"]
    grouped: dict[str, float] = defaultdict(float)
    for row in expense_rows:
        grouped[row["category"]] += row["amount"]
    total_income = sum(row["amount"] for row in income_rows)
    total_expenses = sum(row["amount"] for row in expense_rows)
    return {
        "transactions": tx,
        "income": income_rows,
        "expenses": expense_rows,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "by_category": dict(grouped),
        "budgets": user_budgets(db, user_id),
    }


def recommendation_items(summary: dict[str, Any]) -> list[dict[str, str]]:
    categories = summary["by_category"]
    total_expenses = summary["total_expenses"]
    balance = summary["balance"]
    budgets = summary["budgets"]
    items = []
    if categories:
        top_category = max(categories, key=categories.get)
        amount = categories[top_category]
        share = round(amount / total_expenses * 100) if total_expenses else 0
        items.append({"type": "SPENDING PATTERN", "title": f"{top_category} is your top category", "text": f"{amount:,.0f} is recorded in {top_category}, about {share}% of your expenses. Review the smaller purchases here for any easy-to-adjust costs."})
        if amount > budgets.get(top_category, 0):
            items.append({"type": "BUDGET CHECK-IN", "title": f"{top_category} is above its limit", "text": f"Recorded {amount:,.0f} against a {budgets.get(top_category, 0):,.0f} category limit. Consider adjusting next month's plan or reviewing a flexible expense."})
    if summary["total_income"]:
        suggested = round(max(0, balance) * .2 / 500) * 500
        detail = f"A possible starting target is {suggested:,.0f}, based on your current recorded balance of {balance:,.0f}. Adjust to what feels realistic."
        items.append({"type": "SAVINGS IDEA", "title": "Choose a comfortable savings target", "text": detail})
    items.append({"type": "MONTHLY REFLECTION", "title": "Keep your money picture current", "text": f"You've recorded {len(summary['income'])} income entries and {len(summary['expenses'])} expenses. Your recorded balance is {balance:,.0f}."})
    return items


def local_answer(question: str, summary: dict[str, Any]) -> str:
    lower = question.lower()
    categories = summary["by_category"]
    if "food" in lower:
        amount = categories.get("Food", 0)
        return f"You've recorded ₹{amount:,.0f} in Food expenses. This answer uses the transactions saved in your account."
    if any(word in lower for word in ("most", "category", "where")):
        if not categories:
            return "There are no expense entries yet. Add a few transactions and I can spot your biggest category."
        top = max(categories, key=categories.get)
        total = summary["total_expenses"]
        share = round(categories[top] / total * 100) if total else 0
        return f"Your biggest recorded expense category is {top} at ₹{categories[top]:,.0f} ({share}% of expenses). You could browse those transactions for any easy-to-adjust costs."
    if any(word in lower for word in ("save", "savings", "budget plan")):
        balance = summary["balance"]
        suggested = round(max(0, balance) * .2 / 500) * 500
        return f"Your recorded income is ₹{summary['total_income']:,.0f} and expenses are ₹{summary['total_expenses']:,.0f}, leaving ₹{balance:,.0f}. A gentle starting point could be ₹{suggested:,.0f}, if that fits your needs. Your monthly budget is ₹{summary['budgets']['monthly']:,.0f}. This is a spending summary, not financial advice."
    if any(word in lower for word in ("increase", "increased", "why")):
        if categories:
            top = max(categories, key=categories.get)
            return f"{top} is your largest recorded expense at ₹{categories[top]:,.0f}. I can only see the transactions entered here, so compare recent entries in that category with your usual month to understand what changed."
        return "I need more expense history to compare what may have changed. Add recent transactions and I can help you look for a pattern."
    if any(word in lower for word in ("reduce", "lower", "cut")):
        if categories:
            top = max(categories, key=categories.get)
            return f"Start by reviewing {top}, your largest category at ₹{categories[top]:,.0f}. Look for one repeat cost or optional purchase you could adjust, then see whether that change still feels comfortable."
        return "Start by recording a few expenses. Then we can find a category to review together."
    return f"Your recorded balance is ₹{summary['balance']:,.0f}, from ₹{summary['total_income']:,.0f} income and ₹{summary['total_expenses']:,.0f} expenses. Ask me about a category, your savings, or a simple budget plan."


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "PocketSmart AI API"}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignUp, db: Session = Depends(get_db)) -> dict[str, Any]:
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    db.add_all([Budget(user_id=user.id, category=category, amount=amount) for category, amount in DEFAULT_BUDGETS.items()])
    db.commit()
    db.refresh(user)
    return token_response(user)


@app.post("/api/auth/login")
def login(payload: Credentials, db: Session = Depends(get_db)) -> dict[str, Any]:
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return token_response(user)


@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {"id": user.id, "name": user.name, "email": user.email}


@app.put("/api/auth/me")
def update_me(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    user.name = payload.name
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email}


@app.get("/api/transactions")
def list_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return user_transactions(db, user.id)


@app.post("/api/transactions", status_code=status.HTTP_201_CREATED)
def add_transaction(payload: TransactionInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    model = Income if payload.type == "Income" else Expense
    record = model(user_id=user.id, amount=payload.amount, category=payload.category, description=payload.description, date=payload.date)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_transaction(record, payload.type)


@app.put("/api/transactions/{transaction_id}")
def edit_transaction(transaction_id: str, payload: TransactionInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    model, record_id = parse_transaction_id(transaction_id)
    existing = db.query(model).filter(model.id == record_id, model.user_id == user.id).first()
    if existing is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    desired_model = Income if payload.type == "Income" else Expense
    if desired_model is not model:
        db.delete(existing)
        db.flush()
        existing = desired_model(user_id=user.id)
        db.add(existing)
    existing.amount = payload.amount
    existing.category = payload.category
    existing.description = payload.description
    existing.date = payload.date
    db.commit()
    db.refresh(existing)
    return serialize_transaction(existing, payload.type)


@app.delete("/api/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_transaction(transaction_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    model, record_id = parse_transaction_id(transaction_id)
    existing = db.query(model).filter(model.id == record_id, model.user_id == user.id).first()
    if existing is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    db.delete(existing)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/income")
def list_income(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return user_transactions(db, user.id, "Income")


@app.get("/api/expenses")
def list_expenses(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return user_transactions(db, user.id, "Expense")


@app.get("/api/budgets")
def get_budgets(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, float]:
    return user_budgets(db, user.id)


@app.put("/api/budgets")
def put_budgets(payload: dict[str, float], db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, float]:
    if not payload or any(key not in DEFAULT_BUDGETS for key in payload) or any(not isinstance(amount, (int, float)) or amount < 0 or amount > 999999999 for amount in payload.values()):
        raise HTTPException(status_code=422, detail="Budget amounts must be zero or greater.")
    for key, amount in payload.items():
        category = "Monthly" if key.lower() == "monthly" else key
        existing = db.query(Budget).filter(Budget.user_id == user.id, Budget.category == category).first()
        if existing:
            existing.amount = amount
        else:
            db.add(Budget(user_id=user.id, category=category, amount=amount))
    db.commit()
    return user_budgets(db, user.id)


@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    summary = finance_summary(db, user.id)
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0, "expenses": 0})
    for row in summary["transactions"]:
        month_key = row["date"][:7]
        field = "income" if row["type"] == "Income" else "expenses"
        monthly[month_key][field] += row["amount"]
    months = []
    month_start = date.today().replace(day=1)
    for offset in range(5, -1, -1):
        year = month_start.year
        month = month_start.month - offset
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year:04d}-{month:02d}"
        values = monthly.get(key, {"income": 0, "expenses": 0})
        months.append({"month": key, **values, "savings": values["income"] - values["expenses"]})
    return {
        "total_income": summary["total_income"], "total_expenses": summary["total_expenses"], "balance": summary["balance"],
        "by_category": summary["by_category"], "monthly": months, "budgets": summary["budgets"],
    }


@app.get("/api/recommendations")
def get_recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return [{"id": row.id, "type": row.kind, "title": row.title, "text": row.body, "created_at": row.created_at} for row in db.query(Recommendation).filter(Recommendation.user_id == user.id).order_by(Recommendation.id.desc()).limit(20).all()]


@app.post("/api/recommendations/generate")
def generate_recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, str]]:
    items = recommendation_items(finance_summary(db, user.id))
    db.query(Recommendation).filter(Recommendation.user_id == user.id).delete()
    db.add_all([Recommendation(user_id=user.id, title=item["title"], body=item["text"], kind=item["type"]) for item in items])
    db.commit()
    return items


@app.get("/api/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, str]]:
    summary = finance_summary(db, user.id)
    alerts = []
    monthly_budget = summary["budgets"]["monthly"]
    ratio = summary["total_expenses"] / monthly_budget if monthly_budget else 0
    if ratio >= 1:
        alerts.append({"type": "budget_exceeded", "message": "Your recorded spending is above your monthly budget."})
    elif ratio >= .8:
        alerts.append({"type": "budget_approaching", "message": "Your monthly budget is getting close to its limit."})
    for category, amount in summary["by_category"].items():
        if amount > summary["budgets"].get(category, float("inf")):
            alerts.append({"type": "category_over_budget", "message": f"{category} spending is above its category budget."})
    if summary["total_income"] and summary["balance"] < summary["total_income"] * .1:
        alerts.append({"type": "low_balance", "message": "Your remaining balance is less than 10% of recorded income."})
    if not alerts:
        alerts.append({"type": "on_track", "message": "You are currently within your recorded monthly budget."})
    return alerts


@app.post("/api/assistant/chat")
async def chat(payload: ChatInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    summary = finance_summary(db, user.id)
    answer = local_answer(payload.question.strip(), summary)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": "You are PocketSmart, a friendly personal spending assistant. Answer only using the user's supplied financial context. Do not give investment advice, promise returns, or invent missing data. Keep answers brief, non-judgmental, and educational. If the data is insufficient, say so."},
                    {"role": "user", "content": f"Financial context: {summary}\nQuestion: {payload.question}"},
                ],
                max_tokens=250,
            )
            answer = response.choices[0].message.content or answer
        except Exception:
            pass
    return {"answer": answer}