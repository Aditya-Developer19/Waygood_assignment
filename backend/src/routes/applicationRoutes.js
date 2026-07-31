const express = require("express");

const {
  createApplication,
  listApplications,
  updateApplicationStatus,
} = require("../controllers/applicationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/applications — list applications (filtered by studentId or status via query params)
router.get("/", listApplications);

// POST /api/applications — create a new application (student must be logged in)
router.post("/", requireAuth, createApplication);

// PATCH /api/applications/:id/status — update status (must be logged in to submit a change)
router.patch("/:id/status", requireAuth, updateApplicationStatus);

module.exports = router;
