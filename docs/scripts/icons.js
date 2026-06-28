/* =========================================================
   Thin-line icon set — telemetry / architectural style.
   No fills, currentColor stroke, round caps. 24x24 grid.
   Use: icon('mark') -> inline <svg> string.
   ========================================================= */

const P = {
  // AFL scoring — goal = two tall posts, behind = tall + short post
  goal:    '<line x1="9" y1="2.5" x2="9" y2="21.5"/><line x1="15" y1="2.5" x2="15" y2="21.5"/>',
  behind:  '<line x1="9" y1="2.5" x2="9" y2="21.5"/><line x1="15" y1="9.5" x2="15" y2="21.5"/>',
  // Shot attempt — crosshair / target
  shot:    '<circle cx="12" cy="12" r="3.2"/><line x1="12" y1="2.5" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21.5" y2="12"/>',
  // Mark — ball cradled by hands
  mark:    '<circle cx="12" cy="7" r="2.6"/><path d="M5 13c0 4 3.1 6.6 7 6.6s7-2.6 7-6.6"/>',
  // Disposal — outgoing vector from a node
  disposal:'<circle cx="6" cy="18" r="1.7"/><line x1="7.3" y1="16.7" x2="18" y2="6"/><polyline points="12.5,6 18,6 18,11.5"/>',
  // Tackle — two vectors converging
  tackle:  '<polyline points="3,7 8,12 3,17"/><polyline points="21,7 16,12 21,17"/><line x1="8" y1="12" x2="16" y2="12"/>',
  // Mood — telemetry trend lines
  moodUp:  '<polyline points="3,16 9,10 13,13 21,5"/><polyline points="16,5 21,5 21,10"/>',
  moodFlat:'<line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="3.5" y1="7" x2="6.5" y2="7"/><line x1="17.5" y1="17" x2="20.5" y2="17"/>',
  moodDown:'<polyline points="3,8 9,14 13,11 21,19"/><polyline points="16,19 21,19 21,14"/>',
  // Identity / player marker
  star:    '<polygon points="12,3 14.5,8.9 21,9.5 16.2,13.8 17.6,20.1 12,16.8 6.4,20.1 7.8,13.8 3,9.5 9.5,8.9"/>',
  // Transport
  play:    '<polygon points="7,4.6 19.4,12 7,19.4"/>',
  pause:   '<line x1="8.5" y1="5" x2="8.5" y2="19"/><line x1="15.5" y1="5" x2="15.5" y2="19"/>',
  // Navigation
  back:    '<polyline points="15,5 8,12 15,19"/>',
  chevron: '<polyline points="9,5 16,12 9,19"/>',
  undo:    '<polyline points="9,7 4,12 9,17"/><path d="M4 12h9.5a5.5 5.5 0 0 1 5.5 5.5V19"/>',
  menu:    '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  close:   '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  lock:    '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  // Menu destinations
  track:   '<polyline points="3,12 7.5,12 10,5 14,19 16.5,12 21,12"/>',
  reports: '<rect x="5" y="3.5" width="14" height="17" rx="2.2"/><line x1="8.5" y1="8" x2="15.5" y2="8"/><line x1="8.5" y1="12" x2="15.5" y2="12"/><line x1="8.5" y1="16" x2="13" y2="16"/>',
  fixtures:'<rect x="4" y="5" width="16" height="15" rx="2.2"/><line x1="4" y1="9.5" x2="20" y2="9.5"/><line x1="8.5" y1="3" x2="8.5" y2="6.5"/><line x1="15.5" y1="3" x2="15.5" y2="6.5"/>',
  stories: '<path d="M12 6.6C10.4 5.1 7.6 4.6 4.5 5.1v13c3.1-0.5 5.9 0 7.5 1.5 1.6-1.5 4.4-2 7.5-1.5v-13c-3.1-0.5-5.9 0-7.5 1.5z"/><line x1="12" y1="6.6" x2="12" y2="20.1"/>',
  install: '<line x1="12" y1="3.5" x2="12" y2="14.5"/><polyline points="7.5,10 12,14.5 16.5,10"/><path d="M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17"/>',
};

export function icon(name, cls = '') {
  const body = P[name] || '';
  return `<svg class="icn${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
