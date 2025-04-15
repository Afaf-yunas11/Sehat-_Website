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

// GET all admins
router.get(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin], false),
  async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query(`SELECT * FROM ADMIN`);
      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET admin by user ID
router.get(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("USER_ID", sql.Int, id)
        .query(`SELECT * FROM ADMIN WHERE USER_ID = @USER_ID`);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "ADMIN NOT FOUND" });
      }

      res.status(200).json(result.recordset[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST new admin
router.post(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin], false),
  async (req, res) => {
    try {
      const { USER_ID, DATE_STARTED, ADDRESS } = req.body;
      const columnNames = await fetchColumnNames("ADMIN");

      if (!validateRequestBody(req.body, columnNames)) {
        return res.status(400).json({ error: "INVALID REQUEST BODY" });
      }

      const pool = await sql.connect(config);
      await pool
        .request()
        .input("USER_ID", sql.Int, USER_ID)
        .input("DATE_STARTED", sql.Date, DATE_STARTED)
        .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
        .query(
          `
        INSERT INTO ADMIN (USER_ID, DATE_STARTED, ADDRESS)
        VALUES (@USER_ID, @DATE_STARTED, @ADDRESS)
        `
        );

      const result = await pool
        .request()
        .input("USER_ID", sql.Int, USER_ID)
        .query(`SELECT ADMIN_ID FROM ADMIN WHERE USER_ID = @USER_ID`);

      res.status(201).json({
        message: "ADMIN ADDED SUCCESSFULLY",
        userId: USER_ID,
        adminId: result.recordset[0].ADMIN_ID,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH (update) admin by user ID
router.patch(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const updates = req.body;
    const columnTypes = await fetchColumnTypes("ADMIN");
    const columnNames = await fetchColumnNames("ADMIN");

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
        return res.status(403).json({ error: "FORBIDDEN TO UPDATE USER_ID" });
      }
      request.input(field, columnTypes[field], updates[field]);
      updateFields.push(`${field} = @${field}`);
    }
    request.input("USER_ID", sql.Int, id);

    const query = `UPDATE ADMIN SET ${updateFields.join(
      ", "
    )} WHERE USER_ID = @USER_ID`;

    try {
      const result = await request.query(query);
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "ADMIN NOT FOUND" });
      }

      res
        .status(200)
        .json({ message: `ADMIN WITH USER ID ${id} UPDATED SUCCESSFULLY` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE admin by user ID
router.delete(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("USER_ID", sql.Int, id)
        .query(`DELETE FROM ADMIN WHERE USER_ID = @USER_ID`);

      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: `ADMIN WITH USER ID ${id} NOT FOUND` });
      }

      res.status(200).json({
        message: `ADMIN WITH USER ID ${id} DELETED SUCCESSFULLY`,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
