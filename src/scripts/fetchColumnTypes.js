import sql from "mssql";

const config = JSON.parse(process.env.CONFIG);

export default async function fetchColumnTypes(tableName) {
  const pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("tableName", sql.VarChar(100), tableName).query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
    `);

  let typeMap = {};
  result.recordset.forEach((row) => {
    typeMap[row.COLUMN_NAME] = mapSQLType(row.DATA_TYPE);
  });

  return typeMap;
}

function mapSQLType(sqlType) {
  const typeMapping = {
    int: sql.Int,
    varchar: sql.VarChar(100),
    nvarchar: sql.NVarChar(100),
    text: sql.Text,
    date: sql.Date,
    datetime: sql.DateTime,
    bit: sql.Bit,
    decimal: sql.Decimal,
    float: sql.Float,
  };
  return typeMapping[sqlType] || sql.VarChar(100); // Default to VARCHAR(100)
}
