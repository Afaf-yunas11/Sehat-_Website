import express from "express";
import sql from "mssql";
import cors from "cors";

/* FILE-SYSTEM IMPORTS */
import url from "url";
import path from "path";

/* ROUTE IMPORTS */
import userRoutes from "./src/routes/userRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";

const app = express();
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT;

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* ROUTER MOUNTS */
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

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
