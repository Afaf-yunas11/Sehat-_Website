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
        CONCAT(BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
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
      INNER JOIN BRANCH_ADDRESS AS BA ON BR.BRANCH_ID = BA.BRANCH_ID
      INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = BR.HOSPITAL_ID
      `
    );
    console.log(result.recordset);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
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
        CONCAT(BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
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
      INNER JOIN BRANCH_ADDRESS AS BA ON BR.BRANCH_ID = BA.BRANCH_ID
      INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = BR.HOSPITAL_ID
      WHERE U.USER_ID = @USER_ID
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "BOOKING(S) NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-doctor/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
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
        U.USER_ID AS PATIENT_USER_ID,
        (U.F_NAME + ' ' + U.L_NAME) AS PATIENT_NAME,
        PR.PROCEDURE_NAME, 
        PR.PROCEDURE_DURATION,
        BR.BRANCH_ID,
        CONCAT(BA.ADDRESS, ', ', BA.CITY) AS BRANCH_LOCATION,
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
      INNER JOIN BRANCH_ADDRESS AS BA ON BR.BRANCH_ID = BA.BRANCH_ID
      INNER JOIN HOSPITALS AS H ON H.HOSPITAL_ID = BR.HOSPITAL_ID
      WHERE U2.USER_ID = @USER_ID
      `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "BOOKING(S) NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

router.post("/", authenticateToken, authorizeUser([userTables.admin, userTables.patient], false), async (req, res) => {
  try {
    let {
      USER_ID,
      PROCEDURE_ID,
      LICENSE_NO,
      ROOM_ID,
      BOOKING_DATE,
      BOOKING_TIME,
      DURATION_OF_STAY,
      BOOKING_STATUS,
    } = req.body;

    DURATION_OF_STAY = parseInt(DURATION_OF_STAY);
    LICENSE_NO = parseInt(LICENSE_NO);
    PROCEDURE_ID = parseInt(PROCEDURE_ID);
    ROOM_ID = parseInt(ROOM_ID);
    USER_ID = parseInt(USER_ID);
    console.log(req.body);

    if (
      !(
        USER_ID &&
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
      .input("LICENSE_NO", sql.Int, LICENSE_NO)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.VarChar(100), BOOKING_TIME)
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

    const duplicateRoomBooking = await pool
      .request()
      .input("ROOM_ID", sql.Int, ROOM_ID)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.VarChar(100), BOOKING_TIME)
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

    const result = await pool
      .request()
      .input("USER_ID", sql.Int, USER_ID)
      .input("PROCEDURE_ID", sql.Int, PROCEDURE_ID)
      .input("LICENSE_NO", sql.Int, LICENSE_NO)
      .input("ROOM_ID", sql.Int, ROOM_ID)
      .input("BOOKING_DATE", sql.Date, BOOKING_DATE)
      .input("BOOKING_TIME", sql.VarChar(100), BOOKING_TIME)
      .input("DURATION_OF_STAY", sql.Int, DURATION_OF_STAY)
      .input("BOOKING_STATUS", sql.VarChar(20), BOOKING_STATUS)
      .query(
        `

        DECLARE @PATIENT_ID INT;
        
        SELECT @PATIENT_ID = P.PATIENT_ID
        FROM PATIENTS AS P
        WHERE P.USER_ID = @USER_ID;

        INSERT INTO BOOKINGS 
        (PATIENT_ID, PROCEDURE_ID, LICENSE_NO, ROOM_ID, BOOKING_DATE, BOOKING_TIME, DURATION_OF_STAY, BOOKING_STATUS)
        VALUES 
        (@PATIENT_ID, @PROCEDURE_ID, @LICENSE_NO, @ROOM_ID, @BOOKING_DATE, @BOOKING_TIME, @DURATION_OF_STAY, @BOOKING_STATUS);
        `
      );
    res.status(201).json({ message: "BOOKING ADDED SUCCESSFULLY" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.delete("/by-booking/:id", authenticateToken, authorizeUser([userTables.admin, userTables.patient], true), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID BOOKING ID" });
    }

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("BOOKING_ID", sql.Int, id)
      .query(`DELETE FROM BOOKINGS WHERE BOOKING_ID = @BOOKING_ID`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: `BOOKING ${id} NOT FOUND` });
    }
    res
      .status(200)
      .json({ message: `BOOKING ${id} DELETED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/by-booking/:id", authenticateToken, authorizeUser([userTables.admin, userTables.patient, userTables.doctor], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const columnTypes = await fetchColumnTypes("BOOKINGS");
  const columnNames = await fetchColumnNames("BOOKINGS");
  console.log(id, req.body);
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
    if (field === "BOOKING_ID" || field === "PATIENT_ID" || field === "PROCEDURE_ID") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (field === "BOOKING_STATUS") {
      updates[field] = updates[field].toLowerCase();
    }
    request.input(field, columnTypes[field], updates[field]);
    updateFields.push(`${field} = @${field}`);
  }
  request.input("BOOKING_ID", sql.Int, id);

  const query = `UPDATE BOOKINGS SET ${updateFields.join(
    ", "
  )} WHERE BOOKING_ID = @BOOKING_ID`;

  try {
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "BOOKING NOT FOUND" });
    }

    res
      .status(200)
      .json({ message: `BOOKING ${id} UPDATED SUCCESSFULLY` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;