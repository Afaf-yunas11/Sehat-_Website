import sql from 'mssql';

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