const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', requireAuth, (req, res) => {
  const user = req.session.user;

  const sqlCourses =
    user.role === 'teacher' || user.role === 'admin'
      ? `SELECT * FROM courses WHERE teacher_id = ?`
      : `SELECT c.* FROM courses c
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.user_id = ?`;

  db.all(sqlCourses, [user.id], (err, courses) => {
    if (err) courses = [];

    const sqlAssignments = `
      SELECT a.*, c.title as course_title
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY a.due_date ASC LIMIT 5;
    `;

    db.all(sqlAssignments, [user.id], (err2, assignments) => {
      if (err2) assignments = [];

      const sqlAnnouncements = `
        SELECT an.*, c.title as course_title
        FROM announcements an
        JOIN courses c ON c.id = an.course_id
        ORDER BY an.created_at DESC LIMIT 5;
      `;

      db.all(sqlAnnouncements, [], (err3, announcements) => {
        if (err3) announcements = [];

        res.render('dashboard/index', {
          user,
          courses,
          assignments,
          announcements
        });
      });
    });
  });
});

module.exports = router;
