import sql from "mssql";
const config = JSON.parse(process.env.CONFIG);

export default async function fetchColumnNames(tableName) {
  const pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("tableName", sql.VarChar(100), tableName).query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
    `);

  let columnNames = [];
  result.recordset.forEach((row) => {
    columnNames.push(row.COLUMN_NAME);
  });

  return columnNames;
}