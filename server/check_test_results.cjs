const db = require('./db');

setTimeout(() => {
    console.log("Checking results...");
    db.all("SELECT * FROM appointments WHERE client_id = 999 ORDER BY appointment_time ASC", [], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        if (rows.length === 0) {
            console.log("No test appointments found.");
            return;
        }

        // We expect:
        // 1. Older (first one sorted by time usually, or depending on order) 
        // older is 40 mins ago, newer is 10 mins ago.
        // Actually lets print them.
        rows.forEach(r => {
            console.log(`Time: ${r.appointment_time}, Status: ${r.status}`);
        });

        // Validation logic
        // Verify we have at least 2
        // One should be COMPLETED, One PENDING
        const completed = rows.filter(r => r.status === 'COMPLETED');
        const pending = rows.filter(r => r.status === 'PENDING');

        console.log(`Found ${completed.length} COMPLETED and ${pending.length} PENDING.`);
    });
}, 2000);
