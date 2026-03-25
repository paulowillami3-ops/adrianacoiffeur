
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/barbearia.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Checking Appointments ---");
    db.all("SELECT * FROM appointments", (err, rows) => {
        if (err) console.log(err);
        else console.log(`Total Appointments: ${rows.length}`);
        if (rows.length > 0) console.log("Sample:", rows[0]);

        const completed = rows.filter(r => r.status === 'COMPLETED');
        console.log(`Completed Appointments: ${completed.length}`);
    });

    console.log("\n--- Checking Expenses ---");
    db.all("SELECT * FROM expenses", (err, rows) => {
        if (err) console.log(err);
        else console.log(`Total Expenses: ${rows.length}`);
    });
});
