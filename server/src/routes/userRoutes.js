import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";

import sha256 from "../scripts/sha256.js";
import validateEmail from "../scripts/validateEmail.js";
import validatePassword from "../scripts/validatePassword.js";
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
      SELECT USER_ID, F_NAME, L_NAME, CONVERT(VARCHAR, DOB, 103) AS DOB, GENDER, ACCOUNT_STATUS
      FROM USERS;
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = await sql.connect(config);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const result = await pool
      .request()
      .input("userID", sql.Int, id)
      .query(
        `
      SELECT USER_ID, F_NAME, L_NAME, CONVERT(VARCHAR, DOB, 103) AS DOB, GENDER, ACCOUNT_STATUS
      FROM USERS WHERE USER_ID = @userID;
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "USER NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { F_NAME, L_NAME, EMAIL, PASSWORD, DOB, GENDER, ACCOUNT_STATUS} = req.body;
    const columnNames = await fetchColumnNames("USERS");

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }
    if (!(F_NAME && L_NAME && EMAIL && PASSWORD && DOB && GENDER && ACCOUNT_STATUS)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }
    if (!validateEmail(EMAIL)) {
      return res.status(400).json({ error: "INVALID EMAIL" });
    }
    if (!validatePassword(PASSWORD)) {
      return res.status(400).json({ error: "INVALID PASSWORD" });
    }

    GENDER = GENDER.toLowerCase();
    PASSWORD = sha256(PASSWORD);
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("F_NAME", sql.VarChar(100), F_NAME)
      .input("L_NAME", sql.VarChar(100), L_NAME)
      .input("EMAIL", sql.VarChar(100), EMAIL)
      .input("PASSWORD", sql.VarChar(100), PASSWORD)
      .input("DOB", sql.Date, DOB)
      .input("GENDER", sql.VarChar(6), GENDER)
      .input("ACCOUNT_STATUS", sql.VarChar(10), ACCOUNT_STATUS)
      .query(
        `
        INSERT INTO USERS (F_NAME, L_NAME, EMAIL, PASSWORD, DOB, GENDER, ACCOUNT_STATUS)
        VALUES
        (@F_NAME, @L_NAME, @EMAIL, @PASSWORD, @DOB, @GENDER, @ACCOUNT_STATUS);
        `
      );

    const userIDResult = await pool
      .request()
      .input("EMAIL", sql.VarChar(100), EMAIL)
      .query(
        `
        SELECT USER_ID FROM USERS 
        WHERE LOWER(EMAIL) = LOWER(@EMAIL);
        `
      );

    res.status(201).json({
      message: "USER ADDED SUCCESSFULLY",
      userID: userIDResult.recordset[0].USER_ID,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("USER_ID", sql.Int, id)
      .query(`DELETE FROM USERS WHERE USER_ID = @USER_ID`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: `USER ${id} NOT FOUND` });
    }
    res.status(200).json({ message: `USER ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const columnTypes = await fetchColumnTypes("USERS");
  const columnNames = await fetchColumnNames("USERS");

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  if (!validateRequestBody(updates, columnNames)) {
    return res.status(400).json({ error: "INVALID REQUEST BODY" });
  }

  let updateFields = [];
  const pool = await sql.connect(config);
  const request = pool.request();

  request.input("USER_ID", sql.Int, id);
  for (let field in updates) {
    if (field === "PASSWORD") {
      updates[field] = sha256(updates[field]);
    }
    if (field === "GENDER" || field === "ACCOUNT_STATUS") {
      updates[field] = updates[field].toLowerCase();
    }

    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }

  const query = `UPDATE USERS SET ${updateFields.join(
    ", "
  )} WHERE USER_ID = @USER_ID`;

  try {
    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "USER NOT FOUND" });
    }

    res.status(200).json({ message: `USER ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;