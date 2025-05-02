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

router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.rescueWorker], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT 
        U.USER_ID, 
        PATIENT_ID, 
        F_NAME, 
        L_NAME, 
        ACCOUNT_STATUS, 
        GENDER, 
        BLOOD_GROUP, 
        WEIGHT, 
        HEIGHT, 
        CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS 
      FROM USERS AS U
      INNER JOIN PATIENTS AS P ON U.USER_ID = P.USER_ID
      LEFT JOIN USER_ADDRESS AS UA ON U.USER_ID = UA.USER_ID
      `
    );
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authenticateToken, authorizeUser([userTables.admin, userTables.doctor, userTables.rescueWorker], true), async (req, res) => {
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
          U.USER_ID, 
          PATIENT_ID, 
          F_NAME, 
          L_NAME, 
          ACCOUNT_STATUS, 
          GENDER, 
          BLOOD_GROUP, 
          WEIGHT, 
          HEIGHT, 
          CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS 
        FROM USERS AS U
        INNER JOIN PATIENTS AS P ON U.USER_ID = P.USER_ID
        LEFT JOIN USER_ADDRESS AS UA ON U.USER_ID = UA.USER_ID
        WHERE P.USER_ID = @USER_ID
        `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "PATIENT NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { USER_ID, BLOOD_GROUP, WEIGHT, HEIGHT, ADDRESS, CITY } = req.body;

    USER_ID = parseInt(USER_ID);
    WEIGHT = parseInt(WEIGHT);
    HEIGHT = parseInt(HEIGHT);

    const columnNames = await fetchColumnNames("PATIENTS");
    columnNames.push("ADDRESS", "CITY");

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }
    if (!(USER_ID && BLOOD_GROUP && WEIGHT && HEIGHT && ADDRESS && CITY)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }
    if (HEIGHT <= 0 || WEIGHT <= 0 || !HEIGHT || !WEIGHT || !USER_ID) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const pool = await sql.connect(config);
    
    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Insert into PATIENTS table
      const patientRequest = new sql.Request(transaction);
      await patientRequest
        .input("USER_ID", sql.Int, USER_ID)
        .input("BLOOD_GROUP", sql.VarChar(3), BLOOD_GROUP)
        .input("WEIGHT", sql.Int, WEIGHT)
        .input("HEIGHT", sql.Int, HEIGHT)
        .query(
          `
          INSERT INTO PATIENTS (USER_ID, BLOOD_GROUP, WEIGHT, HEIGHT)
          VALUES (@USER_ID, @BLOOD_GROUP, @WEIGHT, @HEIGHT)
          `
        );
      
      // Insert into USER_ADDRESS table
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("USER_ID", sql.Int, USER_ID)
        .input("ADDRESS", sql.VarChar(sql.MAX), ADDRESS)
        .input("CITY", sql.VarChar(sql.MAX), CITY)
        .query(
          `
          INSERT INTO USER_ADDRESS (USER_ID, ADDRESS, CITY)
          VALUES (@USER_ID, @ADDRESS, @CITY)
          `
        );
      
      // Get PATIENT_ID
      const idRequest = new sql.Request(transaction);
      const userIDResult = await idRequest
        .input("USER_ID", sql.Int, USER_ID)
        .query(
          `
          SELECT PATIENT_ID FROM PATIENTS AS P
          WHERE P.USER_ID = @USER_ID;
          `
        );
      
      // Commit transaction
      await transaction.commit();
      
      res.status(201).json({
        message: "PATIENT ADDED SUCCESSFULLY",
        userId: USER_ID,
        patientId: userIDResult.recordset[0].PATIENT_ID,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
    
    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Delete from USER_ADDRESS table first (will cascade delete from PATIENTS due to foreign key)
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("USER_ID", sql.Int, id)
        .query(`DELETE FROM USER_ADDRESS WHERE USER_ID = @USER_ID`);
      
      // Delete from PATIENTS table
      const patientRequest = new sql.Request(transaction);
      const result = await patientRequest
        .input("USER_ID", sql.Int, id)
        .query(`DELETE FROM PATIENTS WHERE USER_ID = @USER_ID`);
      
      // Commit transaction
      await transaction.commit();
      
      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: `PATIENT WITH USER ID ${id} NOT FOUND` });
      }
      
      res
        .status(200)
        .json({ message: `PATIENT WITH USER ID ${id} DELETED SUCCESSFULLY` });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true), async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  
  // Separate patient data from address data
  const patientUpdates = { ...updates };
  const addressUpdates = {};
  
  if (updates.ADDRESS) {
    addressUpdates.ADDRESS = updates.ADDRESS;
    delete patientUpdates.ADDRESS;
  }
  
  if (updates.CITY) {
    addressUpdates.CITY = updates.CITY;
    delete patientUpdates.CITY;
  }
  
  if (Object.keys(patientUpdates).length === 0 && Object.keys(addressUpdates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  try {
    const pool = await sql.connect(config);
    
    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      let result = { rowsAffected: [0] };
      
      // Update PATIENTS table if there are patient fields to update
      if (Object.keys(patientUpdates).length > 0) {
        const columnTypes = await fetchColumnTypes("PATIENTS");
        const columnNames = await fetchColumnNames("PATIENTS");
        
        if (!validateRequestBody(patientUpdates, columnNames)) {
          return res.status(400).json({ error: "INVALID REQUEST BODY FOR PATIENT" });
        }
        
        let updateFields = [];
        const patientRequest = new sql.Request(transaction);
        
        for (let field in patientUpdates) {
          if (field === "USER_ID") {
            return res.status(403).json({ error: "FORBIDDEN" });
          }
          if (field === "BLOOD_GROUP") {
            patientUpdates[field] = patientUpdates[field].toUpperCase();
          }
          patientRequest.input(field, columnTypes[field], patientUpdates[field]);
          updateFields.push(`${field} = @${field}`);
        }
        
        patientRequest.input("USER_ID", sql.Int, id);
        
        if (updateFields.length > 0) {
          const query = `UPDATE PATIENTS SET ${updateFields.join(", ")} WHERE USER_ID = @USER_ID`;
          result = await patientRequest.query(query);
        }
      }
      
      // Update USER_ADDRESS table if there are address fields to update
      if (Object.keys(addressUpdates).length > 0) {
        const addressRequest = new sql.Request(transaction);
        addressRequest.input("USER_ID", sql.Int, id);
        
        // Check if address record exists
        const checkResult = await addressRequest.query(
          `SELECT COUNT(*) AS count FROM USER_ADDRESS WHERE USER_ID = @USER_ID`
        );
        
        const addressExists = checkResult.recordset[0].count > 0;
        
        if (addressExists) {
          // Update existing record
          let updateFields = [];
          
          for (let field in addressUpdates) {
            addressRequest.input(field, sql.VarChar(sql.MAX), addressUpdates[field]);
            updateFields.push(`${field} = @${field}`);
          }
          
          if (updateFields.length > 0) {
            await addressRequest.query(
              `UPDATE USER_ADDRESS SET ${updateFields.join(", ")} WHERE USER_ID = @USER_ID`
            );
          }
        } else {
          // Insert new record
          addressRequest
            .input("ADDRESS", sql.VarChar(sql.MAX), addressUpdates.ADDRESS || '')
            .input("CITY", sql.VarChar(sql.MAX), addressUpdates.CITY || '')
            .query(
              `INSERT INTO USER_ADDRESS (USER_ID, ADDRESS, CITY) VALUES (@USER_ID, @ADDRESS, @CITY)`
            );
        }
      }
      
      // Commit transaction
      await transaction.commit();
      
      if (result.rowsAffected[0] === 0 && Object.keys(patientUpdates).length > 0) {
        return res.status(404).json({ error: "PATIENT NOT FOUND" });
      }
      
      res
        .status(200)
        .json({ message: `PATIENT WITH USER ID ${id} UPDATED SUCCESSFULLY` });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;