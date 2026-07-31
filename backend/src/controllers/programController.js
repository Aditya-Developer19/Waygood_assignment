const Program = require("../models/Program");
const asyncHandler = require("../utils/asyncHandler");

// Converts a query-string value ("true"/"false") to a real boolean.
// Query strings are always strings, so we can't use a plain truthy check.
function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

// GET /api/programs
// Returns a paginated, filterable, sortable list of programs.
// Supported filters:
//   - country        — exact match on the country field
//   - degreeLevel    — exact match (bachelor, master, diploma, certificate)
//   - intake         — matches programs that include this intake in their intakes array
//   - field          — exact match on the subject field
//   - minTuition     — programs with tuitionFeeUsd >= this value
//   - maxTuition     — programs with tuitionFeeUsd <= this value
//   - scholarshipAvailable — true/false
//   - q              — free-text search across title, universityName, and field
// Supported sort options: "relevance" (default), "tuitionAsc", "tuitionDesc".
// Response always follows { success, data, meta: { page, limit, total, totalPages } }.
const listPrograms = asyncHandler(async (req, res) => {
  const {
    country,
    degreeLevel,
    intake,
    field,
    q,
    minTuition,
    maxTuition,
    scholarshipAvailable,
    sortBy = "relevance",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  // Exact-match filters — straightforward equality checks.
  if (country) {
    filters.country = country;
  }

  if (degreeLevel) {
    filters.degreeLevel = degreeLevel;
  }

  if (field) {
    filters.field = field;
  }

  // intakes is stored as an array in the DB (a program can have multiple intakes).
  // Querying with a scalar value on an array field works in Mongo — it checks
  // if the array contains that value (equivalent to $elemMatch for a simple equality).
  if (intake) {
    filters.intakes = intake;
  }

  // Budget range filter. minTuition and maxTuition can be used together or separately.
  // This builds the query as { tuitionFeeUsd: { $gte: X, $lte: Y } }.
  if (minTuition || maxTuition) {
    filters.tuitionFeeUsd = {};
    if (minTuition) {
      filters.tuitionFeeUsd.$gte = Number(minTuition);
    }
    if (maxTuition) {
      filters.tuitionFeeUsd.$lte = Number(maxTuition);
    }
  }

  // scholarshipAvailable comes in as a string from the query string,
  // so we convert it to a real boolean before using it as a filter.
  const scholarshipFlag = parseBoolean(scholarshipAvailable);
  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  // Free-text search across the most user-visible text fields.
  // Case-insensitive regex so "computer" matches "Computer Science".
  if (q) {
    filters.$or = [
      { title: { $regex: q, $options: "i" } },
      { universityName: { $regex: q, $options: "i" } },
      { field: { $regex: q, $options: "i" } },
    ];
  }

  // Clamp page/limit to safe values so clients can't request absurd page sizes.
  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 50);

  // Sort options. "relevance" is the default — scholarships first, then cheapest.
  const sortMap = {
    tuitionAsc: { tuitionFeeUsd: 1 },
    tuitionDesc: { tuitionFeeUsd: -1 },
    relevance: { scholarshipAvailable: -1, tuitionFeeUsd: 1 },
  };

  // Run the data query and count in parallel so we don't make two serial DB round-trips.
  const [items, total] = await Promise.all([
    Program.find(filters)
      .sort(sortMap[sortBy] || sortMap.relevance)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Program.countDocuments(filters),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

module.exports = {
  listPrograms,
};
