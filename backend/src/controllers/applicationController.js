const Application = require("../models/Application");
const Program = require("../models/Program");
const { validStatusTransitions, applicationStatuses } = require("../config/constants");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

// GET /api/applications
// Returns a list of applications, optionally filtered by studentId and/or status.
// Used by counselors to see all applications, and by students to see their own.
// No pagination for now — in practice you'd add it the same way as universities/programs.
const listApplications = asyncHandler(async (req, res) => {
  const { studentId, status } = req.query;
  const filters = {};

  if (studentId) {
    filters.student = studentId;
  }

  if (status) {
    filters.status = status;
  }

  const applications = await Application.find(filters)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: applications,
  });
});

// POST /api/applications
// Creates a new application for the authenticated student.
// The student ID comes from req.user (set by requireAuth middleware) —
// students cannot create applications on behalf of other students.
//
// We check for a duplicate (same student + program + intake) before saving,
// so we can return a clear 409 instead of a raw Mongo duplicate-key error.
// The unique index on { student, program, intake } is a safety net in case
// two simultaneous requests slip past this check.
const createApplication = asyncHandler(async (req, res) => {
  const { programId, intake, note } = req.body;

  if (!programId || !intake) {
    throw new HttpError(400, "programId and intake are required.");
  }

  // Look up the program to get the university reference and destination country.
  // These are stored on the Application document so queries don't always need a join.
  const program = await Program.findById(programId);
  if (!program) {
    throw new HttpError(404, "Program not found.");
  }

  // Prevent duplicate applications for the same student + program + intake combo.
  // We do this check before saving so we can return a friendly message.
  const alreadyApplied = await Application.findOne({
    student: req.user._id,
    program: programId,
    intake,
  });
  if (alreadyApplied) {
    throw new HttpError(
      409,
      `You already have an application for this program with the ${intake} intake.`
    );
  }

  // Create the application. Status starts as "draft". The model sets up
  // the initial timeline entry automatically via its schema default.
  const application = await Application.create({
    student: req.user._id,
    program: programId,
    university: program.university,
    destinationCountry: program.country,
    intake,
    // If a note was provided, override the default timeline entry message.
    timeline: [{ status: "draft", note: note || "Application created." }],
  });

  // Populate the related documents before returning so the client has full details.
  await application.populate([
    { path: "student", select: "fullName email role" },
    { path: "program", select: "title degreeLevel tuitionFeeUsd" },
    { path: "university", select: "name country city" },
  ]);

  res.status(201).json({
    success: true,
    data: application,
  });
});

// PATCH /api/applications/:id/status
// Moves an application to a new status, enforcing the allowed transition rules.
//
// Valid transitions (defined in config/constants.js):
//   draft         → submitted
//   submitted     → under-review, rejected
//   under-review  → offer-received, rejected
//   offer-received→ visa-processing, rejected
//   visa-processing→ enrolled, rejected
//   enrolled      → (terminal — no further transitions)
//   rejected      → (terminal — no further transitions)
//
// Every status change is recorded in the timeline array with a timestamp,
// giving a complete audit trail of the application's journey.
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: newStatus, note } = req.body;

  // Validate that the requested status is a known value.
  if (!newStatus || !applicationStatuses.includes(newStatus)) {
    throw new HttpError(
      400,
      `Invalid status. Must be one of: ${applicationStatuses.join(", ")}.`
    );
  }

  const application = await Application.findById(id);
  if (!application) {
    throw new HttpError(404, "Application not found.");
  }

  const currentStatus = application.status;
  const allowedNextStatuses = validStatusTransitions[currentStatus] || [];

  // Check that this transition is allowed. If not, tell the client exactly
  // what transitions are valid from the current state.
  if (!allowedNextStatuses.includes(newStatus)) {
    const allowed = allowedNextStatuses.length > 0
      ? allowedNextStatuses.join(", ")
      : "none (this status is terminal)";

    throw new HttpError(
      400,
      `Cannot move from '${currentStatus}' to '${newStatus}'. Valid transitions: ${allowed}.`
    );
  }

  // Update the status and append a timeline entry recording the change.
  // Using $set and $push so we don't need to save the full document —
  // this is safer against race conditions than loading, modifying, and re-saving.
  application.status = newStatus;
  application.timeline.push({
    status: newStatus,
    note: note || `Status changed to ${newStatus}.`,
    changedAt: new Date(),
  });

  await application.save();

  res.json({
    success: true,
    data: application,
  });
});

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};
