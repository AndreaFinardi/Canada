'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || '17/07/2008';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambia-questa-chiave-prima-di-pubblicare';
const COOKIE_NAME = 'ricordi_canada_access';
const COOKIE_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const MAX_LOGIN_ATTEMPTS = 10;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PRIVATE_DIR = path.join(ROOT, 'private');
const IMAGES_DIR = path.join(PRIVATE_DIR, 'images');
const PHOTOS_DIR = path.join(PRIVATE_DIR, 'photos');
const LETTERS_FILE = path.join(ROOT, 'data', 'letters.json');
const PHOTOS_FILE = path.join(ROOT, 'data', 'photos.json');

const loginAttempts = new Map();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  );
  next();
});

app.use('/assets', express.static(PUBLIC_DIR, {
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  index: false
}));

function safeEqual(valueA, valueB) {
  const a = Buffer.from(String(valueA));
  const b = Buffer.from(String(valueB));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function getAccessVersion() {
  return sign(`access-code:${ACCESS_CODE}`).slice(0, 24);
}

function createAccessToken() {
  const payload = Buffer.from(JSON.stringify({
    access: true,
    version: getAccessVersion(),
    exp: Date.now() + COOKIE_DURATION_MS
  })).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

function isValidAccessToken(token) {
  if (!token || typeof token !== 'string') return false;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.access === true
      && safeEqual(data.version || '', getAccessVersion())
      && Number.isFinite(data.exp)
      && data.exp > Date.now();
  } catch {
    return false;
  }
}

function isAuthenticated(req) {
  return isValidAccessToken(req.cookies[COOKIE_NAME]);
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    res.setHeader('Cache-Control', 'private, no-store');
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Accesso richiesto.' });
  }

  return res.redirect('/login');
}

function getClientAttemptRecord(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);

  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, fresh);
    return fresh;
  }

  return current;
}

async function readLetters() {
  const raw = await fs.readFile(LETTERS_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('data/letters.json deve contenere un elenco JSON.');
  }

  return parsed;
}


async function readPhotoGroups() {
  const raw = await fs.readFile(PHOTOS_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('data/photos.json deve contenere un elenco JSON.');
  }

  return parsed;
}

function normalizePhoto(photo, groupName) {
  const item = typeof photo === 'string' ? { file: photo } : (photo || {});
  const filename = path.basename(String(item.file || ''));

  return {
    file: filename,
    alt: String(item.alt || `Foto ricordo con ${groupName}`),
    caption: String(item.caption || '')
  };
}

function buildPhotoUrl(groupId, filename) {
  return `/photo/${encodeURIComponent(groupId)}/${encodeURIComponent(filename)}`;
}

app.get('/', (req, res) => {
  res.redirect(isAuthenticated(req) ? '/ricordi' : '/login');
});

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/ricordi');
  return res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const record = getClientAttemptRecord(ip);

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'Troppi tentativi. Riprova tra qualche minuto.'
    });
  }

  const submittedCode = String(req.body.code || '').trim();

  if (!safeEqual(submittedCode, ACCESS_CODE)) {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ error: 'Il codice inserito non è corretto.' });
  }

  loginAttempts.delete(ip);
  res.cookie(COOKIE_NAME, createAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_DURATION_MS,
    path: '/'
  });

  return res.json({ ok: true, redirect: '/ricordi' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  return res.json({ ok: true });
});

app.get('/ricordi', requireAuth, (req, res) => {
  res.sendFile(path.join(PRIVATE_DIR, 'app.html'));
});

app.get('/api/letters', requireAuth, async (req, res, next) => {
  try {
    const letters = await readLetters();
    const safeLetters = letters.map((letter) => ({
      id: String(letter.id),
      title: String(letter.title || 'Una lettera per te'),
      author: String(letter.author || 'Da una persona speciale'),
      date: String(letter.date || ''),
      preview: String(letter.preview || letter.text || '').slice(0, 150)
    }));
    res.json(safeLetters);
  } catch (error) {
    next(error);
  }
});

