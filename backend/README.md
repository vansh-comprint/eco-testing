# EcoTribe API

FastAPI-based backend for EcoTribe B2B IT Asset Lifecycle Management Platform.

## Architecture

This API follows a clean, layered architecture:

- **Models** (`/app/models/`) - SQLAlchemy ORM models
- **Schemas** (`/app/schemas/`) - Pydantic request/response schemas
- **Repositories** (`/app/repositories/`) - Data access layer
- **Services** (`/app/services/`) - Business logic layer
- **Controllers** (`/app/api/`) - API endpoint handlers
- **Middleware** (`/app/middleware/`) - Authentication, logging, error handling

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Poetry

### Installation

```bash
# Install dependencies
poetry install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
poetry run alembic upgrade head

# Start development server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Database Migrations

```bash
# Create a new migration
poetry run alembic revision --autogenerate -m "description"

# Apply migrations
poetry run alembic upgrade head

# Rollback migration
poetry run alembic downgrade -1
```

## API Documentation

Once the server is running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test file
poetry run pytest tests/test_auth.py
```

## Code Quality

```bash
# Format code
poetry run black app/

# Lint code
poetry run ruff check app/

# Type checking
poetry run mypy app/
```

## Project Structure

```
backend/
├── app/
│   ├── api/              # API endpoints (controllers)
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── enterprises.py
│   │       ├── branches.py
│   │       ├── assets.py
│   │       ├── batches.py
│   │       ├── submissions.py
│   │       ├── reviews.py
│   │       ├── logistics.py
│   │       └── payouts.py
│   ├── core/             # Core configuration
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── middleware/       # Custom middleware
│   │   ├── auth.py
│   │   ├── logging.py
│   │   └── error_handler.py
│   ├── models/           # SQLAlchemy models
│   ├── repositories/     # Data access layer
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   │   ├── response.py
│   │   ├── pagination.py
│   │   └── validators.py
│   └── main.py           # Application entry point
├── alembic/              # Database migrations
├── tests/                # Test suite
├── logs/                 # Application logs
├── pyproject.toml        # Poetry configuration
└── README.md
```

## Environment Variables

See `.env.example` for all available configuration options.

## Quick Reference

### Demo Accounts (after running `scripts/init_db.py`)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@ecotribe.io | password123 |
| OPS Admin | admin@ecotribe.io | password123 |
| Org Admin | orgadmin@techcorp.com | password123 |
| IT Admin | it@techcorp.com | password123 |

### Key Documents

- **[QUICK_START.md](../docs/backend/QUICK_START.md)** - Step-by-step setup guide
- **[MIGRATION_GUIDE.md](../docs/backend/MIGRATION_GUIDE.md)** - Architecture and migration details
- **[MIGRATION_SUMMARY.md](../docs/backend/MIGRATION_SUMMARY.md)** - Implementation status
- **[IMPLEMENTATION_CHECKLIST.md](../docs/backend/IMPLEMENTATION_CHECKLIST.md)** - Remaining tasks

### API Response Format

All endpoints return:
```json
{
  "code": 200,
  "data": {...},
  "message": "Success message",
  "pagination": {...}
}
```

### Authentication

```bash
# Login
POST /api/v1/auth/login
{"email": "admin@ecotribe.io", "password": "password123"}

# Use token
Authorization: Bearer <access_token>
```

## License

Proprietary - EcoTribe

