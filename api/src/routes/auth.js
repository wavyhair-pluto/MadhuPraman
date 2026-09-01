const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

const beekeepersPath = path.join(__dirname, '../../../mock-data/beekeepers.json');
const processorsPath = path.join(__dirname, '../../../mock-data/processors.json');
const auditorsPath = path.join(__dirname, '../../../mock-data/auditors.json');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        madhukrantiId: role === 'beekeeper' ? `BK-${Math.floor(1000 + Math.random() * 9000)}` : null
      }
    });

    const token = jwt.sign(
      { id: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '2h' }
    );
    res.json({ token, user: { id: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { id, type, password } = req.body;
  let user = null;

  try {
    // 1. Check PostgreSQL Database first (for newly registered users)
    const dbUser = await prisma.user.findFirst({ where: { email: id } });
    if (dbUser && await bcrypt.compare(password, dbUser.passwordHash)) {
      user = { id: dbUser.email, name: dbUser.name, role: dbUser.role };
    } 
    // 2. Fallback to Mock JSON files (for hackathon default credentials)
    else {
      if (type === 'beekeeper') {
        const beekeepers = JSON.parse(fs.readFileSync(beekeepersPath, 'utf8'));
        const bk = beekeepers.find(b => b.id === id && b.pin === password);
        if (bk) user = { id: bk.id, name: bk.name, role: 'beekeeper' };
      } else if (type === 'processor') {
        const processors = JSON.parse(fs.readFileSync(processorsPath, 'utf8'));
        const pr = processors.find(p => p.email === id && p.password === password);
        if (pr) user = { id: pr.email, name: pr.name, role: 'processor' };
      } else if (type === 'auditor') {
        const auditors = JSON.parse(fs.readFileSync(auditorsPath, 'utf8'));
        const au = auditors.find(a => a.email === id && a.password === password);
        if (au) user = { id: au.email, name: au.name, role: 'auditor' };
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to authenticate', code: 'AUTH_ERROR' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '2h' }
  );

  res.json({ token, user });
});

// GET /api/auth/me — verify token
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
