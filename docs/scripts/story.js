export async function renderStory(lang, id) {
  const app  = document.getElementById('app');
  const isEn = lang === 'en';
  const back = `#/${lang}`;

  app.innerHTML = `
    <div class="story-screen">
      <header class="screen-header">
        <button class="back-btn" id="story-back" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">Hammond Park Blue</div>
          <h1 class="screen-header__title">${isEn ? 'Season Story' : 'Историята на сезона'}</h1>
        </div>
        <div style="width:40px"></div>
      </header>
      <div class="story-body" id="story-body">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;

  document.getElementById('story-back').addEventListener('click', () => {
    window.location.hash = back;
  });

  const body = document.getElementById('story-body');

  let data;
  try {
    const resp = await fetch('./data/stories/2026.json');
    if (!resp.ok) throw new Error(resp.statusText);
    data = await resp.json();
  } catch {
    body.innerHTML = `<div class="story-empty">${isEn ? 'Story not available.' : 'Историята не е налична.'}</div>`;
    return;
  }

  let entry = null;
  if (id === 'prologue') {
    entry = data.prologue;
  } else {
    const rnd = parseInt(id, 10);
    if (!isNaN(rnd)) entry = data.rounds?.find(r => r.round === rnd) ?? null;
  }

  if (!entry) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'This chapter is coming soon.' : 'Тази глава предстои.'}</div>`;
    return;
  }

  const paragraphs = entry.body
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('');

  body.innerHTML = `
    <div class="story-content">
      <h2 class="story-title">${entry.title}</h2>
      <div class="story-text">${paragraphs}</div>
    </div>`;
}
