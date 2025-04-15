import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";

import authenticateToken from "../scripts/authenticateToken.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";
import authorizeUser from "../scripts/authorizeUser.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

// GET all doctors
router.get("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        D.*, 
        (U.F_NAME + ' ' + U.L_NAME) AS DOCTOR_NAME 
      FROM DOCTORS AS D
      INNER JOIN USERS AS U ON D.USER_ID = U.USER_ID
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET doctor by license number
router.get("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const license = parseInt(req.params.license);
  if (isNaN(license)) return res.status(400).json({ error: "INVALID LICENSE NUMBER" });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("LICENSE_NO", sql.Int, license)
      .query(`
        SELECT 
          D.*, 
          (U.F_NAME + ' ' + U.L_NAME) AS DOCTOR_NAME 
        FROM DOCTORS AS D
        INNER JOIN USERS AS U ON D.USER_ID = U.USER_ID
        WHERE D.LICENSE_NO = @LICENSE_NO
      `);
    if (result.recordset.length === 0) return res.status(404).json({ error: "DOCTOR NOT FOUND" });
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add new doctor
router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const { LICENSE_NO, BRANCH_ID, USER_ID, SPECIALIZATION, STATUS, DATE_STARTED, RATING } = req.body;

  if (!(LICENSE_NO && BRANCH_ID && USER_ID && SPECIALIZATION && STATUS)) {
    return res.status(400).json({ error: "ALL FIELDS EXCEPT DATE_STARTED AND RATING ARE REQUIRED" });
  }

  try {
    const pool = await sql.connect(config);

    // Check USER_ID exists
    const userResult = await pool.request()
      .input("USER_ID", sql.Int, USER_ID)
      .query(`SELECT * FROM USERS WHERE USER_ID = @USER_ID`);
    if (userResult.recordset.length === 0) return res.status(400).json({ error: "INVALID USER_ID" });

    // Check BRANCH_ID exists
    const branchResult = await pool.request()
      .input("BRANCH_ID", sql.Int, BRANCH_ID)
      .query(`SELECT * FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID`);
    if (branchResult.recordset.length === 0) return res.status(400).json({ error: "INVALID BRANCH_ID" });

    await pool.request()
      .input("LICENSE_NO", sql.Int, LICENSE_NO)
      .input("BRANCH_ID", sql.Int, BRANCH_ID)
      .input("USER_ID", sql.Int, USER_ID)
      .input("SPECIALIZATION", sql.VarChar(50), SPECIALIZATION)
      .input("STATUS", sql.VarChar(50), STATUS)
      .input("DATE_STARTED", sql.Date, DATE_STARTED || new Date())
      .input("RATING", sql.Float, RATING || 0.0)
      .query(`
        INSERT INTO DOCTORS (LICENSE_NO, BRANCH_ID, USER_ID, SPECIALIZATION, STATUS, DATE_STARTED, RATING)
        VALUES (@LICENSE_NO, @BRANCH_ID, @USER_ID, @SPECIALIZATION, @STATUS, @DATE_STARTED, @RATING)
      `);

    res.status(201).json({ message: "DOCTOR ADDED SUCCESSFULLY" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update doctor
router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const license = parseInt(req.params.license);
  if (isNaN(license)) return res.status(400).json({ error: "INVALID LICENSE NUMBER" });

  const updates = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  const columnTypes = await fetchColumnTypes("DOCTORS");
  const columnNames = await fetchColumnNames("DOCTORS");

  if (!validateRequestBody(updates, columnNames)) {
    return res.status(400).json({ error: "INVALID REQUEST BODY" });
  }

  const pool = await sql.connect(config);
  const request = pool.request();

  if (updates.BRANCH_ID) {
    const branchCheck = await pool.request().input("BRANCH_ID", sql.Int, updates.BRANCH_ID)
      .query("SELECT * FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID");
    if (branchCheck.recordset.length === 0) return res.status(400).json({ error: "INVALID BRANCH_ID" });
  }

  if (updates.USER_ID) {
    const userCheck = await pool.request().input("USER_ID", sql.Int, updates.USER_ID)
      .query("SELECT * FROM USERS WHERE USER_ID = @USER_ID");
    if (userCheck.recordset.length === 0) return res.status(400).json({ error: "INVALID USER_ID" });
  }

  let updateFields = [];
  for (let field in updates) {
    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }
  request.input("LICENSE_NO", sql.Int, license);

  try {
    const result = await request.query(`
      UPDATE DOCTORS SET ${updateFields.join(", ")} WHERE LICENSE_NO = @LICENSE_NO
    `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "DOCTOR NOT FOUND" });
    }
    res.status(200).json({ message: `DOCTOR ${license} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE doctor
router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const license = parseInt(req.params.license);
  if (isNaN(license)) return res.status(400).json({ error: "INVALID LICENSE NUMBER" });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("LICENSE_NO", sql.Int, license)
      .query("DELETE FROM DOCTORS WHERE LICENSE_NO = @LICENSE_NO");

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "DOCTOR NOT FOUND" });
    res.status(200).json({ message: `DOCTOR ${license} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
