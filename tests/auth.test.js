import "dotenv/config";
import axios from "axios";
import { faker } from "@faker-js/faker";
import {
  getBaseUrl,
  registerUser,
  loginUser,
  authHeaders,
  expiredTokenHeaders,
  malformedTokenHeaders,
  noAuthHeaders,
} from "../utils/auth.js";
import {
  validate,
  validateLoginBody,
  hasErrorMessage,
  getErrorMessage,
  extractProfile,
} from "../utils/schemas.js";

//helpers

function validPayload(overrides = {}) {
  const p = {
    username: faker.internet.username(),
    email: faker.internet.email().toLowerCase(),
    password: "Str0ng@Pass1!",
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    phone_number: "+234" + faker.string.numeric(10),
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete p[k];
    else p[k] = v;
  }
  return p;
}

async function postRegister(payload) {
  return axios.post(`${getBaseUrl()}/auth/register`, payload, {
    validateStatus: () => true,
  });
}

async function postLogin(email, password) {
  return axios.post(
    `${getBaseUrl()}/auth/login`,
    { email, password },
    { validateStatus: () => true },
  );
}

/** Shared 6-point checker for all negative tests (4xx expected). */
function assertErrorResponse(res, expectedCodes) {
  // 1 — status
  expect(expectedCodes).toContain(res.status);

  const body = res.data;

  // 6 — schema
  validate(body, "errorResponse");

  // 2 — field presence
  expect(hasErrorMessage(body)).toBe(true);

  // 3 — data type
  const msg = getErrorMessage(body);
  expect(typeof msg === "string" || Array.isArray(msg)).toBe(true);

  // 4 + 5 — value / error non-empty
  if (typeof msg === "string") {
    expect(msg.trim().length).toBeGreaterThan(0);
  } else {
    expect(msg.length).toBeGreaterThan(0);
  }
}

//Test cases
describe("Registration - Valid Data", () => {
  let res;
  let payload;

  beforeAll(async () => {
    payload = validPayload();
    res = await postRegister(payload);
  });

  //Status code
  test("returns 201 status code", () => {
    expect([200, 201]).toContain(res.status);
  });

  //Field presence
  test("response body contains required fields {status, message, data, access_token, user, id, email}", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveProperty("access_token");
    expect(body.data).toHaveProperty("user");
    expect(body.data.user).toHaveProperty("id");
    expect(body.data.user).toHaveProperty("email");
  });

  //Data types
  test("response fields have correct data types", () => {
    const { data } = res.data;
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.message).toBe("string");
    expect(typeof data.access_token).toBe("string");
    expect(typeof data.user.id).toBe("string");
    expect(typeof data.user.email).toBe("string");
  });

  //Field values
  test("response values match the submitted payload", () => {
    const user = res.data.data.user;
    expect(res.data.status).toBe("success");
    expect(user.email).toBe(payload.email);
  });

  //No error messages on success
  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  //Schema validation
  test("response matches the registerSuccess schema", () => {
    validate(res.data, "registerSuccess");
  });

  //Security-password must not be exposed
  test("password field is absent from the response", () => {
    const responseText = JSON.stringify(res.data);
    expect(res.data.data.user).not.toHaveProperty("password");
    expect(responseText).not.toContain(payload.password);
  });
});

