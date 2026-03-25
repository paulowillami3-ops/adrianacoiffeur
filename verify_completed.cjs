const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./barbershop.db');

db.all("SELECT id, status, appointment_date, appointment_time, client_id FROM appointments", [], (err, rows) => {
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

    // Check distinct statuses
    const statuses = [...new Set(rows.map(r => r.status))];
    console.log("Statuses found:", statuses);
});

db.close();
