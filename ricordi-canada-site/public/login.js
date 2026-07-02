'use strict';

const form = document.querySelector('#login-form');
const input = document.querySelector('#access-code');
const message = document.querySelector('#login-message');
const button = document.querySelector('#login-button');

function formatDateCode(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));

  return parts.join('/');
}

input.addEventListener('input', () => {
  input.value = formatDateCode(input.value);
  message.textContent = '';
  message.classList.remove('is-error', 'is-success');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = input.value.trim();

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(code)) {
    message.textContent = 'Inserisci la data completa nel formato GG/MM/AAAA.';
    message.classList.add('is-error');
    input.focus();
    return;
  }

  button.disabled = true;
  button.classList.add('is-loading');
  message.textContent = 'Controllo il codice…';
  message.classList.remove('is-error', 'is-success');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Non è stato possibile effettuare l’accesso.');
    }

    message.textContent = 'Codice corretto. Apro i ricordi…';
    message.classList.add('is-success');
    window.location.assign(data.redirect || '/ricordi');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
    input.select();
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
  }
});
