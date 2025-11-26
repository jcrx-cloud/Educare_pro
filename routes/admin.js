const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }
  next();
}

// Panel admin
router.get('/', requireAdmin, (req, res) => {
  db.all(
    `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`,
    [],
    (err, users) => {
      if (err) users = [];
      res.render('admin/index', { user: req.session.user, users });
    }
  );
});

// Crear usuario
router.post('/users', requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body;
  const hash = bcrypt.hashSync(password || '123456', 10);

  db.run(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    [name, email, hash, role],
    (err) => {
      if (err) req.flash('error', 'Error creando usuario.');
      else req.flash('success', 'Usuario creado.');

      res.redirect('/admin');
    }
  );
});

module.exports = router;
