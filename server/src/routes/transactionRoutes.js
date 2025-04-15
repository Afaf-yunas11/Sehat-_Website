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

router.get("/", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT * FROM TRANSACTIONS
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
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const result = await pool
      .request()
      .input("USER_ID", sql.Int, id)
      .query(
      `
      SELECT TRANSACTION_ID, BOOKING_ID, AMOUNT_PAYABLE, MODE_OF_PAYMENT, PAYMENT_STATUS, DISCOUNT FROM TRANSACTIONS AS T
      INNER JOIN BOOKINGS AS B ON T.BOOKING_ID = B.BOOKING_ID
      INNER JOIN PATIENTS AS P ON P.PATIENT_ID = B.PATIENT_ID
      INNER JOIN USERS AS U ON U.USER_ID = P.USER_ID
      WHERE U.USER_ID = @USER_ID;
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "TRANSACTION NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  try {
    let { BOOKING_ID, AMOUNT_PAYABLE, MODE_OF_PAYMENT, PAYMENT_STATUS, DISCOUNT } = req.body;
    BOOKING_ID = parseInt(BOOKING_ID);
    AMOUNT_PAYABLE = parseFloat(AMOUNT_PAYABLE);
    DISCOUNT = parseFloat(DISCOUNT);

    const columnNames = await fetchColumnNames("TRANSACTIONS");

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }
    if (!(BOOKING_ID && AMOUNT_PAYABLE && MODE_OF_PAYMENT && PAYMENT_STATUS && DISCOUNT >= 0)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }
    if (BOOKING_ID <= 0 || AMOUNT_PAYABLE <= 0) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BOOKING_ID", sql.Int, BOOKING_ID)
      .input("AMOUNT_PAYABLE", sql.Money, AMOUNT_PAYABLE)
      .input("MODE_OF_PAYMENT", sql.VarChar(50), MODE_OF_PAYMENT)
      .input("PAYMENT_STATUS", sql.VarChar(50), PAYMENT_STATUS)
      .input("DISCOUNT", sql.Decimal(18, 2), DISCOUNT)
      .query(
        `
        INSERT INTO TRANSACTIONS (BOOKING_ID, AMOUNT_PAYABLE, MODE_OF_PAYMENT, PAYMENT_STATUS, DISCOUNT)
        VALUES (@BOOKING_ID, @AMOUNT_PAYABLE, @MODE_OF_PAYMENT, @PAYMENT_STATUS, @DISCOUNT)
        `
      );

    

    const USER_ID = null;
    const transactionIDResult = await pool
      .request()
      .input("USER_ID", sql.Int, USER_ID)
      .input("BOOKING_ID", sql.Int, BOOKING_ID)
      .query(
        `
        SELECT MAX(TRANSACTION_ID) AS TRANSACTION_ID FROM TRANSACTIONS
        WHERE BOOKING_ID = @BOOKING_ID;
        `
      );

    res.status(201).json({
      message: "TRANSACTION ADDED SUCCESSFULLY",
      transactionId: transactionIDResult.recordset[0].TRANSACTION_ID,
      bookingId: BOOKING_ID,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID TRANSACTION ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("TRANSACTION_ID", sql.Int, id)
      .query(`DELETE FROM TRANSACTIONS WHERE TRANSACTION_ID = @TRANSACTION_ID`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: `TRANSACTION ${id} NOT FOUND` });
    }
    res
      .status(200)
      .json({ message: `TRANSACTION ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authenticateToken, authorizeUser([userTables.admin], false), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const columnTypes = await fetchColumnTypes("TRANSACTIONS");
  const columnNames = await fetchColumnNames("TRANSACTIONS");

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
    if (field === "TRANSACTION_ID" || field === "BOOKING_ID") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (field === "PAYMENT_STATUS" || field === "MODE_OF_PAYMENT") {
      updates[field] = updates[field].toLowerCase();
    }
    if (field === "DISCOUNT") {
      if (isNaN(updates[field])) {
        return res.status(400).json({ error: "INVALID NUMBER FORMAT" });
      }
      updates[field] = parseInt(updates[field]);
    }
    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }
  request.input("TRANSACTION_ID", sql.Int, id);

  const query = `UPDATE TRANSACTIONS SET ${updateFields.join(", ")} WHERE TRANSACTION_ID = @TRANSACTION_ID`;

  try {
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "TRANSACTION NOT FOUND" });
    }

    res
      .status(200)
      .json({ message: `TRANSACTION ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;