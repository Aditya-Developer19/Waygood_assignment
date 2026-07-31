const jwt = require("jsonwebtoken");

const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

// requireAuth — verifies the Bearer JWT sent in the Authorization header.
// On success it attaches the full student document (minus password) to req.user
// so that downstream controllers can use req.user._id, req.user.role, etc.
// On failure it throws 401 — the error handler sends it to the client.
const requireAuth = asyncHandler(async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization token missing.");
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const student = await Student.findById(decoded.sub).select("-password");

    if (!student) {
      throw new HttpError(401, "Authenticated user no longer exists.");
    }

    req.user = student;
    next();
  } catch (error) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError on bad/expired tokens.
    // We catch both and return a generic 401 so we don't leak token internals.
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "Invalid or expired token.");
  }
});

// requireRole — a factory that returns a middleware checking the authenticated user's role.
// Usage: router.patch('/...', requireAuth, requireRole('counselor'), handler)
// It must come AFTER requireAuth because it reads req.user (set by requireAuth).
// Returns 403 Forbidden if the user doesn't have the required role.
function requireRole(role) {
  return function checkRole(req, res, next) {
    if (!req.user || req.user.role !== role) {
      throw new HttpError(
        403,
        `Access denied. This route requires the '${role}' role.`
      );
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
