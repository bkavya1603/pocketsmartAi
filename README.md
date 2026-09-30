# PocketSmart AI

PocketSmart is a beginner-friendly personal finance workspace for tracking income and expenses, planning monthly and category budgets, reviewing spending trends, and asking data-grounded questions. It uses React + Vite, FastAPI, SQLAlchemy, and SQLite. The AI chat works with local rules by default; an optional OpenAI key enables server-side generated answers.

## Project layout

```text
backend/
  app/
    database.py       SQLite engine and session dependency
    main.py           FastAPI routes, demo seed, analytics, and assistant
    models.py         Users, incomes, expenses, budgets, recommendations
    schemas.py        Validated API request models
    security.py       Password hashing, JWT creation, and auth guard
  tests/test_api.py   API auth, validation, CRUD, and privacy checks
  requirements.txt
  .env.example
frontend/
  src/PocketSmart.jsx React screens and finance workflows
  src/PocketSmart.css responsive design system
  src/main.jsx        Vite entry point
  .env.example
README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+
- npm

## Run on Windows

Open two PowerShell terminals from the project root.

### 1. Start the API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Before deployment, replace `SECRET_KEY` in `backend/.env` with a long random value. For local development, start the API with:

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

The API is at `http://127.0.0.1:8000`; interactive endpoint documentation is at `http://127.0.0.1:8000/docs`. SQLite creates `backend/pocketsmart.db` on first launch and seeds the demo account.

### 2. Start the frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. `VITE_API_URL` can point the frontend at another API origin. Restart Vite after changing a frontend environment variable.

## Demo data and accounts

The dashboard opens in a browser-local demo workspace with sample income, expenses, budgets, and five months of history. Demo edits persist in that browser and do not call the API.

To exercise the real API login, select **Sign in** and use:

```text
Email:    demo@pocketsmart.com
Password: PocketSmart123!
```

The API seeds this account and sample records at startup. You can also create a personal account from the sign-in screen; new accounts start with category budgets and no transactions.

## API overview

All finance and profile endpoints require `Authorization: Bearer <access_token>` after login/signup.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API status |
| `POST` | `/api/auth/signup` | Create an account and receive a token |
| `POST` | `/api/auth/login` | Sign in and receive a token |
| `GET`, `PUT` | `/api/auth/me` | Read or update the signed-in profile |
| `GET`, `POST` | `/api/transactions` | List/add income and expense records |
| `PUT`, `DELETE` | `/api/transactions/{type-id}` | Edit/remove a record, e.g. `expense-12` |
| `GET` | `/api/income`, `/api/expenses` | List one transaction type |
| `GET`, `PUT` | `/api/budgets` | Read/save monthly and category limits |
| `GET` | `/api/analytics` | Monthly totals, category totals, and six-month history |
| `GET`, `POST` | `/api/recommendations`, `/api/recommendations/generate` | Read or regenerate saved insights |
| `GET` | `/api/notifications` | Budget, category, and balance alerts |
| `POST` | `/api/assistant/chat` | Ask a question using the account's finance data |

Income and expenses are separate tables and are presented together by the transactions API. Each query is scoped to the user decoded from the signed JWT; clients cannot select another user's ID. Passwords are salted PBKDF2 hashes, and API inputs reject invalid amounts and malformed account data.

## AI configuration

The assistant works without an external key using local, deterministic answers from the signed-in user's records. To enable OpenAI-generated wording, add `OPENAI_API_KEY` to `backend/.env` and optionally set `OPENAI_MODEL`. The key is only read by FastAPI and is never included in the frontend bundle. Answers are restricted to spending insights and budgeting support; they must not be treated as investment advice or promises of returns.

Example backend environment:

```dotenv
DATABASE_URL=sqlite:///./pocketsmart.db
SECRET_KEY=use-a-long-random-secret-here
ACCESS_TOKEN_MINUTES=1440
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Generate a local secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Testing

From `backend` with the virtual environment installed:

```powershell
.\.venv\Scripts\python -m unittest discover -s tests -v
```

From `frontend`:

```powershell
npm run build
```

The API tests use a temporary in-memory SQLite database and cover sign-up, authenticated transaction creation, negative-value validation, budget updates, and isolation between two users.

## Deployment notes

Build the frontend with `npm run build` in `frontend` and publish `frontend/dist` to a static host. Deploy the FastAPI app as an ASGI service with `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from `backend`. Set `VITE_API_URL` to the deployed API before building, and set `FRONTEND_ORIGINS` to the exact deployed frontend origin.

SQLite is suitable for local development and a single-instance demonstration. For a public multi-instance deployment, use PostgreSQL, persistent managed storage, HTTPS, a strong unique `SECRET_KEY`, backups, database migrations, and request rate limits. Never commit `.env` files or expose AI credentials in client code.git