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

router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.rescueWorker], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT U.USER_ID, PATIENT_ID, F_NAME, L_NAME, ACCOUNT_STATUS, GENDER, BLOOD_GROUP, WEIGHT, HEIGHT, ADDRESS FROM USERS AS U
      INNER JOIN PATIENTS AS P ON U.USER_ID = P.USER_ID
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authorizeUser([userTables.admin, userTables.doctor, userTables.rescueWorker], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = await sql.connect(config);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const result = await pool
      .request()
      .input("USER_ID", sql.Int, id)
      .query(
        `
      SELECT U.USER_ID, PATIENT_ID, F_NAME, L_NAME, ACCOUNT_STATUS, GENDER, BLOOD_GROUP, WEIGHT, HEIGHT, ADDRESS FROM USERS AS U
      INNER JOIN PATIENTS AS P ON U.USER_ID = P.USER_ID
      WHERE P.USER_ID = @USER_ID
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "PATIENT NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { USER_ID, BLOOD_GROUP, WEIGHT, HEIGHT, ADDRESS } = req.body;
    USER_ID = parseInt(USER_ID);
    WEIGHT = parseInt(WEIGHT);
    HEIGHT = parseInt(HEIGHT);

    const columnNames = await fetchColumnNames("PATIENTS");

    if (
      !authorizeUser(req, res, [userTables.admin, userTables.patient], false)
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }
    if (!(USER_ID && BLOOD_GROUP && WEIGHT && HEIGHT && ADDRESS)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }
    if (HEIGHT <= 0 || WEIGHT <= 0 || !HEIGHT || !WEIGHT || !USER_ID) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("USER_ID", sql.Int, USER_ID)
      .input("BLOOD_GROUP", sql.VarChar(3), BLOOD_GROUP)
      .input("WEIGHT", sql.Int, WEIGHT)
      .input("HEIGHT", sql.Int, HEIGHT)
      .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
      .query(
        `
      INSERT INTO PATIENTS (USER_ID, BLOOD_GROUP, WEIGHT, HEIGHT, ADDRESS)
      VALUES 
      (@USER_ID, @BLOOD_GROUP, @WEIGHT, @HEIGHT, @ADDRESS)
      `
      );

    const userIDResult = await pool
      .request()
      .input("USER_ID", sql.Int, USER_ID)
      .query(
        `
        SELECT PATIENT_ID FROM PATIENTS AS P
        WHERE P.USER_ID = @USER_ID;
        `
      );

    res.status(201).json({
      message: "PATIENT ADDED SUCCESSFULLY",
      userId: USER_ID,
      patientId: userIDResult.recordset[0].PATIENT_ID,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("USER_ID", sql.Int, id)
      .query(`DELETE FROM PATIENTS WHERE USER_ID = @USER_ID`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: `PATIENT WITH USER ID ${id} NOT FOUND` });
    }
    res
      .status(200)
      .json({ message: `PATIENT WITH USER ID ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const columnTypes = await fetchColumnTypes("PATIENTS");
  const columnNames = await fetchColumnNames("PATIENTS");

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  if (!validateRequestBody(updates, columnNames)) {
    return res.status(400).json({ error: "INVALID REQUEST BODY" });
  }

  let updateFields = [];
  const pool = await sql.connect(config);
  const request = pool.request();

  for (let field in updates) {
    if (field === "USER_ID") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (field === "BLOOD_GROUP") {
      updates[field] = updates[field].toUpperCase();
    }
    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }
  request.input("USER_ID", sql.Int, id);

  const query = `UPDATE PATIENTS SET ${updateFields.join(
    ", "
  )} WHERE USER_ID = @USER_ID`;

  try {
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "USER NOT FOUND" });
    }

    res
      .status(200)
      .json({ message: `PATIENT WITH USER ID ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;