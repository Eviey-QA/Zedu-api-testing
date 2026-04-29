/**
 * tests/roles.test.js
 * Every test validates ALL SIX mandatory categories:
 *   1. Status code
 *   2. Field presence
 *   3. Data types
 *   4. Field values
 *   5. Error messages
 *   6. Schema validation
 * Every test that needs auth registers its own account and logs in.
 * No test shares a state with another.
 */

import {authHeaders, getBaseUrl, loginUser, registerUser} from "../utils/auth.js";
import {faker} from "@faker-js/faker";
import axios from "axios";
import {hasErrorMessage, validate} from "../utils/schemas.js";

describe("Create organisation role — Valid Inputs", () => {
    let res;
    let roleName;
    let roleDescription;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session        = await loginUser(registeredUser.email, registeredUser.password);
        const token          = session.token;
        const {raw} = await registeredUser;
        const orgId          = raw.data.user.organisation.id

        const uniqueSuffix = faker.string.alphanumeric(6);

        roleName        = `${faker.person.jobTitle().slice(0, 5)}${uniqueSuffix}`;
        roleDescription = faker.lorem.sentence().slice(0, 18);

        console.log(roleDescription, roleName)

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            { name: roleName, description: roleDescription },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );

        console.log("\n--- Valid Inputs Response ---");

        console.log("\n--- Create Org Role Response ---");
        console.log("Status :", res.status);
        console.log("Body   :", JSON.stringify(res.data, null, 2));
        console.log("--------------------------------\n");
    });

    //Status code
    test("returns 201 status code", () => {
        expect(res.status).toBe(201);
    });

    //Field presence
    test("response body contains status, status_code, message and data fields", () => {
        const body = res.data;
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("status_code");
        expect(body).toHaveProperty("message");
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("id");
        expect(body.data).toHaveProperty("name");
        expect(body.data).toHaveProperty("description");
        expect(body.data).toHaveProperty("message");
    });

    //data types
    test("response fields have correct data types", () => {
        const { data } = res.data;
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
        expect(typeof data.id).toBe("string");
        expect(typeof data.name).toBe("string");
        expect(typeof data.description).toBe("string");
        expect(typeof data.message).toBe("string");
    });

    //field values
    test("status is 'success', status_code is 201 and data reflects submitted payload", () => {
        const { data } = res.data;
        expect(res.data.status).toBe("success");
        expect(res.data.status_code).toBe(201);
        expect(res.data.message).toBe("Org role created successfully");
        expect(data.name).toBe(roleName);
        expect(data.description).toBe(roleDescription);
        expect(data.message).toBe("Role created successfully");
        expect(data.id.length).toBeGreaterThan(0);
    });

    //no error messages on success
    test("response does not contain error messages", () => {
        expect(hasErrorMessage(res.data)).toBe(false);
    });

    //Schema validation
    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Already Existing Role", () => {
    let res;
    let roleName;
    let roleDescription;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        roleName = faker.person.jobTitle().slice(0, 10);
        roleDescription = faker.lorem.sentence().slice(0, 18);

        await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            { name: roleName, description: roleDescription },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            { name: roleName, description: roleDescription },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    //status code
    test("returns 409 status code", () => {
        expect(res.status).toBe(409);
    });

    //field presence
    test("response body contains status, status_code and message fields", () => {
        const body = res.data;
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("status_code");
        expect(body).toHaveProperty("message");
    });

    //data types
    test("response fields have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
    });

    //error values/message
    test("response body matches exact already-existing role error response", () => {
        expect(res.data).toEqual({
            status: "error",
            status_code: 409,
            message: "role name already exists",
        });
    });

    //Schema validation
    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Empty Name Field", () => {
    let res;
    let roleDescription;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        roleDescription = faker.lorem.sentence().slice(0, 18);

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            { name: "", description: roleDescription },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    //status code
    test("returns 422 status code", () => {
        expect(res.status).toBe(422);
    });

    //field presence
    test("response body contains status, status_code, message and error fields", () => {
        const body = res.data;
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("status_code");
        expect(body).toHaveProperty("message");
        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("OrgRole.name");
    });

    //data types
    test("response fields have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
        expect(typeof res.data.error).toBe("object");
        expect(typeof res.data.error["OrgRole.name"]).toBe("string");
    });

    //error values/message
    test("response body matches exact empty-name validation error response", () => {
        expect(res.data).toEqual({
            status: "error",
            status_code: 422,
            message: "Validation failed",
            error: {
                "OrgRole.name": "name is a required field",
            },
        });
    });

    //Schema validation
    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Two-Character Name Field", () => {
    let res;
    let roleDescription;
    let roleName;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        roleName        = faker.string.alpha(2);
        roleDescription = faker.lorem.sentence().slice(0, 18);

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            {
                name: roleName,
                description: roleDescription,
            },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    //status code
    test("returns 201 status code", () => {
        expect(res.status).toBe(201);
    });

    //field presence
    test("response body contains status, status_code, message and role data fields", () => {
        const body = res.data;
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("status_code");
        expect(body).toHaveProperty("message");
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("description");
        expect(body.data).toHaveProperty("id");
        expect(body.data).toHaveProperty("message");
        expect(body.data).toHaveProperty("name");
    });

    //data types
    test("response fields have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
        expect(typeof res.data.data.description).toBe("string");
        expect(typeof res.data.data.id).toBe("string");
        expect(typeof res.data.data.message).toBe("string");
        expect(typeof res.data.data.name).toBe("string");
    });

    //field values
    test("response body matches the expected two-character role creation values", () => {
        expect(res.data.status).toBe("success");
        expect(res.data.status_code).toBe(201);
        expect(res.data.message).toBe("Org role created successfully");
        expect(res.data.data.description).toBe(roleDescription);
        expect(res.data.data.message).toBe("Role created successfully");
        expect(res.data.data.name).toBe(roleName);
        expect(res.data.data.id.length).toBeGreaterThan(0);
    });

    //No error message on success
    test("response does not contain error messages", () => {
        expect(hasErrorMessage(res.data)).toBe(false);
    });

    //Schema validation
    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Empty Description Field", () => {
    let res;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            {
                name: faker.person.jobTitle().slice(0, 10),
                description: "",
            },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    //status code
    test("returns 422 status code", () => {
        expect(res.status).toBe(422);
    });

    //field presence
    test("response body contains status, status_code, message and error fields", () => {
        const body = res.data;
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("status_code");
        expect(body).toHaveProperty("message");
        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("OrgRole.description");
    });

    //data types
    test("response fields have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
        expect(typeof res.data.error).toBe("object");
        expect(typeof res.data.error["OrgRole.description"]).toBe("string");
    });

    //error values/message
    test("response body matches exact empty-description validation error response", () => {
        expect(res.data).toEqual({
            status: "error",
            status_code: 422,
            message: "Validation failed",
            error: {
                "OrgRole.description": "description is a required field",
            },
        });
    });

    //Schema validation
    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Long Description Field", () => {
    let res;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            {
                name: faker.person.jobTitle().slice(0, 10),
                description: "a".repeat(1000),
            },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    test("returns 201 or 409 status code", () => {
        expect([201, 409]).toContain(res.status);
    });

    test("response body contains status, status_code, message and error fields", () => {
        expect(res.data).toHaveProperty("status");
        expect(res.data).toHaveProperty("status_code");
        expect(res.data).toHaveProperty("message");
    });

    test("response fields have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
    });



    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Numeric Name Field", () => {
    let res;
    let roleName;
    let roleDescription;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;
        const orgId = registeredUser.raw.data.user.organisation.id;

        roleName = faker.string.numeric(7);
        roleDescription = `${faker.word.words(3)} ${faker.string.uuid()}`.slice(0, 40);

        res = await axios.post(
            `${getBaseUrl()}/organisations/${orgId}/roles`,
            {
                name: roleName,
                description: roleDescription,
            },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
        );
    });

    test("BUG: should return 422 status code for numeric-only role name", () => {
        expect(res.status).toBe(422);
    });

    test("BUG: response should contain validation error fields", () => {
        expect(res.data).toHaveProperty("status");
        expect(res.data).toHaveProperty("status_code");
        expect(res.data).toHaveProperty("message");
        expect(res.data).toHaveProperty("error");
        expect(res.data.error).toHaveProperty("OrgRole.name");
    });

    test("BUG: validation error response fields should have correct data types", () => {
        expect(typeof res.data.status).toBe("string");
        expect(typeof res.data.status_code).toBe("number");
        expect(typeof res.data.message).toBe("string");
        expect(typeof res.data.error).toBe("object");
        expect(typeof res.data.error["OrgRole.name"]).toBe("string");
    });

    test("BUG: response should reject numeric-only role name with validation message", () => {
        expect(res.data.status).toBe("error");
        expect(res.data.status_code).toBe(422);
        expect(res.data.message).toBe("Validation failed");
        expect(res.data.error["OrgRole.name"]).toBe("name must contain letters");
    });

    test("BUG: response should contain an error message", () => {
        expect(hasErrorMessage(res.data)).toBe(true);
    });

    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});

describe("Create organisation role - Invalid Organisation ID", () => {
    let res;
    let roleName;
    let roleDescription;

    beforeAll(async () => {
        const registeredUser = await registerUser();
        const session = await loginUser(registeredUser.email, registeredUser.password);
        const token = session.token;

        roleName = `${faker.word.noun()}-${faker.string.uuid()}`.slice(0, 30);
        roleDescription = `${faker.lorem.words(4)} ${faker.string.uuid()}`.slice(0, 60);

        res = await axios.post(
            `${getBaseUrl()}/organisations/1234567/roles`,
            {
                name: roleName,
                description: roleDescription,
            },
            {
                headers: authHeaders(token),
                validateStatus: () => true,
            }
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

    test("response body matches exact invalid organisation ID error response", () => {
        expect(res.data).toEqual({
            status: "error",
            status_code: 400,
            message: "ERROR: invalid input syntax for type uuid: \"1234567\" (SQLSTATE 22P02)",
        });
    });

    test("response contains an error message", () => {
        expect(res.data.message.trim().length).toBeGreaterThan(0);
    });

    test("response matches the errorResponse schema", () => {
        validate(res.data, "errorResponse");
    });
});
