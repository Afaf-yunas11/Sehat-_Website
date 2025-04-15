import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";

import authenticateToken from "../scripts/authenticateToken.js";
import authorizeUser from "../scripts/authorizeUser.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);


//assign procedure to a doctor  checks if procedure or doctor exists or not as well


router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    let { PROCEDURE_ID, LICENSE_NO, PROCEDURE_COST } = req.body;

    PROCEDURE_ID = parseInt(PROCEDURE_ID);
    LICENSE_NO = parseInt(LICENSE_NO);
    PROCEDURE_COST = parseFloat(PROCEDURE_COST);

    if (!(PROCEDURE_ID && LICENSE_NO && PROCEDURE_COST)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }

    const pool = await sql.connect(config);

    // ✅ Check if PROCEDURE_ID exists
    const procedureCheck = await pool.request()
      .input("PROCEDURE_ID", sql.Int, PROCEDURE_ID)
      .query(`SELECT 1 FROM PROCEDURES WHERE PROCEDURE_ID = @PROCEDURE_ID`);

    if (procedureCheck.recordset.length === 0) {
      return res.status(404).json({ error: "NO SUCH PROCEDURE EXISTS TO BE ASSIGNED TO ANY DOCTOR" });
    }

    // ✅ Check if LICENSE_NO exists
    const doctorCheck = await pool.request()
      .input("LICENSE_NO", sql.Int, LICENSE_NO)
      .query(`SELECT 1 FROM DOCTORS WHERE LICENSE_NO = @LICENSE_NO`);

    if (doctorCheck.recordset.length === 0) {
      return res.status(404).json({ error: "NO SUCH DOCTOR EXISTS" });
    }

    // ✅ Insert into PROCEDURE_DOCTOR
    await pool.request()
      .input("PROCEDURE_ID", sql.Int, PROCEDURE_ID)
      .input("LICENSE_NO", sql.Int, LICENSE_NO)
      .input("PROCEDURE_COST", sql.Decimal(10, 2), PROCEDURE_COST)
      .query(`
        INSERT INTO PROCEDURE_DOCTOR (PROCEDURE_ID, LICENSE_NO, PROCEDURE_COST)
        VALUES (@PROCEDURE_ID, @LICENSE_NO, @PROCEDURE_COST)
      `);

    res.status(201).json({ message: "PROCEDURE_DOCTOR RECORD ADDED SUCCESSFULLY" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//update the procedure with specific id and while updating license again check if the license no exist in doctor or not or after updated procedure value does it exist in procedure table or not




router.patch(":id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const procedureIdParam = parseInt(req.params.id);
    const { LICENSE_NO, PROCEDURE_ID, PROCEDURE_COST } = req.body;

    if (isNaN(procedureIdParam)) {
      return res.status(400).json({ error: "INVALID PROCEDURE ID IN PARAMETER" });
    }

    if (!LICENSE_NO && !PROCEDURE_COST && !PROCEDURE_ID) {
      return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
    }

    const pool = await sql.connect(config);

    // ✅ Check if the original PROCEDURE_ID exists (from URL param)
    const procedureCheck = await pool.request()
      .input("PROCEDURE_ID", sql.Int, procedureIdParam)
      .query(`SELECT 1 FROM PROCEDURE_DOCTOR WHERE PROCEDURE_ID = @PROCEDURE_ID`);

    if (procedureCheck.recordset.length === 0) {
      return res.status(404).json({ error: "NO SUCH PROCEDURE_DOCTOR ENTRY FOUND" });
    }

    // ✅ Validate LICENSE_NO if provided
    if (LICENSE_NO) {
      const doctorCheck = await pool.request()
        .input("LICENSE_NO", sql.Int, LICENSE_NO)
        .query(`SELECT 1 FROM DOCTORS WHERE LICENSE_NO = @LICENSE_NO`);

      if (doctorCheck.recordset.length === 0) {
        return res.status(404).json({ error: "NO SUCH DOCTOR EXISTS" });
      }
    }

    // ✅ Validate new PROCEDURE_ID if changed
    if (PROCEDURE_ID && PROCEDURE_ID !== procedureIdParam) {
      const newProcedureCheck = await pool.request()
        .input("PROCEDURE_ID", sql.Int, PROCEDURE_ID)
        .query(`SELECT 1 FROM PROCEDURES WHERE PROCEDURE_ID = @PROCEDURE_ID`);

      if (newProcedureCheck.recordset.length === 0) {
        return res.status(404).json({ error: "NO SUCH PROCEDURE EXISTS TO UPDATE TO" });
      }
    }

    // ✅ Prepare dynamic update query
    const fields = [];
    const request = pool.request();

    if (LICENSE_NO) {
      request.input("LICENSE_NO", sql.Int, LICENSE_NO);
      fields.push("LICENSE_NO = @LICENSE_NO");
    }

    if (PROCEDURE_COST) {
      request.input("PROCEDURE_COST", sql.Decimal(10, 2), PROCEDURE_COST);
      fields.push("PROCEDURE_COST = @PROCEDURE_COST");
    }

    if (PROCEDURE_ID && PROCEDURE_ID !== procedureIdParam) {
      request.input("NEW_PROCEDURE_ID", sql.Int, PROCEDURE_ID);
      fields.push("PROCEDURE_ID = @NEW_PROCEDURE_ID");
    }

    request.input("PROCEDURE_ID_ORIG", sql.Int, procedureIdParam);

    const updateQuery = `
      UPDATE PROCEDURE_DOCTOR
      SET ${fields.join(", ")}
      WHERE PROCEDURE_ID = @PROCEDURE_ID_ORIG
    `;

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "UPDATE FAILED: RECORD NOT FOUND" });
    }

    res.status(200).json({ message: "PROCEDURE_DOCTOR UPDATED SUCCESSFULLY" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;