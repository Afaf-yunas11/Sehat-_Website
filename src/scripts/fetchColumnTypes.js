import sql from "mssql";

const config = JSON.parse(process.env.CONFIG);

//process is an object it allows to accees environment variable CONFIG in env.example file
//now config has your db connection requrements



export default async function fetchColumnTypes(tableName) 
{
  const pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("tableName", sql.VarChar(100), tableName).query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
    `);

  let typeMap = {};
  result.recordset .forEach((row) => {
    typeMap[row.COLUMN_NAME] = mapSQLType(row.DATA_TYPE);
  });

  return typeMap;
}

//typemap is an object
//mapSQLType("int ")   result=sql.int

function mapSQLType(sqlType) {
  const typeMapping = {    //an object 
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


/*  PURPOSE OF code

Connects to your SQL Server database

Retrieves all column names and their data types from a given table

Maps the SQL data types to mssql JavaScript types

Returns a key-value object like:


{
  id: sql.Int,
  name: sql.VarChar(100),
  createdAt: sql.DateTime
}
*/
