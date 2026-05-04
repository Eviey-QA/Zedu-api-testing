# Zedu API Test Suite — JavaScript (Vitest)

Automated test suite for the [Zedu](https://zedu.chat/) staging API.  
**Base URL:** `https://api.staging.zedu.chat/api/v1`

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Tests](#running-the-tests)
- [Test File Descriptions](#test-file-descriptions)
- [Design Decisions](#design-decisions)

---

## Project Overview

This suite validates the Zedu REST API using **Vitest** and **Axios**, managed via **npm**.

It covers registration, login, logout, user profiles, and cross-cutting
authorisation enforcement.

Every test is fully **independent** — no test depends on another having run first.  
Every test validates all **six mandatory assertion categories**:

| # | Category | How it's enforced |
|---|---|---|
| 1 | Status code | `expect(res.status).toBe(...)` |
| 2 | Field presence | `expect(body).toHaveProperty(...)` / `hasErrorMessage(body)` |
| 3 | Data types | `expect(typeof value).toBe(...)` |
| 4 | Field values | `expect(value).toBe(expected)` |
| 5 | Error messages | `expect(hasErrorMessage(body)).toBe(true)` + non-empty check |
| 6 | Schema validation | `validate(body, schemaName)` via AJV |

---

## Project Structure

```
zedu_api_tests_js/
│
├── tests/
│   ├── auth.test.js        # Registration, Login, Logout, Password management
│   ├── roles.test.js       # Organisation roles management
│   └── users.test.js       # User profile and status tests
│
├── utils/
│   ├── auth.js     # registerUser(), loginUser(), header builders
│   └── schemas.js  # AJV schemas + validate(), hasErrorMessage(), extractProfile()
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Prerequisites

| Requirement | Version  |
|-------------|----------|
| Node.js     | ≥ 18.0   |
| npm         | ≥ 9.0    |

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd zedu_api_tests_js
```

### 2. Install all dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
APP_BASE_URL=https://api.staging.zedu.chat/api/v1
```

> `.env` is listed in `.gitignore` and must **never** be committed to Git.

---

## Running the Tests

```bash
# Full suite
npm test

# Full suite with verbose output
npm run test:verbose

# Single file
npm run test:auth
npm run test:users
npm run test:roles

# Save JSON results report
npm run test:report
```

---

## Environment Variables

| Variable       | Required | Description                                   |
|----------------|----------|-----------------------------------------------|
| `APP_BASE_URL` | Yes      | API base URL                                  |

---

## Test File Descriptions

### `tests/auth.test.js` (106 assertions)
Comprehensive coverage for `/auth/register`, `/auth/login`, `/auth/logout`, and password management.
- **Registration**: Validates the new nested response structure (`data.user`), unique field constraints, and field validation.
- **Login**: Token extraction from nested payloads and credential validation.
- **Logout**: Token invalidation and secure session termination.
- **Password Management**: Changing password and ensuring new credentials work immediately.

### `tests/users.test.js` (46 assertions)
Covers user-specific endpoints like `GET /users/me` and status updates.
- **Profile Access**: Validates schema and value consistency for authenticated users.
- **Status Updates**: Tests for emoji validation and robustness against empty payloads.
- **User Deletion**: Ensures users can be deleted securely and correctly.

### `tests/roles.test.js` (43 assertions)
Covers organisation role management.
- **Role Creation**: Validates unique names, descriptions, and organisation constraints.
- **Negative Testing**: Rejects numeric-only names or duplicate roles.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **Nested Data Extraction** | `utils/auth.js` and `utils/schemas.js` use robust extraction (e.g., `body?.data?.user`) to handle the latest Zedu API response structure. |
| **Each test owns its setup** | Every test needing auth calls `registerUser()` + `loginUser()` from `utils/auth.js`. No test reads a token produced by another. |
| **`utils/auth.js` is the only auth source** | All registration, login, and header-building logic lives there. Test files never call `/auth/login` directly. |
| **Faker for dynamic data** | Generates fresh emails/usernames on every invocation, making tests idempotent. |
| **AJV for schema validation** | Enforces field presence and types in one call, covering multiple assertion categories simultaneously. |
| **`validateStatus: () => true`** | Prevents Axios from throwing on 4xx/5xx, allowing tests to assert on status explicitly. |
| **Vitest globals** | Enabled to allow familiar `describe`, `test`, and `expect` syntax without manual imports. |