describe("Registration - All Empty Fields", () => {
  let res;

  beforeAll(async () => {
    res = await postRegister({});
  });

  //Status code
  test("returns 422 status code", () => {
    expect(res.status).toBe(422);
  });

  //Field presence
  test("response body contains status, status_code, message and error fields", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("CreateUserRequestModel.email");
    expect(body.error).toHaveProperty("CreateUserRequestModel.password");
  });

  //Data types
  test("response fields have correct data types", () => {
    const body = res.data;
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.error).toBe("object");
    expect(typeof body.error["CreateUserRequestModel.email"]).toBe("string");
    expect(typeof body.error["CreateUserRequestModel.password"]).toBe("string");
  });

  //Field values
  test("status is 'error', status_code is 422 and message is 'Validation failed'", () => {
    expect(res.data.status).toBe("error");
    expect(res.data.status_code).toBe(422);
    expect(res.data.message).toBe("Validation failed");
  });

  //Error messages content
  test("error object contains the correct validation messages for each missing field", () => {
    const errors = res.data.error;
    expect(errors["CreateUserRequestModel.email"]).toBe(
      "email is a required field",
    );
    expect(errors["CreateUserRequestModel.password"]).toBe(
      "password is a required field",
    );
  });

  //Schema validation
  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Registration - Duplicate Email/PhoneNumber", () => {
  let res;
  let duplicateEmail;
  let phoneNumber;

  beforeAll(async () => {
    duplicateEmail = faker.internet.email().toLowerCase();
    phoneNumber = "+234" + faker.string.numeric(10);

    await registerUser({ email: duplicateEmail, phoneNumber });

    res = await axios.post(
      `${getBaseUrl()}/auth/register`,
      {
        username: faker.internet.username(),
        email: duplicateEmail,
        password: "Str0ng@Pass1!",
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone_number: phoneNumber,
      },
      {
        validateStatus: () => true,
      },
    );
  });

  test("returns 400 status code", () => {
    expect(res.status).toBe(400);
  });

  test("response body contains status, status_code and message fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
  });

  test("response body contains duplicate email/phoneNumber error values", () => {
    expect(res.data.status).toBe("error");
    expect(res.data.status_code).toBe(400);
    expect(res.data.message.toLowerCase()).toContain(
      "user already exists with the given phone",
    );
  });

  test("response contains an error message", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });
});

describe("Registration - Password Containing Special Character", () => {
  let res;
  let payload;

  beforeAll(async () => {
    payload = {
      username: faker.internet.username(),
      email: faker.internet.email().toLowerCase(),
      password: `Str0ng@Pass${faker.string.numeric(4)}!`,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      phone_number: "+234" + faker.string.numeric(10),
    };

    res = await axios.post(`${getBaseUrl()}/auth/register`, payload, {
      validateStatus: () => true,
    });
  });

  test("returns 201 status code", () => {
    expect([200, 201]).toContain(res.status);
  });

  test("response body contains required success fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("data");
    expect(res.data.data).toHaveProperty("access_token");
    expect(res.data.data).toHaveProperty("user");
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
    expect(typeof res.data.data).toBe("object");
    expect(typeof res.data.data.access_token).toBe("string");
    expect(typeof res.data.data.user).toBe("object");
  });

  test("response body contains expected registration values", () => {
    expect(res.data.status).toBe("success");
    expect([200, 201]).toContain(res.data.status_code);
    expect(res.data.data.user.email).toBe(payload.email);
    expect(res.data.data.access_token.length).toBeGreaterThan(0);
  });

  test("response does not expose password", () => {
    expect(JSON.stringify(res.data)).not.toContain(payload.password);
    expect(res.data.data.user).not.toHaveProperty("password");
  });

  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  test("response matches the registerSuccess schema", () => {
    validate(res.data, "registerSuccess");
  });
});

describe("Login - Valid Inputs", () => {
  let res;
  let registeredUser;

  beforeAll(async () => {
    // Register a fresh account to guarantee valid credentials
    registeredUser = await registerUser();
    // Login with those credentials
    res = await postLogin(registeredUser.email, registeredUser.password);
  });

  //Status code
  test("returns 200 status code", () => {
    expect(res.status).toBe(200);
  });

  //Field presence
  test("response body contains status, status_code, message and data fields", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveProperty("access_token");
  });

  //Data types
  test("response fields have correct data types", () => {
    const body = res.data;
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.data.access_token).toBe("string");
    expect(body.data.access_token.length).toBeGreaterThan(20);
  });

  //Field values
  test("status is 'success' and status_code is 200", () => {
    expect(res.data.status).toBe("success");
    expect(res.data.status_code).toBe(200);
  });

  //No error messages on success
  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  //Schema validation
  test("response matches the loginSuccess schema", () => {
    validate(res.data, "loginSuccess");
  });
});

