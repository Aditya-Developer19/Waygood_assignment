/**
 * tests/applications.test.js
 *
 * Tests for the application workflow:
 *   - create application  (POST /api/applications)
 *   - update status       (PATCH /api/applications/:id/status)
 *
 * Tests cover the happy path, the duplicate-application edge case,
 * and the invalid-status-transition edge case.
 */
const request = require("supertest");
const app = require("../src/app");
const University = require("../src/models/University");
const Program = require("../src/models/Program");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("./testSetup");
const cacheService = require("../src/services/cacheService");

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearDatabase();
  cacheService.flush();
});

afterAll(async () => {
  await disconnectTestDb();
});

// Registers a user and returns their auth token.
// This helper keeps individual tests concise.
async function registerAndLogin(email = "student@test.com") {
  await request(app).post("/api/auth/register").send({
    fullName: "Test Student",
    email,
    password: "Password123!",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email,
    password: "Password123!",
  });

  return loginRes.body.data.token;
}

// Seeds a minimal university + program so tests have a valid programId to use.
// Returns the seeded program's _id as a string.
async function seedUniversityAndProgram() {
  const university = await University.create({
    name: "Test University",
    country: "Canada",
    city: "Toronto",
    partnerType: "direct",
    scholarshipAvailable: true,
    popularScore: 80,
  });

  const program = await Program.create({
    university: university._id,
    universityName: "Test University",
    country: "Canada",
    city: "Toronto",
    title: "Master of Testing",
    field: "Computer Science",
    degreeLevel: "master",
    tuitionFeeUsd: 20000,
    intakes: ["September", "January"],
    minimumIelts: 6.5,
    scholarshipAvailable: true,
  });

  return { programId: program._id.toString(), universityId: university._id.toString() };
}

// --- Create Application ---

describe("POST /api/applications", () => {
  test("creates an application and returns 201 with an initial timeline entry", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "September" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("draft");
    // The timeline should have exactly one entry (the initial "draft" entry).
    expect(res.body.data.timeline).toHaveLength(1);
    expect(res.body.data.timeline[0].status).toBe("draft");
  });

  test("returns 401 when no auth token is provided", async () => {
    const { programId } = await seedUniversityAndProgram();

    const res = await request(app)
      .post("/api/applications")
      .send({ programId, intake: "September" });

    expect(res.status).toBe(401);
  });

  test("returns 400 when programId or intake is missing", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ intake: "September" }); // programId intentionally missing

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 404 when the programId does not exist", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId: "507f1f77bcf86cd799439011", intake: "September" });

    expect(res.status).toBe(404);
  });

  // Edge case: creating a second application for the same student + program + intake
  // should return 409, not a raw Mongo error.
  test("returns 409 on duplicate application (same student + program + intake)", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();

    // First application — should succeed.
    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "September" });

    // Second application with the same details — should fail with 409.
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "September" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already have an application/i);
  });

  test("allows the same student to apply to the same program with a different intake", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();

    // September application.
    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "September" });

    // January application — different intake, should be allowed.
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "January" });

    expect(res.status).toBe(201);
  });
});

// --- Update Application Status ---

describe("PATCH /api/applications/:id/status", () => {
  // Helper: creates an application as a student and returns the application ID.
  async function createTestApplication(token, programId) {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ programId, intake: "September" });
    return res.body.data._id;
  }

  test("moves application from draft to submitted and adds a timeline entry", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();
    const appId = await createTestApplication(token, programId);

    const res = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "submitted", note: "Submitted by student." });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("submitted");
    // Timeline should now have 2 entries: draft + submitted.
    expect(res.body.data.timeline).toHaveLength(2);
    expect(res.body.data.timeline[1].status).toBe("submitted");
    expect(res.body.data.timeline[1].note).toBe("Submitted by student.");
  });

  test("returns 401 when no auth token is provided", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();
    const appId = await createTestApplication(token, programId);

    const res = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .send({ status: "submitted" });

    expect(res.status).toBe(401);
  });

  test("returns 404 for a non-existent application ID", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch("/api/applications/507f1f77bcf86cd799439011/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "submitted" });

    expect(res.status).toBe(404);
  });

  // Edge case: trying to skip steps in the workflow should return 400 with a clear message.
  test("returns 400 with a clear message when the status transition is invalid", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();
    const appId = await createTestApplication(token, programId);

    // Trying to jump from draft directly to enrolled (skipping several steps).
    const res = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "enrolled" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // The error message should mention what the current status is and what's valid.
    expect(res.body.message).toMatch(/cannot move from/i);
    expect(res.body.message).toMatch(/draft/i);
  });

  // Edge case: trying to move from a terminal status (enrolled) should also fail.
  test("returns 400 when trying to transition from a terminal status", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();
    const appId = await createTestApplication(token, programId);

    // Walk the application to 'enrolled' step by step.
    const steps = ["submitted", "under-review", "offer-received", "visa-processing", "enrolled"];
    for (const step of steps) {
      await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: step });
    }

    // Now try to move from enrolled (terminal) to anything.
    const res = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "submitted" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/terminal/i);
  });

  test("returns 400 when the requested status is not a valid status value", async () => {
    const token = await registerAndLogin();
    const { programId } = await seedUniversityAndProgram();
    const appId = await createTestApplication(token, programId);

    const res = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "approved" }); // "approved" is not a valid status

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid status/i);
  });
});
