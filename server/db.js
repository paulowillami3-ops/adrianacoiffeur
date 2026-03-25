const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database (creates file if not exists)
const dbPath = path.resolve(__dirname, 'barbearia.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath, err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Initialize Schema
db.serialize(() => {
  // 1. Clients
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. Services
  db.run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration INTEGER NOT NULL,
    image_url TEXT,
    is_active INTEGER DEFAULT 1
  )`, () => {
    // Seed Services if empty
    db.get("SELECT count(*) as count FROM services", (err, row) => {
      if (err == null && row.count === 0) {
        console.log("Seeding services...");
        const services = [
          ['Corte de Cabelo', 'Tesoura ou máquina, com acabamento perfeito na navalha.', 20.0, 30, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD4RptFvymJZDEkLZfMwqmhcd_4f7zkFYVMIa7qEGmfvAoMtQimIv7hrUEV2OEnVBlB9HQTs8M0h8XYaxvMg2u5xa3tV8QmAmuMHwS0iuJsSN3vs-kspcMGI3AV5vKVvy6Ung0cWriRLz4lBHj-XcCL3zh0fIzRcRCZZ2q9kBzYfy5y5R7gm2bV94C2KuW45zOrmYTOW2-2HddWogTJsONXGSe3X8e5hQkvR8yNxDTinFszQCQzZP8OgKBcNnjBNXw7uNJXcAyP-PT'],
          ['Barba Completa', 'Modelagem, toalha quente e massagem facial relaxante.', 15.0, 20, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZxLjMFWK0xxuFeG-K_vmcs7YFlRon3BIo4GORMtB1FNOTw63z5yInatq8sENF5RPOVF1-e-unnFABYWrahvx_ldhuD9HIasezPJUlZ6DIZWZ2otfJR6R7UoqoejIxiyjoLpKteLWUyamkN7DnWQ4W45YzaFLNb89odMgkHQi96VNQExFoPnO3iN2YGwLimRCI_kDgYyhqd41d-PBgkKisP8cdcMVnQ30QU_KjBByqqZVX7r8RSA4OE7y97Ypso8CbxEECx3kgMQ9R'],
          ['Pezinho', 'Acabamento do contorno do cabelo.', 10.0, 10, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvYByM6ju2CjbwNDRm9RmCAHKYgF0kZLDCxyiDUJv3Q3PpL884sG9ZTSyCUXuexr-MwvArU8zSvMnwlcRMdE7DsvrJ5mA-Pw2CQJQvxofrvuA7c1X2L5wVHVFV0zZ47_Qey3ylP01VDSxTCT6Du7-gwW1f6iOVzM5EO8ufqcX9aI3b3gyFXpdDjSnOUGVkLgYjLOwodqskOtoRtUzGSSEHQmLTkP04GzdGonGWAkeQJNyZiAJUe59AjVEYvAvk-14f6WWnxyu2LyPl'],
          ['Sobrancelha', 'Design e limpeza dos contornos com navalha.', 10.0, 10, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvYByM6ju2CjbwNDRm9RmCAHKYgF0kZLDCxyiDUJv3Q3PpL884sG9ZTSyCUXuexr-MwvArU8zSvMnwlcRMdE7DsvrJ5mA-Pw2CQJQvxofrvuA7c1X2L5wVHVFV0zZ47_Qey3ylP01VDSxTCT6Du7-gwW1f6iOVzM5EO8ufqcX9aI3b3gyFXpdDjSnOUGVkLgYjLOwodqskOtoRtUzGSSEHQmLTkP04GzdGonGWAkeQJNyZiAJUe59AjVEYvAvk-14f6WWnxyu2LyPl'],
          ['Hidratação', 'Tratamento profundo para cabelos.', 30.0, 20, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJ9fLPDPYlVIXr3ibJLRRdxEf6FA1fq_4H9sNT3VFLx3OKqPIMwMVDt8GS6V5bCvwmkrOJD2FtlFb7ieFs_4mOyQ4iPgPzfWgo-mvW_0LTb2eqeMNTkES7koFP0epzr0FTypKeZ54izOshgN5F73LQ8eCi0Uu0h1p48L_dEQCkCK90_Q1TF6iI5JJWdB5RwEMFNGYPUnwHxNxq5Toi85j-FrC50daezUz1mvfweQ2SifaKxEyF-wJXqhJhwwtYr30oaCWg_XGO1Mf'],
          ['Cabelo / Barba / Sobrancelha', 'Pacote completo para visual renovado.', 35.0, 60, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJ9fLPDPYlVIXr3ibJLRRdxEf6FA1fq_4H9sNT3VFLx3OKqPIMwMVDt8GS6V5bCvwmkrOJD2FtlFb7ieFs_4mOyQ4iPgPzfWgo-mvW_0LTb2eqeMNTkES7koFP0epzr0FTypKeZ54izOshgN5F73LQ8eCi0Uu0h1p48L_dEQCkCK90_Q1TF6iI5JJWdB5RwEMFNGYPUnwHxNxq5Toi85j-FrC50daezUz1mvfweQ2SifaKxEyF-wJXqhJhwwtYr30oaCWg_XGO1Mf']
        ];

        const stmt = db.prepare("INSERT INTO services (name, description, price, duration, image_url) VALUES (?, ?, ?, ?, ?)");
        services.forEach(service => stmt.run(service));
        stmt.finalize();
      }
    });
  });

  // 3. Appointments
  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT DEFAULT 'PENDING',
    total_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  )`);

  // 4. Appointment Services
  db.run(`CREATE TABLE IF NOT EXISTS appointment_services (
    appointment_id INTEGER,
    service_id INTEGER,
    price_at_booking REAL,
    PRIMARY KEY (appointment_id, service_id),
    FOREIGN KEY(appointment_id) REFERENCES appointments(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  )`);

  // 5. Chat Messages
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        sender_type TEXT, -- 'CUSTOMER' or 'BARBER'
        message_text TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY(client_id) REFERENCES clients(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS blocked_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT, -- YYYY-MM-DD
        time TEXT, -- HH:mm
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
    )`);

  // Insert default settings if not exist
  const defaultSettings = [
    { key: 'start_time', value: '09:00' },
    { key: 'end_time', value: '19:00' },
    { key: 'interval_minutes', value: '30' }
  ];

  defaultSettings.forEach(s => {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [s.key, s.value]);
  });

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT,
        amount REAL,
        category TEXT, -- 'Luz', 'Água', 'Produto', 'Outro'
        date TEXT, -- YYYY-MM-DD
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  // 6. Admins
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`, () => {
    db.get("SELECT count(*) as count FROM admins", (err, row) => {
      if (err == null && row.count === 0) {
        console.log("Seeding admin user...");
        // In production, passwords should be hashed (bcrypt). Storing plain for simplicity as requested "simple but real".
        const stmt = db.prepare("INSERT INTO admins (email, password) VALUES (?, ?)");
        stmt.run('adriana@adrianacoiffeur.com.br', 'adriana2024');
        stmt.finalize();
      }
    });
  });
});

module.exports = db;
