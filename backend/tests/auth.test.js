/**
 * tests/auth.test.js
 *
 * Tests for the authentication flow:
 *   - register (POST /api/auth/register)
 *   - login    (POST /api/auth/login)
 *   - me       (GET  /api/auth/me)
 *
 * These tests run against an in-memory MongoDB instance, so no real database
 * connection is needed and the data is wiped after each test.
 */
const request = require("supertest");
const app = require("../src/app");
const { connectTestDb, clearDatabase } = require("./testSetup");
const cacheService = require("../src/services/cacheService");

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  // Clear DB and cache between tests so each test starts clean.
  await clearDatabase();
  cacheService.flush();
});

// Note: we do NOT call disconnectTestDb() here because applications.test.js
// runs after this file (alphabetically) and reuses the same MongoMemoryServer.
// disconnectTestDb() is called in applications.test.js's afterAll instead.
afterAll(async () => {
  // Just clear leftover data. The shared server keeps running for the next test file.
  await clearDatabase();
});

// --- Registration ---

describe("POST /api/auth/register", () => {
  test("creates a new student account and returns 201", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Test Student",
      email: "test@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("test@example.com");
    // Password must never be returned in the response.
    expect(res.body.data.password).toBeUndefined();
    // Default role should be "student".
    expect(res.body.data.role).toBe("student");
  });

  test("allows registering with an explicit counselor role", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Test Counselor",
      email: "counselor@example.com",
      password: "Password123!",
      role: "counselor",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("counselor");
  });

  test("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "nofullname@example.com",
      password: "Password123!",
      // fullName intentionally missing
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Edge case: duplicate email should return 409, not a raw Mongo error.
  test("returns 409 when the email is already registered", async () => {
    const payload = {
      fullName: "Duplicate User",
      email: "duplicate@example.com",
      password: "Password123!",
    };

    // First registration — should succeed.
    await request(app).post("/api/auth/register").send(payload);

    // Second registration with same email — should fail cleanly.
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// --- Login ---

describe("POST /api/auth/login", () => {
  // Register a user before each login test.
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      fullName: "Login Test User",
      email: "logintest@example.com",
      password: "Password123!",
    });
  });

  test("returns a JWT token and user object on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe("logintest@example.com");
    // Password must never be returned in the response.
    expect(res.body.data.user.password).toBeUndefined();
  });

  test("returns 401 on wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 401 when email does not exist", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 400 when email or password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      // password intentionally missing
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// --- Me (full register → login → me flow) ---

describe("GET /api/auth/me", () => {
  let authToken;

  // Register and log in once before these tests run.
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      fullName: "Me Test User",
      email: "metest@example.com",
      password: "Password123!",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "metest@example.com",
      password: "Password123!",
    });

    authToken = loginRes.body.data.token;
  });

  test("returns the authenticated user's profile when a valid token is provided", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("metest@example.com");
    expect(res.body.data.password).toBeUndefined();
  });

  test("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 401 when a malformed or expired token is provided", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer this-is-not-a-valid-jwt");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
