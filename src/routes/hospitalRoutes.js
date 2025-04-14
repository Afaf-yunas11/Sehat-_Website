import express from "express";
import sql from "mssql";
import {userTables } from "../config/userTables.js";

import authenticateToken from "../scripts/authenticateToken.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";
import authorizeUser from "../scripts/authorizeUser.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

//display all hospitals    this can be done my admin,doctor,patient

router.get("/", authenticateToken, authorizeUser([userTables.admin,userTables.rescueWorker,userTables.patient,userTables.doctor], true),async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`SELECT * FROM HOSPITALS`);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  let { HOSPITAL_ID, HOSPITAL_NAME } = req.body;
  HOSPITAL_ID = parseInt(HOSPITAL_ID);

  if (!HOSPITAL_ID || !HOSPITAL_NAME) {
    return res.status(400).json({ error: "HOSPITAL_ID AND HOSPITAL_NAME ARE REQUIRED" });
  }

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("HOSPITAL_ID", sql.Int, HOSPITAL_ID)
      .input("HOSPITAL_NAME", sql.VarChar(255), HOSPITAL_NAME)
      .query(`
        INSERT INTO HOSPITALS (HOSPITAL_ID, HOSPITAL_NAME)
        VALUES (@HOSPITAL_ID, @HOSPITAL_NAME)
      `);

    res.status(201).json({ message: "HOSPITAL ADDED SUCCESSFULLY" });
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