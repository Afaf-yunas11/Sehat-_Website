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

router.get("/", authenticateToken, authorizeUser([userTables.admin, userTables.rescueWorker], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `
      SELECT 
        U.USER_ID, 
        LICENSE_NO, 
        F_NAME, 
        L_NAME, 
        GENDER, 
        CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS, 
        DATE_STARTED
      FROM USERS AS U
      INNER JOIN RESCUE_WORKERS AS R ON U.USER_ID = R.USER_ID
      LEFT JOIN USER_ADDRESS AS UA ON U.USER_ID = UA.USER_ID
      `
    );
    res.status(200).json(result.recordset);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/by-user/:id", authenticateToken, authorizeUser([userTables.admin, userTables.rescueWorker], true), async (req, res) => {
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
          LICENSE_NO, 
          F_NAME, 
          L_NAME, 
          GENDER, 
          CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS, 
          DATE_STARTED
        FROM USERS AS U
        INNER JOIN RESCUE_WORKERS AS R ON U.USER_ID = R.USER_ID
        LEFT JOIN USER_ADDRESS AS UA ON U.USER_ID = UA.USER_ID
        WHERE R.USER_ID = @USER_ID
        `
      );

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "RESCUE WORKER NOT FOUND" });

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { USER_ID, LICENSE_NO, DATE_STARTED, ADDRESS, CITY } = req.body;

    USER_ID = parseInt(USER_ID);

    const columnNames = await fetchColumnNames("RESCUE_WORKERS");
    columnNames.push("ADDRESS", "CITY");

    if (!validateRequestBody(req.body, columnNames)) {
      return res.status(400).json({ error: "INVALID REQUEST BODY" });
    }

    if (!(USER_ID && LICENSE_NO && DATE_STARTED && ADDRESS && CITY)) {
      return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
    }

    const pool = await sql.connect(config);
    
    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Insert into RESCUE_WORKERS table
      const rescueRequest = new sql.Request(transaction);
      await rescueRequest
        .input("USER_ID", sql.Int, USER_ID)
        .input("LICENSE_NO", sql.VarChar(20), LICENSE_NO)
        .input("DATE_STARTED", sql.Date, DATE_STARTED)
        .query(
          `
          INSERT INTO RESCUE_WORKERS (LICENSE_NO, USER_ID, DATE_STARTED)
          VALUES (@LICENSE_NO, @USER_ID, @DATE_STARTED)
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
      
      // Commit transaction
      await transaction.commit();
      
      res.status(201).json({
        message: "RESCUE WORKER ADDED SUCCESSFULLY",
        userId: USER_ID,
        licenseNo: LICENSE_NO,
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
      // Delete from USER_ADDRESS table
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("USER_ID", sql.Int, id)
        .query(`DELETE FROM USER_ADDRESS WHERE USER_ID = @USER_ID`);
      
      // Delete from RESCUE_WORKERS table
      const rescueRequest = new sql.Request(transaction);
      const result = await rescueRequest
        .input("USER_ID", sql.Int, id)
        .query(`DELETE FROM RESCUE_WORKERS WHERE USER_ID = @USER_ID`);
      
      // Commit transaction
      await transaction.commit();
      
      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: `RESCUE WORKER WITH USER ID ${id} NOT FOUND` });
      }

      res.status(200).json({
        message: `RESCUE WORKER WITH USER ID ${id} DELETED SUCCESSFULLY`,
      });
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
  
  // Separate rescue worker data from address data
  const rescueUpdates = { ...updates };
  const addressUpdates = {};
  
  if (updates.ADDRESS) {
    addressUpdates.ADDRESS = updates.ADDRESS;
    delete rescueUpdates.ADDRESS;
  }
  
  if (updates.CITY) {
    addressUpdates.CITY = updates.CITY;
    delete rescueUpdates.CITY;
  }
  
  if (Object.keys(rescueUpdates).length === 0 && Object.keys(addressUpdates).length === 0) {
    return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
  }

  try {
    const pool = await sql.connect(config);
    
    // Begin transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      let result = { rowsAffected: [0] };
      
      // Update RESCUE_WORKERS table if there are rescue worker fields to update
      if (Object.keys(rescueUpdates).length > 0) {
        const columnTypes = await fetchColumnTypes("RESCUE_WORKERS");
        const columnNames = await fetchColumnNames("RESCUE_WORKERS");
        
        if (!validateRequestBody(rescueUpdates, columnNames)) {
          return res.status(400).json({ error: "INVALID REQUEST BODY FOR RESCUE WORKER" });
        }
        
        let updateFields = [];
        const rescueRequest = new sql.Request(transaction);
        
        for (let field in rescueUpdates) {
          if (field === "USER_ID") {
            return res.status(403).json({ error: "USER_ID CANNOT BE UPDATED" });
          }
          rescueRequest.input(field, columnTypes[field], rescueUpdates[field]);
          updateFields.push(`${field} = @${field}`);
        }
        
        rescueRequest.input("USER_ID", sql.Int, id);
        
        if (updateFields.length > 0) {
          const query = `UPDATE RESCUE_WORKERS SET ${updateFields.join(", ")} WHERE USER_ID = @USER_ID`;
          result = await rescueRequest.query(query);
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
      
      if (result.rowsAffected[0] === 0 && Object.keys(rescueUpdates).length > 0) {
        return res.status(404).json({ error: "RESCUE WORKER NOT FOUND" });
      }
      
      res.status(200).json({
        message: `RESCUE WORKER WITH USER ID ${id} UPDATED SUCCESSFULLY`,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;