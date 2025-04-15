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

router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.rescueWorker], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT U.USER_ID, LICENSE_NO, F_NAME, L_NAME, GENDER,  ADDRESS ,DATE_STARTED

      FROM USERS AS U
      INNER JOIN RESCUE_WORKERS AS R
       ON U.USER_ID = R.USER_ID
      `
    );
    res.status(200).json(result.recordset);
  }


  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authenticateToken, authorizeUser([userTables.admin, userTables.rescueWorker], true), async (req, res) => {
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
       SELECT U.USER_ID, LICENSE_NO, F_NAME, L_NAME, GENDER,  ADDRESS ,DATE_STARTED

      FROM USERS AS U
      INNER JOIN RESCUE_WORKERS AS R
       ON U.USER_ID = R.USER_ID
      WHERE R.USER_ID = @USER_ID
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "RESCUE WORKER NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { USER_ID, LICENSE_NO, DATE_STARTED, ADDRESS } = req.body;

    USER_ID = parseInt(USER_ID);

    const columnNames = await fetchColumnNames("RESCUE_WORKERS");

    if (
      !authorizeUser(req, res, [userTables.admin, userTables.rescueWorker], false)
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }

    if (!(USER_ID && LICENSE_NO && DATE_STARTED && ADDRESS)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }

    const pool = await sql.connect(config);
    await pool
      .request()
      .input("USER_ID", sql.Int, USER_ID)
      .input("LICENSE_NO", sql.VarChar(20), LICENSE_NO)
      .input("DATE_STARTED", sql.Date, DATE_STARTED)
      .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
      .query(
        `
        INSERT INTO RESCUE_WORKERS (LICENSE_NO, USER_ID, DATE_STARTED, ADDRESS)
        VALUES (@LICENSE_NO, @USER_ID, @DATE_STARTED, @ADDRESS)
        `
      );

    res.status(201).json({
      message: "RESCUE WORKER ADDED SUCCESSFULLY",
      userId: USER_ID,
      licenseNo: LICENSE_NO,
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
      .query(`DELETE FROM RESCUE_WORKERS WHERE USER_ID = @USER_ID`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: `RESCUE WORKER WITH USER ID ${id} NOT FOUND` });
    }

    res.status(200).json({
      message: `RESCUE WORKER WITH USER ID ${id} DELETED SUCCESSFULLY`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;

  const columnTypes = await fetchColumnTypes("RESCUE_WORKERS");
  const columnNames = await fetchColumnNames("RESCUE_WORKERS");

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
      return res.status(403).json({ error: "USER_ID CANNOT BE UPDATED" });
    }

    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }

  request.input("USER_ID", sql.Int, id);
  const query = `UPDATE RESCUE_WORKERS SET ${updateFields.join(
    ", "
  )} WHERE USER_ID = @USER_ID`;

  try {
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "RESCUE WORKER NOT FOUND" });
    }

    res.status(200).json({
      message: `RESCUE WORKER WITH USER ID ${id} UPDATED SUCCESSFULLY`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;