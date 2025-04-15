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

// GET all procedures (all roles allowed)
router.get(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin, userTables.doctor, userTables.patient, userTables.rescueWorker], false),
  async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query(`
        SELECT 
          P.PROCEDURE_ID,
          P.PROCEDURE_COST,
          P.PROCEDURE_NAME,
          P.PROCEDURE_DURATION,
          U.F_NAME + ' ' + U.L_NAME AS DOCTOR_NAME,
          H.HOSPITAL_NAME,
          DS.SPECIALIZATION_NAME AS SPECIALIZATION,
          D.RATING,
          D.STATUS,
          D.DATE_STARTED
        FROM DOCTORS AS D
        INNER JOIN (
          SELECT 
            P.PROCEDURE_ID,
            PD.PROCEDURE_COST,
            P.PROCEDURE_NAME,
            P.PROCEDURE_DURATION,
            PD.LICENSE_NO
          FROM PROCEDURES AS P
          INNER JOIN PROCEDURE_DOCTOR AS PD ON PD.PROCEDURE_ID = P.PROCEDURE_ID
        ) AS P ON P.LICENSE_NO = D.LICENSE_NO
        INNER JOIN USERS AS U ON D.USER_ID = U.USER_ID
        INNER JOIN DOCTOR_SPECIALIZATIONS AS DS ON D.SPECIALIZATION = DS.SPECIALIZATION_ID
        INNER JOIN BRANCHES AS B ON D.BRANCH_ID = B.BRANCH_ID
        INNER JOIN HOSPITALS AS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
      `);

      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET procedure by ID (admin only)
router.get(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID PROCEDURE ID" });
    }

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("PROCEDURE_ID", sql.Int, id)
        .query(`
          SELECT 
            P.PROCEDURE_ID,
            P.PROCEDURE_COST,
            P.PROCEDURE_NAME,
            P.PROCEDURE_DURATION,
            U.F_NAME + ' ' + U.L_NAME AS DOCTOR_NAME,
            H.HOSPITAL_NAME,
            DS.SPECIALIZATION_NAME AS SPECIALIZATION,
            D.RATING,
            D.STATUS,
            D.DATE_STARTED
          FROM DOCTORS AS D
          INNER JOIN (
            SELECT 
              P.PROCEDURE_ID,
              PD.PROCEDURE_COST,
              P.PROCEDURE_NAME,
              P.PROCEDURE_DURATION,
              PD.LICENSE_NO
            FROM PROCEDURES AS P
            INNER JOIN PROCEDURE_DOCTOR AS PD ON PD.PROCEDURE_ID = P.PROCEDURE_ID
          ) AS P ON P.LICENSE_NO = D.LICENSE_NO
          INNER JOIN USERS AS U ON D.USER_ID = U.USER_ID
          INNER JOIN DOCTOR_SPECIALIZATIONS AS DS ON D.SPECIALIZATION = DS.SPECIALIZATION_ID
          INNER JOIN BRANCHES AS B ON D.BRANCH_ID = B.BRANCH_ID
          INNER JOIN HOSPITALS AS H ON B.HOSPITAL_ID = H.HOSPITAL_ID
          WHERE P.PROCEDURE_ID = @PROCEDURE_ID
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "PROCEDURE NOT FOUND" });
      }

      res.status(200).json(result.recordset[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST create new procedure (admin only)
router.post(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin], false),
  async (req, res) => {
    const { PROCEDURE_NAME, PROCEDURE_DURATION, OPERATION_SUCCESS_RATE } = req.body;

    if (
      typeof PROCEDURE_NAME !== "string" ||
      PROCEDURE_NAME.trim().length === 0 ||
      PROCEDURE_DURATION <= 0 ||
      OPERATION_SUCCESS_RATE < 0 ||
      OPERATION_SUCCESS_RATE > 100
    ) {
      return res.status(400).json({ error: "INVALID INPUT VALUES" });
    }

    const columnNames = await fetchColumnNames("PROCEDURES");
    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }

    try {
      const pool = await sql.connect(config);
      await pool
        .request()
        .input("PROCEDURE_NAME", sql.VarChar(100), PROCEDURE_NAME.trim())
        .input("PROCEDURE_DURATION", sql.Int, PROCEDURE_DURATION)
        .input("OPERATION_SUCCESS_RATE", sql.Int, OPERATION_SUCCESS_RATE)
        .query(`
          INSERT INTO PROCEDURES (PROCEDURE_NAME, PROCEDURE_DURATION, OPERATION_SUCCESS_RATE)
          VALUES (@PROCEDURE_NAME, @PROCEDURE_DURATION, @OPERATION_SUCCESS_RATE)
        `);

      res.status(201).json({ message: "PROCEDURE CREATED SUCCESSFULLY" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH update procedure (admin only)
router.patch(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID PROCEDURE ID" });
    }

    const columnNames = await fetchColumnNames("PROCEDURES");
    const columnTypes = await fetchColumnTypes("PROCEDURES");

    if (!validateRequestBody(updates, columnNames)) {
      return res.status(400).json({ error: "INVALID FIELDS IN REQUEST" });
    }

    const updateFields = [];
    const pool = await sql.connect(config);
    const request = pool.request();

    for (let field in updates) {
      if (field === "PROCEDURE_ID") {
        return res.status(403).json({ error: "PROCEDURE_ID CANNOT BE UPDATED" });
      }

      if (
        field === "PROCEDURE_DURATION" &&
        (parseInt(updates[field]) <= 0 || isNaN(parseInt(updates[field])))
      ) {
        return res.status(400).json({ error: "INVALID PROCEDURE_DURATION" });
      }

      if (
        field === "OPERATION_SUCCESS_RATE" &&
        (updates[field] < 0 || updates[field] > 100)
      ) {
        return res.status(400).json({ error: "INVALID OPERATION_SUCCESS_RATE" });
      }

      request.input(field, columnTypes[field], updates[field]);
      updateFields.push(`${field} = @${field}`);
    }

    request.input("PROCEDURE_ID", sql.Int, id);

    try {
      const result = await request.query(
        `UPDATE PROCEDURES SET ${updateFields.join(", ")} WHERE PROCEDURE_ID = @PROCEDURE_ID`
      );

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "PROCEDURE NOT FOUND" });
      }

      res.status(200).json({ message: "PROCEDURE UPDATED SUCCESSFULLY" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE procedure (admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID PROCEDURE ID" });
    }

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("PROCEDURE_ID", sql.Int, id)
        .query(`DELETE FROM PROCEDURES WHERE PROCEDURE_ID = @PROCEDURE_ID`);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "PROCEDURE NOT FOUND" });
      }

      res.status(200).json({ message: "PROCEDURE DELETED SUCCESSFULLY" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
