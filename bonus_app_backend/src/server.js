require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import routes (adjust paths as needed)
// const authRoutes = require("./routes/authRoutes"); // Assuming auth routes exist
const bonusTemplateRoutes = require("./routes/bonusTemplateRoutes");
const bonusRuleRoutes = require("./routes/bonusRuleRoutes");
const bonusInstanceRoutes = require("./routes/bonusInstanceRoutes");
const bonusAllocationRoutes = require("./routes/bonusAllocationRoutes");
const approvalRoutes = require("./routes/approvalRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON bodies

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// API Routes
// app.use("/api/auth", authRoutes);
app.use("/api/bonus/templates", bonusTemplateRoutes);
app.use("/api/bonus/rules", bonusRuleRoutes);
app.use("/api/bonus/instances", bonusInstanceRoutes);
app.use("/api/bonus/allocations", bonusAllocationRoutes);
app.use("/api/bonus/approvals", approvalRoutes);

// Simple root route
app.get("/", (req, res) => {
  res.send("Bonus Management Backend is running.");
});

// Global error handler (basic example)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something went wrong!", message: err.message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});

