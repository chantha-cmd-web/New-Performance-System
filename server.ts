import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-2026';

const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    khmerName TEXT DEFAULT '',
    campus TEXT DEFAULT '',
    department TEXT DEFAULT '',
    position TEXT DEFAULT '',
    category TEXT DEFAULT '',
    supervisorId TEXT DEFAULT '',
    supporterId TEXT DEFAULT '',
    evalModel TEXT DEFAULT '',
    evalPeriod TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    hireDate TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId TEXT NOT NULL,
    employeeName TEXT NOT NULL,
    campus TEXT NOT NULL,
    position TEXT NOT NULL,
    appraiser TEXT NOT NULL,
    reviewDate TEXT NOT NULL,
    weightScheme TEXT NOT NULL,
    evaluationType TEXT DEFAULT 'management',
    totalSelf REAL NOT NULL,
    totalSuper REAL NOT NULL,
    overallScore REAL NOT NULL,
    createdBy TEXT NOT NULL,
    createdByName TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS criteria_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluationId INTEGER,
    criteriaId INTEGER,
    selfScore REAL,
    superScore REAL,
    supporterScore REAL,
    managementScore REAL,
    aspScore REAL,
    FOREIGN KEY(evaluationId) REFERENCES evaluations(id)
  );

  CREATE TABLE IF NOT EXISTS peer_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluationId INTEGER,
    peerName TEXT,
    feedback TEXT,
    score REAL,
    FOREIGN KEY(evaluationId) REFERENCES evaluations(id)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profile_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(category, key)
  );
