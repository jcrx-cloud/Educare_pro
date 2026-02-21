const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'educare_pro_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(flash());

// Middleware para variables globales (flash + usuario)
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  next();
});

// Rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const coursesRoutes = require('./routes/courses');
const assignmentsRoutes = require('./routes/assignments');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/courses', coursesRoutes);
app.use('/assignments', assignmentsRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);


// Ruta principal
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  return res.redirect('/dashboard');
});

// 404
app.use((req, res) => {
  res.status(404).render('404');
});
