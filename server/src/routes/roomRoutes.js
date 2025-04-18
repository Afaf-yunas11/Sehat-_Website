import express from "express";
import { userTables } from "../config/userTables.js";
import sql from "mssql";

import authenticateToken from "../scripts/authenticateToken.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";
import authorizeUser from "../scripts/authorizeUser.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

router.get("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT R.ROOM_ID, B.BRANCH_ID, B.[LOCATION], H.HOSPITAL_NAME, R.MAX_OCCUPANCY, R.ROOM_TYPE, R.ROOM_COST_PER_NIGHT FROM ROOMS AS R
      INNER JOIN BRANCHES AS B ON B.BRANCH_ID = R.BRANCH_ID
      INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = B.HOSPITAL_ID
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authorizeUser([userTables.admin], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = await sql.connect(config);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID ROOM ID" });
    }

    const result = await pool
      .request()
      .input("ROOM_ID", sql.Int, id)
      .query(
        `
        SELECT R.ROOM_ID, B.BRANCH_ID, B.[LOCATION], H.HOSPITAL_NAME, R.MAX_OCCUPANCY, R.ROOM_TYPE, R.ROOM_COST_PER_NIGHT FROM ROOMS AS R
        INNER JOIN BRANCHES AS B ON B.BRANCH_ID = R.BRANCH_ID
        INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = B.HOSPITAL_ID
        WHERE R.ROOM_ID = @ROOM_ID
        `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "ROOM NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-branch-id/:branchId", authenticateToken, authorizeUser([userTables.admin, userTables.patient], false), async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ error: "INVALID BRANCH ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, branchId)
      .query(
        `
        SELECT R.ROOM_ID, R.MAX_OCCUPANCY, R.ROOM_TYPE, R.ROOM_COST_PER_NIGHT
        FROM ROOMS AS R
        INNER JOIN BRANCHES AS B ON B.BRANCH_ID = R.BRANCH_ID
        INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = B.HOSPITAL_ID
        WHERE R.BRANCH_ID = @BRANCH_ID
        `
      );

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});router.get("/by-branch/:branchId", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ error: "INVALID BRANCH ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, branchId)
      .query(
        `
        SELECT R.ROOM_ID, B.BRANCH_ID, B.[LOCATION], H.HOSPITAL_NAME, R.MAX_OCCUPANCY, R.ROOM_TYPE, R.ROOM_COST_PER_NIGHT
        FROM ROOMS AS R
        INNER JOIN BRANCHES AS B ON B.BRANCH_ID = R.BRANCH_ID
        INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = B.HOSPITAL_ID
        WHERE R.BRANCH_ID = @BRANCH_ID
        `
      );

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    let { BRANCH_ID, MAX_OCCUPANCY, ROOM_TYPE, ROOM_COST_PER_NIGHT} = req.body;
    BRANCH_ID = parseInt(BRANCH_ID);
    MAX_OCCUPANCY = parseInt(MAX_OCCUPANCY);

    const columnNames = await fetchColumnNames("ROOMS");

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }
    if (!(BRANCH_ID && MAX_OCCUPANCY > 0 && ROOM_TYPE && ROOM_COST_PER_NIGHT >= 0)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }
    if (isNaN(BRANCH_ID) || isNaN(MAX_OCCUPANCY)) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BRANCH_ID", sql.Int, BRANCH_ID)
      .input("MAX_OCCUPANCY", sql.Int, MAX_OCCUPANCY)
      .input("ROOM_TYPE", sql.VarChar(50), ROOM_TYPE)
      .input("ROOM_COST_PER_NIGHT", sql.Money, ROOM_COST_PER_NIGHT)
      .query(
        `
        INSERT INTO ROOMS (BRANCH_ID, MAX_OCCUPANCY, ROOM_TYPE, ROOM_COST_PER_NIGHT)
        VALUES (@BRANCH_ID, @MAX_OCCUPANCY, @ROOM_TYPE, @ROOM_COST_PER_NIGHT)
        `
      );

    const ROOM_ID = null;
    const roomIDResult = await pool
      .request()
      .input("ROOM_COST_PER_NIGHT", sql.Money, ROOM_COST_PER_NIGHT)
      .query(
        `
        SELECT MAX(ROOM_ID) AS ROOM_ID FROM ROOMS
        WHERE ROOM_COST_PER_NIGHT = @ROOM_COST_PER_NIGHT
        `
      );

    res.status(201).json({
      message: "ROOM ADDED SUCCESSFULLY",
      roomId: roomIDResult.recordset[0].ROOM_ID
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID ROOM ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("ROOM_ID", sql.Int, id)
      .query(`DELETE FROM ROOMS WHERE ROOM_ID = @ROOM_ID`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: `ROOM ${id} NOT FOUND` });
    }
    res
      .status(200)
      .json({ message: `ROOM ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const columnTypes = await fetchColumnTypes("ROOMS");
  const columnNames = await fetchColumnNames("ROOMS");

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
    if (field === "ROOM_ID") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (field === "ROOM_TYPE") {
      updates[field] = updates[field].toLowerCase();
    }
    if (field === "MAX_OCCUPANCY") {
      if (isNaN(updates[field])) {
        return res.status(400).json({ error: "INVALID NUMBER FORMAT" });
      }
      updates[field] = parseFloat(updates[field]);
    }
    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }
  request.input("ROOM_ID", sql.Int, id);

  const query = `UPDATE ROOMS SET ${updateFields.join(", ")} WHERE ROOM_ID = @ROOM_ID`;

  try {
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "ROOM NOT FOUND" });
    }

    res
      .status(200)
      .json({ message: `ROOM ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;