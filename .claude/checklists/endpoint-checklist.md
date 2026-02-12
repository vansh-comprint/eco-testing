# Endpoint Development Checklist

Use this checklist before marking any endpoint as complete.

## Before Writing

- [ ] Understand the requirement completely
- [ ] Identify required authentication level
- [ ] Design request/response schemas
- [ ] Plan error scenarios

## Implementation

### Schema Layer
- [ ] Create/Update/Response schemas defined
- [ ] All fields have type hints
- [ ] Validation constraints added (min/max length, etc.)
- [ ] `ConfigDict(from_attributes=True)` for response schemas
- [ ] Examples in schema_extra

### Service Layer
- [ ] Business logic in service, not endpoint
- [ ] Input validation before database operations
- [ ] Proper exceptions raised (ValidationError, NotFoundError)
- [ ] Logging added for key operations

### Repository Layer
- [ ] CRUD operations implemented
- [ ] Parameterized queries only
- [ ] Proper error handling

### Endpoint Layer
- [ ] HTTP method is appropriate (GET/POST/PUT/DELETE)
- [ ] Status codes are correct (200, 201, 204, 400, 401, 404, 422)
- [ ] Dependency injection used
- [ ] Response model defined
- [ ] OpenAPI documentation (summary, description)
- [ ] Standardized response format used

## Security

- [ ] Authentication required (unless intentionally public)
- [ ] Authorization checked (user can access resource)
- [ ] Input sanitized via Pydantic
- [ ] Sensitive data not exposed in response
- [ ] Rate limiting considered

## Error Handling

- [ ] All expected errors caught
- [ ] Meaningful error messages returned
- [ ] No internal details leaked
- [ ] Proper HTTP status codes

## Testing

- [ ] Happy path tested
- [ ] Error paths tested
- [ ] Edge cases tested
- [ ] Authentication tested

## Final Verification

- [ ] Code follows project patterns
- [ ] No linting errors
- [ ] Type hints complete
- [ ] Documentation updated
