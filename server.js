
/*Client —> Token Verification —> User privilege authorization —> API Response*/


/* importing packages */

import express from "express";   //to build server
import sql from "mssql";        //package that allows sql functions
import cors from "cors";       //a middleware to cross-check ports
import cookieParser from "cookie-parser";

/* FILE-SYSTEM IMPORTS */
import url from "url";
import path from "path";

/* ROUTE IMPORTS */
import userRoutes from "./src/routes/userRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import patientRoutes from "./src/routes/patientRoutes.js";
import rescueWorkerRoutes from "./src/routes/rescueWorkerRoutes.js";
import hospitalRoutes from "./src/routes/hospitalRoutes.js";
import doctorRoutes from "./src/routes/Doctor.js";
import procedureRoutes from "./src/routes/patientRoutes.js"
import ProcedureAssignmentRoutes from "./src/routes/procedureAssignmentRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import branchRoutes from "./src/routes/branchRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";


const app = express();
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT;

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());
app.use(cookieParser());

/* ROUTER MOUNTS */
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/rescue-workers", rescueWorkerRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctors",doctorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/procedures", procedureRoutes);
app.use("/api/procedure-assingment",ProcedureAssignmentRoutes);
app.use("/api/branch",branchRoutes);

app.use("/api/transactions", transactionRoutes);


/* SERVE STATIC FILES */
app.use(express.static(path.join(__dirname, "public")));

/* LOADING MSSQL CONFIG */
const config = JSON.parse(process.env.CONFIG);

async function connectDB() {
  try {
    await sql.connect(config);
    console.log(`SQL SERVER RUNNING ON PORT ${config.port}`);
  } catch {
    console.log(`FAILED TO ESTABLISH CONNECTION TO SQL SERVER`);
  }
}

app.get("/", async (req, res) => {
  res.status(200).json({ message: "Welcome To Sehat" });
});

connectDB();
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
