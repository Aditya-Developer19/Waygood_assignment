# Waygood Study Abroad Candidate Evaluation Starter

This repository is a starter assignment for backend-focused MERN candidates interviewing with Waygood.

Waygood's public website positions the business around helping students discover universities, compare options, plan budgets, and navigate their study-abroad journey with AI-assisted tools and partner networks. This starter mirrors that business context by focusing on student discovery, recommendation, and application tracking.

## Business Scenario

You are joining the engineering team working on a study-abroad platform for students and counselors.

The product already has:

- a basic university and program catalog
- seeded sample data for students, universities, programs, and applications
- a minimal React dashboard shell
- starter backend architecture with Express, Mongoose, controllers, services, and middleware

The product is still missing critical engineering work needed for a real candidate-ready release.

## Your Assignment

Build on top of this starter and complete the platform features below.

### Required Tasks

1. Implement secure authentication

- Complete `POST /api/auth/register`
- Complete `POST /api/auth/login`
- Add a protected `GET /api/auth/me`
- Use JWT-based authentication
- Store passwords securely using hashing
- Support roles for `student` and `counselor`

2. Complete advanced university and program discovery

- Extend `GET /api/universities` and `GET /api/programs`
- Add filtering by country, intake, degree level, budget, scholarship availability, and search term
- Add pagination metadata and sorting options
- Make the response format consistent and frontend-friendly

3. Build a recommendation engine using MongoDB aggregation

- Improve `GET /api/recommendations/:studentId`
- Use MongoDB aggregation to recommend relevant programs for a student
- Consider preferred countries, budget, field of interest, intake, and IELTS score
- Return top matches with a short explanation of why each result matched

4. Implement the application workflow

- Complete `POST /api/applications`
- Complete `PATCH /api/applications/:id/status`
- Prevent duplicate applications for the same student, program, and intake
- Enforce valid status transitions
- Record a timeline/history entry when status changes

5. Add caching and performance improvements

- Cache `GET /api/universities/popular` and/or dashboard summary responses
- You may use Redis or improve the provided in-memory cache
- Add or document MongoDB indexes that improve the most important queries
- Keep performance tradeoffs clear in code comments or README notes

6. Add testing and developer documentation

- Add tests for at least 2 important API flows
- Include at least 1 edge-case test
- Update this README with any assumptions, setup steps, and architecture notes needed to review your submission

### Bonus Tasks

- Integrate an AI endpoint for study-plan suggestions, SOP helper prompts, or shortlist summaries
- Dockerize the backend and database setup
- Improve the React dashboard to consume your new APIs cleanly
- Add rate limiting, request logging, or role-based access improvements

## What We Will Evaluate

- Backend architecture and code organization
- API design, validation, and error handling
- MongoDB query quality, aggregation usage, and indexing awareness
- Performance thinking, including caching and response design
- Code readability, maintainability, and naming
- Testing depth and practical engineering judgment
- How well your solution reflects a real study-abroad product workflow

## Suggested Timebox

A strong submission can usually be completed in 6-8 focused hours. We care more about thoughtful engineering tradeoffs than feature volume.

## Suggested Submission Expectations

- Keep the solution realistic and production-minded
- Favor clean, explainable code over unnecessary complexity
- If you make assumptions, document them
- If you skip a bonus feature, that is okay
- Share your repository, setup instructions, and any sample credentials or environment notes needed to review

## Starter Project Structure

```text
.
|-- backend
|   |-- src
|   |   |-- config
|   |   |-- controllers
|   |   |-- data
|   |   |-- middleware
|   |   |-- models
|   |   |-- routes
|   |   |-- scripts
|   |   |-- services
|   |   `-- utils
|-- frontend
|   `-- src
`-- docs
```

## Getting Started

### 1. Backend setup

```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

On macOS or Linux, use `cp .env.example .env` instead of `copy`.

## Environment Variables

See `backend/.env.example`.

## Seeded Data Included

The seed script creates sample:

- students with profile preferences
- universities across key study-abroad destinations
- programs with tuition, intake, and IELTS requirements
- applications with mixed statuses

## Sample Seed Credentials

After running the seed script, you can use:

- `aarav@example.com` / `Candidate123!`
- `sara@example.com` / `Candidate123!`
- `counselor@example.com` / `Candidate123!`

## Notes For Candidates

- Some routes are intentionally incomplete
- Some services are intentionally simple and should be improved
- The codebase is structured to show expected engineering direction, not to be finished
- You can refactor any part of the starter if your approach is better

## Candidate-Friendly Deliverables

Along with this README, a Word assignment brief is available at:

- `docs/Waygood_Candidate_Assignment.docx`

## Reference Context Used For This Assignment Design

