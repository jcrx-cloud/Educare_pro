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

// Listar cursos del usuario
router.get('/', requireAuth, (req, res) => {
  const user = req.session.user;

  const sql =
    user.role === 'teacher' || user.role === 'admin'
      ? `SELECT * FROM courses WHERE teacher_id = ?`
      : `SELECT c.* FROM courses c
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.user_id = ?`;

  db.all(sql, [user.id], (err, courses) => {
    if (err) courses = [];
    res.render('courses/index', { user, courses });
  });
});

// Crear curso
router.get('/new', requireTeacher, (req, res) => {
  res.render('courses/new', { user: req.session.user });
});

router.post('/', requireTeacher, (req, res) => {
  const { title, code, description, start_date, end_date } = req.body;
  const teacher_id = req.session.user.id;

  db.run(
    `INSERT INTO courses (title, code, description, teacher_id, start_date, end_date, is_published)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [title, code, description, teacher_id, start_date, end_date],
    function (err) {
      if (err) {
        req.flash('error', 'No se pudo crear el curso.');
        return res.redirect('/courses');
      }

      req.flash('success', 'Curso creado.');
      res.redirect('/courses/' + this.lastID + '/edit');
    }
  );
});

// Ver curso
router.get('/:id', requireAuth, (req, res) => {
  const courseId = req.params.id;
  const user = req.session.user;

  db.get(
    `SELECT c.*, u.name as teacher_name
     FROM courses c
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE c.id = ?`,
    [courseId],
    (err, course) => {
      if (err || !course) {
        req.flash('error', 'Curso no encontrado.');
        return res.redirect('/courses');
      }

      db.all(`SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC`,
        [courseId],
        (err2, modules) => {
          if (err2) modules = [];

          db.all(`SELECT * FROM assignments WHERE course_id = ? ORDER BY due_date ASC`,
            [courseId],
            (err3, assignments) => {
              if (err3) assignments = [];

              db.all(
                `SELECT * FROM announcements WHERE course_id = ? ORDER BY created_at DESC`,
                [courseId],
                (err4, announcements) => {
                  if (err4) announcements = [];

                  res.render('courses/show', {
                    user,
                    course,
                    modules,
                    assignments,
                    announcements
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Editar curso
router.get('/:id/edit', requireTeacher, (req, res) => {
  const courseId = req.params.id;

  db.get(`SELECT * FROM courses WHERE id = ?`, [courseId], (err, course) => {
    if (err || !course) {
      req.flash('error', 'Curso no encontrado.');
      return res.redirect('/courses');
    }

    res.render('courses/edit', { user: req.session.user, course });
  });
});

router.put('/:id', requireTeacher, (req, res) => {
  const { title, code, description, start_date, end_date, is_published } = req.body;

  db.run(
    `UPDATE courses SET title=?, code=?, description=?, start_date=?, end_date=?, is_published=? WHERE id=?`,
    [title, code, description, start_date, end_date, is_published ? 1 : 0, req.params.id],
    (err) => {
      if (err) {
        req.flash('error', 'No se pudo actualizar.');
        return res.redirect('/courses');
      }

      req.flash('success', 'Curso actualizado.');
      res.redirect('/courses/' + req.params.id);
    }
  );
});

// Crear módulo
router.post('/:id/modules', requireTeacher, (req, res) => {
  const { title } = req.body;

  db.run(
    `INSERT INTO modules (course_id, title, position) VALUES (?, ?, 0)`,
    [req.params.id, title],
    (err) => {
      if (err) req.flash('error', 'No se pudo crear el módulo.');
      else req.flash('success', 'Módulo creado.');

      res.redirect('/courses/' + req.params.id);
    }
  );
});

// Crear anuncio
router.post('/:id/announcements', requireTeacher, (req, res) => {
  const { title, body } = req.body;

  db.run(
    `INSERT INTO announcements (course_id, title, body, created_by)
     VALUES (?, ?, ?, ?)`,
    [req.params.id, title, body, req.session.user.id],
    (err) => {
      if (err) req.flash('error', 'Error publicando.');
      else req.flash('success', 'Anuncio publicado.');

      res.redirect('/courses/' + req.params.id);
    }
  );
});

module.exports = router;
