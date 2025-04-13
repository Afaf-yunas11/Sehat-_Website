import express from "express";
import sql from "mssql";
import jwt from "jsonwebtoken";

/*IMPORTING MIDDLEWARE BEFORE ROUTES*/

import sha256 from "../scripts/sha256.js";
import validateEmail from "../scripts/validateEmail.js";
import { allowedTables } from "../config/userTables.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

router.post("/login", async (req, res) => {
  try {
    let { loginType, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL AND PASSWORD REQUIRED" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "INVALID EMAIL FORMAT" });
    }

    loginType = loginType.toUpperCase();
    if (!allowedTables.includes(loginType)) {
      return res.status(400).json({ error: "INVALID LOGIN TYPE" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("email", sql.VarChar(100), email)
      .query(
        `
      SELECT USERS.USER_ID, EMAIL, PASSWORD
      FROM USERS
      INNER JOIN ${loginType} ON USERS.USER_ID = ${loginType}.USER_ID
      WHERE LOWER(EMAIL) = LOWER(@email);
      `
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "USER NOT FOUND" });
    }

    const user = result.recordset[0];
    const hashedPassword = user.PASSWORD;
    const hashedInput = sha256(password);

    if (hashedPassword != hashedInput) {
      console.log(`user: ${hashedInput}, sql: ${hashedPassword}`);
      return res.status(401).json({ error: "INVALID PASSWORD" });
    }

    const token = jwt.sign(
      { userId: user.USER_ID, email: user.EMAIL, loginType: loginType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token,
      {
        domain: 'localhost',
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 3600 * 1000,
      });

    res.status(200).json({ message: "LOGIN SUCCESSFUL" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;