- Waygood website: student discovery, AI tools, calculators, and partner-university positioning
- Job description: backend APIs, MongoDB aggregation, performance optimization, caching, and AI integration

---

## Implementation Notes & Technical Documentation

This section provides technical documentation of the implementation, architecture decisions, status workflow, and verification steps for evaluators reviewing this repository.

---

### 1. Setup Instructions

The setup instructions from the starter starter remain valid with no breaking changes:

```bash
# 1. Navigate to backend directory and install dependencies
cd backend
npm install

# 2. Configure environment variables
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# 3. Seed database with initial students, universities, programs, and applications
npm run seed

# 4. Start local development server (runs on port 4000 by default)
npm run dev

# 5. Run automated test suite (uses in-memory MongoDB — no local Mongo process required)
npm test
```

*Note on tests:* Running `npm test` executes Jest using `mongodb-memory-server`. On the very first run, it automatically downloads an isolated MongoDB binary (~60MB) which is cached for subsequent instant runs.

---

### 2. Environment Variables

Below is every environment variable declared in `.env.example` and referenced across the codebase (`src/config/env.js`, `src/app.js`):

| Environment Variable | Default Value | Description |
|---|---|---|
| `PORT` | `4000` | Port number on which the Express server listens for HTTP requests. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/waygood-evaluation` | Connection string for the MongoDB instance. |
| `JWT_SECRET` | `replace-with-a-long-secret` | Secret key used by `jsonwebtoken` to sign and verify Bearer tokens. |
| `JWT_EXPIRES_IN` | `1d` | Expiration time for generated JWT tokens (e.g. `1d`, `7d`, `1h`). |
| `CACHE_TTL_SECONDS` | `300` | In-memory cache time-to-live duration in seconds (5 minutes). |
| `REDIS_URL` | `""` | Connection string for an external Redis instance (unused; local in-memory Map cache is active). |
| `OPENAI_API_KEY` | `""` | Key for OpenAI API (unused; optional bonus feature omitted). |
| `NODE_ENV` | `development` | Node environment mode (`test` suppresses Morgan HTTP logging during Jest runs). |

---

### 3. What Was Implemented

#### Required Task 1 — Authentication
- **Endpoints & Files Touched:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` in `src/controllers/authController.js`, `src/routes/authRoutes.js`, and `src/middleware/auth.js`.
- **Key Design Decision:** Password hashing is delegated to the Mongoose `Student` model `pre('save')` hook (`bcryptjs`, 10 rounds), and JWTs store `{ sub: student._id, role: student.role }`. Added a `requireRole(role)` middleware factory alongside `requireAuth` to enable role-based authorization.
- **Tradeoffs / Limitations:** Stateless JWT authentication relies entirely on expiration (`JWT_EXPIRES_IN`); token revocation or blacklisting on logout is not implemented.

#### Required Task 2 — University & Program Discovery
- **Endpoints & Files Touched:** `GET /api/universities` in `src/controllers/universityController.js` and `GET /api/programs` in `src/controllers/programController.js`.
- **Key Design Decision:** Extended program filtering with `minTuition` and `maxTuition` parameters to form budget range queries (`{ tuitionFeeUsd: { $gte, $lte } }`) alongside `country`, `degreeLevel`, `intake`, `field`, `scholarshipAvailable`, and search term `q`.
- **Tradeoffs / Limitations:** Free-text search uses case-insensitive regular expressions (`$regex`), which is straightforward for seeded data sizes but lacks full-text index scoring on very large collections.

#### Required Task 3 — Recommendation Engine
- **Endpoints & Files Touched:** `GET /api/recommendations/:studentId` in `src/controllers/recommendationController.js` and `src/services/recommendationService.js`.
- **Key Design Decision:** Replaced in-memory JavaScript `.find()` + `.map()` filtering with a single 5-stage MongoDB aggregation pipeline (`$match` → `$addFields: matchScore` → `$addFields: matchReasons` → `$sort` → `$limit`).
- **Tradeoffs / Limitations:** Field matching uses `$regexMatch` within a `$reduce` loop over interested fields (requires MongoDB 4.2+). The initial `$match` stage pre-filters on `country` and `maxBudgetUsd`, assuming candidate programs outside these parameters should be excluded early.

#### Required Task 4 — Application Workflow
- **Endpoints & Files Touched:** `POST /api/applications` and `PATCH /api/applications/:id/status` in `src/controllers/applicationController.js` and `src/routes/applicationRoutes.js`.
- **Key Design Decision:** Derived the student ID directly from the verified JWT (`req.user._id`) instead of request body parameters to prevent IDOR attacks. Enforced duplicate prevention via pre-query before DB writes and validated state progression against `validStatusTransitions`.
- **Tradeoffs / Limitations:** `PATCH /api/applications/:id/status` requires `requireAuth` but is not restricted exclusively to the `counselor` role, allowing any authenticated user to transition status provided the state progression is valid.

