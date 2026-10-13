let cleanup;

function onLoad() {
  cleanup?.();
  const marked = new Set();
  const pages = new Set();
  const observed = new Set();
  let frame = 0;

  function update() {
    frame = 0;
    const nextObserved = new Set();
    const nextMarked = new Set();
    const nextPages = new Set();
    const nav = document.querySelector('.cove-navbar');
    const navStyle = nav && getComputedStyle(nav);
    const navHeight = nav && ['sticky', 'fixed'].includes(navStyle.position)
      ? nav.getBoundingClientRect().height + (parseFloat(navStyle.top) || 0) : 0;
    if (nav) nextObserved.add(nav);

    for (const page of document.querySelectorAll('.list-page')) {
      const toolbar = page.querySelector(':scope > .list-page-toolbar');
      if (!toolbar) continue;
      nextPages.add(page);
      page.style.setProperty('--sticky-action-bar-nav', `${navHeight}px`);
      page.style.setProperty('--sticky-action-bar-height', `${toolbar.getBoundingClientRect().height}px`);
      toolbar.setAttribute('data-sticky-action-bar', 'toolbar');
      nextMarked.add(toolbar);
      nextObserved.add(toolbar);
      // Cove's selection row currently has no semantic class. Match only the
      // direct child with the complete distinguishing selection-row classes.
      const selection = Array.from(page.children).find(node =>
        ['grid', 'grid-cols-1', 'items-center', 'bg-card/80', 'sm:grid-cols-[1fr_auto_1fr]']
          .every(name => node.classList.contains(name)));
      if (selection) {
        selection.setAttribute('data-sticky-action-bar', 'selection');
        nextMarked.add(selection);
      }
    }

    for (const node of marked) if (!nextMarked.has(node)) node.removeAttribute('data-sticky-action-bar');
    for (const page of pages) if (!nextPages.has(page)) clearPage(page);
    for (const node of observed) if (!nextObserved.has(node)) resize.unobserve(node);
    for (const node of nextObserved) if (!observed.has(node)) resize.observe(node);
    marked.clear(); nextMarked.forEach(node => marked.add(node));
    pages.clear(); nextPages.forEach(page => pages.add(page));
    observed.clear(); nextObserved.forEach(node => observed.add(node));
  }

  function clearPage(page) {
    page.style.removeProperty('--sticky-action-bar-nav');
    page.style.removeProperty('--sticky-action-bar-height');
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  const resize = new ResizeObserver(schedule);
  const mutations = new MutationObserver(schedule);
  // Avoid observing our own style/attribute writes. Class changes cover host
  // layout changes; child changes cover selections and SPA navigation.
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', schedule);
  update();
  cleanup = () => {
    mutations.disconnect();
    resize.disconnect();
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
    marked.forEach(node => node.removeAttribute('data-sticky-action-bar'));
    pages.forEach(clearPage);
    cleanup = undefined;
  };
}

export default { onLoad, onUnload() { cleanup?.(); } };
