'use strict';

const grid = document.querySelector('#letters-grid');
const loadingState = document.querySelector('#loading-state');
const emptyState = document.querySelector('#empty-state');
const errorState = document.querySelector('#error-state');
const errorMessage = document.querySelector('#error-message');
const lettersCount = document.querySelector('#letters-count');
const dialog = document.querySelector('#letter-dialog');
const dialogClose = document.querySelector('#dialog-close');
const dialogTitle = document.querySelector('#dialog-title');
const dialogMeta = document.querySelector('#dialog-meta');
const letterImage = document.querySelector('#letter-image');
const fullImageLink = document.querySelector('#full-image-link');
const letterText = document.querySelector('#letter-text');
const speakButton = document.querySelector('#speak-button');
const pauseButton = document.querySelector('#pause-button');
const stopButton = document.querySelector('#stop-button');
const speechRate = document.querySelector('#speech-rate');
const speechStatus = document.querySelector('#speech-status');
const readingModeButton = document.querySelector('#reading-mode-button');
const logoutButton = document.querySelector('#logout-button');

const photoGroupsGrid = document.querySelector('#photo-groups-grid');
const photosLoadingState = document.querySelector('#photos-loading-state');
const photosEmptyState = document.querySelector('#photos-empty-state');
const photosErrorState = document.querySelector('#photos-error-state');
const photosErrorMessage = document.querySelector('#photos-error-message');
const photosCount = document.querySelector('#photos-count');
const photoDialog = document.querySelector('#photo-dialog');
const photoDialogClose = document.querySelector('#photo-dialog-close');
const photoDialogTitle = document.querySelector('#photo-dialog-title');
const photoDialogMeta = document.querySelector('#photo-dialog-meta');
const photoGalleryGrid = document.querySelector('#photo-gallery-grid');
const photoViewer = document.querySelector('#photo-viewer');
const photoViewerClose = document.querySelector('#photo-viewer-close');
const photoViewerPrev = document.querySelector('#photo-viewer-prev');
const photoViewerNext = document.querySelector('#photo-viewer-next');
const photoViewerImage = document.querySelector('#photo-viewer-image');
const photoViewerCaption = document.querySelector('#photo-viewer-caption');

let currentLetter = null;
let currentUtterance = null;
let italianVoice = null;
let currentPhotoGroup = null;
let currentPhotoIndex = 0;

function escapeForText(value) {
  return String(value ?? '').trim();
}

function selectItalianVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  italianVoice = voices.find((voice) => voice.lang.toLowerCase() === 'it-it')
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('it'))
    || null;
}

function setSpeechControls(state) {
  const isSpeaking = state === 'speaking';
  const isPaused = state === 'paused';

  pauseButton.disabled = !(isSpeaking || isPaused);
  stopButton.disabled = !(isSpeaking || isPaused);
  pauseButton.setAttribute('aria-label', isPaused ? 'Riprendi la lettura' : 'Metti in pausa');
  pauseButton.querySelector('span').textContent = isPaused ? '▶' : 'Ⅱ';

  const icon = speakButton.querySelector('.button-icon');
  const label = speakButton.querySelector('span:last-child');

  if (isSpeaking) {
    icon.textContent = '🔊';
    label.textContent = 'Lettura in corso';
  } else if (isPaused) {
    icon.textContent = '▶';
    label.textContent = 'Riprendi la lettera';
  } else {
    icon.textContent = '▶';
    label.textContent = 'Leggi la lettera';
  }
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  setSpeechControls('idle');
  speechStatus.textContent = 'Pronta per essere ascoltata.';
}

function buildLetterCard(letter, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'letter-card';
  button.dataset.letterId = letter.id;

  const number = document.createElement('span');
  number.className = 'letter-number';
  number.textContent = String(index + 1).padStart(2, '0');

  const icon = document.createElement('span');
  icon.className = 'envelope-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✉';

  const content = document.createElement('span');
  content.className = 'letter-card-content';

  const title = document.createElement('strong');
  title.textContent = escapeForText(letter.title);

  const author = document.createElement('span');
  author.className = 'letter-author';
  author.textContent = escapeForText(letter.author);

  const preview = document.createElement('span');
  preview.className = 'letter-preview';
  preview.textContent = escapeForText(letter.preview);

  const open = document.createElement('span');
  open.className = 'letter-open';
  open.textContent = 'Apri la lettera →';

  content.append(title, author, preview, open);
  button.append(number, icon, content);
  button.addEventListener('click', () => openLetter(letter.id, button));

  return button;
}

async function loadLetters() {
  try {
    const response = await fetch('/api/letters');

    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }

    const letters = await response.json();
    if (!response.ok) throw new Error(letters.error || 'Errore durante il caricamento.');

    loadingState.hidden = true;

    if (!letters.length) {
      emptyState.hidden = false;
      lettersCount.textContent = '0 lettere';
      return;
    }

    grid.replaceChildren(...letters.map(buildLetterCard));
    grid.hidden = false;
    lettersCount.textContent = `${letters.length} ${letters.length === 1 ? 'lettera' : 'lettere'}`;
  } catch (error) {
    loadingState.hidden = true;
    errorState.hidden = false;
    errorMessage.textContent = error.message;
  }
}