#### Required Task 5 — Performance & Caching
- **Endpoints & Files Touched:** `GET /api/universities/popular` and `GET /api/dashboard` in `src/services/cacheService.js`, `src/controllers/universityController.js`, and `src/models/Program.js`.
- **Key Design Decision:** Enhanced `MemoryCacheService` with a `flush()` method for test isolation and added compound + multikey (`intakes: 1`) indexes on `Program` with inline documentation mapping each index to its query pattern.
- **Tradeoffs / Limitations:** The cache uses an in-process JavaScript `Map`. In a multi-instance production environment behind a load balancer, instances would not share cache state unless migrated to Redis.

---

### 4. Recommendation Engine — How It Works

The recommendation engine executes entirely inside MongoDB via an aggregation pipeline in `src/services/recommendationService.js`:

1. **Stage 1 — Pre-filtering (`$match`):** Discards programs that do not match the student's `targetCountries` or exceed `maxBudgetUsd`. This stage utilizes compound indexes to limit scan volume.
2. **Stage 2 — Scoring (`$addFields: matchScore`):** Calculates a scalar `matchScore` (0 to 100 points) by summing conditional rules (`$cond`):
   - **+35 points:** Program `country` is in student's `targetCountries`.
   - **+30 points:** Program `field` substring matches any entry in `interestedFields` (evaluated via `$reduce` + `$regexMatch`).
   - **+20 points:** Tuition fee is within student's budget (`tuitionFeeUsd <= maxBudgetUsd`).
   - **+10 points:** Student's `preferredIntake` is offered in the program's `intakes` array.
   - **+5 points:** Student's IELTS score meets or exceeds program's `minimumIelts`.
3. **Stage 3 — Reason Generation (`$addFields: matchReasons`):** Constructs human-readable explanation strings for each matched criterion using `$concat` and `$filter` (e.g., `"Matches your preferred country: Canada"`, `"Within your budget (saves $2100)"`, `"IELTS requirement met (needs 6.5, you have 7.0)"`).
4. **Stage 4 & 5 — Ordering & Limit (`$sort` and `$limit`):** Sorts candidates descending by `matchScore` and limits output to the top 10 matches.

---

### 5. Application Workflow — Status Rules

Applications adhere to the state transition graph defined in `src/config/constants.js`:

```text
[draft] ──► [submitted] ──► [under-review] ──► [offer-received] ──► [visa-processing] ──► [enrolled]
   │             │                 │                    │                     │
   └─── (N/A)    └──► [rejected]   └──► [rejected]      └──► [rejected]        └──► [rejected]
```

- **Terminal States:** `enrolled` and `rejected` (no further status changes permitted).
- **Invalid Transition Behavior:** Any illegal jump (e.g. `draft` → `enrolled` or modifying a `rejected` application) is blocked before saving. The API returns HTTP `400 Bad Request` with an explicit error message detailing the current status and allowed next steps:
  ```json
  {
    "success": false,
    "message": "Cannot move from 'draft' to 'enrolled'. Valid transitions: submitted."
  }
  ```
- **Timeline Audit Trail:** Every valid transition appends a timestamped timeline record (`{ status, note, changedAt }`) to the application document's `timeline` array.

---

### 6. Caching & Indexing

#### Cached Endpoints
- `GET /api/universities/popular`: Caches top 6 popular universities under key `"popular-universities"`.
- `GET /api/dashboard`: Caches overview counts and country/status aggregations under key `"dashboard-overview"`.

#### Cache Approach & Invalidation
- **Service:** `MemoryCacheService` (`src/services/cacheService.js`) using a JavaScript `Map`.
- **TTL Strategy:** Default TTL of 300 seconds (5 minutes), configurable via `CACHE_TTL_SECONDS`.
- **Invalidation:** Lazy cleanup on read after TTL expiry; programmatically flushed via `cacheService.flush()` between test runs.
- **Response Headers/Meta:** Returns `meta: { cache: "hit" }` or `meta: { cache: "miss" }`.

#### MongoDB Indexes
- `Program.index({ country: 1, degreeLevel: 1, field: 1, tuitionFeeUsd: 1 })`: Speeds up multi-parameter discovery filtering and recommendation pre-filtering.
- `Program.index({ intakes: 1 })`: Multikey index accelerating intake array matches (`?intake=September`).
- `Program.index({ university: 1 })`: Speeds up program queries linked to a specific university.
- `Application.index({ student: 1, program: 1, intake: 1 }, { unique: true })`: Enforces uniqueness at DB level and accelerates duplicate check lookups.
- `University.index({ name: "text", country: "text", city: "text" })`: Text index supporting multi-field keyword searches.

---

