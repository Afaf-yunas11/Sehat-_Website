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

// Get condensed branch information (no authentication required)
router.get("/condensed", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        B.BRANCH_ID, 
        H.HOSPITAL_NAME,
        CONCAT(BA.ADDRESS, ', ', BA.CITY) AS LOCATION
      FROM BRANCHES AS B
      JOIN HOSPITALS AS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
      JOIN BRANCH_ADDRESS AS BA ON B.BRANCH_ID = BA.BRANCH_ID
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all branches
router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.patient, userTables.rescueWorker], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
          B.BRANCH_ID, 
          B.HOSPITAL_ID, 
          H.HOSPITAL_NAME,
          CONCAT(BA.ADDRESS, ', ', BA.CITY) AS LOCATION, 
          B.TOTAL_BEDS,
          B.LATITUDE,
          B.LONGITUDE,
          B.PHONE_NO
        FROM BRANCHES AS B
        JOIN BRANCH_ADDRESS AS BA ON B.BRANCH_ID = BA.BRANCH_ID
        JOIN HOSPITALS AS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific branch by ID
router.get("/:id", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.patient], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, id)
      .query(`
        SELECT 
          B.BRANCH_ID, 
          B.HOSPITAL_ID, 
          H.HOSPITAL_NAME,
          CONCAT(BA.ADDRESS, ', ', BA.CITY) AS LOCATION, 
          B.TOTAL_BEDS,
          B.LATITUDE,
          B.LONGITUDE,
          B.PHONE_NO
        FROM BRANCHES AS B
        JOIN BRANCH_ADDRESS AS BA ON B.BRANCH_ID = BA.BRANCH_ID
        JOIN HOSPITALS AS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
        WHERE B.BRANCH_ID = @BRANCH_ID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "BRANCH NOT FOUND" });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get branches by hospital ID
router.get("/by-hospital/:id", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.patient], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID HOSPITAL ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, id)
      .query(`
        SELECT 
          B.BRANCH_ID, 
          B.HOSPITAL_ID, 
          B.BRANCH_NAME, 
          CONCAT(BA.ADDRESS, ', ', BA.CITY) AS LOCATION, 
          B.CONTACT_NO
        FROM BRANCHES AS B
        JOIN BRANCH_ADDRESS AS BA ON B.BRANCH_ID = BA.BRANCH_ID
        WHERE B.HOSPITAL_ID = @HOSPITAL_ID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "NO BRANCHES FOUND FOR THIS HOSPITAL" });
    }

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const {
      HOSPITAL_ID,
      ADDRESS,
      CITY,
      PHONE_NO,
      LATITUDE,
      LONGITUDE,
      TOTAL_BEDS,
      TOTAL_VENTILATORS
    } = req.body;

    const branchColumnNames = await fetchColumnNames("BRANCHES");
    branchColumnNames.push("ADDRESS", "CITY");

    if (!validateRequestBody(req.body, branchColumnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY FOR BRANCH" });
    }

    // Validate required fields
    if (
      !HOSPITAL_ID ||
      !ADDRESS ||
      !CITY ||
      !PHONE_NO ||
      LATITUDE === undefined ||
      LONGITUDE === undefined ||
      TOTAL_BEDS === undefined ||
      TOTAL_VENTILATORS === undefined
    ) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }

    const pool = await sql.connect(config);

    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Check if hospital exists
      const hospitalCheck = await pool
        .request()
        .input("HOSPITAL_ID", sql.Int, HOSPITAL_ID)
        .query(`SELECT COUNT(*) as count FROM HOSPITALS WHERE HOSPITAL_ID = @HOSPITAL_ID`);

      if (hospitalCheck.recordset[0].count === 0) {
        return res.status(404).json({ error: "HOSPITAL NOT FOUND" });
      }

      // Insert into BRANCHES table
      const branchRequest = new sql.Request(transaction);
      const result = await branchRequest
        .input("HOSPITAL_ID", sql.Int, HOSPITAL_ID)
        .input("PHONE_NO", sql.VarChar(20), PHONE_NO)
        .input("LATITUDE", sql.Float, LATITUDE)
        .input("LONGITUDE", sql.Float, LONGITUDE)
        .input("TOTAL_BEDS", sql.Int, TOTAL_BEDS)
        .input("TOTAL_VENTILATORS", sql.Int, TOTAL_VENTILATORS)
        .query(`
          INSERT INTO BRANCHES (HOSPITAL_ID, PHONE_NO, LATITUDE, LONGITUDE, TOTAL_BEDS, TOTAL_VENTILATORS)
          VALUES (@HOSPITAL_ID, @PHONE_NO, @LATITUDE, @LONGITUDE, @TOTAL_BEDS, @TOTAL_VENTILATORS);

          SELECT SCOPE_IDENTITY() AS BRANCH_ID
        `);

      const branchId = result.recordset[0].BRANCH_ID;

      // Insert into BRANCH_ADDRESS table
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("BRANCH_ID", sql.Int, branchId)
        .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
        .input("CITY", sql.VarChar(sql.MAX), CITY)
        .query(`
          INSERT INTO BRANCH_ADDRESS (BRANCH_ID, ADDRESS, CITY)
          VALUES (@BRANCH_ID, @ADDRESS, @CITY)
        `);

      // Commit transaction
      await transaction.commit();

      res.status(201).json({
        message: "BRANCH ADDED SUCCESSFULLY",
        branchId: branchId,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update branch
router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID ID" });
    }

    const updates = req.body;

    // Separate branch data from address data
    const branchUpdates = { ...updates };
    const addressUpdates = {};

    if (updates.ADDRESS) {
      addressUpdates.ADDRESS = updates.ADDRESS;
      delete branchUpdates.ADDRESS;
    }

    if (updates.CITY) {
      addressUpdates.CITY = updates.CITY;
      delete branchUpdates.CITY;
    }

    if (Object.keys(branchUpdates).length === 0 && Object.keys(addressUpdates).length === 0) {
      return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
    }

    // Validate branch fields if there are any
    if (Object.keys(branchUpdates).length > 0) {
      const branchColumnTypes = await fetchColumnTypes("BRANCHES");
      const branchColumnNames = await fetchColumnNames("BRANCHES");

      if (!validateRequestBody(branchUpdates, branchColumnNames)) {
        return res.status(400).json({ error: "INVALID REQUEST BODY FOR BRANCH" });
      }
    }

    // If only one address field is provided, fetch the other
    if ((addressUpdates.ADDRESS && !addressUpdates.CITY) || (addressUpdates.CITY && !addressUpdates.ADDRESS)) {
      const pool = await sql.connect(config);
      const currentValues = await pool
        .request()
        .input("BRANCH_ID", sql.Int, id)
        .query(`SELECT ADDRESS, CITY FROM BRANCH_ADDRESS WHERE BRANCH_ID = @BRANCH_ID`);

      if (currentValues.recordset.length === 0) {
        return res.status(404).json({ error: "BRANCH ADDRESS NOT FOUND" });
      }

      // Set the missing value to current value
      if (addressUpdates.ADDRESS && !addressUpdates.CITY) {
        addressUpdates.CITY = currentValues.recordset[0].CITY;
      } else if (addressUpdates.CITY && !addressUpdates.ADDRESS) {
        addressUpdates.ADDRESS = currentValues.recordset[0].ADDRESS;
      }
    }

    const pool = await sql.connect(config);

    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Check if hospital exists if HOSPITAL_ID is in updates
      if (branchUpdates.HOSPITAL_ID) {
        const hospitalCheck = await pool
          .request()
          .input("HOSPITAL_ID", sql.Int, branchUpdates.HOSPITAL_ID)
          .query(`SELECT COUNT(*) as count FROM HOSPITALS WHERE HOSPITAL_ID = @HOSPITAL_ID`);

        if (hospitalCheck.recordset[0].count === 0) {
          return res.status(404).json({ error: "HOSPITAL NOT FOUND" });
        }
      }

      // Update BRANCHES table if there are branch fields to update
      let branchResult = { rowsAffected: [0] };
      if (Object.keys(branchUpdates).length > 0) {
        const branchColumnTypes = await fetchColumnTypes("BRANCHES");

        let updateFields = [];
        const branchRequest = new sql.Request(transaction);

        for (let field in branchUpdates) {
          if (field === "BRANCH_ID") {
            return res.status(403).json({ error: "FORBIDDEN TO UPDATE BRANCH_ID" });
          }
          if (field === "LATITUDE") {
            branchRequest.input("LATITUDE", sql.Decimal(9, 6), branchUpdates.LATITUDE);
          }
          else if (field === "LONGITUDE") {
            branchRequest.input("LONGITUDE", sql.Decimal(9, 6), branchUpdates.LONGITUDE);
          }
          else {
            branchRequest.input(field, branchColumnTypes[field], branchUpdates[field]);
          }
          console.log(`${field}, ${branchColumnTypes[field]}, ${typeof branchUpdates[field]}`)
          updateFields.push(`${field} = @${field}`);
        }

        branchRequest.input("BRANCH_ID", sql.Int, id);

        if (updateFields.length > 0) {
          const query = `UPDATE BRANCHES SET ${updateFields.join(", ")} WHERE BRANCH_ID = @BRANCH_ID`;
          console.log(updateFields);
          console.log(query);
          branchResult = await branchRequest.query(query);
        }
      }

      // Update BRANCH_ADDRESS table if there are address fields to update
      if (Object.keys(addressUpdates).length > 0) {
        const addressRequest = new sql.Request(transaction);
        addressRequest.input("BRANCH_ID", sql.Int, id);

        // Check if address record exists
        const checkResult = await addressRequest.query(
          `SELECT COUNT(*) AS count FROM BRANCH_ADDRESS WHERE BRANCH_ID = @BRANCH_ID`
        );

        const addressExists = checkResult.recordset[0].count > 0;

        if (addressExists) {
          // Update existing record
          let updateFields = [];

          for (let field in addressUpdates) {
            addressRequest.input(field, sql.VarChar(sql.MAX), addressUpdates[field]);
            updateFields.push(`${field} = @${field}`);
          }

          if (updateFields.length > 0) {
            await addressRequest.query(
              `UPDATE BRANCH_ADDRESS SET ${updateFields.join(", ")} WHERE BRANCH_ID = @BRANCH_ID`
            );
          }
        } else {
          // Insert new record
          addressRequest
            .input("ADDRESS", sql.VarChar(sql.MAX), addressUpdates.ADDRESS || '')
            .input("CITY", sql.VarChar(sql.MAX), addressUpdates.CITY || '')
            .query(
              `INSERT INTO BRANCH_ADDRESS (BRANCH_ID, ADDRESS, CITY) VALUES (@BRANCH_ID, @ADDRESS, @CITY)`
            );
        }
      }

      // Commit transaction
      await transaction.commit();

      // Check if branch was found
      if (branchResult.rowsAffected[0] === 0 && Object.keys(branchUpdates).length > 0) {
        return res.status(404).json({ error: "BRANCH NOT FOUND" });
      }

      res.status(200).json({ message: `BRANCH WITH ID ${id} UPDATED SUCCESSFULLY` });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete branch
router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID ID" });
    }

    const pool = await sql.connect(config);

    // Check if branch has associated doctors or patients
    const checkAssociations = await pool
      .request()
      .input("BRANCH_ID", sql.Int, id)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM DOCTORS WHERE BRANCH_ID = @BRANCH_ID) as doctorCount,
          (SELECT COUNT(*) FROM EMERGENCY_CALLS WHERE BRANCH_ID = @BRANCH_ID) as emergencyCallCount
      `);

    const { doctorCount, emergencyCallCount } = checkAssociations.recordset[0];

    if (doctorCount > 0 || emergencyCallCount > 0) {
      return res.status(400).json({
        error: "CANNOT DELETE BRANCH WITH ASSOCIATED DOCTORS OR EMERGENCY CALLS",
        doctorCount,
        emergencyCallCount
      });
    }

    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Delete from BRANCH_ADDRESS table
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("BRANCH_ID", sql.Int, id)
        .query(`DELETE FROM BRANCH_ADDRESS WHERE BRANCH_ID = @BRANCH_ID`);

      // Delete from BRANCHES table
      const branchRequest = new sql.Request(transaction);
      const result = await branchRequest
        .input("BRANCH_ID", sql.Int, id)
        .query(`DELETE FROM BRANCHES WHERE BRANCH_ID = @BRANCH_ID`);

      // Commit transaction
      await transaction.commit();

      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: `BRANCH WITH ID ${id} NOT FOUND` });
      }

      res.status(200).json({
        message: `BRANCH WITH ID ${id} DELETED SUCCESSFULLY`,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