describe("Login - Incorrect Email", () => {
  let res;

  beforeAll(async () => {
    res = await postLogin("nonexistent_user_xyz@zedu-test.io", "Str0ng@Pass1!");
  });

  //Status code
  test("returns 4xx status code", () => {
    expect([400, 401, 404]).toContain(res.status);
  });

  //Field presence
  test("response body contains status, status_code, message and error fields", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");
  });

  //Data types
  test("response fields have correct data types", () => {
    const body = res.data;
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.error).toBe("object");
  });

  //Field values
  test("status is 'error' and status_code matches the response status", () => {
    expect(res.data.status).toBe("error");
    expect(res.data.status_code).toBe(res.status);
  });

  //Error message is non-empty
  test("message is a non-empty string", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  //Schema validation
  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Login - All Empty Fields", () => {
  let res;

  beforeAll(async () => {
    res = await axios.post(
      `${getBaseUrl()}/auth/login`,
      {},
      { validateStatus: () => true },
    );
  });

  //Status code
  test("returns 400 status code", () => {
    expect(res.status).toBe(400);
  });

  //Field presence
  test("response body contains status, status_code, message and error fields", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("LoginRequestModel.email");
    expect(body.error).toHaveProperty("LoginRequestModel.password");
  });

  //Data types
  test("response fields have correct data types", () => {
    const body = res.data;
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.error).toBe("object");
    expect(typeof body.error["LoginRequestModel.email"]).toBe("string");
    expect(typeof body.error["LoginRequestModel.password"]).toBe("string");
  });

  //Field values
  test("status is 'error', status_code is 400 and message is 'Validation failed'", () => {
    expect(res.data.status).toBe("error");
    expect(res.data.status_code).toBe(400);
    expect(res.data.message).toBe("Validation failed");
  });

  //Error messages content
  test("error object contains the correct validation messages for each missing field", () => {
    const errors = res.data.error;
    expect(errors["LoginRequestModel.email"]).toBe("email is a required field");
    expect(errors["LoginRequestModel.password"]).toBe(
      "password is a required field",
    );
  });

  //Schema validation
  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Fetch onboard-status - Valid Token", () => {
  let res;
  let registeredUser;

  beforeAll(async () => {
    registeredUser = await registerUser();
    const { token } = registeredUser;

    res = await axios.get(`${getBaseUrl()}/auth/onboard-status`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
  });

  //Status code
  test("returns 200 status code", () => {
    expect(res.status).toBe(200);
  });

  //Field presence
  test("response body contains status, status_code, message and data fields", () => {
    const body = res.data;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveProperty("online");
    expect(body.data).toHaveProperty("status");
  });

  //Data types
  test("response fields have correct data types", () => {
    const body = res.data;
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.data.online).toBe("boolean");
    expect(typeof body.data.status).toBe("boolean");
  });

  //Field values
  test("status is 'success', status_code is 200 and message is correct", () => {
    expect(res.data.status).toBe("success");
    expect(res.data.status_code).toBe(200);
    expect(res.data.message).toBe("user status fetch successfully");
  });

  //No error messages on success
  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  //Schema validation
  test("response matches the onboardStatus schema", () => {
    validate(res.data, "onboardStatus");
  });
});

describe("Fetch onboard-status - Malformed Token", () => {
  test("returns 401 with Token is invalid message", async () => {
    const res = await axios.get(`${getBaseUrl()}/auth/onboard-status`, {
      headers: malformedTokenHeaders(),
      validateStatus: () => true,
    });
    const body = res.data;

    //status code
    expect(res.status).toBe(401);

    //field presence
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");

    //data types
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.error).toBe("string");

    //field values
    expect(body.status).toBe("error");
    expect(body.status_code).toBe(401);

    //error message
    expect(body.message).toBe("Token is invalid!");
    expect(body.error).toBe("Unauthorized");

    //schema validation
    validate(body, "errorResponse");
  });
});

