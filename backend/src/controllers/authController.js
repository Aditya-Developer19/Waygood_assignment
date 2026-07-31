const jwt = require("jsonwebtoken");

const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

// Signs a JWT for a given student document.
// The payload includes the student's ID (as "sub") and role, so downstream
// middleware and routes can identify who is making the request and what they're allowed to do.
function signToken(student) {
  return jwt.sign(
    { sub: student._id, role: student.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

// Formats a student document for API responses by stripping the password field.
// We never want to accidentally send the hashed password back to the client.
function formatUser(student) {
  const user = student.toObject ? student.toObject() : { ...student };
  delete user.password;
  return user;
}

// POST /api/auth/register
// Creates a new student or counselor account.
// Password hashing is handled by the Student model's pre-save hook (bcrypt, 10 rounds),
// so we just save the document and the model takes care of it.
// Returns 409 if the email is already registered so the client gets a clear error
// instead of a raw Mongo duplicate-key crash.
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  // Basic field presence check — give the client a clear message on what's missing.
  if (!fullName || !email || !password) {
    throw new HttpError(400, "fullName, email, and password are required.");
  }

  // Check for an existing account with this email before trying to save,
  // so we return a friendly 409 instead of a 500 from the unique index violation.
  const existing = await Student.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  // Create the student document. The model's pre-save hook will hash the password.
  // Role defaults to "student" if not provided; only "student" and "counselor" are valid.
  const student = await Student.create({ fullName, email, password, role });

  res.status(201).json({
    success: true,
    data: formatUser(student),
  });
});

// POST /api/auth/login
// Authenticates a student or counselor with email + password.
// Returns a signed JWT on success. The token should be sent as
// "Authorization: Bearer <token>" on all protected routes.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, "email and password are required.");
  }

  // Find the student and deliberately include the password field
  // (it's excluded by default in some query helpers but we need it to compare).
  const student = await Student.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!student) {
    // Return a generic message — don't reveal whether the email exists or not.
    throw new HttpError(401, "Invalid email or password.");
  }

  // Use the model's comparePassword method (bcrypt.compare under the hood).
  const passwordMatches = await student.comparePassword(password);
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const token = signToken(student);

  res.json({
    success: true,
    data: {
      token,
      user: formatUser(student),
    },
  });
});

// GET /api/auth/me
// Returns the profile of the currently authenticated user.
// This route is protected by the requireAuth middleware (see authRoutes.js),
// which verifies the JWT and attaches the student document to req.user.
// So here we just return what the middleware already fetched.
const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

module.exports = {
  register,
  login,
  me,
};