app.get('/api/letters/:id', requireAuth, async (req, res, next) => {
  try {
    const letters = await readLetters();
    const letter = letters.find((item) => String(item.id) === String(req.params.id));

    if (!letter) {
      return res.status(404).json({ error: 'Lettera non trovata.' });
    }

    return res.json({
      id: String(letter.id),
      title: String(letter.title || 'Una lettera per te'),
      author: String(letter.author || 'Da una persona speciale'),
      date: String(letter.date || ''),
      imageUrl: `/letter-image/${encodeURIComponent(path.basename(String(letter.image || '')) )}`,
      imageAlt: String(letter.imageAlt || `Lettera scritta a mano da ${letter.author || 'una persona speciale'}`),
      text: String(letter.text || '')
    });
  } catch (error) {
    next(error);
  }
});

app.get('/letter-image/:filename', requireAuth, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const letters = await readLetters();
    const allowedImages = new Set(
      letters.map((letter) => path.basename(String(letter.image || ''))).filter(Boolean)
    );

    if (!allowedImages.has(filename)) {
      return res.status(404).send('Immagine non trovata.');
    }

    return res.sendFile(path.join(IMAGES_DIR, filename));
  } catch (error) {
    next(error);
  }
});



app.get('/api/photo-groups', requireAuth, async (req, res, next) => {
  try {
    const groups = await readPhotoGroups();
    const safeGroups = groups.map((group) => {
      const id = path.basename(String(group.id || ''));
      const name = String(group.name || id || 'Album');
      const photos = Array.isArray(group.photos)
        ? group.photos.map((photo) => normalizePhoto(photo, name)).filter((photo) => photo.file)
        : [];
      const requestedCover = path.basename(String(group.cover || ''));
      const cover = photos.find((photo) => photo.file === requestedCover) || photos[0] || null;

      return {
        id,
        name,
        description: String(group.description || ''),
        photoCount: photos.length,
        coverUrl: cover ? buildPhotoUrl(id, cover.file) : ''
      };
    }).filter((group) => group.id);

    return res.json(safeGroups);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/photo-groups/:id', requireAuth, async (req, res, next) => {
  try {
    const groups = await readPhotoGroups();
    const group = groups.find((item) => String(item.id) === String(req.params.id));

    if (!group) {
      return res.status(404).json({ error: 'Album non trovato.' });
    }

    const id = path.basename(String(group.id || ''));
    const name = String(group.name || id || 'Album');
    const photos = Array.isArray(group.photos)
      ? group.photos.map((photo) => normalizePhoto(photo, name)).filter((photo) => photo.file)
      : [];

    return res.json({
      id,
      name,
      description: String(group.description || ''),
      photos: photos.map((photo) => ({
        url: buildPhotoUrl(id, photo.file),
        alt: photo.alt,
        caption: photo.caption
      }))
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/photo/:groupId/:filename', requireAuth, async (req, res, next) => {
  try {
    const groups = await readPhotoGroups();
    const group = groups.find((item) => String(item.id) === String(req.params.groupId));

    if (!group) {
      return res.status(404).send('Album non trovato.');
    }

    const groupName = String(group.name || group.id || 'Album');
    const filename = path.basename(String(req.params.filename || ''));
    const folder = path.basename(String(group.folder || group.id || ''));
    const allowedFiles = new Set(
      (Array.isArray(group.photos) ? group.photos : [])
        .map((photo) => normalizePhoto(photo, groupName).file)
        .filter(Boolean)
    );

    if (!folder || !allowedFiles.has(filename)) {
      return res.status(404).send('Foto non trovata.');
    }

    return res.sendFile(path.join(PHOTOS_DIR, folder, filename));
  } catch (error) {
    return next(error);
  }
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /\n');
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Risorsa non trovata.' });
  }
  return res.status(404).send('Pagina non trovata.');
});

app.use((error, req, res, _next) => {
  console.error(error);
  const message = process.env.NODE_ENV === 'production'
    ? 'Si è verificato un errore. Riprova.'
    : error.message;

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: message });
  }
  return res.status(500).send(message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ricordi Canada in ascolto sulla porta ${PORT}`);
  if (SESSION_SECRET === 'cambia-questa-chiave-prima-di-pubblicare') {
    console.warn('ATTENZIONE: configura SESSION_SECRET su Render prima della pubblicazione.');
  }
});
