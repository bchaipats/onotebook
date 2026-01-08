# CLAUDE.md

Project guidelines and best practices for this codebase.

## Project Structure

Use domain-driven organization rather than grouping by file type:

```
src/
├── <domain>/           # e.g., auth, posts, payments
│   ├── router.py       # API endpoints
│   ├── schemas.py      # Request/response models
│   ├── models.py       # Database models
│   ├── service.py      # Business logic
│   ├── dependencies.py # Route dependencies
│   ├── config.py       # Domain-specific config
│   ├── constants.py    # Domain constants/error codes
│   ├── exceptions.py   # Domain-specific exceptions
│   └── utils.py        # Helper functions
├── config.py           # Global configuration
├── database.py         # DB connection setup
└── main.py             # Application entrypoint
```

Import across domains explicitly:
```python
from src.auth import constants as auth_constants
from src.notifications import service as notification_service
```

## Async/Concurrency

- Never block async functions with synchronous I/O operations
- Sync route handlers run in a threadpool automatically; async handlers do not
- For sync SDK calls in async context, run in threadpool explicitly
- CPU-intensive tasks belong in separate worker processes, not threads (due to GIL)

## Data Validation

- Use schema validation extensively with built-in validators (regex, enums, length constraints, email validation)
- Create a custom base model to standardize serialization (e.g., datetime formats)
- Raise `ValueError` in validators for user-friendly error responses
- Split configuration settings by domain rather than one monolithic config class

## Dependency Injection

- Use dependencies for validation beyond schema validation (DB lookups, permissions, external checks)
- Chain dependencies to avoid code repetition
- Dependencies are cached per request - reuse them freely
- Prefer async dependencies over sync to avoid threadpool overhead

## REST API Design

- Use consistent path variable names to enable dependency reuse across routes
- Document response models, status codes, and descriptions
- Hide API documentation in production environments

## Database

- Use explicit naming conventions for indexes/constraints
- Prefer SQL for complex joins and data manipulation over application code
- Use migrations with descriptive names and timestamps (e.g., `2024-01-15_add_user_email_idx.py`)

Table naming conventions:
- `lower_case_snake`, singular form
- Group related tables with prefixes (e.g., `payment_account`, `payment_bill`)
- Use `_at` suffix for datetime, `_date` suffix for date columns

## Testing

- Use async test client from day one to avoid event loop issues
- Structure tests to mirror the domain organization

## Code Quality

- Use automated formatting (ruff or similar)
- Run linting as part of CI/pre-commit hooks
