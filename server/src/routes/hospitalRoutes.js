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

//display all hospitals    this can be done my admin,doctor,patient

router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.rescueWorker, userTables.patient, userTables.doctor], true), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
	  SELECT 
  B.BRANCH_ID,
  B.HOSPITAL_ID,
  H.HOSPITAL_NAME,
  B.TOTAL_BEDS,
  B.TOTAL_VENTILATORS,
  B.LOCATION,
  B.LATITUDE,
  B.LONGITUDE,
  B.PHONE_NO
FROM 
  BRANCHES B
INNER JOIN 
  HOSPITALS H
ON 
  B.HOSPITAL_ID = H.HOSPITAL_ID;
`
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-procedure-id/:id", authenticateToken, authorizeUser([userTables.admin, userTables.patient, userTables.doctor], false), async (req, res) => {
  let id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "PROCEDURE ID IS REQUIRED" });
  }


  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("PROCEDURE_ID", sql.Int(100), id)
      .query(`
        SELECT DISTINCT
          H.HOSPITAL_ID,
          H.HOSPITAL_NAME,
          B.BRANCH_ID,
          B.LOCATION,
          B.LATITUDE,
          B.LONGITUDE,
          B.PHONE_NO
        FROM 
          PROCEDURES P
        INNER JOIN 
          PROCEDURE_DOCTOR PD ON P.PROCEDURE_ID = PD.PROCEDURE_ID
        INNER JOIN 
          DOCTORS D ON PD.LICENSE_NO = D.LICENSE_NO
        INNER JOIN
          BRANCHES B ON D.BRANCH_ID = B.BRANCH_ID
        INNER JOIN
          HOSPITALS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
        WHERE 
          P.PROCEDURE_ID = @PROCEDURE_ID AND LOWER(D.[STATUS]) IN ('active', 'on call')
        ORDER BY H.HOSPITAL_NAME, B.LOCATION;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "NO HOSPITALS FOUND FOR THIS PROCEDURE" });
    }

    res.status(200).json(result.recordset);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  let { HOSPITAL_NAME } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("HOSPITAL_NAME", sql.VarChar(100), HOSPITAL_NAME)
      .query(`
        INSERT INTO HOSPITALS (HOSPITAL_NAME)
        VALUES (@HOSPITAL_NAME)
      `);

    const hospitalID = await pool
      .request()
      .input("HOSPITAL_NAME", sql.VarChar(100), HOSPITAL_NAME)
      .query(`
            SELECT HOSPITAL_ID FROM HOSPITALS WHERE HOSPITAL_NAME = @HOSPITAL_NAME
          `)

    
    res.status(201).json({
      message: "HOSPITAL ADDED SUCCESSFULLY",
      HOSPITAL_ID: hospitalID.recordset[0].HOSPITAL_ID
    });

  } catch (error) {
    // Handle duplicate ID or other SQL errors
    if (error.number === 2627) {
      return res.status(409).json({ error: "HOSPITAL_ID ALREADY EXISTS" });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "INVALID HOSPITAL ID" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, id)
      .query(`DELETE FROM HOSPITALS WHERE HOSPITAL_ID = @HOSPITAL_ID`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "HOSPITAL NOT FOUND" });
    }

    res.status(200).json({ message: `HOSPITAL ID ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//update hospital only allowed to  admin 
router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const { HOSPITAL_NAME } = req.body;

  if (!HOSPITAL_NAME) {
    return res.status(400).json({ error: "HOSPITAL_NAME IS REQUIRED TO UPDATE" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, id)
      .input("HOSPITAL_NAME", sql.VarChar(255), HOSPITAL_NAME)
      .query(`
        UPDATE HOSPITALS
        SET HOSPITAL_NAME = @HOSPITAL_NAME
        WHERE HOSPITAL_ID = @HOSPITAL_ID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "HOSPITAL NOT FOUND" });
    }

    res.status(200).json({ message: `HOSPITAL ID ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;