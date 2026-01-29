# EcoTribe API Tests

Comprehensive test suite for the EcoTribe API using pytest.

## Setup

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **Create test database:**
   ```bash
   createdb ecotribe_test
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql+asyncpg://user:password@localhost/ecotribe_test"
   ```

## Running Tests

### Run all tests
```bash
poetry run pytest
```

### Run with coverage
```bash
poetry run pytest --cov=app --cov-report=html
```

### Run specific test file
```bash
poetry run pytest tests/test_auth.py
```

### Run specific test
```bash
poetry run pytest tests/test_auth.py::test_login_success
```

### Run tests by marker
```bash
# Run only unit tests
poetry run pytest -m unit

# Skip slow tests
poetry run pytest -m "not slow"
```

### Verbose output
```bash
poetry run pytest -v
```

### Stop on first failure
```bash
poetry run pytest -x
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Fixtures and test configuration
├── test_auth.py          # Authentication tests
├── test_enterprises.py   # Enterprise CRUD tests
├── test_assets.py        # Asset management tests
├── test_batches.py       # Batch workflow tests
├── test_submissions.py   # Submission tests
├── test_reviews.py       # Review tests
├── test_pickups.py       # Pickup tests
└── test_permissions.py   # Permission/RBAC tests
```

## Fixtures

### Database Fixtures
- `db_session` - Fresh database session for each test
- `client` - HTTP test client with database override

### User Fixtures
- `super_admin_user` - Super admin user
- `ops_admin_user` - OPS admin user
- `org_admin_user` - Org admin user
- `it_admin_user` - IT admin user
- `employee_user` - Employee user

### Auth Header Fixtures
- `super_admin_headers` - Auth headers for super admin
- `ops_admin_headers` - Auth headers for OPS admin
- `org_admin_headers` - Auth headers for org admin
- `it_admin_headers` - Auth headers for IT admin
- `employee_headers` - Auth headers for employee

### Entity Fixtures
- `test_enterprise` - Test enterprise
- `test_branch` - Test branch

## Writing Tests

### Example Test
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_example(client: AsyncClient, it_admin_headers: dict):
    """Test description."""
    response = await client.get("/api/v1/assets", headers=it_admin_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
```

### Testing Permissions
```python
@pytest.mark.asyncio
async def test_forbidden_access(client: AsyncClient, employee_headers: dict):
    """Test that employee cannot access admin endpoint."""
    response = await client.get("/api/v1/enterprises", headers=employee_headers)
    
    assert response.status_code == 403
```

## Coverage

View coverage report:
```bash
poetry run pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## CI/CD

Tests are automatically run on:
- Pull requests
- Commits to main branch
- Before deployment

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running
- Verify DATABASE_URL is correct
- Check test database exists

### Import errors
- Run `poetry install` to install dependencies
- Ensure you're in the backend directory

### Async warnings
- All async tests should use `@pytest.mark.asyncio` decorator
- Use `pytest-asyncio` for async fixtures

