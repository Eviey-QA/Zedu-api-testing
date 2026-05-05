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
- [CI Pipeline](#ci-pipeline)
- [Test File Descriptions](#test-file-descriptions)
- [Design Decisions](#design-decisions)

---

## Project Overview

This suite validates the Zedu REST API using **Vitest** and **Axios**, managed via **pnpm**.

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
zedu-api-testing/
│
├── .github/
│   └── workflows/
│       └── test_ci.yml     # GitHub Actions CI pipeline
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
├── reports/                # Generated test reports (gitignored)
│   └── results.xml         # JUnit XML report (produced by CI)
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## Prerequisites

| Requirement | Version  |
|-------------|----------|
| Node.js     | ≥ 18.0   |
| pnpm        | ≥ 9.0    |

> Install pnpm globally if you don't have it: `npm install -g pnpm`

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd zedu-api-testing
```

### 2. Install all dependencies

```bash
pnpm install
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
pnpm test

# Full suite with verbose output
pnpm run test:verbose

# Single file
pnpm run test:auth
pnpm run test:users
pnpm run test:roles

# Save JSON results report
pnpm run test:report
```

---

## Environment Variables

| Variable       | Required | Description                                   |
|----------------|----------|-----------------------------------------------|
| `APP_BASE_URL` | Yes      | API base URL                                  |

> In CI, `APP_BASE_URL` is injected automatically via a GitHub Actions repository secret (`secrets.APP_BASE_URL`).

---

## CI Pipeline

The project includes a GitHub Actions workflow at `.github/workflows/test_ci.yml`.

**Triggers:** every `push` and every `pull_request` to any branch.

**Pipeline steps:**

| Step | Description |
|------|-------------|
| Checkout | Checks out the repository |
| Install pnpm | Sets up pnpm via `pnpm/action-setup@v4` |
| Set up Node.js | Uses Node 20 with pnpm cache enabled |
| Install dependencies | Runs `pnpm install --frozen-lockfile` |
| Run tests | Runs the full suite with `--reporter=default` (console) and `--reporter=junit` (XML) simultaneously |
| Publish test summary | Renders a pass/fail table in the GitHub Actions UI via `mikepenz/action-junit-report@v4` — runs even if tests fail |
| Upload test report | Uploads `reports/results.xml` as a downloadable artifact — runs even if tests fail |

**Failure conditions:**
- Any test failure → pipeline fails (non-zero exit code from Vitest)
- No tests found or all tests skipped → pipeline fails (`require_tests: true` + `fail_on_failure: true`)

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
| **pnpm as package manager** | Faster installs, strict dependency resolution, and native support for `--frozen-lockfile` in CI. |
| **Nested Data Extraction** | `utils/auth.js` and `utils/schemas.js` use robust extraction (e.g., `body?.data?.user`) to handle the latest Zedu API response structure. |
| **Each test owns its setup** | Every test needing auth calls `registerUser()` + `loginUser()` from `utils/auth.js`. No test reads a token produced by another. |
| **`utils/auth.js` is the only auth source** | All registration, login, and header-building logic lives there. Test files never call `/auth/login` directly. |
| **Faker for dynamic data** | Generates fresh emails/usernames on every invocation, making tests idempotent. |
| **AJV for schema validation** | Enforces field presence and types in one call, covering multiple assertion categories simultaneously. |
| **`validateStatus: () => true`** | Prevents Axios from throwing on 4xx/5xx, allowing tests to assert on status explicitly. |
| **Vitest globals** | Enabled to allow familiar `describe`, `test`, and `expect` syntax without manual imports. |
| **Dual reporters in CI** | `--reporter=default` keeps logs human-readable; `--reporter=junit` produces structured XML for GitHub Actions UI summaries and artifact downloads. |