function pluralizePhotos(count) {
  return `${count} ${count === 1 ? 'foto' : 'foto'}`;
}

function buildPhotoGroupCard(group) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'photo-group-card';
  button.dataset.groupId = group.id;

  const cover = document.createElement('span');
  cover.className = 'photo-group-cover';

  if (group.coverUrl) {
    const image = document.createElement('img');
    image.src = group.coverUrl;
    image.alt = '';
    image.loading = 'lazy';
    cover.append(image);
  } else {
    const emptyIcon = document.createElement('span');
    emptyIcon.className = 'photo-group-empty-icon';
    emptyIcon.setAttribute('aria-hidden', 'true');
    emptyIcon.textContent = '📷';
    cover.append(emptyIcon);
  }

  const content = document.createElement('span');
  content.className = 'photo-group-content';

  const title = document.createElement('strong');
  title.textContent = escapeForText(group.name);

  const description = document.createElement('span');
  description.className = 'photo-group-description';
  description.textContent = escapeForText(group.description) || 'Un album pieno di ricordi.';

  const footer = document.createElement('span');
  footer.className = 'photo-group-footer';

  const count = document.createElement('span');
  count.textContent = pluralizePhotos(group.photoCount);

  const open = document.createElement('span');
  open.textContent = 'Apri album →';

  footer.append(count, open);
  content.append(title, description, footer);
  button.append(cover, content);
  button.addEventListener('click', () => openPhotoGroup(group.id, button));

  return button;
}

async function loadPhotoGroups() {
  try {
    const response = await fetch('/api/photo-groups');

    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }

    const groups = await response.json();
    if (!response.ok) throw new Error(groups.error || 'Errore durante il caricamento degli album.');

    photosLoadingState.hidden = true;

    if (!groups.length) {
      photosEmptyState.hidden = false;
      photosCount.textContent = '0 album';
      return;
    }

    photoGroupsGrid.replaceChildren(...groups.map(buildPhotoGroupCard));
    photoGroupsGrid.hidden = false;
    const totalPhotos = groups.reduce((sum, group) => sum + Number(group.photoCount || 0), 0);
    photosCount.textContent = `${groups.length} ${groups.length === 1 ? 'album' : 'album'} · ${pluralizePhotos(totalPhotos)}`;
  } catch (error) {
    photosLoadingState.hidden = true;
    photosErrorState.hidden = false;
    photosErrorMessage.textContent = error.message;
  }
}

function buildGalleryPhoto(photo, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gallery-photo-card';
  button.setAttribute('aria-label', photo.caption ? `Apri: ${photo.caption}` : `Apri la foto ${index + 1}`);

  const image = document.createElement('img');
  image.src = photo.url;
  image.alt = photo.alt;
  image.loading = 'lazy';

  const overlay = document.createElement('span');
  overlay.className = 'gallery-photo-overlay';
  overlay.textContent = photo.caption || `Foto ${index + 1}`;

  button.append(image, overlay);
  button.addEventListener('click', () => openPhotoViewer(index));
  return button;
}

async function openPhotoGroup(id, triggerButton) {
  triggerButton.classList.add('is-opening');

  try {
    const response = await fetch(`/api/photo-groups/${encodeURIComponent(id)}`);

    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }

    const group = await response.json();
    if (!response.ok) throw new Error(group.error || 'Album non trovato.');

    currentPhotoGroup = group;
    photoDialogTitle.textContent = group.name;
    photoDialogMeta.textContent = group.description || pluralizePhotos(group.photos.length);

    if (group.photos.length) {
      photoGalleryGrid.replaceChildren(...group.photos.map(buildGalleryPhoto));
    } else {
      const empty = document.createElement('div');
      empty.className = 'gallery-empty';
      empty.innerHTML = '<span aria-hidden="true">📷</span><strong>Questo album è ancora vuoto</strong><p>Aggiungi le foto nel file data/photos.json.</p>';
      photoGalleryGrid.replaceChildren(empty);
    }

    closePhotoViewer();
    photoDialog.showModal();
    photoDialogClose.focus();
  } catch (error) {
    window.alert(error.message);
  } finally {
    triggerButton.classList.remove('is-opening');
  }
}

function updatePhotoViewer() {
  if (!currentPhotoGroup?.photos?.length) return;
  const photo = currentPhotoGroup.photos[currentPhotoIndex];
  photoViewerImage.src = photo.url;
  photoViewerImage.alt = photo.alt;
  photoViewerCaption.textContent = photo.caption || `${currentPhotoGroup.name} · Foto ${currentPhotoIndex + 1} di ${currentPhotoGroup.photos.length}`;
  photoViewerPrev.disabled = currentPhotoGroup.photos.length < 2;
  photoViewerNext.disabled = currentPhotoGroup.photos.length < 2;
}

function openPhotoViewer(index) {
  currentPhotoIndex = index;
  updatePhotoViewer();
  photoViewer.hidden = false;
  photoViewerClose.focus();
}

