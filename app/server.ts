// app/server.ts — MMU Alumni Portal (Assignment 1, Version 2.2) adapted for the
// containerised Assignment 2 deployment.
//
// Security:
//   - All secrets come from environment variables ONLY (no hardcoded fallbacks):
//       JWT_SECRET, DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT, DB_TRUST_CERT
//   - TLS to the DB defaults to verifying the server cert (DB_TRUST_CERT=false).
//
// Mock mode:
//   - When the SQL Server pool is unavailable (e.g. RDS/MSSQL is SCP-blocked in
//     the AWS Academy sandbox), the server transparently falls back to MOCK MODE
//     backed by the sanitised db.json seed, so the app stays demoable with no DB.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import fs from "fs";
import { body, validationResult } from "express-validator";
import sql from "mssql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// --- Secrets / config from environment (NO hardcoded fallbacks) ---
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const sqlConfig: any = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST || "",
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
  },
};

// --- Database pool (optional). Resolves to null => MOCK MODE. ---
const poolPromise: Promise<any> = (async () => {
  if (!process.env.DB_HOST) {
    console.warn("⚠️  DB_HOST not set — starting in MOCK MODE (no live database).");
    return null;
  }
  try {
    const pool = await sql.connect(sqlConfig);
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err: any) {
    console.error("❌ Database connection failed — MOCK MODE:", err?.message);
    return null;
  }
})();

// --- Mock seed (sanitised, no real PII) used when DB is unavailable ---
let mockDB: any = { users: [], alumni: [], donations: [], auditLogs: [] };
try {
  mockDB = JSON.parse(fs.readFileSync(path.join(process.cwd(), "db.json"), "utf-8"));
  console.log("ℹ️  Loaded mock seed from db.json");
} catch {
  console.warn("ℹ️  No db.json seed found — mock data is empty.");
}

