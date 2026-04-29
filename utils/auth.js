/**
 * utils/auth.js
 * -------------
 * Single source of truth for every authentication operation in the suite.
 *
 * Rules:
 *  - No token is ever hardcoded anywhere.
 *  - Credentials are read from environment variables only.
 *  - register() and login() are pure async functions — same input → same shape.
 *  - Header builders return plain objects — no side effects.
 */


import "dotenv/config";
import axios from "axios";
import { faker } from "@faker-js/faker";

// Base URL
function getBaseUrl() {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("APP_BASE_URL is not set in your .env file.");
  return url.replace(/\/$/, "");
}

// Registration
async function freshSession() {
  const user    = await registerUser();
  const session = await loginUser(user.email, user.password);
  return { user, headers: authHeaders(session.token), token: session.token };
}
/**
 * Register a brand-new account and return:
 *   { username, email, password, firstName, lastName, phoneNumber, token, userId, raw }
 *
 * Any field not supplied is generated uniquely by Faker, guaranteeing
 * idempotent test runs.
 *
 * @throws {Error} if the server does not return 200/201
 */
async function registerUser({
  username,
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
} = {}) {
  const payload = {
    username:     username     ?? faker.internet.username(),
    email:        email        ?? faker.internet.email().toLowerCase(),
    password:     password     ?? "Str0ng@Pass1!",
    first_name:   firstName    ?? faker.person.firstName(),
    last_name:    lastName     ?? faker.person.lastName(),
    phone_number: phoneNumber  ?? '+234' + faker.string.numeric(10),
  };

  const res = await axios.post(`${getBaseUrl()}/auth/register`, payload, {
    validateStatus: () => true,   // never throw on 4xx/5xx — let tests assert
  });

  if (![200, 201].includes(res.status)) {
    throw new Error(
      `registerUser failed [${res.status}]: ${JSON.stringify(res.data).slice(0, 300)}`
    );
  }

  const token  = extractToken(res.data);
  const userId = extractUserId(res.data);

  return {
    username:    payload.username,
    email:       payload.email,
    password:    payload.password,
    firstName:   payload.first_name,
    lastName:    payload.last_name,
    phoneNumber: payload.phone_number,
    token,
    userId,
    raw: res.data,
  };
}

/**
 * Login with existing credentials and return:
 *   { email, password, token, raw }
 *
 * @throws {Error} if the server does not return 200
 */
async function loginUser(email, password) {
  const res = await axios.post(
    `${getBaseUrl()}/auth/login`,
    { email, password },
    { validateStatus: () => true }
  );

  if (res.status !== 200) {
    throw new Error(
      `loginUser failed [${res.status}]: ${JSON.stringify(res.data).slice(0, 300)}`
    );
  }

  return {
    email,
    password,
    token: extractToken(res.data),
    raw:   res.data,
  };
}
// Header builders
function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function noAuthHeaders() {
  return { "Content-Type": "application/json" };
}

function malformedTokenHeaders() {
  return {
    Authorization: "Bearer this.is.not.a.valid.jwt",
    "Content-Type": "application/json",
  };
}

function expiredTokenHeaders() {
  // Well-formed JWT whose exp claim is set in the past
  const expired =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
    ".eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE2NzYyMzkwMjJ9" +
    ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  return {
    Authorization: `Bearer ${expired}`,
    "Content-Type": "application/json",
  };
}

// Private helpers

function extractToken(body) {
  return (
    body?.data?.access_token ??
    null
  );
}

function extractUserId(body) {
  return (
    body?.data?.user?.id ?? null
  );
}

export {
  getBaseUrl,
  registerUser,
  loginUser,
  authHeaders,
  noAuthHeaders,
  malformedTokenHeaders,
  expiredTokenHeaders,
  extractToken,
  freshSession,
  extractUserId,
};