`);

// Migrations
try { db.exec('ALTER TABLE evaluations ADD COLUMN evaluationType TEXT DEFAULT "management"'); } catch (e) {}
try { db.exec('ALTER TABLE criteria_scores ADD COLUMN supporterScore REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE criteria_scores ADD COLUMN managementScore REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE criteria_scores ADD COLUMN aspScore REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN evaluatorComments TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN status TEXT DEFAULT "Draft"'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN department TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN evalPeriod TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN supporter TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN active INTEGER DEFAULT 1'); } catch(e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN email TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN phone TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN hireDate TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}

// Indexes for performance
try { db.exec('CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_employees_campus ON employees(campus)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_evaluations_employeeId ON evaluations(employeeId)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_evaluations_campus ON evaluations(campus)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)'); } catch(e) {}

const seedUsers = () => {
  const insert = db.prepare('INSERT OR IGNORE INTO users (id, name, password, role) VALUES (?, ?, ?, ?)');
  const superHash = bcrypt.hashSync('super@2026', 10);
  const adminHash = bcrypt.hashSync('admin@123', 10);
  insert.run('superadmin', 'Super Administrator', superHash, 'superadmin');
  insert.run('admin', 'Administrator', adminHash, 'admin');
};
seedUsers();

const seedSettings = () => {
  const existing = db.prepare('SELECT * FROM app_settings WHERE key = ?').get('evaluation_config');
  if (!existing) {
    const defaultConfig = {
      types: [
        { id: 'management', label: 'Management / ការគ្រប់គ្រង' },
        { id: 'teacher', label: 'Teacher / គ្រូបង្រៀន' },
        { id: 'operations', label: 'Operations / ប្រតិបត្តិការ' }
      ],
      weightingSchemes: [
        { id: 'campus_60_40', label: 'Direct Supervisor 60% (campus) / Supporter 40% (central)' },
        { id: 'campus_50_50', label: 'Direct Supervisor 50% (campus) / Supporter 50% (central)' },
        { id: 'campus_100', label: 'Direct Supervisor (campus) 100%' },
        { id: 'central_100', label: 'Direct Supervisor 100% (central)' },
        { id: 'management_100', label: 'Management 100%' },
        { id: 'asp_100', label: 'ASP 100%' }
      ],
      criteriaSets: {
        management: [
          { id: 1, kh: 'អាកប្បកិរិយា', khDesc: 'ចំណាប់អារម្មណ៍ និងភាពសាទរ', en: 'Attitude', desc: 'Enthusiasm and dedication', max: 10 },
          { id: 2, kh: 'ចំណេះដឹងការងារ', khDesc: 'ការយល់ដឹងអំពីការងារ', en: 'Job Knowledge', desc: 'Understanding of work and skills', max: 10 },
          { id: 3, kh: 'គំនិតផ្តួចផ្តើម', khDesc: 'ការអភិវឌ្ឍន៍ និងដោះស្រាយបញ្ហា', en: 'Initiative', desc: 'Proactive thinking and development', max: 10 },
          { id: 4, kh: 'ការវិនិច្ឆ័យ និងការយល់ដឹង', khDesc: 'ការសម្រេចចិត្ត', en: 'Judgment and Awareness', desc: 'Problem-solving and decision making', max: 10 },
          { id: 5, kh: 'ការអភិវឌ្ឍន៍បុគ្គលិក', khDesc: 'ការកសាងសមត្ថភាព', en: 'Employee Development', desc: 'Effectiveness of capacity building', max: 10 },
          { id: 6, kh: 'ការចូលរួមក្នុងការគ្រប់គ្រង់ផ្នែក', khDesc: 'ការអនុលោមតាមទិសដៅ', en: 'Participation in Management', desc: 'Adherence to work directives', max: 10 },
          { id: 7, kh: 'វិន័យបុគ្គលិក', khDesc: 'ការគោរពវិន័យ', en: 'Employee Discipline', desc: 'Adherence to discipline', max: 10 },
          { id: 8, kh: 'ការទំនាក់ទំនង', khDesc: 'ការទំនាក់ទំនងជាមួយមិត្តរួមការងារ', en: 'Communication', desc: 'Interactions with colleagues', max: 10 },
          { id: 9, kh: 'ភាពជាអ្នកដឹកនាំ', khDesc: 'ការកសាងក្រុម', en: 'Leadership', desc: 'Leadership qualities and team building', max: 10 },
          { id: 10, kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', khDesc: 'ជំនាញបច្ចេកវិទ្យា', en: 'Technology Use', desc: 'Proficiency in office technology', max: 10 },
        ],
        teacher: [
          { id: 11, kh: 'ការរៀបចំមេរៀន', khDesc: 'ការរៀបចំផែនការបង្រៀន', en: 'Lesson Preparation', desc: 'Planning and preparing lessons', max: 10 },
          { id: 12, kh: 'វិធីសាស្ត្របង្រៀន', khDesc: 'ប្រសិទ្ធភាពនៃការបង្រៀន', en: 'Teaching Methodology', desc: 'Effective teaching methods', max: 10 },
          { id: 13, kh: 'ការគ្រប់គ្រងថ្នាក់រៀន', khDesc: 'ការគ្រប់គ្រងសិស្ស', en: 'Classroom Management', desc: 'Managing student behavior', max: 10 },
          { id: 14, kh: 'ការវាយតម្លៃសិស្ស', khDesc: 'ការតាមដានការសិក្សា', en: 'Student Assessment', desc: 'Evaluating student progress', max: 10 },
          { id: 15, kh: 'ទំនាក់ទំនងជាមួយមាតាបិតា', khDesc: 'ការប្រាស្រ័យទាក់ទង', en: 'Parent Communication', desc: 'Engaging with parents', max: 10 },
          { id: 16, kh: 'វិន័យនិងអាកប្បកិរិយា', khDesc: 'ក្រមសីលធម៌វិជ្ជាជីវៈ', en: 'Discipline & Attitude', desc: 'Professional conduct', max: 10 },
          { id: 17, kh: 'ការប្រើប្រាស់សម្ភារៈ', khDesc: 'ការប្រើប្រាស់សម្ភារៈឧបទ្ទេស', en: 'Use of Materials', desc: 'Effective use of teaching aids', max: 10 },
          { id: 18, kh: 'ការចូលរួមសកម្មភាពសាលា', khDesc: 'ការចូលរួមកម្មវិធី', en: 'School Activity Participation', desc: 'Involvement in school events', max: 10 },
          { id: 19, kh: 'ការអភិវឌ្ឍន៍ខ្លួន', khDesc: 'ការសិក្សាបន្ត', en: 'Self-Development', desc: 'Continuous learning', max: 10 },
          { id: 20, kh: 'ការសហការជាមួយមិត្តរួមការងារ', khDesc: 'ការធ្វើការងារជាក្រុម', en: 'Collaboration', desc: 'Teamwork with peers', max: 10 },
        ],
        operations: [
          { id: 21, kh: 'គុណភាពសេវាកម្ម', khDesc: 'ការផ្តល់សេវាកម្ម', en: 'Service Quality', desc: 'Delivering high-quality service', max: 10 },
          { id: 22, kh: 'ការអនុលោមតាមនីតិវិធី', khDesc: 'ការគោរពតាមគោលការណ៍', en: 'Compliance', desc: 'Following rules and protocols', max: 10 },
          { id: 23, kh: 'ប្រសិទ្ធភាពការងារ', khDesc: 'ល្បឿននិងភាពត្រឹមត្រូវ', en: 'Operational Efficiency', desc: 'Speed and accuracy of work', max: 10 },
          { id: 24, kh: 'ការដោះស្រាយបញ្ហា', khDesc: 'ការដោះស្រាយបញ្ហាជាក់ស្តែង', en: 'Problem Solving', desc: 'Handling operational issues', max: 10 },
          { id: 25, kh: 'សុវត្ថិភាពនិងអនាម័យ', khDesc: 'ការរក្សាបរិស្ថានល្អ', en: 'Safety & Hygiene', desc: 'Maintaining a safe environment', max: 10 },
          { id: 26, kh: 'ការថែទាំឧបករណ៍', khDesc: 'ការថែរក្សាសម្ភារៈ', en: 'Equipment Maintenance', desc: 'Proper care of tools and equipment', max: 10 },
          { id: 27, kh: 'ការធ្វើការជាក្រុម', khDesc: 'ការសហការ', en: 'Teamwork', desc: 'Working well with others', max: 10 },
          { id: 28, kh: 'ភាពជឿជាក់និងការទទួលខុសត្រូវ', khDesc: 'ការទទួលខុសត្រូវ', en: 'Reliability & Responsibility', desc: 'Dependability in duties', max: 10 },
          { id: 29, kh: 'ការទំនាក់ទំនងអតិថិជន', khDesc: 'ការបម្រើអតិថិជន', en: 'Customer Communication', desc: 'Interacting with clients effectively', max: 10 },
          { id: 30, kh: 'ការគ្រប់គ្រងពេលវេលា', khDesc: 'ការបំពេញការងារទាន់ពេល', en: 'Time Management', desc: 'Completing tasks on time', max: 10 },
        ]
      }
    };
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('evaluation_config', JSON.stringify(defaultConfig));
  }
};
seedSettings();

// Seed default profile settings
const seedProfileSettings = () => {
  const defaults = [
    { category: 'campuses', key: 'main', value: 'Main Campus' },
    { category: 'campuses', key: 'north', value: 'North Campus' },
    { category: 'campuses', key: 'south', value: 'South Campus' },
    { category: 'campuses', key: 'east', value: 'East Campus' },
    { category: 'campuses', key: 'west', value: 'West Campus' },
    { category: 'departments', key: 'it', value: 'Information Technology' },
    { category: 'departments', key: 'hr', value: 'Human Resources' },
    { category: 'departments', key: 'finance', value: 'Finance' },
    { category: 'departments', key: 'operations', value: 'Operations' },
    { category: 'departments', key: 'academics', value: 'Academics' },
    { category: 'positions', key: 'manager', value: 'Manager' },
    { category: 'positions', key: 'developer', value: 'Developer' },
    { category: 'positions', key: 'teacher', value: 'Teacher' },
    { category: 'positions', key: 'staff', value: 'Staff' },
    { category: 'positions', key: 'coordinator', value: 'Coordinator' },
    { category: 'categories', key: 'fulltime', value: 'Full-time' },
    { category: 'categories', key: 'parttime', value: 'Part-time' },
    { category: 'categories', key: 'contractor', value: 'Contractor' },
    { category: 'categories', key: 'intern', value: 'Intern' },
    { category: 'evalModels', key: 'campus_100', value: 'campus_100' },
    { category: 'evalModels', key: 'campus_60_40', value: 'campus_60_40' },
    { category: 'evalModels', key: 'campus_50_50', value: 'campus_50_50' },
    { category: 'evalModels', key: 'central_100', value: 'central_100' },
    { category: 'evalPeriods', key: 'q1_2026', value: 'Q1 2026' },
    { category: 'evalPeriods', key: 'q2_2026', value: 'Q2 2026' },
    { category: 'evalPeriods', key: 'q3_2026', value: 'Q3 2026' },
    { category: 'evalPeriods', key: 'q4_2026', value: 'Q4 2026' },
    { category: 'evalPeriods', key: 'annual_2026', value: 'Annual 2026' },
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO profile_settings (category, key, value) VALUES (?, ?, ?)');
  for (const s of defaults) { stmt.run(s.category, s.key, s.value); }
};
seedProfileSettings();

const app = express();
app.use(express.json({ limit: '50mb' }));

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; name: string };
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user as any;
    next();
  });
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'superadmin') return res.status(403).json({ error: 'Access denied. Super Admin only.' });
  next();
};

const logAudit = (userId: string, userName: string, action: string, details: string) => {
  try {
    db.prepare('INSERT INTO audit_logs (userId, userName, action, details) VALUES (?, ?, ?, ?)').run(userId, userName, action, details);
  } catch (error) { console.error('Error logging audit:', error); }
};

// PDF Generation Helper
const khmerFontPath = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansKhmer-Regular.ttf');

function generateReportPDF(title: string, subtitle: string, contentFn: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        info: { Title: title, Author: 'Performance Appraisal System', Subject: subtitle }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const hasKhmer = fs.existsSync(khmerFontPath);
      if (hasKhmer) {
        doc.registerFont('Khmer', khmerFontPath);
      }

      // Header
      doc.fontSize(10).font('Helvetica').fillColor('#666').text('Performance Appraisal System', 50, 20, { align: 'left' });
      doc.fontSize(8).fillColor('#999').text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 50, 35, { align: 'left' });
      doc.fontSize(8).fillColor('#999').text('Page', { align: 'right' });

      // Title
      doc.moveDown(3);
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text(title, { align: 'center' });
      doc.fontSize(13).font('Helvetica').fillColor('#64748b').text(subtitle, { align: 'center' });
      doc.moveDown(1);

      // Horizontal line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(1.5);

      contentFn(doc);

      // Footer with page numbers
      const pages = doc.bufferedPageRange ? doc.bufferedPageRange() : null;
      if (pages) {
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          const pageNum = i + 1;
          doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
          doc.text(`Page ${pageNum} of ${pages.count}`, 50, 800, { align: 'right' });
          doc.text('© Performance Appraisal System', 50, 800, { align: 'left' });
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function addKhmerText(doc: PDFKit.PDFDocument, text: string, khmerText: string, options?: any) {
  const hasKhmer = fs.existsSync(khmerFontPath);
  doc.font('Helvetica').fontSize(options?.size || 10).fillColor(options?.color || '#333');
  if (hasKhmer) {
    doc.font('Khmer').text(khmerText, options);
    doc.font('Helvetica').text(text, options);
  } else {
    doc.text(`${khmerText} / ${text}`, options);
  }
}

// ====== PDF GENERATION ENDPOINTS ======

app.get('/api/pdf/evaluation/:id', authenticateToken, async (req, res) => {
  try {
    const evalRecord = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(req.params.id) as any;
    if (!evalRecord) return res.status(404).json({ error: 'Evaluation not found' });

    const scores = db.prepare('SELECT * FROM criteria_scores WHERE evaluationId = ?').all(req.params.id) as any[];
    const config = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('evaluation_config') as any;
    const evaluationConfig = config ? JSON.parse(config.value) : null;

    let criteriaList: any[] = [];
    if (evaluationConfig && evaluationConfig.criteriaSets[evalRecord.evaluationType]) {
      criteriaList = evaluationConfig.criteriaSets[evalRecord.evaluationType];
    }

    const buf = await generateReportPDF(
      'របាយការណ៍វាយតម្លៃបុគ្គលិក',
      `Employee Performance Appraisal Report - ${evalRecord.employeeName}`,
      (doc) => {
        const hasKhmer = fs.existsSync(khmerFontPath);
        const kh = (text: string, fallback: string) => hasKhmer ? text : fallback;

        // Employee Info
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('ព័ត៌មានបុគ្គលិក / Employee Information');
        doc.moveDown(0.5);

        const infoX = 70;
        const infoY = doc.y;
        doc.fontSize(9).font('Helvetica').fillColor('#475569');
        doc.text(`Employee ID: ${evalRecord.employeeId}`, infoX, infoY);
        doc.text(`Name: ${evalRecord.employeeName}`, infoX, infoY + 15);
        doc.text(`Campus: ${evalRecord.campus}`, infoX + 200, infoY);
        doc.text(`Department: ${evalRecord.department || 'N/A'}`, infoX + 200, infoY + 15);
        doc.text(`Position: ${evalRecord.position}`, infoX + 200, infoY + 30);
        doc.text(`Review Date: ${evalRecord.reviewDate}`, infoX, infoY + 30);

        doc.moveDown(4);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.moveDown(1.5);

        // Scores Table
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('ពិន្ទុវាយតម្លៃ / Evaluation Scores');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidths = [30, 180, 80, 80, 80];
        const headers = ['#', 'លក្ខណៈវិនិច្ឆ័យ / Criteria', 'Self', 'Supervisor', 'Overall'];

        // Table header
        let xPos = 50;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
        headers.forEach((h, i) => {
          doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : i > 1 ? 'center' : 'left' });
          xPos += colWidths[i];
        });

        let yPos = tableTop + 18;
        doc.moveTo(50, yPos - 5).lineTo(545, yPos - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        criteriaList.forEach((crit: any, idx: number) => {
          const score = scores.find((s: any) => s.criteriaId === crit.id) || { selfScore: 0, superScore: 0 };
          if (yPos > 720) {
            doc.addPage();
            yPos = 60;
          }

          xPos = 50;
          doc.fontSize(8).font('Helvetica').fillColor('#334155');
          doc.text(String(idx + 1), xPos, yPos, { width: colWidths[0], align: 'center' });
          xPos += colWidths[0];

          doc.text(`${crit.kh} / ${crit.en}`, xPos, yPos, { width: colWidths[1] });
          xPos += colWidths[1];

          doc.text(String(score.selfScore || 0), xPos, yPos, { width: colWidths[2], align: 'center' });
          xPos += colWidths[2];
          doc.text(String(score.superScore || 0), xPos, yPos, { width: colWidths[3], align: 'center' });
          xPos += colWidths[3];
          doc.text(String(((score.selfScore || 0) + (score.superScore || 0)) / 2), xPos, yPos, { width: colWidths[4], align: 'center' });
          yPos += 20;
        });

        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.moveDown(1);

        // Overall Score
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#4f46e5');
        doc.text(`ពិន្ទុសរុប / Overall Score: ${evalRecord.overallScore.toFixed(1)} / 100`, { align: 'center' });
        doc.moveDown(0.5);

        const rating = evalRecord.overallScore >= 95 ? 'ល្អប្រសើរបំផុត (Outstanding)' :
          evalRecord.overallScore >= 90 ? 'ល្អ (Good)' :
          evalRecord.overallScore >= 70 ? 'ល្អបង្គួរ (Meets Expectation)' :
          evalRecord.overallScore >= 60 ? 'មធ្យម (Below Expectation)' : 'ត្រូវកែលម្អ (Not Met)';

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text(`ចំណាត់ថ្នាក់ / Rating: ${rating}`, { align: 'center' });
        doc.moveDown(2);

        // Signature Section
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.moveDown(2);

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
        doc.text('ហត្ថលេខា / Signatures');
        doc.moveDown(1);

        const sigY = doc.y;
        const sigWidth = 150;
        const sigGap = 20;
        const sigStart = 50;
        const sigs = ['បុគ្គលិក / Employee', 'អ្នកគ្រប់គ្រង / Supervisor', 'ថ្នាក់គ្រប់គ្រង / Management'];

        sigs.forEach((s, i) => {
          const sx = sigStart + i * (sigWidth + sigGap);
          doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(s, sx, sigY, { width: sigWidth, align: 'center' });
          doc.moveTo(sx, sigY + 30).lineTo(sx + sigWidth, sigY + 30).strokeColor('#94a3b8').stroke();
          doc.fontSize(7).fillColor('#94a3b8').text('ហត្ថលេខា / Signature', sx, sigY + 35, { width: sigWidth, align: 'center' });
          doc.text('កាលបរិច្ឆេទ / Date: ________', sx, sigY + 50, { width: sigWidth, align: 'center' });
        });
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="evaluation_${evalRecord.id}.pdf"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/department-report', authenticateToken, async (req, res) => {
  try {
    const { department, campus } = req.query;
    let query = 'SELECT * FROM evaluations WHERE 1=1';
    const params: any[] = [];
    if (department) { query += ' AND department = ?'; params.push(department); }
    if (campus) { query += ' AND campus = ?'; params.push(campus); }
    query += ' ORDER BY createdAt DESC';
    const evals = db.prepare(query).all(...params) as any[];

    const summary = {
      total: evals.length,
      avgScore: evals.length ? (evals.reduce((s: number, e: any) => s + e.overallScore, 0) / evals.length).toFixed(1) : '0',
      outstanding: evals.filter((e: any) => e.overallScore >= 95).length,
      good: evals.filter((e: any) => e.overallScore >= 90 && e.overallScore < 95).length,
      meets: evals.filter((e: any) => e.overallScore >= 70 && e.overallScore < 90).length,
      below: evals.filter((e: any) => e.overallScore >= 60 && e.overallScore < 70).length,
      notMet: evals.filter((e: any) => e.overallScore < 60).length,
    };

    const buf = await generateReportPDF(
      department ? `របាយការណ៍ដេប៉ាតឺម៉ង់: ${department}` : 'របាយការណ៍ដេប៉ាតឺម៉ង់',
      `Department Performance Report${campus ? ` - ${campus}` : ''}`,
      (doc) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('សង្ខេប / Summary');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#475569');
        doc.text(`Total Evaluations: ${summary.total}`);
        doc.text(`Average Score: ${summary.avgScore} / 100`);
        doc.moveDown(1);

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('ចំណាត់ថ្នាក់ / Rating Distribution');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica').fillColor('#475569');
        doc.text(`Outstanding / ល្អប្រសើរបំផុត: ${summary.outstanding}`);
        doc.text(`Good / ល្អ: ${summary.good}`);
        doc.text(`Meets Expectation / ល្អបង្គួរ: ${summary.meets}`);
        doc.text(`Below Expectation / មធ្យម: ${summary.below}`);
        doc.text(`Not Met / ត្រូវកែលម្អ: ${summary.notMet}`);
        doc.moveDown(2);

        if (evals.length > 0) {
          const tableTop = doc.y;
          const cw = [30, 120, 80, 80, 80, 80];
          const th = ['#', 'ឈ្មោះ / Name', 'សាខា / Campus', 'ពិន្ទុខ្លួនឯង / Self', 'អ្នកគ្រប់គ្រង / Super', 'សរុប / Overall'];

          doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569');
          let xp = 50;
          th.forEach((h, i) => { doc.text(h, xp, tableTop, { width: cw[i], align: i > 2 ? 'center' : 'left' }); xp += cw[i]; });

          let yp = tableTop + 16;
          evals.slice(0, 30).forEach((e: any, idx: number) => {
            if (yp > 740) { doc.addPage(); yp = 60; }
            xp = 50;
            doc.fontSize(7).font('Helvetica').fillColor('#334155');
            doc.text(String(idx + 1), xp, yp, { width: cw[0], align: 'center' }); xp += cw[0];
            doc.text(e.employeeName, xp, yp, { width: cw[1] }); xp += cw[1];
            doc.text(e.campus, xp, yp, { width: cw[2], align: 'center' }); xp += cw[2];
            doc.text(String(e.totalSelf?.toFixed(1) || '0'), xp, yp, { width: cw[3], align: 'center' }); xp += cw[3];
            doc.text(String(e.totalSuper?.toFixed(1) || '0'), xp, yp, { width: cw[4], align: 'center' }); xp += cw[4];
            doc.text(String(e.overallScore?.toFixed(1) || '0'), xp, yp, { width: cw[5], align: 'center' });
            yp += 18;
          });
        }
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="department_report${department ? '_' + department : ''}.pdf"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/campus-report', authenticateToken, async (req, res) => {
  try {
    const campuses = db.prepare('SELECT DISTINCT campus FROM evaluations').all() as any[];
    const reportData = campuses.map((c: any) => {
      const evals = db.prepare('SELECT * FROM evaluations WHERE campus = ?').all(c.campus) as any[];
      const avgScore = evals.length ? (evals.reduce((s: number, e: any) => s + e.overallScore, 0) / evals.length) : 0;
      return { campus: c.campus, count: evals.length, avgScore: avgScore.toFixed(1) };
    });

    const buf = await generateReportPDF(
      'របាយការណ៍ប្រចាំសាខា',
      'Campus Performance Report',
      (doc) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('សង្ខេបតាមសាខា / Campus Summary');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const cw = [30, 200, 100, 100];
        const th = ['#', 'សាខា / Campus', 'ចំនួន / Count', 'មធ្យម / Avg Score'];

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
        let xp = 50;
        th.forEach((h, i) => { doc.text(h, xp, tableTop, { width: cw[i], align: i > 1 ? 'center' : 'left' }); xp += cw[i]; });

        let yp = tableTop + 16;
        reportData.forEach((c: any, idx: number) => {
          xp = 50;
          doc.fontSize(9).font('Helvetica').fillColor('#334155');
          doc.text(String(idx + 1), xp, yp, { width: cw[0], align: 'center' }); xp += cw[0];
          doc.text(c.campus, xp, yp, { width: cw[1] }); xp += cw[1];
          doc.text(String(c.count), xp, yp, { width: cw[2], align: 'center' }); xp += cw[2];
          doc.text(String(c.avgScore), xp, yp, { width: cw[3], align: 'center' });
          yp += 20;
        });
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="campus_report.pdf"');
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/evaluation-summary', authenticateToken, async (req, res) => {
  try {
    const evals = db.prepare('SELECT * FROM evaluations ORDER BY createdAt DESC').all() as any[];
    const total = evals.length;
    const avgScore = total ? (evals.reduce((s: number, e: any) => s + e.overallScore, 0) / total).toFixed(1) : '0';
    const completed = evals.filter((e: any) => e.status === 'Completed' || e.status === 'Approved').length;
    const pending = total - completed;

    const buf = await generateReportPDF(
      'របាយការណ៍សង្ខេបការវាយតម្លៃ',
      'Evaluation Summary Report',
      (doc) => {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('ទិដ្ឋភាពទូទៅ / Overview');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#475569');
        doc.text(`Total Evaluations: ${total}`);
        doc.text(`Average Score: ${avgScore} / 100`);
        doc.text(`Completed: ${completed}`);
        doc.text(`Pending: ${pending}`);
        doc.moveDown(2);

        if (total > 0) {
          const ratingData = [
            { label: 'Outstanding / ល្អប្រសើរបំផុត', count: evals.filter((e: any) => e.overallScore >= 95).length },
            { label: 'Good / ល្អ', count: evals.filter((e: any) => e.overallScore >= 90 && e.overallScore < 95).length },
            { label: 'Meets Exp. / ល្អបង្គួរ', count: evals.filter((e: any) => e.overallScore >= 70 && e.overallScore < 90).length },
            { label: 'Below Exp. / មធ្យម', count: evals.filter((e: any) => e.overallScore >= 60 && e.overallScore < 70).length },
            { label: 'Not Met / ត្រូវកែលម្អ', count: evals.filter((e: any) => e.overallScore < 60).length },
          ];

          const barTop = doc.y;
          const barMaxWidth = 300;
          const barHeight = 20;
          const maxCount = Math.max(...ratingData.map(r => r.count));

          doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b');
          doc.text('របាយការណ៍ចំណាត់ថ្នាក់ / Rating Distribution');
          doc.moveDown(0.5);

          ratingData.forEach((r, i) => {
            const barY = doc.y;
            const barW = maxCount > 0 ? (r.count / maxCount) * barMaxWidth : 0;
            doc.fontSize(8).font('Helvetica').fillColor('#475569').text(r.label, 50, barY + 2);
            doc.rect(200, barY, barW, barHeight).fill(i < 2 ? '#10b981' : i < 3 ? '#6366f1' : i < 4 ? '#f59e0b' : '#ef4444');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(String(r.count), 200 + barW + 5, barY + 2);
            doc.moveDown(1.5);
          });
        }
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="evaluation_summary.pdf"');
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== AUTH ENDPOINTS ======

app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid User ID or Password' });
  }
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  logAudit(user.id, user.name, 'login', `User logged in from ${req.ip || 'unknown'}`);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ====== USERS ENDPOINTS ======

app.get('/api/users', authenticateToken, requireSuperAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, role FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id, name, role, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (existing) return res.status(400).json({ error: 'User ID already exists' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)').run(id, name, hash, role);
    logAudit(req.user!.id, req.user!.name, 'create_user', `Created user ${name} (${id})`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?').run(name, role, hash, id);
    } else {
      db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name, role, id);
    }
    logAudit(req.user!.id, req.user!.name, 'update_user', `Updated user ${name} (${id})`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  if (id === 'superadmin') return res.status(400).json({ error: 'Cannot delete the default superadmin' });
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.name, 'delete_user', `Deleted user (${id})`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== EMPLOYEES ENDPOINTS (Enhanced with Pagination & Filtering) ======

app.get('/api/employees', authenticateToken, (req, res) => {
  try {
    const { id, page, limit, search, campus, department, position, active, sortBy, sortOrder } = req.query;

    // Single employee lookup
    if (id) {
      const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
      return res.json(employee || null);
    }

    let query = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (id LIKE ? OR name LIKE ? OR khmerName LIKE ? OR department LIKE ? OR campus LIKE ? OR position LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }
    if (campus) { query += ' AND campus = ?'; params.push(campus); }
    if (department) { query += ' AND department = ?'; params.push(department); }
    if (position) { query += ' AND position LIKE ?'; params.push(`%${position}%`); }
    if (active !== undefined && active !== '') { query += ' AND active = ?'; params.push(active === 'true' || active === '1' ? 1 : 0); }

    const totalQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalResult = db.prepare(totalQuery).get(...params) as any;
    const total = totalResult?.total || 0;

    const sortCol = (sortBy as string) || 'name';
    const sortDir = (sortOrder as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const allowedSortCols = ['id', 'name', 'campus', 'department', 'position', 'createdAt'];
    const safeSortCol = allowedSortCols.includes(sortCol) ? sortCol : 'name';
    query += ` ORDER BY ${safeSortCol} ${sortDir}`;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const employees = db.prepare(query).all(...params);

    res.json({
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', authenticateToken, requireSuperAdmin, (req, res) => {
  const data = req.body;
  try {
    // Check if updating existing
    const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(data.id);
    if (existing) {
      db.prepare(`UPDATE employees SET name=?, khmerName=?, campus=?, department=?, position=?, category=?, supervisorId=?, supporterId=?, evalModel=?, evalPeriod=?, active=?, email=?, phone=?, hireDate=? WHERE id=?`).run(
        data.name, data.khmerName || '', data.campus || '', data.department || '', data.position || '',
        data.category || '', data.supervisorId || '', data.supporterId || '', data.evalModel || '',
        data.evalPeriod || '', data.active !== undefined ? (data.active ? 1 : 0) : 1,
        data.email || '', data.phone || '', data.hireDate || '', data.id
      );
      res.json({ success: true, action: 'updated' });
    } else {
      db.prepare(`INSERT INTO employees (id, name, khmerName, campus, department, position, category, supervisorId, supporterId, evalModel, evalPeriod, active, email, phone, hireDate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        data.id, data.name, data.khmerName || '', data.campus || '', data.department || '', data.position || '',
        data.category || '', data.supervisorId || '', data.supporterId || '', data.evalModel || '',
        data.evalPeriod || '', data.active !== undefined ? (data.active ? 1 : 0) : 1,
        data.email || '', data.phone || '', data.hireDate || ''
      );
      res.json({ success: true, action: 'created' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const fields = ['name', 'khmerName', 'campus', 'department', 'position', 'category', 'supervisorId', 'supporterId', 'evalModel', 'evalPeriod', 'active', 'email', 'phone', 'hireDate'];
    const setClauses = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      if (f === 'active') return data[f] !== undefined ? (data[f] ? 1 : 0) : 1;
      return data[f] || '';
    });
    values.push(id);
    db.prepare(`UPDATE employees SET ${setClauses} WHERE id = ?`).run(...values);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/employees/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Bulk Import Validation Endpoint
