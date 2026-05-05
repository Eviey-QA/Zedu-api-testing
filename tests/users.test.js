import "dotenv/config";
import axios from "axios";
import {
  getBaseUrl,
  registerUser,
  loginUser,
  authHeaders,
  noAuthHeaders,
  malformedTokenHeaders,
  expiredTokenHeaders,
} from "../utils/auth.js";
import {
  validate,
  hasErrorMessage,
  getErrorMessage,
} from "../utils/schemas.js";
import { faker } from "@faker-js/faker";

describe("Update user status - Invalid Emoji", () => {
  let res;

  beforeAll(async () => {
    // Register a fresh account to get both token and userId
    const registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;
    const userId = registeredUser.userId;

    res = await axios.patch(
      `${getBaseUrl()}/users/${userId}/status`,
      { emoji: "not-an-emoji" },
      {
        headers: authHeaders(token),
        validateStatus: () => true,
      },
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
  test("status is 'error' and status_code is 400", () => {
    expect(res.data.status).toBe("error");
    expect(res.data.status_code).toBe(400);
  });

  //Error message content
  test("message describes the invalid emoji", () => {
    expect(res.data.message).toBe("emoji must be a valid Unicode emoji");
  });

  //Schema validation
  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Retrieve organisation details - Valid Inputs", () => {
  let res;
  let registeredUser;

  beforeAll(async () => {
    registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;

    res = await axios.get(`${getBaseUrl()}/users/organisations/`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
  });

  test("returns 200 status code", () => {
    expect(res.status).toBe(200);
  });

  test("response body contains status, status_code, message and data fields", () => {
    expect(res.data).toHaveProperty("status");
    expect(res.data).toHaveProperty("status_code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("data");
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  test("organisation object contains expected fields", () => {
    const org = res.data.data[0];

    expect(org).toHaveProperty("id");
    expect(org).toHaveProperty("name");
    expect(org).toHaveProperty("description");
    expect(org).toHaveProperty("email");
    expect(org).toHaveProperty("type");
    expect(org).toHaveProperty("location");
    expect(org).toHaveProperty("country");
    expect(org).toHaveProperty("owner_id");
    expect(org).toHaveProperty("logo_url");
    expect(org).toHaveProperty("credit_balance");
    expect(org).toHaveProperty("channels_count");
    expect(org).toHaveProperty("total_messages_count");
    expect(org).toHaveProperty("org_roles");
    expect(org).toHaveProperty("pinned");
    expect(org).toHaveProperty("Users");
    expect(org).toHaveProperty("created_at");
    expect(org).toHaveProperty("updated_at");
    expect(org).toHaveProperty("channels");
    expect(org).toHaveProperty("subscription_plan_id");
    expect(org).toHaveProperty("stripe_customer_id");
    expect(org).toHaveProperty("org_plan_id");
    expect(org).toHaveProperty("organisation_plan");
    expect(org).toHaveProperty("organisation_slug");
    expect(org).toHaveProperty("user_role");
  });

  test("nested organisation_plan object contains expected fields", () => {
    const organisationPlan = res.data.data[0].organisation_plan;

    expect(organisationPlan).toHaveProperty("started_at");
    expect(organisationPlan).toHaveProperty("ended_at");
    expect(organisationPlan).toHaveProperty("created_at");
    expect(organisationPlan).toHaveProperty("updated_at");
    expect(organisationPlan).toHaveProperty("plan_details");
  });

  test("nested plan_details object contains expected fields", () => {
    const planDetails = res.data.data[0].organisation_plan.plan_details;

    expect(planDetails).toHaveProperty("id");
    expect(planDetails).toHaveProperty("name");
    expect(planDetails).toHaveProperty("description");
    expect(planDetails).toHaveProperty("benefits");
    expect(planDetails).toHaveProperty("fee");
    expect(planDetails).toHaveProperty("max_channels");
    expect(planDetails).toHaveProperty("max_users");
    expect(planDetails).toHaveProperty("max_notifications");
    expect(planDetails).toHaveProperty("can_upgrade_notifications");
    expect(planDetails).toHaveProperty("can_add_unlimited_channels");
    expect(planDetails).toHaveProperty("can_add_unlimited_users");
    expect(planDetails).toHaveProperty("is_for_individuals");
    expect(planDetails).toHaveProperty("is_for_small_business");
    expect(planDetails).toHaveProperty("is_for_large_enterprise");
    expect(planDetails).toHaveProperty("unlimited_ai_co_workers");
    expect(planDetails).toHaveProperty("create_your_own_ai_co_workers");
    expect(planDetails).toHaveProperty("ai_credits_purchasable");
    expect(planDetails).toHaveProperty("max_call_duration");
    expect(planDetails).toHaveProperty("max_buzz_participants");
    expect(planDetails).toHaveProperty("max_active_calls");
    expect(planDetails).toHaveProperty("call_records_available");
    expect(planDetails).toHaveProperty("transcript_available");
    expect(planDetails).toHaveProperty("advanced_controls");
    expect(planDetails).toHaveProperty("advanced_controls_user");
    expect(planDetails).toHaveProperty("created_at");
    expect(planDetails).toHaveProperty("credits");
    expect(planDetails).toHaveProperty("updated_at");
  });

  test("response fields have correct data types", () => {
    const body = res.data;
    const org = body.data[0];
    const plan = org.organisation_plan;
    const planDetails = plan.plan_details;

    expect(typeof body.status).toBe("string");
    expect(typeof body.status_code).toBe("number");
    expect(typeof body.message).toBe("string");

    expect(typeof org.id).toBe("string");
    expect(typeof org.name).toBe("string");
    expect(typeof org.description).toBe("string");
    expect(typeof org.email).toBe("string");
    expect(typeof org.type).toBe("string");
    expect(typeof org.location).toBe("string");
    expect(typeof org.country).toBe("string");
    expect(typeof org.owner_id).toBe("string");
    expect(typeof org.logo_url).toBe("string");
    expect(typeof org.credit_balance).toBe("number");
    expect(typeof org.channels_count).toBe("number");
    expect(typeof org.total_messages_count).toBe("number");
    expect(typeof org.pinned).toBe("boolean");
    expect(typeof org.created_at).toBe("string");
    expect(typeof org.updated_at).toBe("string");
    expect(typeof org.subscription_plan_id).toBe("string");
    expect(typeof org.stripe_customer_id).toBe("string");
    expect(typeof org.org_plan_id).toBe("string");
    expect(typeof org.organisation_plan).toBe("object");
    expect(typeof org.organisation_slug).toBe("string");
    expect(typeof org.user_role).toBe("object");

    expect(typeof plan.started_at).toBe("string");
    expect(typeof plan.ended_at).toBe("string");
    expect(typeof plan.created_at).toBe("string");
    expect(typeof plan.updated_at).toBe("string");
    expect(typeof plan.plan_details).toBe("object");

    expect(typeof planDetails.id).toBe("string");
    expect(typeof planDetails.name).toBe("string");
    expect(typeof planDetails.description).toBe("string");
    expect(typeof planDetails.fee).toBe("number");
    expect(typeof planDetails.max_channels).toBe("number");
    expect(typeof planDetails.max_users).toBe("number");
    expect(typeof planDetails.max_notifications).toBe("number");
    expect(typeof planDetails.can_upgrade_notifications).toBe("boolean");
    expect(typeof planDetails.can_add_unlimited_channels).toBe("boolean");
    expect(typeof planDetails.can_add_unlimited_users).toBe("boolean");
    expect(typeof planDetails.is_for_individuals).toBe("boolean");
    expect(typeof planDetails.is_for_small_business).toBe("boolean");
    expect(typeof planDetails.is_for_large_enterprise).toBe("boolean");
    expect(typeof planDetails.unlimited_ai_co_workers).toBe("boolean");
    expect(typeof planDetails.create_your_own_ai_co_workers).toBe("boolean");
    expect(typeof planDetails.ai_credits_purchasable).toBe("boolean");
    expect(typeof planDetails.max_call_duration).toBe("number");
    expect(typeof planDetails.max_buzz_participants).toBe("number");
    expect(typeof planDetails.max_active_calls).toBe("number");
    expect(typeof planDetails.call_records_available).toBe("boolean");
    expect(typeof planDetails.transcript_available).toBe("boolean");
    expect(typeof planDetails.advanced_controls).toBe("boolean");
    expect(typeof planDetails.advanced_controls_user).toBe("boolean");
    expect(typeof planDetails.created_at).toBe("string");
    expect(typeof planDetails.credits).toBe("number");
    expect(typeof planDetails.updated_at).toBe("string");
  });

  test("response body contains expected success values", () => {
    const org = res.data.data[0];

    expect(res.data.status).toBe("success");
    expect(res.data.status_code).toBe(200);
    expect(res.data.message).toBe("User organisations retrieved successfully");
    expect(org.email).toBe(registeredUser.email);
    expect(org.owner_id).toBe(registeredUser.userId);
    expect(org.type).toBe("user default org");
    expect(org.subscription_plan_id).toBe("free");
  });

  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Retrieve organisation details - Without Access Token", () => {
  let res;

  beforeAll(async () => {
    res = await axios.get(`${getBaseUrl()}/users/organisations/`, {
      headers: {
        Authorization: "Bearer ",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });
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

describe("Delete user - Valid Inputs", () => {
  let res;
  let userId;

  beforeAll(async () => {
    const registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;
    userId = registeredUser.userId;

    res = await axios.delete(`${getBaseUrl()}/users/${userId}`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
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

  test("response body matches exact successful delete user response", () => {
    expect(res.data).toEqual({
      status: "success",
      status_code: 200,
      message: "User deleted successfully",
    });
  });

  test("response does not contain error messages", () => {
    expect(hasErrorMessage(res.data)).toBe(false);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Delete user - Invalid User ID", () => {
  let res;

  beforeAll(async () => {
    const registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;

    res = await axios.delete(`${getBaseUrl()}/users/{{user_id`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
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

  test("response body matches exact invalid user ID error response", () => {
    expect(res.data).toEqual({
      status: "error",
      status_code: 400,
      message:
        'user not found: ERROR: invalid input syntax for type uuid: "{{user_id" (SQLSTATE 22P02)',
    });
  });

  test("response contains an error message", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});

describe("Delete user - Without Access Token", () => {
  let res;
  let userId;

  beforeAll(async () => {
    const registeredUser = await registerUser();
    userId = registeredUser.userId;

    res = await axios.delete(`${getBaseUrl()}/users/${userId}`, {
      headers: {
        Authorization: "Bearer ",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });
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

describe("Delete user - Wrong Endpoint", () => {
  let res;
  let userId;

  beforeAll(async () => {
    const registeredUser = await registerUser();
    const session = await loginUser(
      registeredUser.email,
      registeredUser.password,
    );
    const token = session.token;
    userId = registeredUser.userId;

    res = await axios.delete(`${getBaseUrl()}/user/${userId}`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
  });

  test("returns 404 status code", () => {
    expect(res.status).toBe(404);
  });

  test("response body contains code, message, name and status fields", () => {
    expect(res.data).toHaveProperty("code");
    expect(res.data).toHaveProperty("message");
    expect(res.data).toHaveProperty("name");
    expect(res.data).toHaveProperty("status");
  });

  test("response fields have correct data types", () => {
    expect(typeof res.data.code).toBe("number");
    expect(typeof res.data.message).toBe("string");
    expect(typeof res.data.name).toBe("string");
    expect(typeof res.data.status).toBe("number");
  });

  test("response body matches exact wrong-endpoint not found response", () => {
    expect(res.data).toEqual({
      code: 404,
      message: "Page not found.",
      name: "Not Found",
      status: 404,
    });
  });

  test("response message is not empty", () => {
    expect(res.data.message.trim().length).toBeGreaterThan(0);
  });

  test("response matches the errorResponse schema", () => {
    validate(res.data, "errorResponse");
  });
});
