---
name: pre-write-validation
description: Validates code before writing to ensure it follows FastAPI best practices
event: PreToolUse
matchTools:
  - Write
  - Edit
---

# Pre-Write Validation Hook

Before writing Python code to FastAPI projects, verify:

## Automatic Checks

### 1. File Naming
If writing to models/, services/, repositories/:
- Model files: Must be PascalCase (`User.py`, not `user.py`)
- Service files: Must end with `Service.py` (`UserService.py`)
- Repository files: Must end with `Repository.py` (`UserRepository.py`)

### 2. Import Verification
Before including any import:
- Verify the module exists
- Check the import path is correct
- Ensure no circular imports

### 3. Type Hints
All functions must have:
- Parameter type hints
- Return type hints
- Use `| None` not `Optional` for Python 3.10+

### 4. Pydantic Patterns
When writing Pydantic models:
- Use `ConfigDict(from_attributes=True)` not `class Config: orm_mode = True`
- Use `Field()` for validation constraints
- Separate Create/Update/Response schemas

### 5. Async Patterns
When writing async code:
- No blocking calls (`time.sleep`, `requests.get`)
- Use `await` with all async functions
- Proper session handling with context managers

## Validation Message

If any check fails, output:

```
⚠️ VALIDATION WARNING
- Issue: [description]
- Location: [file:line]
- Fix: [how to fix]

Proceeding with write, but please review.
```