app.post('/api/employees/validate-import', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Invalid records format' });

    const profileSettings = db.prepare('SELECT * FROM profile_settings').all() as any[];
    const campuses = profileSettings.filter((p: any) => p.category === 'campuses').map((p: any) => p.value);
    const departments = profileSettings.filter((p: any) => p.category === 'departments').map((p: any) => p.value);
    const positions = profileSettings.filter((p: any) => p.category === 'positions').map((p: any) => p.value);

    const errors: { row: number; message: string }[] = [];
    const validRecords: any[] = [];
    const existingIds = new Set((db.prepare('SELECT id FROM employees').all() as any[]).map((e: any) => e.id));

    records.forEach((record: any, index: number) => {
      const row = index + 2; // 1-indexed + header row
      const rowErrors: string[] = [];

      const id = String(record['Staff ID'] || record['id'] || '').trim();
      const name = String(record['Employee Name'] || record['name'] || '').trim();
      const campus = String(record['Campus'] || record['campus'] || '').trim();
      const department = String(record['Department'] || record['department'] || '').trim();
      const position = String(record['Position'] || record['position'] || '').trim();

      if (!id) rowErrors.push('Staff ID is required');
      if (!name) rowErrors.push('Employee Name is required');

      if (campus && campuses.length > 0 && !campuses.includes(campus)) {
        rowErrors.push(`Campus "${campus}" not found in allowed campuses`);
      }
      if (department && departments.length > 0 && !departments.includes(department)) {
        rowErrors.push(`Department "${department}" not found`);
      }
      if (position && positions.length > 0 && !positions.includes(position)) {
        rowErrors.push(`Position "${position}" not found`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
      } else {
        const action = existingIds.has(id) ? 'update' : 'create';
        validRecords.push({
          id, name,
          khmerName: String(record['Khmer Name'] || record['khmerName'] || '').trim(),
          campus, department, position,
          category: String(record['Category'] || record['category'] || '').trim(),
          supervisorId: String(record['Direct Supervisor ID'] || record['supervisorId'] || '').trim(),
          supporterId: String(record['Supporter ID'] || record['supporterId'] || '').trim(),
          evalModel: String(record['Evaluation Model'] || record['evalModel'] || '').trim(),
          evalPeriod: String(record['Evaluation Period'] || record['evalPeriod'] || '').trim(),
          email: String(record['Email'] || record['email'] || '').trim(),
          phone: String(record['Phone'] || record['phone'] || '').trim(),
          action
        });
      }
    });

    res.json({
      total: records.length,
      valid: validRecords.length,
      errors: errors.length,
      errorDetails: errors,
      validRecords: validRecords.slice(0, 100),
      summary: {
        creates: validRecords.filter((r: any) => r.action === 'create').length,
        updates: validRecords.filter((r: any) => r.action === 'update').length,
        campuses: [...new Set(validRecords.map((r: any) => r.campus).filter(Boolean))],
        departments: [...new Set(validRecords.map((r: any) => r.department).filter(Boolean))],
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees/bulk-import', authenticateToken, requireSuperAdmin, (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'Invalid records' });

  try {
    const upsert = db.prepare(`
      INSERT INTO employees (id, name, khmerName, campus, department, position, category, supervisorId, supporterId, evalModel, evalPeriod, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, khmerName=excluded.khmerName, campus=excluded.campus,
        department=excluded.department, position=excluded.position, category=excluded.category,
        supervisorId=excluded.supervisorId, supporterId=excluded.supporterId,
        evalModel=excluded.evalModel, evalPeriod=excluded.evalPeriod,
        email=excluded.email, phone=excluded.phone
    `);

    let created = 0, updated = 0;

    db.transaction(() => {
      for (const r of records) {
        const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(r.id);
        upsert.run(r.id, r.name, r.khmerName || '', r.campus || '', r.department || '', r.position || '',
          r.category || '', r.supervisorId || '', r.supporterId || '', r.evalModel || '', r.evalPeriod || '',
          r.email || '', r.phone || '');
        if (existing) updated++; else created++;
      }
    })();

    logAudit(req.user!.id, req.user!.name, 'bulk_import', `Imported ${created} new, updated ${updated} employees`);
    res.json({ success: true, created, updated, total: records.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== PROFILE SETTINGS ENDPOINTS ======

app.get('/api/profile-settings', authenticateToken, (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM profile_settings';
    const params: any[] = [];
    if (category) { query += ' WHERE category = ?'; params.push(category); }
    query += ' ORDER BY category, key';
    const settings = db.prepare(query).all(...params);
    res.json(settings);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/profile-settings', authenticateToken, requireSuperAdmin, (req, res) => {
  const { category, key, value } = req.body;
  if (!category || !key) return res.status(400).json({ error: 'Category and key required' });
  try {
    db.prepare('INSERT INTO profile_settings (category, key, value) VALUES (?, ?, ?) ON CONFLICT(category, key) DO UPDATE SET value = excluded.value')
      .run(category, key, value);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/profile-settings/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM profile_settings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/profile-settings/import', authenticateToken, requireSuperAdmin, (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings)) return res.status(400).json({ error: 'Invalid format' });
  try {
    const stmt = db.prepare('INSERT INTO profile_settings (category, key, value) VALUES (?, ?, ?) ON CONFLICT(category, key) DO UPDATE SET value = excluded.value');
    db.transaction(() => {
      for (const s of settings) { stmt.run(s.category, s.key, s.value); }
    })();
    res.json({ success: true, count: settings.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/profile-settings/export', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM profile_settings ORDER BY category, key').all();
    const grouped: Record<string, { key: string; value: string }[]> = {};
    for (const s of settings as any[]) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({ key: s.key, value: s.value });
    }
    res.json(grouped);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== SETTINGS ENDPOINTS ======

app.get('/api/settings/evaluation_config', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('evaluation_config') as any;
  res.json(row ? JSON.parse(row.value) : null);
});

app.post('/api/settings/evaluation_config', authenticateToken, requireSuperAdmin, (req, res) => {
  const data = req.body;
  try {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('evaluation_config', JSON.stringify(data));
    logAudit(req.user!.id, req.user!.name, 'update_settings', 'Updated evaluation configuration');
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings/self_eval_profiles', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('self_eval_profiles') as any;
  res.json(row ? JSON.parse(row.value) : null);
});

app.post('/api/settings/self_eval_profiles', authenticateToken, requireSuperAdmin, (req, res) => {
  const data = req.body;
  try {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('self_eval_profiles', JSON.stringify(data));
    logAudit(req.user!.id, req.user!.name, 'update_settings', 'Updated Self Evaluation profiles');
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings/hr_profiles', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('hr_profiles') as any;
  res.json(row ? JSON.parse(row.value) : null);
});

app.post('/api/settings/hr_profiles', authenticateToken, requireSuperAdmin, (req, res) => {
  const data = req.body;
  try {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('hr_profiles', JSON.stringify(data));
    logAudit(req.user!.id, req.user!.name, 'update_settings', 'Updated HR Profile Settings');
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== NOTIFICATIONS ======

app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifications: { id: string, message: string, type: string, link: string }[] = [];
    const userId = req.user!.id;

    const myEvals = db.prepare('SELECT COUNT(*) as count FROM evaluations WHERE employeeId = ? AND status IN ("Draft", "Self Evaluation Pending")').get(userId) as any;
    if (myEvals && myEvals.count > 0) {
      notifications.push({ id: 'self-eval', message: `You have ${myEvals.count} self-evaluation(s) to complete.`, type: 'warning', link: '/dashboard' });
    }

    const superEvals = db.prepare('SELECT COUNT(*) as count FROM evaluations WHERE appraiser = ? AND status = "Waiting for Supervisor"').get(userId) as any;
    if (superEvals && superEvals.count > 0) {
      notifications.push({ id: 'super-eval', message: `You have ${superEvals.count} evaluation(s) waiting for your supervisor review.`, type: 'info', link: '/dashboard' });
    }

    const supporterEvals = db.prepare('SELECT COUNT(*) as count FROM evaluations WHERE supporter = ? AND status = "Waiting for Supporter"').get(userId) as any;
    if (supporterEvals && supporterEvals.count > 0) {
      notifications.push({ id: 'supporter-eval', message: `You have ${supporterEvals.count} evaluation(s) waiting for your supporter review.`, type: 'info', link: '/dashboard' });
    }

    if (req.user!.role === 'superadmin' || req.user!.role === 'admin') {
      const allPending = db.prepare('SELECT COUNT(*) as count FROM evaluations WHERE status NOT IN ("Completed", "Approved")').get() as any;
      if (allPending && allPending.count > 0) {
        notifications.push({ id: 'admin-pending', message: `There are ${allPending.count} evaluation(s) in progress across the system.`, type: 'default', link: '/dashboard' });
      }
    }

    res.json(notifications);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== EVALUATIONS ENDPOINTS ======

app.get('/api/evaluations', authenticateToken, (req, res) => {
  let evals;
  const { page, limit, campus, department, status, search } = req.query;
  let query = 'SELECT * FROM evaluations WHERE 1=1';
  const params: any[] = [];

  if (req.user?.role !== 'superadmin') {
    query += ' AND (createdBy = ? OR appraiser = ? OR supporter = ?)';
    params.push(req.user?.id, req.user?.id, req.user?.id);
  }
  if (campus) { query += ' AND campus = ?'; params.push(campus); }
  if (department) { query += ' AND department = ?'; params.push(department); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { const s = `%${search}%`; query += ' AND (employeeName LIKE ? OR employeeId LIKE ?)'; params.push(s, s); }

  query += ' ORDER BY createdAt DESC';

  const totalQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const totalRow = db.prepare(totalQuery).get(...params) as any;
  const total = totalRow?.total || 0;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, (pageNum - 1) * limitNum);

  evals = db.prepare(query).all(...params);
  res.json({ data: evals, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
});

app.get('/api/evaluations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const evalRecord = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id) as any;
    if (!evalRecord) return res.status(404).json({ error: 'Evaluation not found' });
    const scores = db.prepare('SELECT * FROM criteria_scores WHERE evaluationId = ?').all(id) as any[];
    const peerFeedbacks = db.prepare('SELECT * FROM peer_feedback WHERE evaluationId = ?').all(id) as any[];
    res.json({ ...evalRecord, scores, peerFeedbacks });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/evaluations', authenticateToken, (req, res) => {
  const data = req.body;
  const createdBy = req.user!.id;
  const createdByName = req.user!.name;
  try {
    const insertEval = db.prepare(`
      INSERT INTO evaluations (employeeId, employeeName, campus, department, position, appraiser, supporter, reviewDate, weightScheme, evaluationType, evalPeriod, totalSelf, totalSuper, overallScore, createdBy, createdByName, evaluatorComments, status)
      VALUES (@employeeId, @employeeName, @campus, @department, @position, @appraiser, @supporter, @reviewDate, @weightScheme, @evaluationType, @evalPeriod, @totalSelf, @totalSuper, @overallScore, @createdBy, @createdByName, @evaluatorComments, @status)
    `);
    const info = insertEval.run({
      ...data, createdBy, createdByName,
      evaluatorComments: data.evaluatorComments || '',
      status: data.status || 'Draft',
      department: data.department || '',
      evalPeriod: data.evalPeriod || '',
      supporter: data.supporter || ''
    });
    const evalId = info.lastInsertRowid;

    const insertCriteria = db.prepare('INSERT INTO criteria_scores (evaluationId, criteriaId, selfScore, superScore, supporterScore, managementScore, aspScore) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of data.criteriaScores) {
      insertCriteria.run(evalId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore || 0, c.managementScore || 0, c.aspScore || 0);
    }

    if (data.peerFeedbacks) {
      const insertPeer = db.prepare('INSERT INTO peer_feedback (evaluationId, peerName, feedback, score) VALUES (?, ?, ?, ?)');
      for (const p of data.peerFeedbacks) { insertPeer.run(evalId, p.peerName, p.feedback, p.score); }
    }

    logAudit(createdBy, createdByName, 'create_evaluation', `Created evaluation for employee ID: ${data.employeeId} (${data.employeeName})`);
    res.json({ success: true, id: evalId });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/evaluations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const ev = db.prepare('SELECT createdBy, appraiser, supporter FROM evaluations WHERE id = ?').get(id) as any;
    if (!ev) return res.status(404).json({ error: 'Evaluation not found' });
    if (req.user!.role !== 'superadmin' && ev.createdBy !== req.user!.id && ev.appraiser !== req.user!.id && ev.supporter !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateEval = db.prepare(`
      UPDATE evaluations SET employeeId=@employeeId, employeeName=@employeeName, campus=@campus, department=@department,
        position=@position, appraiser=@appraiser, supporter=@supporter, reviewDate=@reviewDate,
        weightScheme=@weightScheme, evaluationType=@evaluationType, evalPeriod=@evalPeriod,
        totalSelf=@totalSelf, totalSuper=@totalSuper, overallScore=@overallScore,
        evaluatorComments=@evaluatorComments, status=@status WHERE id=@id
    `);

    db.transaction(() => {
      updateEval.run({ ...data, id, evaluatorComments: data.evaluatorComments || '', status: data.status || 'Draft', department: data.department || '', evalPeriod: data.evalPeriod || '', supporter: data.supporter || '' });
      db.prepare('DELETE FROM criteria_scores WHERE evaluationId = ?').run(id);
      const insertScore = db.prepare('INSERT INTO criteria_scores (evaluationId, criteriaId, selfScore, superScore, supporterScore, managementScore, aspScore) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const score of data.criteriaScores) { insertScore.run(id, score.criteriaId, score.selfScore || 0, score.superScore || 0, score.supporterScore || 0, score.managementScore || 0, score.aspScore || 0); }
      db.prepare('DELETE FROM peer_feedback WHERE evaluationId = ?').run(id);
      if (data.peerFeedbacks && data.peerFeedbacks.length > 0) {
        const insertPeer = db.prepare('INSERT INTO peer_feedback (evaluationId, peerName, feedback, score) VALUES (?, ?, ?, ?)');
        for (const peer of data.peerFeedbacks) { insertPeer.run(id, peer.peerName, peer.feedback, peer.score || 0); }
      }
    })();

    logAudit(req.user!.id, req.user!.name, 'update_evaluation', `Updated evaluation #${id} for ${data.employeeName}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/evaluations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const ev = db.prepare('SELECT createdBy FROM evaluations WHERE id = ?').get(id) as any;
    if (!ev) return res.status(404).json({ error: 'Evaluation not found' });
    if (req.user!.role !== 'superadmin' && ev.createdBy !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    db.transaction(() => {
      db.prepare('DELETE FROM criteria_scores WHERE evaluationId = ?').run(id);
      db.prepare('DELETE FROM peer_feedback WHERE evaluationId = ?').run(id);
      db.prepare('DELETE FROM evaluations WHERE id = ?').run(id);
    })();
    logAudit(req.user!.id, req.user!.name, 'delete_evaluation', `Deleted evaluation #${id}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== AUDIT LOGS ======

app.get('/api/audit-logs', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string) || 100));
    const offset = (pageNum - 1) * limitNum;

    const total = (db.prepare('SELECT COUNT(*) as total FROM audit_logs').get() as any).total;
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limitNum, offset);

    res.json({ data: logs, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== DATA MANAGEMENT ======

app.get('/api/data/export', authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, role FROM users').all();
    const evaluations = db.prepare('SELECT * FROM evaluations').all();
    const criteriaScores = db.prepare('SELECT * FROM criteria_scores').all();
    const settings = db.prepare('SELECT * FROM app_settings').all();
    logAudit(req.user!.id, req.user!.name, 'export_data', 'Exported full system backup');
    res.json({ users, evaluations, criteriaScores, settings });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/data/import', authenticateToken, requireSuperAdmin, (req, res) => {
  const { users, evaluations, criteriaScores, settings } = req.body;
  try {
    const insertEval = db.prepare(`
      INSERT OR REPLACE INTO evaluations (id, employeeId, employeeName, campus, position, appraiser, reviewDate, weightScheme, evaluationType, totalSelf, totalSuper, overallScore, createdBy, createdByName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertScore = db.prepare(`INSERT OR REPLACE INTO criteria_scores (id, evaluationId, criteriaId, selfScore, superScore, supporterScore, managementScore, aspScore) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    db.transaction(() => {
      if (evaluations && Array.isArray(evaluations)) { for (const e of evaluations) insertEval.run(e.id, e.employeeId, e.employeeName, e.campus, e.position, e.appraiser, e.reviewDate, e.weightScheme, e.evaluationType, e.totalSelf, e.totalSuper, e.overallScore, e.createdBy, e.createdByName, e.createdAt); }
      if (criteriaScores && Array.isArray(criteriaScores)) { for (const c of criteriaScores) insertScore.run(c.id, c.evaluationId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore, c.managementScore, c.aspScore); }
      if (settings && Array.isArray(settings)) { const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)'); for (const s of settings) stmt.run(s.key, s.value); }
    })();

    logAudit(req.user!.id, req.user!.name, 'import_data', 'Imported data from backup');
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/data/reset/:type', authenticateToken, requireSuperAdmin, (req, res) => {
  const { type } = req.params;
  try {
    if (type === 'evaluations') {
      db.prepare('DELETE FROM criteria_scores').run();
      db.prepare('DELETE FROM peer_feedback').run();
      db.prepare('DELETE FROM evaluations').run();
      logAudit(req.user!.id, req.user!.name, 'reset_data', 'Reset all appraisal records');
    } else if (type === 'users') {
      db.prepare("DELETE FROM users WHERE id != 'superadmin'").run();
      logAudit(req.user!.id, req.user!.name, 'reset_data', 'Reset all users (except superadmin)');
    } else if (type === 'all') {
      db.prepare('DELETE FROM criteria_scores').run();
      db.prepare('DELETE FROM peer_feedback').run();
      db.prepare('DELETE FROM evaluations').run();
      db.prepare("DELETE FROM users WHERE id != 'superadmin'").run();
      db.prepare('DELETE FROM app_settings').run();
      seedSettings();
      logAudit(req.user!.id, req.user!.name, 'reset_data', 'Factory reset entire system');
    } else { return res.status(400).json({ error: 'Invalid reset type' }); }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ====== SERVE ======

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
