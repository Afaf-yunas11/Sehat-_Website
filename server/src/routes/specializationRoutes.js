import express from "express";
import sql from "mssql";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

router.get("/", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM DOCTOR_SPECIALIZATIONS ORDER BY SPECIALIZATION_NAME");
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Specialization ID is required" });
  }
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("SPECIALIZATION_ID", sql.Int, id)
      .query("SELECT * FROM DOCTOR_SPECIALIZATIONS WHERE SPECIALIZATION_ID = @SPECIALIZATION_ID");
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Specialization not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;