describe("Fetch onboard-status - Expired Token", () => {
  test("returns 401 with Token is invalid message", async () => {
    const res = await axios.get(`${getBaseUrl()}/auth/onboard-status`, {
      headers: expiredTokenHeaders(),
      validateStatus: () => true,
    });
    const body = res.data;

    //status code
    expect(res.status).toBe(401);

    //field presence
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");

    //data types
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");
    expect(typeof body.error).toBe("string");

    //field values
    expect(body.status).toBe("error");
    expect(body.status_code).toBe(401);

    //error message
    expect(body.message).toBe("Token is invalid!");
    expect(body.error).toBe("Unauthorized");

    //schema validation
    validate(body, "errorResponse");
  });
});

describe("Fetch onboard-status - No Token", () => {
  test("returns 401 with Token could not be found message", async () => {
    const res = await axios.get(`${getBaseUrl()}/auth/onboard-status`, {
      headers: noAuthHeaders(),
      validateStatus: () => true,
    });
    const body = res.data;

    //status code
    expect(res.status).toBe(401);

    //field presence
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("status_code");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("error");

    //data types
    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");

    //error message
    expect(body.status).toBe("error");
    expect(body.status_code).toBe(401);

    expect(body.message).toBe("Token could not be found!");

    //schema validation
    validate(body, "errorResponse");
  });
});

