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

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { id, type, password } = req.body;
  // In production: WebAuthn FIDO2 verification replaces passwords.

  let user = null;

  try {
    if (type === 'beekeeper') {
      const beekeepers = JSON.parse(fs.readFileSync(beekeepersPath, 'utf8'));
      user = beekeepers.find(b => b.id === id && b.pin === password);
      if (user) user.role = 'beekeeper';
    } else if (type === 'processor') {
      const processors = JSON.parse(fs.readFileSync(processorsPath, 'utf8'));
      user = processors.find(p => p.email === id && p.password === password);
    } else if (type === 'auditor') {
      const auditors = JSON.parse(fs.readFileSync(auditorsPath, 'utf8'));
      user = auditors.find(a => a.email === id && a.password === password);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read identity data', code: 'REGISTRY_ERROR' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '2h' }
  );

  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
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