### 7. Testing

Automated tests are located in `backend/tests/` and run using `npm test` (Jest + Supertest + `mongodb-memory-server`).

- **`tests/auth.test.js` (11 tests):**
  - Covers registration (`POST /api/auth/register`), login (`POST /api/auth/login`), and profile retrieval (`GET /api/auth/me`).
  - *Edge Case Test:* Attempting registration with an existing email returns `409 Conflict` rather than crashing on Mongo duplicate key errors.
- **`tests/applications.test.js` (12 tests):**
  - Covers application creation (`POST /api/applications`) and status progression (`PATCH /api/applications/:id/status`).
  - *Edge Case Tests:*
    1. Submitting a duplicate application for the same student + program + intake combo returns `409 Conflict`.
    2. Attempting an invalid status jump (e.g. `draft` → `enrolled`) returns `400 Bad Request` with allowed transition details.
    3. Attempting status updates on a terminal state (`enrolled`) returns `400 Bad Request`.

---

### 8. Assumptions Made

1. **Student Context from Token:** `POST /api/applications` derives the applicant ID from `req.user._id` (JWT), assuming students only apply for themselves.
2. **Duplicate Definition:** An application is a duplicate if `student`, `program`, and `intake` all match an existing record. Applying to the same program for a different intake is allowed.
3. **Status Workflow Map:** Utilized the existing `validStatusTransitions` map in `src/config/constants.js` (`draft` → `submitted` → `under-review` → `offer-received` → `visa-processing` → `enrolled`), which expands on the simplified assignment prompt description.
4. **Pagination Defaults:** Page defaults to 1, limit defaults to 10 (clamped between 1 and 50).
5. **Denormalized Application Fields:** `destinationCountry` and `university` are stored directly on the Application document to optimize list queries.

---

### 9. Known Frontend Gaps

The `frontend/` codebase was not modified. The following gaps exist if connecting a frontend to these APIs:

1. **Bearer Token Storage:** Frontend must store JWT tokens on login and pass `Authorization: Bearer <token>` headers for protected application routes.
2. **Auth Payload Handling:** `POST /api/auth/login` returns `{ success: true, data: { token, user } }`; frontend auth handlers must extract `token` from `data.token`.
3. **Application Body:** Frontend forms should omit `studentId` when calling `POST /api/applications` as it is extracted server-side from the token.
4. **Recommendation Metadata:** Recommendations output includes `matchScore` and `matchReasons`; frontend components can render match tags and explanation lists.
5. **Budget Range Inputs:** Programs discovery supports `minTuition`; frontend can expose a minimum tuition price slider.

---

### 10. How to Verify

Below are example cURL commands to verify each implemented task against a running backend (`npm run dev`):

#### 1. Register a New User (Task 1)
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Student",
    "email": "teststudent@example.com",
    "password": "Password123!",
    "role": "student"
  }'
```

#### 2. Login & Obtain JWT (Task 1)
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teststudent@example.com",
    "password": "Password123!"
  }'
```

#### 3. Fetch Authenticated User Profile (Task 1)
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 4. Filter Universities & Programs (Task 2)
```bash
# Filter universities by country and scholarship
curl -X GET "http://localhost:4000/api/universities?country=Canada&scholarshipAvailable=true"

# Filter programs by degree level and budget range
curl -X GET "http://localhost:4000/api/programs?degreeLevel=master&minTuition=15000&maxTuition=23000"
```

#### 5. Recommendation Engine (Task 3)
```bash
# Login as seeded student Aarav Malhotra (aarav@example.com / Candidate123!) to get ID, or use Aarav's ObjectId:
curl -X GET http://localhost:4000/api/recommendations/<AARAV_STUDENT_ID>
```

#### 6. Create Application & Verify Duplicate Check (Task 4)
```bash
# Create application
curl -X POST http://localhost:4000/api/applications \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "programId": "<VALID_PROGRAM_ID>",
    "intake": "September"
  }'

# Run the exact same command again to verify 409 Conflict duplicate error
```

#### 7. Transition Application Status & Verify Edge Case (Task 4)
```bash
# Valid transition (draft -> submitted)
curl -X PATCH http://localhost:4000/api/applications/<APPLICATION_ID>/status \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "submitted",
    "note": "Submitted application documents"
  }'

# Invalid transition attempt (submitted -> enrolled) to verify 400 Bad Request
curl -X PATCH http://localhost:4000/api/applications/<APPLICATION_ID>/status \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "enrolled"
  }'
```

#### 8. Verify Caching (Task 5)
```bash
# First request (Returns meta.cache: "miss")
curl -X GET http://localhost:4000/api/universities/popular

# Immediate second request (Returns meta.cache: "hit")
curl -X GET http://localhost:4000/api/universities/popular
```