describe("Change password - Valid Inputs", () => {
  let res;
  let registeredUser;
  let oldPassword;
  let newPassword;

  beforeAll(async () => {
    oldPassword = faker.internet.password();
    newPassword = `New@Pass${faker.string.numeric(6)}!`;

    registeredUser = await registerUser({ password: oldPassword });
    const session = await loginUser(registeredUser.email, oldPassword);
    const token = session.token;

    res = await axios.put(
      `${getBaseUrl()}/auth/change-password`,
      {
        old_password: oldPassword,
        new_password: newPassword,
      },
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
    );
  });

  test("returns 200 status code", () => {
    expect(res.status).toBe(200);
  });

  test("response body contains status, status_code, message and data fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("data");

    expect(res.data.data).toHaveProperty("id");
    expect(res.data.data).toHaveProperty("name");
    expect(res.data.data).toHaveProperty("email");
    expect(res.data.data).toHaveProperty("is_verified");
    expect(res.data.data).toHaveProperty("deactivated");
    expect(res.data.data).toHaveProperty("is_active");
    expect(res.data.data).toHaveProperty("is_onboarded");
    expect(res.data.data).toHaveProperty("profile_updated");
    expect(res.data.data).toHaveProperty("current_org");
    expect(res.data.data).toHaveProperty("profile");
    expect(res.data.data).toHaveProperty("org_role");
  });

  test("response fields have correct data types", () => {
    const body = res.data;
    const data = body.data;

    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");

    expect(typeof data.id).toBe("string");
    expect(typeof data.name).toBe("string");
    expect(typeof data.email).toBe("string");
    expect(typeof data.is_verified).toBe("boolean");
    expect(typeof data.deactivated).toBe("boolean");
    expect(typeof data.is_active).toBe("boolean");
    expect(typeof data.is_onboarded).toBe("boolean");
    expect(typeof data.profile_updated).toBe("boolean");
    expect(typeof data.current_org).toBe("string");
    expect(typeof data.profile).toBe("object");
    expect(typeof data.org_role).toBe("object");
  });

  test("response body has expected success values", () => {
    expect(res.data.status).toBe("success");
    expect(res.data.status_code).toBe(200);
    expect(res.data.message).toBe("Password updated successfully");
    expect(res.data.data.email).toBe(registeredUser.email);
    expect(res.data.data.is_active).toBe(true);
    expect(res.data.data.deactivated).toBe(false);
  });

  test("response profile contains expected user details", () => {
    const profile = res.data.data.profile;

    expect(profile).toHaveProperty("profile_id");
    expect(profile).toHaveProperty("first_name");
    expect(profile).toHaveProperty("last_name");
    expect(profile).toHaveProperty("full_name");
    expect(profile).toHaveProperty("username");
    expect(profile).toHaveProperty("phone");
    expect(profile).toHaveProperty("user_id");
    expect(profile).toHaveProperty("online");
    expect(profile).toHaveProperty("is_active");

    expect(typeof profile.profile_id).toBe("string");
    expect(typeof profile.first_name).toBe("string");
    expect(typeof profile.last_name).toBe("string");
    expect(typeof profile.full_name).toBe("string");
    expect(typeof profile.username).toBe("string");
    expect(typeof profile.phone).toBe("string");
    expect(typeof profile.user_id).toBe("string");
    expect(typeof profile.online).toBe("boolean");
    expect(typeof profile.is_active).toBe("boolean");
  });

  test("new password can be used to login after password change", async () => {
    const loginAfterChange = await loginUser(registeredUser.email, newPassword);

    expect(loginAfterChange.token).toBeTruthy();
    expect(typeof loginAfterChange.token).toBe("string");
  });

  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Change password - Invalid Old Password", () => {
  let res;
  let wrongOldPassword;
  let newPassword;

  beforeAll(async () => {
    const currentPassword = faker.internet.password();
    wrongOldPassword = `Wrong@Pass${faker.string.numeric(6)}!`;
    newPassword = `New@Pass${faker.string.numeric(6)}!`;

    const registeredUser = await registerUser({ password: currentPassword });
    const session = await loginUser(registeredUser.email, currentPassword);
    const token = session.token;

    res = await axios.put(
      `${getBaseUrl()}/auth/change-password`,
      {
        old_password: wrongOldPassword,
        new_password: newPassword,
      },
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
    );
  });

  test("returns 400 status code", () => {
    expect(res.status).toBe(400);
  });

  test("response body contains status, status_code, message and error fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("error");
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
    expect(typeof res.data.error).toBe("object");
  });

  test("response body matches exact invalid-old-password error response", () => {
    expect(res.data).toEqual({
      status: "error",
      status_code: 400,
      message: "old password is incorrect",
      error: {},
    });
  });

  test("response contains an error message", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Change password - New Password Is One Character", () => {
  let res;
  let oldPassword;
  let singleCharacter;

  beforeAll(async () => {
    oldPassword = faker.internet.password();
    singleCharacter = faker.string.alpha({ length: 1 });

    const registeredUser = await registerUser({ password: oldPassword });
    const session = await loginUser(registeredUser.email, oldPassword);
    const token = session.token;

    res = await axios.put(
      `${getBaseUrl()}/auth/change-password`,
      {
        old_password: oldPassword,
        new_password: singleCharacter,
      },
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
    );
  });

  test("returns 422 status code", () => {
    expect(res.status).toBe(422);
  });

  test("response body contains status, status_code, message and error fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("error");
    expect(res.data.error).toHaveProperty(
      "ChangePasswordRequestModel.new_password",
    );
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
    expect(typeof res.data.error).toBe("object");
    expect(
      typeof res.data.error["ChangePasswordRequestModel.new_password"],
    ).toBe("string");
  });

  test("response body matches exact one-character new-password validation response", () => {
    expect(res.data).toEqual({
      status: "error",
      status_code: 422,
      message: "Validation failed",
      error: {
        "ChangePasswordRequestModel.new_password":
          "new_password must be at least 7 characters in length",
      },
    });
  });

  test("response contains an error message", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Change password - Empty New Password Field", () => {
  let res;
  let oldPassword;

  beforeAll(async () => {
    oldPassword = faker.internet.password();

    const registeredUser = await registerUser({ password: oldPassword });
    const session = await loginUser(registeredUser.email, oldPassword);
    const token = session.token;

    res = await axios.put(
      `${getBaseUrl()}/auth/change-password`,
      {
        old_password: oldPassword,
        new_password: "",
      },
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
    );
  });

  test("returns 422 status code", () => {
    expect(res.status).toBe(422);
  });

  test("response body contains status, status_code, message and error fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("error");
    expect(res.data.error).toHaveProperty(
      "ChangePasswordRequestModel.new_password",
    );
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
    expect(typeof res.data.error).toBe("object");
    expect(
      typeof res.data.error["ChangePasswordRequestModel.new_password"],
    ).toBe("string");
  });

  test("response body matches exact empty-new-password validation response", () => {
    expect(res.data).toEqual({
      status: "error",
      status_code: 422,
      message: "Validation failed",
      error: {
        "ChangePasswordRequestModel.new_password":
          "new_password is a required field",
      },
    });
  });

  test("response contains an error message", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Change password - Without Access Token", () => {
  let res;
  let oldPassword;
  let newPassword;

  beforeAll(async () => {
    oldPassword = faker.internet.password();
    newPassword = `New@Pass${faker.string.numeric(6)}!`;

    res = await axios.put(
      `${getBaseUrl()}/auth/change-password`,
      {
        old_password: oldPassword,
        new_password: newPassword,
      },
      {
        headers: noAuthHeaders(),
        validateStatus: () => true,
      },
    );
  });

  test("returns 401 status code", () => {
    expect(res.status).toBe(401);
  });

  test("response body contains error information", () => {
    expect(hasErrorMessage(res.data)).toBe(true);
  });

  test("response error message is not empty", () => {
    const msg = getErrorMessage(res.data);
    expect(
      typeof msg === "string" || Array.isArray(msg) || typeof msg === "object",
    ).toBe(true);

    if (typeof msg === "string") {
      expect(msg.trim().length).toBeGreaterThan(0);
    } else if (Array.isArray(msg)) {
      expect(msg.length).toBeGreaterThan(0);
    } else {
      expect(Object.keys(msg).length).toBeGreaterThanOrEqual(0);
    }
  });

  test("response does not return success", () => {
    expect(res.data.status).not.toBe("success");
    expect(res.data.status_code).not.toBe(200);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Logout - Without Access Token", () => {
  let res;

  beforeAll(async () => {
    res = await axios.post(
      `${getBaseUrl()}/auth/logout`,
      {},
      {
        headers: {
          Authorization: "Bearer ",
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      },
    );
  });

  test("returns 401 status code", () => {
    expect(res.status).toBe(401);
  });

  test("response body contains error information", () => {
    expect(hasErrorMessage(res.data)).toBe(true);
  });

  test("response error message is not empty", () => {
    const msg = getErrorMessage(res.data);

    expect(
      typeof msg === "string" || Array.isArray(msg) || typeof msg === "object",
    ).toBe(true);

    if (typeof msg === "string") {
      expect(msg.trim().length).toBeGreaterThan(0);
    } else if (Array.isArray(msg)) {
      expect(msg.length).toBeGreaterThan(0);
    } else {
      expect(Object.keys(msg).length).toBeGreaterThanOrEqual(0);
    }
  });

  test("response does not return success", () => {
    expect(res.data.status).not.toBe("success");
    expect(res.data.status_code).not.toBe(200);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Logout - Valid Inputs", () => {
  let res;

  beforeAll(async () => {
    const registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;

    res = await axios.post(
      `${getBaseUrl()}/auth/logout`,
      {},
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
    );
  });

  test("returns 200 status code", () => {
    expect(res.status).toBe(200);
  });

  test("response body contains status, status_code and message fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.status).toBe("string");
    expect(typeof res.data.status_code).toBe("number");
    expect(typeof res.data.message).toBe("string");
  });

  test("response body matches exact successful logout response", () => {
    expect(res.data).toEqual({
      status: "success",
      status_code: 200,
      message: "user logout successfully",
    });
  });

  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});
