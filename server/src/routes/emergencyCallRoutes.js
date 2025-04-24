import express from "express";
import sql from "mssql";
import authenticateToken from "../scripts/authenticateToken.js";
import authorizeUser from "../scripts/authorizeUser.js";
import { userTables } from "../config/userTables.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

// Get all emergency calls for a specific rescue worker
router.get("/by-rescue-worker/:id", authenticateToken, authorizeUser([userTables.rescueWorker], true), async (req, res) => {
  const rescueWorkerId = parseInt(req.params.id);
  if (isNaN(rescueWorkerId)) return res.status(400).json({ error: "INVALID RESCUE WORKER ID" });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("RESCUE_WORKER_ID", sql.Int, rescueWorkerId)
      .query(`
        SELECT 
          EC.*,
          B.LOCATION as BRANCH_LOCATION,
          H.HOSPITAL_NAME
        FROM EMERGENCY_CALLS EC
        LEFT JOIN BRANCHES B ON EC.BRANCH_ID = B.BRANCH_ID
        LEFT JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
        WHERE EC.RESCUE_WORKER_ID = @RESCUE_WORKER_ID
        ORDER BY EC.CALL_DATE DESC
      `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new emergency call
router.post("/", authenticateToken, authorizeUser([userTables.rescueWorker], false), async (req, res) => {
  const { RESCUE_WORKER_ID, BRANCH_ID, PATIENT_F_NAME, PATIENT_L_NAME, GENDER, AGE, ADDRESS, IS_USING_VENTILATOR } = req.body;

  if (!RESCUE_WORKER_ID || !PATIENT_F_NAME || !PATIENT_L_NAME || !GENDER || !ADDRESS) {
    return res.status(400).json({ error: "MISSING REQUIRED FIELDS" });
  }

  try {
    const pool = await sql.connect(config);
    
    // Validate rescue worker exists
    const workerCheck = await pool.request()
      .input("RESCUE_WORKER_ID", sql.Int, RESCUE_WORKER_ID)
      .query("SELECT LICENSE_NO FROM RESCUE_WORKERS WHERE LICENSE_NO = @RESCUE_WORKER_ID");

    if (workerCheck.recordset.length === 0) {
      return res.status(400).json({ error: "INVALID RESCUE WORKER ID" });
    }

    // If branch_id is provided, validate it exists
    if (BRANCH_ID) {
      const branchCheck = await pool.request()
        .input("BRANCH_ID", sql.Int, BRANCH_ID)
        .query("SELECT BRANCH_ID FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID");

      if (branchCheck.recordset.length === 0) {
        return res.status(400).json({ error: "INVALID BRANCH ID" });
      }
    }

    const result = await pool.request()
      .input("RESCUE_WORKER_ID", sql.Int, RESCUE_WORKER_ID)
      .input("BRANCH_ID", sql.Int, BRANCH_ID)
      .input("PATIENT_F_NAME", sql.VarChar(50), PATIENT_F_NAME)
      .input("PATIENT_L_NAME", sql.VarChar(50), PATIENT_L_NAME)
      .input("GENDER", sql.VarChar(6), GENDER)
      .input("AGE", sql.Int, AGE)
      .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
      .input("IS_USING_VENTILATOR", sql.Bit, IS_USING_VENTILATOR || false)
      .query(`
        INSERT INTO EMERGENCY_CALLS 
        (RESCUE_WORKER_ID, BRANCH_ID, PATIENT_F_NAME, PATIENT_L_NAME, GENDER, AGE, ADDRESS, IS_USING_VENTILATOR)
        VALUES 
        (@RESCUE_WORKER_ID, @BRANCH_ID, @PATIENT_F_NAME, @PATIENT_L_NAME, @GENDER, @AGE, @ADDRESS, @IS_USING_VENTILATOR)
      `);

    res.status(201).json({ message: "EMERGENCY CALL CREATED SUCCESSFULLY" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an emergency call
router.patch("/:id", authenticateToken, authorizeUser([userTables.rescueWorker], true), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID EMERGENCY CALL ID" });

  const updates = req.body;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  try {
    const pool = await sql.connect(config);
    
    // Validate emergency call exists and belongs to the rescue worker
    const callCheck = await pool.request()
      .input("EMERGENCY_CALL_ID", sql.Int, id)
      .input("RESCUE_WORKER_ID", sql.Int, req.user.userId)
      .query(`
        SELECT EMERGENCY_CALL_ID 
        FROM EMERGENCY_CALLS 
        WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID 
        AND RESCUE_WORKER_ID = @RESCUE_WORKER_ID
      `);

    if (callCheck.recordset.length === 0) {
      return res.status(404).json({ error: "EMERGENCY CALL NOT FOUND OR UNAUTHORIZED" });
    }

    // Build update query
    let setClauses = [];
    const request = pool.request();
    request.input("EMERGENCY_CALL_ID", sql.Int, id);

    for (let [key, value] of Object.entries(updates)) {
      request.input(key, value);
      setClauses.push(`${key} = @${key}`);
    }

    const result = await request.query(`
      UPDATE EMERGENCY_CALLS 
      SET ${setClauses.join(", ")} 
      WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID
    `);

    res.status(200).json({ message: "EMERGENCY CALL UPDATED SUCCESSFULLY" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an emergency call
router.delete("/:id", authenticateToken, authorizeUser([userTables.rescueWorker], true), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID EMERGENCY CALL ID" });

  try {
    const pool = await sql.connect(config);
    
    // Validate emergency call exists and belongs to the rescue worker
    const callCheck = await pool.request()
      .input("EMERGENCY_CALL_ID", sql.Int, id)
      .query(`
        SELECT EMERGENCY_CALL_ID 
        FROM EMERGENCY_CALLS 
        WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID
      `);

    if (callCheck.recordset.length === 0) {
      return res.status(404).json({ error: "EMERGENCY CALL NOT FOUND OR UNAUTHORIZED" });
    }

    const result = await pool.request()
      .input("EMERGENCY_CALL_ID", sql.Int, id)
      .query("DELETE FROM EMERGENCY_CALLS WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID");

    res.status(200).json({ message: "EMERGENCY CALL DELETED SUCCESSFULLY" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 