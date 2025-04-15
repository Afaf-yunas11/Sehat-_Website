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
      SELECT 
        B.BOOKING_ID, 
        B.BOOKING_DATE, 
        B.BOOKING_TIME, 
        B.DURATION_OF_STAY, 
        B.BOOKING_STATUS, 
        B.PATIENT_ID, 
        U.USER_ID AS PATIENT_USER_ID, 
        B.LICENSE_NO, 
        U2.USER_ID AS DOCTOR_USER_ID, 
        U2.F_NAME AS DOCTOR_F_NAME, 
        U2.L_NAME DOCTOR_L_NAME, 
        PR.PROCEDURE_NAME, 
        PR.PROCEDURE_DURATION,
        BR.BRANCH_ID,
        BR.[LOCATION] AS BRANCH_LOCATION,
        BR.PHONE_NO,
        BR.LATITUDE,
        BR.LONGITUDE,
        H.HOSPITAL_NAME,
        RO.ROOM_ID,
        RO.ROOM_TYPE
      FROM BOOKINGS AS B
      INNER JOIN PROCEDURES AS PR ON PR.PROCEDURE_ID = B.PROCEDURE_ID
      INNER JOIN PATIENTS AS PA ON PA.PATIENT_ID = B.PATIENT_ID
      INNER JOIN USERS AS U ON U.USER_ID = PA.USER_ID
      INNER JOIN DOCTORS AS D ON D.LICENSE_NO = B.LICENSE_NO
      INNER JOIN USERS AS U2 ON U2.USER_ID = D.USER_ID
      INNER JOIN ROOMS AS RO ON RO.ROOM_ID = B.ROOM_ID
      INNER JOIN BRANCHES AS BR ON BR.BRANCH_ID = RO.BRANCH_ID
      INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = BR.HOSPITAL_ID
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authorizeUser([userTables.admin], true), async (req, res) => {
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
      SELECT 
    B.BOOKING_ID, 
    B.BOOKING_DATE, 
    B.BOOKING_TIME, 
    B.DURATION_OF_STAY, 
    B.BOOKING_STATUS, 
    B.PATIENT_ID, 
    (U2.F_NAME + ' ' + U2.L_NAME) AS DOCTOR_NAME,
    PR.PROCEDURE_NAME, 
    PR.PROCEDURE_DURATION,
    BR.BRANCH_ID,
    BR.[LOCATION] AS BRANCH_LOCATION,
    BR.PHONE_NO,
    H.HOSPITAL_NAME,
    RO.ROOM_ID,
    RO.ROOM_TYPE
FROM BOOKINGS AS B
INNER JOIN PROCEDURES AS PR ON PR.PROCEDURE_ID = B.PROCEDURE_ID
INNER JOIN PATIENTS AS PA ON PA.PATIENT_ID = B.PATIENT_ID
INNER JOIN USERS AS U ON U.USER_ID = PA.USER_ID
INNER JOIN DOCTORS AS D ON D.LICENSE_NO = B.LICENSE_NO
INNER JOIN USERS AS U2 ON U2.USER_ID = D.USER_ID
INNER JOIN ROOMS AS RO ON RO.ROOM_ID = B.ROOM_ID
INNER JOIN BRANCHES AS BR ON BR.BRANCH_ID = RO.BRANCH_ID
INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = BR.HOSPITAL_ID;
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "BOOKING NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, authorizeUser([userTables.admin, userTables.patient], false), async (req, res) => {
  try {
    let {
      BOOKING_ID,
      PATIENT_ID,
      PROCEDURE_ID,
      LICENSE_NO,
      ROOM_ID,
      BOOKING_DATE,
      BOOKING_TIME,
      DURATION_OF_STAY,
      BOOKING_STATUS,
    } = req.body;

    BOOKING_ID = parseInt(BOOKING_ID);
    PATIENT_ID = parseInt(PATIENT_ID);
    PROCEDURE_ID = parseInt(PROCEDURE_ID);
    ROOM_ID = parseInt(ROOM_ID);
    DURATION_OF_STAY = parseInt(DURATION_OF_STAY);

    const columnNames = await fetchColumnNames("BOOKINGS");
    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }

    if (
      !(
        BOOKING_ID &&
        PATIENT_ID &&
        PROCEDURE_ID &&
        LICENSE_NO &&
        ROOM_ID &&
        BOOKING_DATE &&
        BOOKING_TIME &&
        DURATION_OF_STAY &&
        BOOKING_STATUS
      )
    ) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }

    if (DURATION_OF_STAY <= 0) {
      return res.status(400).json({ error: "DURATION MUST BE > 0" });
    }

    const pool = await sql.connect(config);

    // 🔍 Check for same doctor, date, and time
    const duplicateDoctorBooking = await pool
      .request()
      .input("LICENSE_NO", sql.VarChar(20), LICENSE_NO)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.Time, BOOKING_TIME)
      .query(
        `SELECT * FROM BOOKINGS 
         WHERE LICENSE_NO = @LICENSE_NO 
         AND BOOKING_DATE = @BOOKING_DATE 
         AND BOOKING_TIME = @BOOKING_TIME`
      );

    if (duplicateDoctorBooking.recordset.length > 0) {
      return res.status(409).json({
        error: "DOCTOR ALREADY HAS A BOOKING AT THAT DATE & TIME",
      });
    }

    // 🔍 Check if the same room is booked at the same date and time
    const duplicateRoomBooking = await pool
      .request()
      .input("ROOM_ID", sql.Int, ROOM_ID)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.Time, BOOKING_TIME)
      .query(
        `SELECT * FROM BOOKINGS 
         WHERE ROOM_ID = @ROOM_ID 
         AND BOOKING_DATE = @BOOKING_DATE 
         AND BOOKING_TIME = @BOOKING_TIME`
      );

    if (duplicateRoomBooking.recordset.length > 0) {
      return res.status(409).json({
        error: "ROOM IS ALREADY BOOKED AT THAT DATE & TIME",
      });
    }

    // ✅ Insert booking if all checks pass
    const result = await pool
      .request()
      .input("BOOKING_ID", sql.Int, BOOKING_ID)
      .input("PATIENT_ID", sql.Int, PATIENT_ID)
      .input("PROCEDURE_ID", sql.Int, PROCEDURE_ID)
      .input("LICENSE_NO", sql.VarChar(20), LICENSE_NO)
      .input("ROOM_ID", sql.Int, ROOM_ID)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.Time, BOOKING_TIME)
      .input("DURATION_OF_STAY", sql.Int, DURATION_OF_STAY)
      .input("BOOKING_STATUS", sql.VarChar(20), BOOKING_STATUS)
      .query(
        `
        INSERT INTO BOOKINGS (BOOKING_ID, PATIENT_ID, PROCEDURE_ID, LICENSE_NO, ROOM_ID, BOOKING_DATE, BOOKING_TIME, DURATION_OF_STAY, BOOKING_STATUS)
        VALUES (@BOOKING_ID, @PATIENT_ID, @PROCEDURE_ID, @LICENSE_NO, @ROOM_ID, @BOOKING_DATE, @BOOKING_TIME, @DURATION_OF_STAY, @BOOKING_STATUS)
        `
      );

    res.status(201).json({ message: "BOOKING ADDED SUCCESSFULLY" });
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