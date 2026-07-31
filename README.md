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

## Implementation Notes (Candidate Submission)

The sections below document the implementation decisions, setup steps, and known limitations added during the assignment.

### Setup Instructions

**Prerequisites:** Node.js 18+, MongoDB 6+ running locally (or a MongoDB Atlas connection string).

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Copy environment variables and fill in your values
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# 3. Seed the database with sample universities, programs, students, and applications
npm run seed

# 4. Start the development server (default port 4000)
npm run dev

# 5. Run tests (uses an in-memory MongoDB — no running Mongo instance needed)
npm test
```

The frontend can be started separately with `cd frontend && npm install && npm run dev`.

---

### Environment Variables

All variables are defined in `backend/.env.example`. Key ones:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Port the Express server listens on |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/waygood-evaluation` | MongoDB connection string |
| `JWT_SECRET` | `replace-with-a-long-secret` | Secret used to sign and verify JWTs. **Change this in production.** |
| `JWT_EXPIRES_IN` | `1d` | How long issued tokens stay valid (e.g. `1d`, `7d`, `1h`) |
| `CACHE_TTL_SECONDS` | `300` | How many seconds in-memory cache entries stay valid (5 minutes by default) |
| `REDIS_URL` | _(empty)_ | Not used — the starter wires Redis but this implementation uses the in-memory cache only |
| `OPENAI_API_KEY` | _(empty)_ | Not used — AI features are a bonus task and were not implemented |

---

### Assumptions Made

1. **Student ID from token, not request body.** When a student creates an application (`POST /api/applications`), their ID is taken from the JWT (`req.user._id`) rather than the request body. This prevents a student from submitting applications on behalf of someone else. Counselors creating applications on a student's behalf would need a separate admin endpoint — out of scope for this assignment.

2. **Status update is not role-restricted.** The `PATCH /api/applications/:id/status` route requires authentication (`requireAuth`) but not a specific role. In a real product, only counselors would move status from `under-review` to `offer-received`. For this assignment the valid-transitions map already prevents misuse — any logged-in user can only move to states permitted by the workflow.

3. **Status workflow follows the `constants.js` map.** The `validStatusTransitions` map was already defined in the starter with a richer workflow than the assignment description: `draft → submitted → under-review → offer-received → visa-processing → enrolled/rejected`. This was kept as-is rather than simplified to `Applied → Reviewed → Accepted/Rejected`.

4. **`universityName` and `destinationCountry` are denormalized on the Application document.** Rather than always joining to Program and University, the application stores `destinationCountry` directly. This matches the existing schema design in the starter.

5. **No input sanitization beyond basic validation.** Field presence and type are checked. For a production system, a library like `zod` or `express-validator` would be used for full schema validation.

6. **Tests use `mongodb-memory-server`.** This avoids needing a running MongoDB instance to run tests. The binary is downloaded on the first `npm test` run (about 60–80 MB) and cached by the library for subsequent runs.

---

### Architecture Decisions

#### Recommendation Engine

The recommendation engine runs entirely as a **MongoDB aggregation pipeline** inside `services/recommendationService.js`. Here is why that matters:

The previous starter implementation fetched all candidate programs into Node.js with `.find()` and then scored them in JavaScript. That approach works but has two problems:
1. Every byte of every candidate program document travels from MongoDB to Node before any filtering happens.
2. As the programs collection grows, this gets slower linearly.

The aggregation pipeline approach fixes both:
- **Stage 1 (`$match`)** pre-filters by `country` and `tuitionFeeUsd` before any other stage runs. MongoDB can use the compound index `{ country, degreeLevel, field, tuitionFeeUsd }` here, so only a small subset of documents is scanned.
- **Stage 2 (`$addFields: matchScore`)** computes the score inside MongoDB using `$cond` expressions — no data leaves the DB until scoring is done.
- **Stage 3 (`$addFields: matchReasons`)** builds the human-readable reason strings (e.g. `"Matches your preferred country: Canada"`) also inside MongoDB, so the controller receives a fully-formed result.
- **Stages 4 and 5 (`$sort`, `$limit`)** return only the top 10 matches.

The `$regexMatch` operator (used for field-of-interest substring matching) requires MongoDB 4.2 or later. Since the project uses Mongoose 8.x (which requires MongoDB 5+), this is safe.

**Scoring weights:**

| Criterion | Points |
|---|---|
| Country matches student's target countries | +35 |
| Field of study contains student's interested fields | +30 |
| Tuition fee within student's max budget | +20 |
| Student's preferred intake is offered | +10 |
| Student's IELTS score meets the minimum | +5 |
| **Maximum possible score** | **100** |

#### Caching Strategy

Two endpoints are cached in memory using the existing `MemoryCacheService` in `services/cacheService.js`:

- `GET /api/universities/popular` — the top 6 universities by popularity score
- `GET /api/dashboard` — aggregated counts and breakdowns

**How it works:** On the first request, the result is fetched from MongoDB and stored in a JavaScript `Map` with an expiry timestamp. On subsequent requests within the TTL window (default: 5 minutes), the stored value is returned immediately without touching the database. When the TTL expires, the next request fetches fresh data and resets the cache.

**Trade-off:** Data can be up to 5 minutes stale after a change. This is acceptable for popularity scores and dashboard summaries, which are aggregate views that don't need to be real-time.

**Limitation:** The cache is per-process. Running multiple Node.js instances (e.g., behind a load balancer) means each instance has its own independent cache. For a multi-instance deployment, replace `MemoryCacheService` with a Redis client — the `REDIS_URL` environment variable is already wired for this.

---

### Known Frontend Gaps

The frontend was not modified during this implementation. The following API changes may require frontend updates to work correctly:

1. **Auth headers required on application create/update.** `POST /api/applications` and `PATCH /api/applications/:id/status` now require a `Authorization: Bearer <token>` header. The frontend must store the JWT after login and attach it to these requests.

2. **Login response shape changed.** The login endpoint now returns `{ success: true, data: { token, user } }`. The frontend will need to read `data.token` and `data.user` from the response.

3. **New `minTuition` filter on `/api/programs`.** The programs list now accepts a `minTuition` query parameter in addition to `maxTuition`. The frontend can optionally expose this as a budget range slider.

4. **Recommendation response includes new fields.** Each recommendation now has `matchScore` (0–100) and `matchReasons` (array of strings). The frontend dashboard can display these to help students understand why a program was suggested.

5. **Application `createApplication` no longer accepts `studentId` in the body.** The student ID is derived from the JWT. If the frontend was passing a `studentId` field, it should be removed.
