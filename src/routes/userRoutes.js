import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";

import sha256 from "../scripts/sha256.js";
import validateEmail from "../scripts/validateEmail.js";
import validatePassword from "../scripts/validatePassword.js";
import authenticateToken from "../scripts/authenticateToken.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

router.get("/", authenticateToken, async (req, res) => {
  try {
    const allowedTables = [userTables.admin];

    if (!allowedTables.includes(req.user.loginType)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT USER_ID, F_NAME, L_NAME, CONVERT(VARCHAR, DOB, 103) AS FDOB, GENDER
      FROM USERS;
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const allowedTables = [userTables.admin];

    if (!allowedTables.includes(req.user.loginType)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const pool = await sql.connect(config);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const result = await pool
      .request()
      .input("userID", sql.Int, id)
      .query(
        `
      SELECT USER_ID, F_NAME, L_NAME, CONVERT(VARCHAR, DOB, 103) AS FDOB, GENDER
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
    let { F_NAME, L_NAME, EMAIL, PASSWORD, DOB, GENDER } = req.body;

    if (!(F_NAME && L_NAME && EMAIL && PASSWORD && DOB && GENDER)) {
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

    const pool = await sql.connect();
    const result = await pool
      .request()
      .input("F_NAME", sql.VarChar(100), F_NAME)
      .input("L_NAME", sql.VarChar(100), L_NAME)
      .input("EMAIL", sql.VarChar(100), EMAIL)
      .input("PASSWORD", sql.VarChar(100), PASSWORD)
      .input("DOB", sql.Date, DOB)
      .input("GENDER", sql.VarChar(6), GENDER)
      .query(
        `
        INSERT INTO USERS (F_NAME, L_NAME, EMAIL, PASSWORD, DOB, GENDER)
        VALUES
        (@F_NAME, @L_NAME, @EMAIL, @PASSWORD, @DOB, @GENDER);
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

export default router;