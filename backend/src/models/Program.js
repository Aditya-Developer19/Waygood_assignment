const mongoose = require("mongoose");

// Program — represents a degree or certificate program offered by a university.
// Fields like country, degreeLevel, field, and tuitionFeeUsd are indexed because
// they are the most common filter parameters on GET /api/programs and in the
// recommendation aggregation pipeline. Indexes make those queries fast even as
// the programs collection grows.
const programSchema = new mongoose.Schema(
  {
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true, // Indexed so we can quickly find all programs for a university.
    },
    universityName: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      index: true, // Indexed because country is the most common filter in both discovery and recommendations.
    },
    city: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    field: {
      type: String,
      required: true,
      index: true, // Indexed for field-of-study filtering and the recommendation regex match.
    },
    degreeLevel: {
      type: String,
      required: true,
      enum: ["bachelor", "master", "diploma", "certificate"],
      index: true, // Indexed because users frequently filter by degree level.
    },
    tuitionFeeUsd: {
      type: Number,
      required: true,
      index: true, // Indexed for range queries (maxTuition / minTuition filters and budget pre-filter in recommendations).
    },
    intakes: {
      type: [String],
      default: [],
    },
    durationMonths: Number,
    minimumIelts: {
      type: Number,
      default: 0,
    },
    scholarshipAvailable: {
      type: Boolean,
      default: false,
    },
    stem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the most common multi-field discovery query pattern:
// filtering by country + degree level + field + budget simultaneously.
// MongoDB can use this index to satisfy all four filters in a single index scan
// rather than four separate collection scans.
programSchema.index({
  country: 1,
  degreeLevel: 1,
  field: 1,
  tuitionFeeUsd: 1,
});

// Index on intakes array — used when filtering programs that offer a specific intake
// (e.g., ?intake=September). Mongo supports multikey indexes on array fields,
// so this creates one index entry per element in the array.
programSchema.index({ intakes: 1 });

module.exports = mongoose.model("Program", programSchema);
