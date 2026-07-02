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

let currentLetter = null;
let currentUtterance = null;
let italianVoice = null;

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
