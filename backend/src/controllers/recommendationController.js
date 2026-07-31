const asyncHandler = require("../utils/asyncHandler");
const { buildProgramRecommendations } = require("../services/recommendationService");

// GET /api/recommendations/:studentId
// Returns a ranked list of programs that best match the given student's preferences.
// The ranking is computed by a MongoDB aggregation pipeline in recommendationService.js.
// Each result includes a matchScore (0-100) and a matchReasons array explaining why it matched.
const getRecommendations = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const payload = await buildProgramRecommendations(studentId);

  res.json({
    success: true,
    ...payload,
  });
});

module.exports = {
  getRecommendations,
};
