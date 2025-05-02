import express from "express";
import sql from "mssql";
import { userTables } from "../config/userTables.js";
import authenticateToken from "../scripts/authenticateToken.js";
import authorizeUser from "../scripts/authorizeUser.js";
import validateRequestBody from "../scripts/validateRequestBody.js";
import fetchColumnTypes from "../scripts/fetchColumnTypes.js";
import fetchColumnNames from "../scripts/fetchColumnNames.js";

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

// GET all admins
router.get(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin], false),
  async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query(`
        SELECT 
          A.ADMIN_ID,
          A.USER_ID,
          A.DATE_STARTED,
          CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS
        FROM ADMINS AS A
        LEFT JOIN USER_ADDRESS AS UA ON A.USER_ID = UA.USER_ID
      `);
      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET admin by user ID
router.get("/by-user/:id", authenticateToken, authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("USER_ID", sql.Int, id)
        .query(`
          SELECT 
            A.ADMIN_ID,
            A.USER_ID,
            A.DATE_STARTED,
            CONCAT(UA.ADDRESS, ', ', UA.CITY) AS ADDRESS
          FROM ADMINS AS A
          LEFT JOIN USER_ADDRESS AS UA ON A.USER_ID = UA.USER_ID
          WHERE A.USER_ID = @USER_ID
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "ADMIN NOT FOUND" });
      }

      res.status(200).json(result.recordset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST new admin
router.post(
  "/",
  authenticateToken,
  authorizeUser([userTables.admin], false),
  async (req, res) => {
    try {
      const { USER_ID, DATE_STARTED, ADDRESS, CITY } = req.body;
      const columnNames = await fetchColumnNames("ADMINS");

      if (!validateRequestBody(req.body, columnNames)) {
        return res.status(400).json({ error: "INVALID REQUEST BODY" });
      }

      if (!(USER_ID && DATE_STARTED && ADDRESS && CITY)) {
        return res.status(400).json({ error: "ALL FIELDS ARE REQUIRED" });
      }

      const pool = await sql.connect(config);
      
      // Begin transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      try {
        // Insert into ADMINS table
        const adminRequest = new sql.Request(transaction);
        await adminRequest
          .input("USER_ID", sql.Int, USER_ID)
          .input("DATE_STARTED", sql.Date, DATE_STARTED)
          .query(
            `
            INSERT INTO ADMINS (USER_ID, DATE_STARTED)
            VALUES (@USER_ID, @DATE_STARTED)
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
        
        // Get ADMIN_ID
        const idRequest = new sql.Request(transaction);
        const result = await idRequest
          .input("USER_ID", sql.Int, USER_ID)
          .query(`SELECT ADMIN_ID FROM ADMINS WHERE USER_ID = @USER_ID`);
        
        // Commit transaction
        await transaction.commit();
        
        res.status(201).json({
          message: "ADMIN ADDED SUCCESSFULLY",
          userId: USER_ID,
          adminId: result.recordset[0].ADMIN_ID,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH (update) admin by user ID
router.patch(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    const updates = req.body;
    
    // Separate admin data from address data
    const adminUpdates = { ...updates };
    const addressUpdates = {};
    
    if (updates.ADDRESS) {
      addressUpdates.ADDRESS = updates.ADDRESS;
      delete adminUpdates.ADDRESS;
    }
    
    if (updates.CITY) {
      addressUpdates.CITY = updates.CITY;
      delete adminUpdates.CITY;
    }
    
    if (Object.keys(adminUpdates).length === 0 && Object.keys(addressUpdates).length === 0) {
      return res.status(400).json({ error: "NO FIELDS TO UPDATE" });
    }

    try {
      const pool = await sql.connect(config);
      
      // Begin transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      try {
        let result = { rowsAffected: [0] };
        
        // Update ADMINS table if there are admin fields to update
        if (Object.keys(adminUpdates).length > 0) {
          const columnTypes = await fetchColumnTypes("ADMINS");
          const columnNames = await fetchColumnNames("ADMINS");
          
          if (!validateRequestBody(adminUpdates, columnNames)) {
            return res.status(400).json({ error: "INVALID REQUEST BODY FOR ADMIN" });
          }
          
          let updateFields = [];
          const adminRequest = new sql.Request(transaction);
          
          for (let field in adminUpdates) {
            if (field === "USER_ID") {
              return res.status(403).json({ error: "FORBIDDEN TO UPDATE USER_ID" });
            }
            adminRequest.input(field, columnTypes[field], adminUpdates[field]);
            updateFields.push(`${field} = @${field}`);
          }
          
          adminRequest.input("USER_ID", sql.Int, id);
          
          if (updateFields.length > 0) {
            const query = `UPDATE ADMINS SET ${updateFields.join(", ")} WHERE USER_ID = @USER_ID`;
            result = await adminRequest.query(query);
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
        
        if (result.rowsAffected[0] === 0 && Object.keys(adminUpdates).length > 0) {
          return res.status(404).json({ error: "ADMIN NOT FOUND" });
        }
        
        res
          .status(200)
          .json({ message: `ADMIN WITH USER ID ${id} UPDATED SUCCESSFULLY` });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE admin by user ID
router.delete(
  "/by-user/:id",
  authenticateToken,
  authorizeUser([userTables.admin], true),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "INVALID USER ID" });
    }

    try {
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
        
        // Delete from ADMINS table
        const adminRequest = new sql.Request(transaction);
        const result = await adminRequest
          .input("USER_ID", sql.Int, id)
          .query(`DELETE FROM ADMINS WHERE USER_ID = @USER_ID`);
        
        // Commit transaction
        await transaction.commit();
        
        if (result.rowsAffected[0] === 0) {
          return res
            .status(404)
            .json({ error: `ADMIN WITH USER ID ${id} NOT FOUND` });
        }
        
        res.status(200).json({
          message: `ADMIN WITH USER ID ${id} DELETED SUCCESSFULLY`,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