const maskPhone = (phone: any) => {
  if (!phone) return "N/A";
  const s = String(phone);
  return s.length >= 4 ? "XXX-XXX-" + s.slice(-4) : "XXX-XXX-XXXX";
};

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- Health check for the ALB target group ---
  app.get("/health", (_req: any, res: any) => res.status(200).send("ok"));

  // --- Auth: Register ---
  app.post("/api/auth/register",
    [
      body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').trim().escape(),
      body('full_name').notEmpty().withMessage('Name is required').trim().escape(),
      body('batch_year').isInt({ min: 1990, max: 2030 }).withMessage('Invalid batch year').toInt(),
      body('programme').optional().trim().escape(),
      body('phone').optional().trim().escape()
    ],
    async (req: any, res: any) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { full_name, email, password, batch_year, programme, phone } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        const user_id = Date.now();
        const alumni_id = user_id + 1;
        const now = new Date();
        const pool = await poolPromise;

        if (!pool) {
          // MOCK MODE: in-memory registration (non-persistent)
          if (mockDB.users.find((u: any) => u.email === email)) {
            return res.status(400).json({ success: false, message: "Email already registered" });
          }
          mockDB.users.push({ user_id, email, password_hash, role: 'alumni', is_active: 1, created_at: now.toISOString() });
          mockDB.alumni.push({ alumni_id, user_id, full_name, batch_year, programme: programme || '', phone: phone || '', nric_encrypted: 'encrypted_data_placeholder', address_encrypted: 'encrypted_data_placeholder', updated_at: now.toISOString() });
          return res.json({ success: true, message: "Registration successful (mock mode)", mock: true });
        }

        const checkUser = await pool.request()
          .input('email', sql.VarChar, email)
          .query('SELECT 1 FROM Users WHERE email = @email');
        if (checkUser.recordset.length > 0) {
          return res.status(400).json({ success: false, message: "Email already registered" });
        }

        await pool.request()
          .input('user_id', sql.BigInt, user_id)
          .input('email', sql.VarChar, email)
          .input('password_hash', sql.VarChar, password_hash)
          .input('role', sql.VarChar, 'alumni')
          .input('is_active', sql.Int, 1)
          .input('created_at', sql.DateTime, now)
          .query('INSERT INTO Users (user_id, email, password_hash, role, is_active, created_at) VALUES (@user_id, @email, @password_hash, @role, @is_active, @created_at)');

        await pool.request()
          .input('alumni_id', sql.BigInt, alumni_id)
          .input('user_id', sql.BigInt, user_id)
          .input('full_name', sql.VarChar, full_name)
          .input('batch_year', sql.Int, batch_year)
          .input('programme', sql.VarChar, programme || '')
          .input('phone', sql.VarChar, phone || '')
          .input('nric_encrypted', sql.VarChar, 'encrypted_data_placeholder')
          .input('address_encrypted', sql.VarChar, 'encrypted_data_placeholder')
          .input('updated_at', sql.DateTime, now)
          .query('INSERT INTO Alumni (alumni_id, user_id, full_name, batch_year, programme, phone, nric_encrypted, address_encrypted, updated_at) VALUES (@alumni_id, @user_id, @full_name, @batch_year, @programme, @phone, @nric_encrypted, @address_encrypted, @updated_at)');

        res.json({ success: true, message: "Registration successful" });
      } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
    }
  );

  // --- Auth: Login ---
  app.post("/api/auth/login",
    [body('email').isEmail().normalizeEmail(), body('password').notEmpty().trim()],
    async (req: any, res: any) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email, password } = req.body;
        const pool = await poolPromise;

        let user: any;
        if (pool) {
          const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query(`
              SELECT u.user_id, u.email, u.password_hash, u.role, a.alumni_id, a.full_name
              FROM Users u LEFT JOIN Alumni a ON u.user_id = a.user_id
              WHERE u.email = @email
            `);
          user = result.recordset[0];
        } else {
          const u = mockDB.users.find((x: any) => x.email === email);
          if (u) {
            const a = mockDB.alumni.find((al: any) => al.user_id === u.user_id);
            user = { ...u, alumni_id: a?.alumni_id, full_name: a?.full_name };
          }
        }

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
          { user_id: user.user_id, role: user.role, alumni_id: user.alumni_id },
          SECRET_KEY as string,
          { expiresIn: "1h" }
        );

        res.json({
          success: true, token, mock: !pool,
          user: {
            user_id: user.user_id,
            alumni_id: user.alumni_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
    });

  // --- Middleware: Auth Token Verification ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY as string, async (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      // Set RLS context only when a real DB is connected.
      try {
        const pool = await poolPromise;
        if (pool) {
          await pool.request().query(`
            EXEC sp_set_session_context 'user_id', ${user.user_id}, @read_only = 0;
            EXEC sp_set_session_context 'user_role', '${user.role}', @read_only = 0;
            EXEC sp_set_session_context 'alumni_id', ${user.alumni_id || 'NULL'}, @read_only = 0;
          `);
        }
      } catch (sqlErr) {
        console.error("❌ Failed to set RLS context:", sqlErr);
      }
      next();
    });
  };

  // --- Directory: public/masked alumni list ---
  app.get("/api/directory", authenticateToken, async (req: any, res: any) => {
    try {
      const pool = await poolPromise;
      let records: any[];
      if (pool) {
        const result = await pool.request().query('SELECT alumni_id, full_name, batch_year, programme, phone FROM Alumni');
        records = result.recordset;
      } else {
        records = mockDB.alumni;
      }
      const publicAlumni = records.map((a: any) => ({
        alumni_id: a.alumni_id,
        full_name: a.full_name,
        batch_year: a.batch_year,
        programme: a.programme,
        phone: maskPhone(a.phone)
      }));
      res.json({ success: true, mock: !pool, data: publicAlumni });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Profile: Get profile by id (own / admin only) ---
  app.get("/api/alumni/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const pool = await poolPromise;
      let profile: any;
      if (pool) {
        const result = await pool.request()
          .input('alumni_id', sql.BigInt, parseInt(req.params.id))
          .query(`SELECT a.*, u.email, u.role FROM Alumni a JOIN Users u ON a.user_id = u.user_id WHERE a.alumni_id = @alumni_id`);
        profile = result.recordset[0];
      } else {
        const a = mockDB.alumni.find((x: any) => x.alumni_id === parseInt(req.params.id));
        if (a) {
          const u = mockDB.users.find((x: any) => x.user_id === a.user_id);
          profile = { ...a, email: u?.email, role: u?.role };
        }
      }
      if (!profile) return res.status(404).json({ success: false, message: "Alumni not found" });

      if (req.user.role !== 'admin' && req.user.alumni_id !== profile.alumni_id) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
      }

      const profileData = {
        ...profile,
        phone: req.user.role === 'admin' ? profile.phone : maskPhone(profile.phone)
      };
      res.json({ success: true, mock: !pool, data: profileData });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Donations: history ---
  app.get("/api/donations", authenticateToken, async (req: any, res: any) => {
    try {
      const pool = await poolPromise;
      if (pool) {
        let query = 'SELECT * FROM Donations';
        const request = pool.request();
        if (req.user.role !== 'admin') {
          query += ' WHERE alumni_id = @alumni_id';
          request.input('alumni_id', sql.BigInt, req.user.alumni_id);
        }
        const result = await request.query(query);
        return res.json({ success: true, data: result.recordset });
      }
      // MOCK MODE
      const data = req.user.role === 'admin'
        ? mockDB.donations
        : mockDB.donations.filter((d: any) => d.alumni_id === req.user.alumni_id);
      res.json({ success: true, mock: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Admin: audit logs ---
  app.get("/api/admin/logs", authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
      }
      const pool = await poolPromise;
      if (pool) {
        const result = await pool.request().query(`
          SELECT TOP 50 l.log_id, l.action_type, l.table_name, l.changed_at, u.email as user_email, l.ip_address
          FROM AuditLogs l LEFT JOIN Users u ON l.changed_by = u.user_id
          ORDER BY l.changed_at DESC
        `);
        return res.json({ success: true, data: result.recordset });
      }
      res.json({ success: true, mock: true, data: mockDB.auditLogs.slice(-50).reverse() });
    } catch (error) {
      console.error("Audit Logs Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Donations: make donation ---
  app.post("/api/donations", authenticateToken, async (req: any, res: any) => {
    try {
      const { amount, message } = req.body;
      const donation_id = Date.now();
      const receipt_ref = "MMU-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const now = new Date();
      const pool = await poolPromise;

      if (!pool) {
        mockDB.donations.push({ donation_id, alumni_id: req.user.alumni_id, amount, message: message || '', donated_at: now.toISOString(), receipt_ref });
        mockDB.auditLogs.push({ log_id: donation_id + 1, table_name: 'DONATIONS', action_type: 'INSERT', changed_at: now.toISOString(), ip_address: req.ip || 'unknown' });
        return res.json({ success: true, mock: true, receipt_ref });
      }

      await pool.request()
        .input('donation_id', sql.BigInt, donation_id)
        .input('alumni_id', sql.BigInt, req.user.alumni_id)
        .input('amount', sql.Decimal(10, 2), amount)
        .input('message', sql.VarChar, message || '')
        .input('donated_at', sql.DateTime, now)
        .input('receipt_ref', sql.VarChar, receipt_ref)
        .query('INSERT INTO Donations (donation_id, alumni_id, amount, message, donated_at, receipt_ref) VALUES (@donation_id, @alumni_id, @amount, @message, @donated_at, @receipt_ref)');

      const audit_log_id = Date.now() + 1;
      const logValue = JSON.stringify({ donation_id, amount, receipt_ref });
      await pool.request()
        .input('log_id', sql.BigInt, audit_log_id)
        .input('table_name', sql.VarChar, 'DONATIONS')
        .input('action_type', sql.VarChar, 'INSERT')
        .input('record_id', sql.BigInt, donation_id)
        .input('changed_by', sql.BigInt, req.user.user_id)
        .input('new_value', sql.VarChar, logValue)
        .input('changed_at', sql.DateTime, now)
        .input('ip_address', sql.VarChar, req.ip || 'unknown')
        .query('INSERT INTO AuditLogs (log_id, table_name, action_type, record_id, changed_by, new_value, changed_at, ip_address) VALUES (@log_id, @table_name, @action_type, @record_id, @changed_by, @new_value, @changed_at, @ip_address)');

      res.json({ success: true, receipt_ref });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Admin: delete alumni ---
  app.delete("/api/admin/alumni/:id", authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
      }
      const alumniId = parseInt(req.params.id);
      const pool = await poolPromise;

      if (!pool) {
        const before = mockDB.alumni.length;
        mockDB.alumni = mockDB.alumni.filter((a: any) => a.alumni_id !== alumniId);
        if (mockDB.alumni.length === before) return res.status(404).json({ success: false, message: "Alumni not found" });
        mockDB.auditLogs.push({ log_id: Date.now(), table_name: 'ALUMNI', action_type: 'DELETE', changed_at: new Date().toISOString(), ip_address: req.ip || 'unknown' });
        return res.json({ success: true, mock: true, message: `Alumni ${alumniId} deleted (mock)` });
      }

      const result = await pool.request()
        .input('alumni_id', sql.BigInt, alumniId)
        .query('DELETE FROM Alumni WHERE alumni_id = @alumni_id');
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, message: "Alumni not found" });
      }
      const audit_log_id = Date.now();
      await pool.request()
        .input('log_id', sql.BigInt, audit_log_id)
        .input('table_name', sql.VarChar, 'ALUMNI')
        .input('action_type', sql.VarChar, 'DELETE')
        .input('record_id', sql.BigInt, alumniId)
        .input('changed_by', sql.BigInt, req.user.user_id)
        .input('new_value', sql.VarChar, `Deleted alumni_id: ${alumniId}`)
        .input('changed_at', sql.DateTime, new Date())
        .input('ip_address', sql.VarChar, req.ip || 'unknown')
        .query('INSERT INTO AuditLogs (log_id, table_name, action_type, record_id, changed_by, new_value, changed_at, ip_address) VALUES (@log_id, @table_name, @action_type, @record_id, @changed_by, @new_value, @changed_at, @ip_address)');
      res.json({ success: true, message: `Alumni ${alumniId} deleted` });
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Users: update profile ---
  app.put("/api/users/update-profile", authenticateToken, async (req: any, res: any) => {
    try {
      const { full_name, email } = req.body;
      const pool = await poolPromise;

      if (!pool) {
        const u = mockDB.users.find((x: any) => x.user_id === req.user.user_id);
        if (u) u.email = email;
        const a = mockDB.alumni.find((x: any) => x.user_id === req.user.user_id);
        if (a) a.full_name = full_name;
        mockDB.auditLogs.push({ log_id: Date.now(), table_name: 'USERS/ALUMNI', action_type: 'UPDATE_PROFILE', changed_at: new Date().toISOString(), ip_address: req.ip || 'unknown' });
        return res.json({ success: true, mock: true, message: "Profile updated (mock)" });
      }

      await pool.request()
        .input('user_id', sql.BigInt, req.user.user_id)
        .input('email', sql.VarChar, email)
        .query('UPDATE Users SET email = @email WHERE user_id = @user_id');
      await pool.request()
        .input('user_id', sql.BigInt, req.user.user_id)
        .input('full_name', sql.VarChar, full_name)
        .query('UPDATE Alumni SET full_name = @full_name WHERE user_id = @user_id');
      const audit_log_id = Date.now() + 2;
      await pool.request()
        .input('log_id', sql.BigInt, audit_log_id)
        .input('table_name', sql.VarChar, 'USERS/ALUMNI')
        .input('action_type', sql.VarChar, 'UPDATE_PROFILE')
        .input('record_id', sql.BigInt, req.user.user_id)
        .input('changed_by', sql.BigInt, req.user.user_id)
        .input('new_value', sql.VarChar, `Name: ${full_name}, Email: ${email}`)
        .input('changed_at', sql.DateTime, new Date())
        .input('ip_address', sql.VarChar, req.ip || 'unknown')
        .query('INSERT INTO AuditLogs (log_id, table_name, action_type, record_id, changed_by, new_value, changed_at, ip_address) VALUES (@log_id, @table_name, @action_type, @record_id, @changed_by, @new_value, @changed_at, @ip_address)');
      res.json({ success: true, message: "Profile information updated." });
    } catch (error) {
      console.error("Update Profile Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- Users: update password ---
  app.put("/api/users/update-password", authenticateToken, async (req: any, res: any) => {
    try {
      const { newPassword } = req.body;
      const password_hash = await bcrypt.hash(newPassword, 10);
      const pool = await poolPromise;

      if (!pool) {
        const u = mockDB.users.find((x: any) => x.user_id === req.user.user_id);
        if (u) u.password_hash = password_hash;
        mockDB.auditLogs.push({ log_id: Date.now(), table_name: 'USERS', action_type: 'UPDATE_PASSWORD', changed_at: new Date().toISOString(), ip_address: req.ip || 'unknown' });
        return res.json({ success: true, mock: true });
      }

      await pool.request()
        .input('user_id', sql.BigInt, req.user.user_id)
        .input('password_hash', sql.VarChar, password_hash)
        .query('UPDATE Users SET password_hash = @password_hash WHERE user_id = @user_id');
      const audit_log_id = Date.now() + 1;
      await pool.request()
        .input('log_id', sql.BigInt, audit_log_id)
        .input('table_name', sql.VarChar, 'USERS')
        .input('action_type', sql.VarChar, 'UPDATE_PASSWORD')
        .input('record_id', sql.BigInt, req.user.user_id)
        .input('changed_by', sql.BigInt, req.user.user_id)
        .input('new_value', sql.VarChar, 'Password Hash Rotated')
        .input('changed_at', sql.DateTime, new Date())
        .input('ip_address', sql.VarChar, req.ip || 'unknown')
        .query('INSERT INTO AuditLogs (log_id, table_name, action_type, record_id, changed_by, new_value, changed_at, ip_address) VALUES (@log_id, @table_name, @action_type, @record_id, @changed_by, @new_value, @changed_at, @ip_address)');
      res.json({ success: true });
    } catch (error) {
      console.error("Update Password Error:", error);
      res.status(500).json({ success: false, message: "Failed to update password." });
    }
  });

  // --- Vite / Frontend ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get('*', async (req: any, res: any, next: any) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: any, res: any) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
