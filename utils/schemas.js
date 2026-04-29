/**
 * utils/schemas.js
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

// Top-level envelope: { status, status_code, message, data: { access_token, user } }
const REGISTER_SUCCESS_SCHEMA = {
  type: "object",
  required: ["status", "status_code", "message", "data"],
  properties: {
    status:      { type: "string" },
    status_code: { type: "integer" },
    message:     { type: "string" },
    data: {
      type: "object",
      required: ["access_token", "user"],
      properties: {
        access_token:       { type: "string", minLength: 20 },
        notification_token: { type: "string" },
        user: {
          type: "object",
          required: ["id", "email"],
          properties: {
            id:         { type: "string" },
            email:      { type: "string", format: "email" },
            username:   { type: "string" },
            first_name: { type: "string" },
            last_name:  { type: "string" },
            phone:      { type: "string" },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

// Login — same envelope shape as register
const LOGIN_SUCCESS_SCHEMA = {
  type: "object",
  required: ["status", "status_code", "message", "data"],
  properties: {
    status:      { type: "string" },
    status_code: { type: "integer" },
    message:     { type: "string" },
    data: {
      type: "object",
      required: ["access_token"],
      properties: {
        access_token: { type: "string", minLength: 20 },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

// User profile — the user object inside data
const USER_PROFILE_SCHEMA = {
  type: "object",
  required: ["id", "email"],
  properties: {
    id:         { type: "string" },
    email:      { type: "string", format: "email" },
    username:   { type: "string" },
    first_name: { type: "string" },
    last_name:  { type: "string" },
    phone:      { type: "string" },
    is_active:  { type: "boolean" },
    fullname:   { type: "string" },
  },
  additionalProperties: true,
};

// Error response envelope
const ERROR_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: true,
};

const ONBOARD_STATUS_SCHEMA = {
  type: "object",
  required: ["status", "status_code", "message", "data"],
  properties: {
    status:      { type: "string" },
    status_code: { type: "integer" },
    message:     { type: "string" },
    data: {
      type: "object",
      required: ["online", "status"],
      properties: {
        online: { type: "boolean" },
        status: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: true,
};

const validators = {
  registerSuccess: ajv.compile(REGISTER_SUCCESS_SCHEMA),
  loginSuccess:    ajv.compile(LOGIN_SUCCESS_SCHEMA),
  userProfile:     ajv.compile(USER_PROFILE_SCHEMA),
  errorResponse:   ajv.compile(ERROR_RESPONSE_SCHEMA),
  onboardStatus:   ajv.compile(ONBOARD_STATUS_SCHEMA),
};

function validate(data, schemaName) {
  const fn = validators[schemaName];
  if (!fn) throw new Error(`Unknown schema: "${schemaName}"`);

  const valid = fn(data);
  if (!valid) {
    const errors = fn.errors.map((e) => `  ${e.instancePath} ${e.message}`).join("\n");
    throw new Error(`Schema "${schemaName}" validation failed:\n${errors}\nData: ${JSON.stringify(data)}`);
  }
}

/**
 * Validate a login response and return the access token.
 */
function validateLoginBody(body) {
  validate(body, "loginSuccess");
  const token = body?.data?.access_token ?? null;
  if (!token) throw new Error(`Token not found after schema validation: ${JSON.stringify(body)}`);
  return token;
}

const ERROR_KEYS = [ "error", "errors", "msg"];

function hasErrorMessage(body) {
  return ERROR_KEYS.some((k) => body[k] !== undefined);
}

function getErrorMessage(body) {
  for (const k of ERROR_KEYS) {
    if (body[k] !== undefined) return body[k];
  }
  return null;
}

function extractProfile(body) {
  return body?.data?.user ?? body?.data ?? body?.user ?? body;
}

export {
  validate,
  validateLoginBody,
  hasErrorMessage,
  getErrorMessage,
  extractProfile,
  ERROR_KEYS,
};
