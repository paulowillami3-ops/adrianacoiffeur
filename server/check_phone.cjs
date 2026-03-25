const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./barbearia.db');

db.all("SELECT phone FROM clients LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Sample Phones:", rows);
});

db.close();
