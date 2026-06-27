/* =========================================================
   Password gates (English side + Bulgarian side)

   Passwords are caps + a two-digit number (e.g. WORD42WORD).
   Entry is case-insensitive — input is normalised to uppercase
   before hashing. Only the SHA-256 hash is stored here, never the
   plaintext.

   NOTE: this is a client-side gate for a static PWA. It keeps casual
   visitors out; it is not a hardened secret (the hashes ship in the
   source). To rotate a password, hash the new value and replace the
   matching entry below:
     node -e "console.log(require('crypto').createHash('sha256')
       .update('NEWPASS'.toUpperCase()).digest('hex'))"
   ========================================================= */

const HASHES = {
  en: 'fba30da3a31592e4dc4d36332d8d234c1c01d66a67396b36ee6be7e853906946', // English side
  bg: 'a7253649957f9947ced080c343f353643603b9f393d785a2ff198e4c1896824f', // Bulgarian side
};

const sessionKey = side => `afl.auth.${side}`;

export function isUnlocked(side) {
  try { return sessionStorage.getItem(sessionKey(side)) === '1'; }
  catch { return false; }
}

function unlock(side) {
  try { sessionStorage.setItem(sessionKey(side), '1'); } catch { /**/ }
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verify(side, input) {
  const hex = await sha256Hex((input || '').trim().toUpperCase());
  return hex === HASHES[side];
}

const COPY = {
  en: {
    eyebrow: 'English Access',
    title: 'Hammond Park Blue',
    hint: 'Enter the password to continue.',
    placeholder: 'Password',
    submit: 'Unlock',
    error: 'Incorrect password. Try again.',
    back: 'Back',
  },
  bg: {
    eyebrow: 'Семеен достъп',
    title: 'Hammond Park Blue',
    hint: 'Въведете паролата, за да продължите.',
    placeholder: 'Парола',
    submit: 'Отключи',
    error: 'Грешна парола. Опитайте отново.',
    back: 'Назад',
  },
};

export function renderLock(side, onSuccess) {
  const app = document.getElementById('app');
  const t = COPY[side];
  app.innerHTML = `
    <div class="lock-screen">
      <div class="lock-card">
        <div class="lock-icon" aria-hidden="true">🔒</div>
        <div class="lock-eyebrow">${t.eyebrow}</div>
        <h1 class="lock-title">${t.title}</h1>
        <p class="lock-hint">${t.hint}</p>
        <form class="lock-form" id="lock-form" autocomplete="off">
          <input class="lock-input" id="lock-input" type="password" inputmode="text"
                 placeholder="${t.placeholder}" aria-label="${t.placeholder}"
                 autocapitalize="characters" autocorrect="off" autocomplete="off" spellcheck="false" />
          <div class="lock-error" id="lock-error" role="alert" hidden>${t.error}</div>
          <button class="lock-submit" type="submit">${t.submit}</button>
        </form>
        <button class="lock-back" id="lock-back" type="button">‹ ${t.back}</button>
      </div>
    </div>`;

  const form  = document.getElementById('lock-form');
  const input = document.getElementById('lock-input');
  const error = document.getElementById('lock-error');

  setTimeout(() => input.focus(), 50);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (await verify(side, input.value)) {
      unlock(side);
      onSuccess();
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
      try { navigator.vibrate?.(60); } catch { /**/ }
    }
  });

  document.getElementById('lock-back').addEventListener('click', () => {
    window.location.hash = '#/';
  });
}
