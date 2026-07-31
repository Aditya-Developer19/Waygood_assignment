const University = require("../models/University");
const cacheService = require("../services/cacheService");
const asyncHandler = require("../utils/asyncHandler");

// Converts a query-string value ("true"/"false") to a real boolean.
// Query strings are always strings, so we can't use a plain truthy check.
function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

// GET /api/universities
// Returns a paginated, filterable, sortable list of universities.
// Supported filters: country, partnerType, scholarshipAvailable, q (free-text search).
// Supported sort options: "popular" (default), "name", "ranking".
// Response always follows { success, data, meta: { page, limit, total, totalPages } }.
const listUniversities = asyncHandler(async (req, res) => {
  const {
    country,
    partnerType,
    q,
    scholarshipAvailable,
    sortBy = "popular",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  // Exact-match filters — straightforward equality checks.
  if (country) {
    filters.country = country;
  }

  if (partnerType) {
    filters.partnerType = partnerType;
  }

  // scholarshipAvailable comes in as a string from the query string,
  // so we convert it to a real boolean before using it as a filter.
  const scholarshipFlag = parseBoolean(scholarshipAvailable);
  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  // Free-text search across name, country, city, and tags.
  // Using a case-insensitive regex so "canada" matches "Canada".
  // For very large collections a text index ($text/$search) would be faster,
  // but for the current data size regex is fine and easier to read.
  if (q) {
    filters.$or = [
      { name: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
      { city: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  // Clamp page/limit to safe values so clients can't request absurd page sizes.
  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 50);

  // Sort options. "popular" is the default — most visited/applied-to first.
  const sortMap = {
    name: { name: 1 },
    ranking: { qsRanking: 1, popularScore: -1 },
    popular: { popularScore: -1, qsRanking: 1 },
  };

  // Run the data query and count in parallel so we don't make two serial DB round-trips.
  const [items, total] = await Promise.all([
    University.find(filters)
      .sort(sortMap[sortBy] || sortMap.popular)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    University.countDocuments(filters),
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

// GET /api/universities/popular
// Returns the top 6 universities by popularity score.
// Results are cached in memory for CACHE_TTL_SECONDS (default 5 minutes).
//
// Caching strategy: We store the result in a simple in-memory Map with a TTL.
// Trade-off: data can be up to 5 minutes stale after a popularity update, but
// we avoid hitting MongoDB on every request to this hot endpoint.
// For a production system with multiple server instances you'd use Redis instead,
// since in-memory cache is per-process and won't be shared across instances.
const listPopularUniversities = asyncHandler(async (req, res) => {
  const cacheKey = "popular-universities";
  const cachedPayload = cacheService.get(cacheKey);

  // Serve from cache if we have a fresh copy.
  if (cachedPayload) {
    return res.json({
      success: true,
      data: cachedPayload,
      meta: {
        cache: "hit",
      },
    });
  }

  // Cache miss — fetch from DB and store result for the next request.
  const universities = await University.find()
    .sort({ popularScore: -1, qsRanking: 1 })
    .limit(6)
    .lean();

  cacheService.set(cacheKey, universities);

  res.json({
    success: true,
    data: universities,
    meta: {
      cache: "miss",
    },
  });
});

module.exports = {
  listPopularUniversities,
  listUniversities,
};
