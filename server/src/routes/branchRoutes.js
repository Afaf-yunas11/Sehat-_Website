import express from "express";
import sql from "mssql";

import authenticateToken from "../scripts/authenticateToken.js";
import authorizeUser from "../scripts/authorizeUser.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import { userTables } from "../config/userTables.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

// Get all branches
router.get("/", authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT B.*, H.HOSPITAL_NAME FROM BRANCHES B INNER JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID ");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/condensed", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        B.BRANCH_ID, 
        B.LOCATION, 
        H.HOSPITAL_NAME
      FROM BRANCHES B
      JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific branch by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID BRANCH ID" });

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, id)
      .query("SELECT * FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "BRANCH NOT FOUND" });

    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const { HOSPITAL_ID, TOTAL_BEDS, TOTAL_VENTILATORS, LOCATION, LATITUDE, LONGITUDE, PHONE_NO } = req.body;

    // Validate required fields
    if (!HOSPITAL_ID || !TOTAL_BEDS || !TOTAL_VENTILATORS || !LOCATION || !PHONE_NO) {
      return res.status(400).json({ error: "MISSING REQUIRED FIELDS" });
    }

    const pool = await sql.connect(config);
    
    // Check if hospital exists
    const hospitalCheck = await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, HOSPITAL_ID)
      .query("SELECT HOSPITAL_ID FROM HOSPITALS WHERE HOSPITAL_ID = @HOSPITAL_ID");

    if (hospitalCheck.recordset.length === 0) {
      return res.status(400).json({ error: "HOSPITAL_ID DOES NOT EXIST" });
    }

    // Insert branch with coordinates
    await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, HOSPITAL_ID)
      .input("TOTAL_BEDS", sql.Int, TOTAL_BEDS)
      .input("TOTAL_VENTILATORS", sql.Int, TOTAL_VENTILATORS)
      .input("LOCATION", sql.VarChar(100), LOCATION)
      .input("LATITUDE", sql.Decimal(9, 6), LATITUDE || null)
      .input("LONGITUDE", sql.Decimal(9, 6), LONGITUDE || null)
      .input("PHONE_NO", sql.VarChar(20), PHONE_NO)
      .query(`
        INSERT INTO BRANCHES 
        (HOSPITAL_ID, TOTAL_BEDS, TOTAL_VENTILATORS, LOCATION, LATITUDE, LONGITUDE, PHONE_NO)
        VALUES 
        (@HOSPITAL_ID, @TOTAL_BEDS, @TOTAL_VENTILATORS, @LOCATION, @LATITUDE, @LONGITUDE, @PHONE_NO)
      `);

    res.status(201).json({ message: "BRANCH ADDED SUCCESSFULLY" });
  } catch (err) {
    console.error('Error adding branch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update branch
router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "INVALID BRANCH ID" });

    const updates = req.body;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
    }

    // Convert latitude and longitude to proper format if they exist
    if (updates.LATITUDE !== undefined) {
      updates.LATITUDE = updates.LATITUDE === null ? null : parseFloat(updates.LATITUDE);
    }
    if (updates.LONGITUDE !== undefined) {
      updates.LONGITUDE = updates.LONGITUDE === null ? null : parseFloat(updates.LONGITUDE);
    }

    const columnNames = await fetchColumnNames("BRANCHES");
    const columnTypes = await fetchColumnTypes("BRANCHES");

    if (!validateRequestBody(updates, columnNames)) {
      return res.status(400).json({ error: "INVALID FIELDS IN REQUEST BODY" });
    }

    // If hospital_id is being updated, validate it exists
    if (updates.HOSPITAL_ID) {
      const pool = await sql.connect(config);
      const check = await pool
        .request()
        .input("HOSPITAL_ID", sql.Int, updates.HOSPITAL_ID)
        .query("SELECT HOSPITAL_ID FROM HOSPITALS WHERE HOSPITAL_ID = @HOSPITAL_ID");
      if (check.recordset.length === 0) {
        return res.status(400).json({ error: "UPDATED HOSPITAL_ID DOES NOT EXIST" });
      }
    }

    const pool = await sql.connect(config);
    const request = pool.request();

    let setClauses = [];
    for (let key in updates) {
      if (key === 'LATITUDE' || key === 'LONGITUDE') {
        request.input(key, sql.Decimal(9, 6), updates[key]);
      } else {
        request.input(key, columnTypes[key], updates[key]);
      }
      setClauses.push(`${key} = @${key}`);
    }

    request.input("BRANCH_ID", sql.Int, id);
    const result = await request.query(
      `UPDATE BRANCHES SET ${setClauses.join(", ")} WHERE BRANCH_ID = @BRANCH_ID`
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "BRANCH NOT FOUND" });
    }

    res.status(200).json({ message: "BRANCH UPDATED SUCCESSFULLY" });
  } catch (err) {
    console.error('Error updating branch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete branch by ID
router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID BRANCH ID" });

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, id)
      .query("DELETE FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID");

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: "BRANCH NOT FOUND" });

    res.status(200).json({ message: "BRANCH DELETED SUCCESSFULLY" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
