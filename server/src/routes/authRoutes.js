import express from "express";
import sql from "mssql";
import jwt from "jsonwebtoken";


//middlewares before routes 

import sha256 from "../scripts/sha256.js";
import validateEmail from "../scripts/validateEmail.js";
import { allowedTables, userTables } from "../config/userTables.js";
import authenticateToken from "../scripts/authenticateToken.js";
import { userInfo } from "os";


const router = express.Router();

//a mini router that we mount on our app(actual server)

const config = JSON.parse(process.env.CONFIG);

/*“Hey server, when someone sends data to /login using the POST method, run this code.”*/

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL AND PASSWORD REQUIRED" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "INVALID EMAIL FORMAT" });
    }

    const pool = await sql.connect(config);
    let result = null;
    let loginType = null;

    for (const table of Object.values(userTables)) {
      result = await pool
        .request()
        .input("email", sql.VarChar(100), email)
        .query(
          `
          SELECT USERS.USER_ID, EMAIL, PASSWORD, ACCOUNT_STATUS
          FROM USERS
          INNER JOIN ${table} ON USERS.USER_ID = ${table}.USER_ID
          WHERE LOWER(EMAIL) = LOWER(@email);
        `
        );

      if (result.recordset.length > 0) {
        loginType = table; // Optionally store the found type
        break;
      }
    }

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "USER NOT FOUND" });
    }

    const user = result.recordset[0];
    const hashedPassword = user.PASSWORD;   //hashed password already stored
    const hashedInput = sha256(password);   //password is string

    if (hashedPassword != hashedInput) {
      return res.status(401).json({ error: "INVALID PASSWORD" });
    }
    //we setting token to our jwt key
    const token = jwt.sign(
      { userId: user.USER_ID, email: user.EMAIL, loginType: loginType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }    //converts in jwt token
    );

    res.cookie("token", token,   //then in cookie we modifying token
      {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 3600 * 1000,
      });

    res.status(200).json({ message: "LOGIN SUCCESSFUL", userId: user.USER_ID, accountStatus: user.ACCOUNT_STATUS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/logout", authenticateToken, (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.status(200).json({ message: "LOGOUT SUCCESSFUL" });
});

router.get("/current-user", authenticateToken, async (req, res) => {
  if (req.user) {
    res.status(200).json({ userId: req.user.userId, loginType: req.user.loginType });
  }
  else {
    res.status(401).json({ error: "UNAUTHORIZED" });
  }
})


export default router;
