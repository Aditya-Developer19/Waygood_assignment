const Program = require("../models/Program");
const Student = require("../models/Student");
const HttpError = require("../utils/httpError");

// Builds the MongoDB aggregation pipeline that scores and ranks programs for a student.
// All scoring logic runs inside MongoDB — we don't fetch all candidates into Node
// and filter them in JS. This means only the top matches travel over the network.
//
// Scoring weights (total possible = 100):
//   +35  country is in student's target countries
//   +30  program field matches (contains) one of the student's interested fields
//   +20  tuition fee is within the student's max budget
//   +10  student's preferred intake is offered by the program
//   +5   student's IELTS score meets the program's minimum requirement
//
// Pre-filter: We narrow to programs in target countries AND within budget before scoring.
// This keeps the pipeline efficient — there's no point scoring a $40k program for a
// student whose max budget is $20k, or a UK program for a Canada-only student.
function buildAggregationPipeline(student) {
  const {
    targetCountries = [],
    interestedFields = [],
    preferredIntake = "",
    maxBudgetUsd = 0,
    englishTest = {},
  } = student;

  const ieltsScore = englishTest.score || 0;

  return [
    // Stage 1: Pre-filter — discard programs that can't possibly match.
    // This reduces the number of documents the subsequent $addFields stages process.
    {
      $match: {
        country: { $in: targetCountries },
        tuitionFeeUsd: { $lte: maxBudgetUsd },
      },
    },

    // Stage 2: Compute a matchScore for each remaining program by adding up
    // conditional point values. Each $cond evaluates one scoring criterion.
    {
      $addFields: {
        matchScore: {
          $add: [
            // +35 if this program's country is one the student wants to go to.
            {
              $cond: [{ $in: ["$country", targetCountries] }, 35, 0],
            },

            // +30 if the program's field contains any of the student's interested fields.
            // We use $reduce to loop over interestedFields and $regexMatch for case-insensitive
            // substring matching (e.g., "Computer" matches "Computer Science").
            // $regexMatch requires MongoDB 4.2+.
            {
              $cond: [
                {
                  $gt: [
                    {
                      $reduce: {
                        input: interestedFields,
                        initialValue: 0,
                        in: {
                          $add: [
                            "$$value",
                            {
                              $cond: [
                                {
                                  $regexMatch: {
                                    input: "$field",
                                    regex: "$$this",
                                    options: "i",
                                  },
                                },
                                1,
                                0,
                              ],
                            },
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
                30,
                0,
              ],
            },

            // +20 if the tuition fee is within the student's budget.
            // All programs that passed the $match in Stage 1 already meet this condition,
            // but we still include it here so the score reflects that it's a factor,
            // and so the matchReasons array can mention it with the exact savings amount.
            {
              $cond: [{ $lte: ["$tuitionFeeUsd", maxBudgetUsd] }, 20, 0],
            },

            // +10 if the student's preferred intake is offered by this program.
            {
              $cond: [
                { $in: [preferredIntake, "$intakes"] },
                10,
                0,
              ],
            },

            // +5 if the student's IELTS score meets or exceeds the program's minimum.
            {
              $cond: [{ $gte: [ieltsScore, "$minimumIelts"] }, 5, 0],
            },
          ],
        },
      },
    },

    // Stage 3: Build the matchReasons array.
    // Each entry is a human-readable string explaining one scoring criterion that matched.
    // We use $filter to keep only the reason strings that are not null/empty.
    // $cond returns the reason string if the criterion matched, or "" if it didn't.
    {
      $addFields: {
        matchReasons: {
          $filter: {
            input: [
              // Country reason.
              {
                $cond: [
                  { $in: ["$country", targetCountries] },
                  { $concat: ["Matches your preferred country: ", "$country"] },
                  "",
                ],
              },

              // Field reason.
              {
                $cond: [
                  {
                    $gt: [
                      {
                        $reduce: {
                          input: interestedFields,
                          initialValue: 0,
                          in: {
                            $add: [
                              "$$value",
                              {
                                $cond: [
                                  {
                                    $regexMatch: {
                                      input: "$field",
                                      regex: "$$this",
                                      options: "i",
                                    },
                                  },
                                  1,
                                  0,
                                ],
                              },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                  { $concat: ["Field of interest match: ", "$field"] },
                  "",
                ],
              },

              // Budget reason — shows how much headroom the student has.
              {
                $cond: [
                  { $lte: ["$tuitionFeeUsd", maxBudgetUsd] },
                  {
                    $concat: [
                      "Within your budget (saves $",
                      {
                        $toString: { $subtract: [maxBudgetUsd, "$tuitionFeeUsd"] },
                      },
                      ")",
                    ],
                  },
                  "",
                ],
              },

              // Intake reason.
              {
                $cond: [
                  { $in: [preferredIntake, "$intakes"] },
                  {
                    $concat: [
                      "Preferred intake available: ",
                      preferredIntake,
                    ],
                  },
                  "",
                ],
              },

              // IELTS reason — shows the student's score vs. the requirement.
              {
                $cond: [
                  { $gte: [ieltsScore, "$minimumIelts"] },
                  {
                    $concat: [
                      "IELTS requirement met (needs ",
                      { $toString: "$minimumIelts" },
                      ", you have ",
                      { $toString: ieltsScore },
                      ")",
                    ],
                  },
                  "",
                ],
              },
            ],
            // Only keep reasons that are non-empty strings (i.e., criteria that matched).
            as: "reason",
            cond: { $gt: [{ $strLenCP: "$$reason" }, 0] },
          },
        },
      },
    },

    // Stage 4: Sort best matches first.
    { $sort: { matchScore: -1 } },

    // Stage 5: Return only the top 10 matches.
    { $limit: 10 },
  ];
}

// buildProgramRecommendations — fetches a student by ID and runs the aggregation pipeline.
// Returns the student's profile summary alongside the ranked program list.
async function buildProgramRecommendations(studentId) {
  const student = await Student.findById(studentId).lean();

  if (!student) {
    throw new HttpError(404, "Student not found.");
  }

  // Run the full scoring pipeline in MongoDB — no JS-side sorting or filtering needed.
  const pipeline = buildAggregationPipeline(student);
  const recommendations = await Program.aggregate(pipeline);

  return {
    data: {
      student: {
        id: student._id,
        fullName: student.fullName,
        targetCountries: student.targetCountries,
        interestedFields: student.interestedFields,
        preferredIntake: student.preferredIntake,
        maxBudgetUsd: student.maxBudgetUsd,
        ieltsScore: student.englishTest?.score || 0,
      },
      recommendations,
    },
    meta: {
      total: recommendations.length,
    },
  };
}

module.exports = {
  buildProgramRecommendations,
};
