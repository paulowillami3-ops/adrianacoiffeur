const db = require('./db');

// Allow DB to connect
setTimeout(() => {
    const now = new Date();
    const older = new Date(now.getTime() - 40 * 60000); // 40 mins ago
    const newer = new Date(now.getTime() - 10 * 60000); // 10 mins ago

    const dateStr = older.getFullYear() + '-' +
        String(older.getMonth() + 1).padStart(2, '0') + '-' +
        String(older.getDate()).padStart(2, '0');

    // Format times as HH:mm
    const formatTime = (d) => {
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    };

    const timeOlder = formatTime(older);
    const timeNewer = formatTime(newer);

    console.log(`Setting up test: Date=${dateStr}, Older=${timeOlder}, Newer=${timeNewer}`);

    db.serialize(() => {
        db.run("INSERT OR IGNORE INTO clients (id, name, phone) VALUES (999, 'Test Client', '999999999')");

        // Cleanup previous runs
        db.run("DELETE FROM appointments WHERE client_id = 999");

        // Insert Older (Should be completed)
        db.run(`INSERT INTO appointments (client_id, appointment_date, appointment_time, status) 
                VALUES (999, ?, ?, 'PENDING')`, [dateStr, timeOlder], function (err) {
            if (err) console.error("Error inserting older:", err);
            else console.log("Inserted Older Appointment");
        });

        // Insert Newer (Should stay PENDING)
        db.run(`INSERT INTO appointments (client_id, appointment_date, appointment_time, status) 
                VALUES (999, ?, ?, 'PENDING')`, [dateStr, timeNewer], function (err) {
            if (err) console.error("Error inserting newer:", err);
            else console.log("Inserted Newer Appointment");
        });
    });
}, 2000);