function closePhotoViewer() {
  photoViewer.hidden = true;
  photoViewerImage.removeAttribute('src');
  photoViewerCaption.textContent = '';
}

function movePhotoViewer(direction) {
  if (!currentPhotoGroup?.photos?.length) return;
  const length = currentPhotoGroup.photos.length;
  currentPhotoIndex = (currentPhotoIndex + direction + length) % length;
  updatePhotoViewer();
}

photoDialogClose.addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('close', closePhotoViewer);
photoDialog.addEventListener('cancel', (event) => {
  if (!photoViewer.hidden) {
    event.preventDefault();
    closePhotoViewer();
  }
});
photoDialog.addEventListener('click', (event) => {
  if (event.target === photoDialog) photoDialog.close();
});
photoViewerClose.addEventListener('click', closePhotoViewer);
photoViewerPrev.addEventListener('click', () => movePhotoViewer(-1));
photoViewerNext.addEventListener('click', () => movePhotoViewer(1));
photoViewer.addEventListener('click', (event) => {
  if (event.target === photoViewer) closePhotoViewer();
});

document.addEventListener('keydown', (event) => {
  if (photoViewer.hidden) return;
  if (event.key === 'ArrowLeft') movePhotoViewer(-1);
  if (event.key === 'ArrowRight') movePhotoViewer(1);
});


async function openLetter(id, triggerButton) {
  triggerButton.classList.add('is-opening');

  try {
    const response = await fetch(`/api/letters/${encodeURIComponent(id)}`);

    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }

    const letter = await response.json();
    if (!response.ok) throw new Error(letter.error || 'Lettera non trovata.');

    currentLetter = letter;
    dialogTitle.textContent = letter.title;
    dialogMeta.textContent = [letter.author, letter.date].filter(Boolean).join(' · ');
    letterImage.src = letter.imageUrl;
    letterImage.alt = letter.imageAlt;
    fullImageLink.href = letter.imageUrl;
    letterText.textContent = letter.text;
    stopSpeech();

    if (!('speechSynthesis' in window)) {
      speakButton.disabled = true;
      speechStatus.textContent = 'La lettura vocale non è supportata da questo browser.';
    } else {
      speakButton.disabled = false;
    }

    dialog.showModal();
    dialogClose.focus();
  } catch (error) {
    window.alert(error.message);
  } finally {
    triggerButton.classList.remove('is-opening');
  }
}

speakButton.addEventListener('click', () => {
  if (!currentLetter || !('speechSynthesis' in window)) return;

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setSpeechControls('speaking');
    speechStatus.textContent = 'Lettura ripresa.';
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(currentLetter.text);
  currentUtterance.lang = 'it-IT';
  currentUtterance.rate = Number(speechRate.value);
  currentUtterance.pitch = 1;
  if (italianVoice) currentUtterance.voice = italianVoice;

  currentUtterance.addEventListener('start', () => {
    setSpeechControls('speaking');
    speechStatus.textContent = italianVoice
      ? `Sto leggendo con la voce ${italianVoice.name}.`
      : 'Sto leggendo la lettera.';
  });

  currentUtterance.addEventListener('end', () => {
    currentUtterance = null;
    setSpeechControls('idle');
    speechStatus.textContent = 'Lettura terminata.';
  });

  currentUtterance.addEventListener('error', (event) => {
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    currentUtterance = null;
    setSpeechControls('idle');
    speechStatus.textContent = 'Non sono riuscita a leggere il testo. Riprova.';
  });

  window.speechSynthesis.speak(currentUtterance);
});

pauseButton.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) return;

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setSpeechControls('speaking');
    speechStatus.textContent = 'Lettura ripresa.';
  } else if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    setSpeechControls('paused');
    speechStatus.textContent = 'Lettura in pausa.';
  }
});

stopButton.addEventListener('click', stopSpeech);

speechRate.addEventListener('change', () => {
  if (window.speechSynthesis?.speaking || window.speechSynthesis?.paused) {
    stopSpeech();
    speechStatus.textContent = 'Velocità cambiata. Premi di nuovo “Leggi la lettera”.';
  }
});

dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', stopSpeech);
dialog.addEventListener('cancel', stopSpeech);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

function applyReadingMode(enabled) {
  document.body.classList.toggle('reading-mode', enabled);
  readingModeButton.setAttribute('aria-pressed', String(enabled));
  readingModeButton.classList.toggle('is-active', enabled);
  localStorage.setItem('ricordi-reading-mode', enabled ? 'on' : 'off');
}

readingModeButton.addEventListener('click', () => {
  applyReadingMode(!document.body.classList.contains('reading-mode'));
});

logoutButton.addEventListener('click', async () => {
  stopSpeech();
  await fetch('/api/logout', { method: 'POST' }).catch(() => null);
  window.location.assign('/login');
});

if ('speechSynthesis' in window) {
  selectItalianVoice();
  window.speechSynthesis.addEventListener('voiceschanged', selectItalianVoice);
}

applyReadingMode(localStorage.getItem('ricordi-reading-mode') === 'on');
loadLetters();
loadPhotoGroups();
