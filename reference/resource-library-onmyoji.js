(() => {
  const requestedGame = new URL(window.location.href).searchParams.get('game');

  const yinCard = () => `
    <article class="official-group game-阴" data-onmyoji-official>
      <header><span class="official-mark">阴</span><div><p>网易《阴阳师》官方入口</p><h3>阴阳师</h3></div><strong>01</strong></header>
      <div class="official-routes">
        <a href="https://yys.163.com/" target="_blank" rel="noopener noreferrer"><span class="route-index">01</span><span><strong>阴阳师官网</strong><small>官方角色、版本与公告入口</small></span><em>官方</em><b aria-hidden="true">↗</b></a>
      </div>
    </article>`;

  function activeGame() {
    return document.querySelector('.game-filter.is-active')?.dataset.game || 'all';
  }

  function queryMatches() {
    const query = (document.querySelector('#sourceSearch')?.value || '').trim().toLocaleLowerCase('zh-CN');
    if (!query) return true;
    return ['阴阳师', '网易', '官网', '官方', '公告', '式神', 'yys'].some((term) => term.includes(query) || query.includes(term));
  }

  function syncOnmyojiOfficial() {
    const grid = document.querySelector('#officialGrid');
    if (!grid) return;

    const game = activeGame();
    const shouldShow = (game === 'all' || game === '阴') && queryMatches();
    const existing = grid.querySelector('[data-onmyoji-official]');

    if (shouldShow && !existing) grid.insertAdjacentHTML('beforeend', yinCard());
    if (!shouldShow && existing) existing.remove();

    const empty = document.querySelector('#officialEmpty');
    if (empty && game === '阴') empty.hidden = shouldShow;
  }

  function updateCounts() {
    document.querySelector('[data-view="official"] strong')?.replaceChildren(document.createTextNode('27'));
    const officialStamp = document.querySelector('#officialPanel .official-stamp b');
    if (officialStamp) officialStamp.textContent = '27';
    const consoleCount = document.querySelector('.console-grid > div:nth-child(2) strong');
    if (consoleCount) consoleCount.textContent = '27';
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateCounts();

    document.querySelectorAll('.game-filter, .view-switch').forEach((button) => {
      button.addEventListener('click', () => queueMicrotask(syncOnmyojiOfficial));
    });
    document.querySelector('#sourceSearch')?.addEventListener('input', () => queueMicrotask(syncOnmyojiOfficial));

    const grid = document.querySelector('#officialGrid');
    if (grid) {
      new MutationObserver(() => queueMicrotask(syncOnmyojiOfficial))
        .observe(grid, { childList: true });
    }

    if (requestedGame === '阴') {
      document.querySelector('.game-filter[data-game="阴"]')?.click();
    } else {
      syncOnmyojiOfficial();
    }
  });
})();
