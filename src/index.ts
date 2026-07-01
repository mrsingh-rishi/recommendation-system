import express from "express";

import vendorRouter from "./routes/vendor.js";
import vendorDocumentsRouter from "./routes/vendor-documents.js";
import vendorRatingsRouter from "./routes/vendor-ratings.js";
import workRequirementsRouter from "./routes/work-requirements.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/vendors", vendorRouter);
app.use("/api/vendor-documents", vendorDocumentsRouter);
app.use("/api/vendor-ratings", vendorRatingsRouter);
app.use("/api/work-requirements", workRequirementsRouter);

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});