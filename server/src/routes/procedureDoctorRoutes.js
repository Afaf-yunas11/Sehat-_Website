import express from 'express';
import sql from 'mssql';
import { userTables } from '../config/userTables.js';
import authenticateToken from '../scripts/authenticateToken.js';
import authorizeUser from '../scripts/authorizeUser.js';

const router = express.Router();
const config = JSON.parse(process.env.CONFIG);

// Get procedures for a specific doctor
router.get('/by-doctor/:licenseNo', authenticateToken, authorizeUser([userTables.doctor, userTables.admin], true), async (req, res) => {
  const licenseNo = parseInt(req.params.licenseNo);
  if (isNaN(licenseNo)) return res.status(400).json({ error: 'INVALID LICENSE NUMBER' });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('LICENSE_NO', sql.Int, licenseNo)
      .query(`
        SELECT 
          PD.PROCEDURE_ID,
          PD.LICENSE_NO,
          PD.PROCEDURE_COST,
          P.PROCEDURE_NAME
        FROM PROCEDURE_DOCTOR PD
        JOIN PROCEDURES P ON PD.PROCEDURE_ID = P.PROCEDURE_ID
        WHERE PD.LICENSE_NO = @LICENSE_NO
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available procedures
router.get('/available-procedures', authenticateToken, authorizeUser([userTables.doctor, userTables.admin], false), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT PROCEDURE_ID, PROCEDURE_NAME FROM PROCEDURES');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a procedure for a doctor
router.post('/', authenticateToken, authorizeUser([userTables.doctor, userTables.admin], false), async (req, res) => {
  const { licenseNo, procedureId, procedureCost } = req.body;

  if (!licenseNo || !procedureId || !procedureCost) {
    return res.status(400).json({ error: 'MISSING REQUIRED FIELDS' });
  }

  try {
    const pool = await sql.connect(config);
    
    // Check if the procedure-doctor combination already exists
    const checkResult = await pool.request()
      .input('LICENSE_NO', sql.Int, licenseNo)
      .input('PROCEDURE_ID', sql.Int, procedureId)
      .query('SELECT * FROM PROCEDURE_DOCTOR WHERE LICENSE_NO = @LICENSE_NO AND PROCEDURE_ID = @PROCEDURE_ID');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'PROCEDURE ALREADY EXISTS FOR THIS DOCTOR' });
    }

    await pool.request()
      .input('LICENSE_NO', sql.Int, licenseNo)
      .input('PROCEDURE_ID', sql.Int, procedureId)
      .input('PROCEDURE_COST', sql.Decimal(10, 2), procedureCost)
      .query(`
        INSERT INTO PROCEDURE_DOCTOR (LICENSE_NO, PROCEDURE_ID, PROCEDURE_COST)
        VALUES (@LICENSE_NO, @PROCEDURE_ID, @PROCEDURE_COST)
      `);
    
    res.status(201).json({ message: 'PROCEDURE ADDED SUCCESSFULLY' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a procedure for a doctor
router.delete('/:licenseNo/:procedureId', authenticateToken, authorizeUser([userTables.doctor, userTables.admin], true), async (req, res) => {
  const licenseNo = parseInt(req.params.licenseNo);
  const procedureId = parseInt(req.params.procedureId);

  if (isNaN(licenseNo) || isNaN(procedureId)) {
    return res.status(400).json({ error: 'INVALID LICENSE NUMBER OR PROCEDURE ID' });
  }

  try {
    const pool = await sql.connect(config);

    // First check if the procedure has been performed
    const checkResult = await pool.request()
      .input('LICENSE_NO', sql.Int, licenseNo)
      .input('PROCEDURE_ID', sql.Int, procedureId)
      .query(`
        SELECT COUNT(*) as count 
        FROM BOOKINGS B
        WHERE B.LICENSE_NO = @LICENSE_NO 
        AND B.PROCEDURE_ID = @PROCEDURE_ID
      `);

    if (checkResult.recordset[0].count > 0) {
      return res.status(409).json({ 
        error: 'CANNOT DELETE PROCEDURE AS IT HAS ALREADY BEEN PERFORMED'
      });
    }

    // If no appointments found, proceed with deletion
    const result = await pool.request()
      .input('LICENSE_NO', sql.Int, licenseNo)
      .input('PROCEDURE_ID', sql.Int, procedureId)
      .query('DELETE FROM PROCEDURE_DOCTOR WHERE LICENSE_NO = @LICENSE_NO AND PROCEDURE_ID = @PROCEDURE_ID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'PROCEDURE NOT FOUND FOR THIS DOCTOR' });
    }

    res.status(200).json({ message: 'PROCEDURE REMOVED SUCCESSFULLY' });
  } catch (error) {
    // If we somehow still get a foreign key constraint error
    if (error.number === 547) { // SQL Server foreign key constraint error number
      return res.status(409).json({ 
        error: 'CANNOT DELETE PROCEDURE AS IT HAS ALREADY BEEN PERFORMED'
      });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router; 