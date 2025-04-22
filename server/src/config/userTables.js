import sql from 'mssql';   //sql is  an object to access db functions


//export let you use anything in another file
//userTables is an object that cannot be changed

//i-e our user can use these tables

export const userTables = Object.freeze({
  patient: "PATIENTS",
  doctor: "DOCTORS",
  rescueWorker: "RESCUE_WORKERS",
  admin: "ADMINS",
});

export const allowedTables = [
  "PATIENTS",
  "DOCTORS",
  "RESCUE_WORKERS",
  "ADMINS",
];