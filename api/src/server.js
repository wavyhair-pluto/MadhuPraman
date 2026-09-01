require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const captureRoutes = require('./routes/capture');
const processorRoutes = require('./routes/processor');
const auditorRoutes = require('./routes/auditor');
const publicRoutes = require('./routes/public');

const prisma = new PrismaClient();
const app = express();

// ========================
// CYBERSECURITY MIDDLEWARE
// ========================

// Helmet: Sets secure HTTP headers (XSS protection, HSTS, CSP, etc.)
app.use(helmet());

// CORS: Restrict origins in production
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate Limiting: Prevents DDoS and brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Rate limited.', code: 'RATE_LIMITED' }
});
app.use('/api/', apiLimiter);

// Strict login rate limiter (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.', code: 'LOGIN_RATE_LIMITED' }
});

app.use(express.json({ limit: '1mb' }));

// Request logging (WAF simulation)
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${new Date().toISOString()} | ${req.method} ${req.url} | IP: ${req.ip}`);
  next();
});

// ========================
// ROUTES
// ========================
app.get('/health', (req, res) => res.json({ status: 'ok', secure: true, timestamp: new Date().toISOString() }));

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/processor', processorRoutes);
app.use('/api/auditor', auditorRoutes);
app.use('/api/public', publicRoutes);

// Global error handler — never leak stack traces
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n[Zero-Trust Gateway] TrueSource API running on port ${PORT}`);
  console.log(`[Fabric Mode] ${process.env.USE_REAL_FABRIC === 'true' ? 'PRODUCTION (gRPC/mTLS)' : 'MOCK (In-Memory Ledger)'}`);
  console.log(`[Database] PostgreSQL via Prisma\n`);
});
