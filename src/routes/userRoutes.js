import express from "express";
import sql from "mssql";

import sha256 from "../scripts/sha256.js";
import validateEmail from "../scripts/validateEmail.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

router.get("/", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT USER_ID, (F_NAME + ' ' + L_NAME) AS FULL_NAME, CONVERT(VARCHAR, DOB, 103) AS FDOB, GENDER
      FROM USERS;
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
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
      SELECT USER_ID, (F_NAME + ' ' + L_NAME) AS FULL_NAME, CONVERT(VARCHAR, DOB, 103) AS FDOB, GENDER
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

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL AND PASSWORD REQUIRED" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "INVALID EMAIL FORMAT" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("email", sql.VarChar(100), email)
      .query(
        `
      SELECT USER_ID, EMAIL, PASSWORD
      FROM USERS
      WHERE EMAIL = @email;
      `
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "USER NOT FOUND" });
    }

    const user = result.recordset[0];
    const hashedPassword = user.PASSWORD;
    const hashedInput = sha256(password);

    if (hashedPassword != hashedInput) {
      return res.status(401).json({ error: "INVALID PASSWORD" });
    }

    res.status(200).json({ message: "LOGIN SUCCESSFUL", userId: user.USER_ID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;