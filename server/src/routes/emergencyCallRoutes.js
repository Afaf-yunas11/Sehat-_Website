import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";
import authenticateToken from "../scripts/authenticateToken.js";
import authorizeUser from "../scripts/authorizeUser.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

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
          CONCAT (BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
          ECA.ADDRESS AS LOCATION,
          ECA.CITY,
          H.HOSPITAL_NAME
        FROM EMERGENCY_CALLS EC
        LEFT JOIN BRANCHES B ON EC.BRANCH_ID = B.BRANCH_ID
        INNER JOIN BRANCH_ADDRESS BA ON B.BRANCH_ID = BA.BRANCH_ID
        LEFT JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
        LEFT JOIN EMERGENCY_CALLS_ADDRESS ECA ON EC.EMERGENCY_CALL_ID = ECA.EMERGENCY_CALL_ID
        WHERE EC.RESCUE_WORKER_ID = @RESCUE_WORKER_ID
        ORDER BY EC.CALL_DATE DESC
      `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all emergency calls
router.get(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.rescueWorker], false),
  async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query(`
        SELECT 
          EC.*,
          CONCAT (BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
          CONCAT(ECA.ADDRESS, ', ', ECA.CITY) AS LOCATION,
          H.HOSPITAL_NAME
        FROM EMERGENCY_CALLS EC
        LEFT JOIN BRANCHES B ON EC.BRANCH_ID = B.BRANCH_ID
        INNER JOIN BRANCH_ADDRESS BA ON B.BRANCH_ID = BA.BRANCH_ID
        LEFT JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
        LEFT JOIN EMERGENCY_CALLS_ADDRESS ECA ON EC.EMERGENCY_CALL_ID = ECA.EMERGENCY_CALL_ID
        ORDER BY EC.CALL_DATE DESC
      `);
      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET emergency call by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.rescueWorker], false),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID ID" });
      }

      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("CALL_ID", sql.Int, id)
        .query(`
          SELECT 
            EC.*,
            CONCAT (BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
            CONCAT(ECA.ADDRESS, ', ', ECA.CITY) AS LOCATION,
            H.HOSPITAL_NAME
          FROM EMERGENCY_CALLS EC
          LEFT JOIN BRANCHES B ON EC.BRANCH_ID = B.BRANCH_ID
          INNER JOIN BRANCH_ADDRESS BA ON B.BRANCH_ID = BA.BRANCH_ID
          LEFT JOIN HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
          LEFT JOIN EMERGENCY_CALLS_ADDRESS ECA ON EC.EMERGENCY_CALL_ID = ECA.EMERGENCY_CALL_ID
          WHERE EC.CALL_ID = @CALL_ID
          ORDER BY EC.CALL_DATE DESC
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "EMERGENCY CALL NOT FOUND" });
      }

      res.status(200).json(result.recordset[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET emergency calls by user ID
router.get(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.rescueWorker, userTables.patient], true),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID ID" });
      }

      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("USER_ID", sql.Int, id)
        .query(`
          SELECT 
            EC.CALL_ID, 
            EC.USER_ID, 
            EC.WORKER_ID, 
            EC.CALL_DATETIME, 
            EC.CATEGORY,
            EC.STATUS, 
            CONCAT(UA.ADDRESS, ', ', UA.CITY) AS LOCATION
          FROM EMERGENCY_CALLS AS EC
          LEFT JOIN USER_ADDRESS AS UA ON EC.USER_ID = UA.USER_ID
          WHERE EC.USER_ID = @USER_ID
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "NO EMERGENCY CALLS FOUND FOR THIS USER" });
      }

      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST emergency call
router.post(
  "/",
  authenticateToken,
  authorizeUser([userTables.patient, userTables.rescueWorker], true),
  async (req, res) => {
    try {
      const {
        BRANCH_ID,
        RESCUE_WORKER_ID,
        PATIENT_F_NAME,
        PATIENT_L_NAME,
        GENDER,
        AGE,
        IS_USING_VENTILATOR,
        ADDRESS,
        CITY
      } = req.body;

      // Validate required fields
      if (
        !BRANCH_ID ||
        !RESCUE_WORKER_ID ||
        !PATIENT_F_NAME ||
        !PATIENT_L_NAME ||
        !GENDER ||
        !AGE ||
        ADDRESS === undefined ||
        CITY === undefined
      ) {
        return res.status(400).json({ error: "MISSING REQUIRED FIELDS" });
      }

      const pool = await sql.connect(config);

      // Insert into EMERGENCY_CALLS
      const result = await pool
        .request()
        .input("BRANCH_ID", sql.Int, BRANCH_ID)
        .input("RESCUE_WORKER_ID", sql.Int, RESCUE_WORKER_ID)
        .input("PATIENT_F_NAME", sql.VarChar(50), PATIENT_F_NAME)
        .input("PATIENT_L_NAME", sql.VarChar(50), PATIENT_L_NAME)
        .input("GENDER", sql.VarChar(6), GENDER)
        .input("AGE", sql.Int, AGE)
        .input("IS_USING_VENTILATOR", sql.Bit, IS_USING_VENTILATOR ? 1 : 0)
        .query(`
          INSERT INTO EMERGENCY_CALLS 
            (RESCUE_WORKER_ID, BRANCH_ID, PATIENT_F_NAME, PATIENT_L_NAME, GENDER, AGE, IS_USING_VENTILATOR, CALL_DATE)
          VALUES 
            (@RESCUE_WORKER_ID, @BRANCH_ID, @PATIENT_F_NAME, @PATIENT_L_NAME, @GENDER, @AGE, @IS_USING_VENTILATOR, GETDATE());

          SELECT SCOPE_IDENTITY() AS EMERGENCY_CALL_ID;
        `);

      const emergencyCallId = result.recordset[0].EMERGENCY_CALL_ID;

      // Insert into EMERGENCY_CALLS_ADDRESS
      await pool
        .request()
        .input("EMERGENCY_CALL_ID", sql.Int, emergencyCallId)
        .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
        .input("CITY", sql.VarChar(sql.MAX), CITY)
        .query(`
          INSERT INTO EMERGENCY_CALLS_ADDRESS (EMERGENCY_CALL_ID, ADDRESS, CITY)
          VALUES (@EMERGENCY_CALL_ID, @ADDRESS, @CITY)
        `);

      res.status(201).json({
        message: "EMERGENCY CALL ADDED SUCCESSFULLY",
        emergencyCallId: emergencyCallId,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH (update) emergency call
router.patch(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.rescueWorker], false),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID ID" });
      }

      const updates = req.body;
      const columnTypes = await fetchColumnTypes("EMERGENCY_CALLS");
      const columnNames = await fetchColumnNames("EMERGENCY_CALLS");

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
      }

      // Separate address fields from main table fields
      const addressFields = {};
      if ('ADDRESS' in updates) addressFields.ADDRESS = updates.ADDRESS;
      if ('CITY' in updates) addressFields.CITY = updates.CITY;

      // Remove address fields from updates for main table
      const mainTableUpdates = { ...updates };
      delete mainTableUpdates.ADDRESS;
      delete mainTableUpdates.CITY;

      // Validate main table fields
      if (
        Object.keys(mainTableUpdates).length > 0 &&
        !validateRequestBody(mainTableUpdates, columnNames)
      ) {
        return res.status(400).json({ error: "INVALID REQUEST BODY" });
      }

      const pool = await sql.connect(config);

      // Update EMERGENCY_CALLS table if needed
      if (Object.keys(mainTableUpdates).length > 0) {
        let updateFields = [];
        const request = pool.request();

        for (let field in mainTableUpdates) {
          if (field === "USER_ID" || field === "CALL_ID" || field === "CALL_DATETIME") {
            return res.status(403).json({ error: `FORBIDDEN TO UPDATE ${field}` });
          }
          if (
            field === "STATUS" &&
            !["PENDING", "ASSIGNED", "COMPLETED", "CANCELLED"].includes(mainTableUpdates[field].toUpperCase())
          ) {
            return res.status(400).json({ error: "INVALID STATUS VALUE" });
          }
          request.input(field, columnTypes[field], mainTableUpdates[field]);
          updateFields.push(`${field} = @${field}`);
        }
        request.input("EMERGENCY_CALL_ID", sql.Int, id);

        const query = `UPDATE EMERGENCY_CALLS SET ${updateFields.join(
          ", "
        )} WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID`;

        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
          return res.status(404).json({ error: "EMERGENCY CALL NOT FOUND" });
        }
      }

      // Update EMERGENCY_CALLS_ADDRESS table if needed
      if (Object.keys(addressFields).length > 0) {
        let addressUpdateFields = [];
        const addressRequest = pool.request();
        for (let field in addressFields) {
          addressRequest.input(field, sql.VarChar(sql.MAX), addressFields[field]);
          addressUpdateFields.push(`${field} = @${field}`);
        }
        addressRequest.input("EMERGENCY_CALL_ID", sql.Int, id);

        const addressQuery = `UPDATE EMERGENCY_CALLS_ADDRESS SET ${addressUpdateFields.join(
          ", "
        )} WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID`;

        const addressResult = await addressRequest.query(addressQuery);
        // Optionally, check if address was found/updated
      }

      res
        .status(200)
        .json({ message: `EMERGENCY CALL WITH ID ${id} UPDATED SUCCESSFULLY` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE emergency call
router.delete(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.rescueWorker], false),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID ID" });
      }

      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("EMERGENCY_CALL_ID", sql.Int, id)
        .query(`DELETE FROM EMERGENCY_CALLS WHERE EMERGENCY_CALL_ID = @EMERGENCY_CALL_ID`);

      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: `EMERGENCY CALL WITH ID ${id} NOT FOUND` });
      }

      res.status(200).json({
        message: `EMERGENCY CALL WITH ID ${id} DELETED SUCCESSFULLY`,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router; 