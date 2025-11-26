const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireTeacher(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'teacher' && req.session.user.role !== 'admin')) {
    return res.redirect('/dashboard');
  }
  next();
}

// Crear tarea
router.post('/course/:courseId', requireTeacher, (req, res) => {
  const { title, description, due_date, points } = req.body;

  db.run(
    `INSERT INTO assignments (course_id, title, description, due_date, points)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.courseId, title, description, due_date, points || 100],
    (err) => {
      if (err) req.flash('error', 'Error creando tarea.');
      else req.flash('success', 'Tarea creada.');
      res.redirect('/courses/' + req.params.courseId);
    }
  );
});

// Ver tarea
router.get('/:id', requireAuth, (req, res) => {
  const user = req.session.user;

  db.get(
    `SELECT a.*, c.title AS course_title
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = ?`,
    [req.params.id],
    (err, assignment) => {
      if (err || !assignment) {
        req.flash('error', 'Tarea no encontrada.');
        return res.redirect('/dashboard');
      }

      if (user.role === 'teacher' || user.role === 'admin') {
        db.all(
          `SELECT s.*, u.name AS student_name
           FROM submissions s
           JOIN users u ON u.id = s.student_id
           WHERE s.assignment_id = ?`,
          [req.params.id],
          (err2, submissions) => {
            if (err2) submissions = [];
            res.render('assignments/show_teacher', { user, assignment, submissions });
          }
        );
      } else {
        db.get(
          `SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?`,
          [req.params.id, user.id],
          (err3, submission) => {
            res.render('assignments/show_student', { user, assignment, submission });
          }
        );
      }
    }
  );
});

// Enviar tarea
router.post('/:id/submit', requireAuth, (req, res) => {
  const { text, file_url } = req.body;

  db.get(
    `SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?`,
    [req.params.id, req.session.user.id],
    (err, existing) => {
      if (existing) {
        db.run(
          `UPDATE submissions SET text=?, file_url=?, submitted_at=CURRENT_TIMESTAMP WHERE id=?`,
          [text, file_url, existing.id],
          () => {
            req.flash('success', 'Entrega actualizada.');
            res.redirect('/assignments/' + req.params.id);
          }
        );
      } else {
        db.run(
          `INSERT INTO submissions (assignment_id, student_id, text, file_url)
           VALUES (?, ?, ?, ?)`,
          [req.params.id, req.session.user.id, text, file_url],
          () => {
            req.flash('success', 'Entrega enviada.');
            res.redirect('/assignments/' + req.params.id);
          }
        );
      }
    }
  );
});

// Calificar tarea
router.post('/:id/grade/:submissionId', requireTeacher, (req, res) => {
  const { grade, feedback } = req.body;

  db.run(
    `UPDATE submissions SET grade=?, feedback=?, graded_at=CURRENT_TIMESTAMP WHERE id=?`,
    [grade, feedback, req.params.submissionId],
    () => {
      req.flash('success', 'Calificación guardada.');
      res.redirect('/assignments/' + req.params.id);
    }
  );
});

module.exports = router;
