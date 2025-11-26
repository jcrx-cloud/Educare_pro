const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  next();
}

router.get('/events', requireAuth, (req, res) => {
  db.all(
    `
    SELECT ev.*, c.title AS course_title
    FROM events ev
    JOIN courses c ON c.id = ev.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.user_id = ?
    `,
    [req.session.user.id],
    (err, events) => {
      if (err) return res.json([]);
      res.json(events);
    }
  );
});

module.exports = router;
