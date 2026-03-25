const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./barbearia.db');

db.all("SELECT id, status, appointment_date, appointment_time FROM appointments", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Total appointments:", rows.length);
    const completed = rows.filter(r => r.status === 'COMPLETED');
    console.log("Completed appointments:", completed.length);
    if (completed.length > 0) {
        console.log("Sample Completed:", completed[0]);
    } else {
        console.log("No completed appointments found.");
    }

    // Check Date format
    if (rows.length > 0) {
        console.log("Sample Date Format:", rows[0].appointment_date);
    }
});

db.close();
