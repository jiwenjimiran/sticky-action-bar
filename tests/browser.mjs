import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const css = await readFile(new URL('../frontend/sticky-action-bar.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../frontend/sticky-action-bar.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(`<style>
    * { box-sizing:border-box; } body { margin:0; font:14px sans-serif; --color-surface:#eee; --color-card:#ddd; }
    .cove-navbar { position:sticky; top:0; z-index:50; height:48px; background:#333; color:white; }
    main { padding:20px 24px; } .list-page-toolbar { margin:4px; padding:12px; display:flex; align-items:center; gap:8px; border:1px solid #888; }
    .list-page-title-group { flex:1; } button { padding:8px; } .selection { margin:4px; padding:8px; border:1px solid #888; }
    .items { height:3000px; background:linear-gradient(#eee,#aaa); padding:12px; }
    .modal { position:fixed; inset:100px; z-index:100; background:white; }
    @media(max-width:600px) { .list-page-toolbar { flex-wrap:wrap; } .list-page-title-group { flex-basis:100%; } }
  </style><nav class="cove-navbar">Cove navigation</nav><main>
    <div class="list-page"><div class="list-page-toolbar"><div class="list-page-title-group">Videos · 100 items</div><button id="filter">Filters</button><button>Sort</button></div>
    <div id="chips">Active filters</div><div class="items"><button id="select" style="margin-top:1000px">Select item</button></div></div>
    <div id="unrelated">Outside the list</div></main>`);
  await page.addStyleTag({ content: css });
  await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    window.extension = (await import(url)).default;
    URL.revokeObjectURL(url);
    window.extension.onLoad();
    document.querySelector('#filter').onclick = () => {
      const modal = document.createElement('div'); modal.className = 'modal'; modal.textContent = 'Filter dialog'; document.body.append(modal);
    };
    document.querySelector('#select').onclick = () => {
      const row = document.createElement('div');
      row.className = 'selection grid grid-cols-1 items-center bg-card/80 sm:grid-cols-[1fr_auto_1fr]';
      row.innerHTML = '1 selected <button id="bulk">Bulk edit</button>';
      document.querySelector('.list-page').insertBefore(row, document.querySelector('.items'));
      document.querySelector('#bulk').onclick = () => { window.bulkClicked = true; };
    };
  }, js);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const bounds = selector => page.locator(selector).evaluate(node => ({ top: node.getBoundingClientRect().top, height: node.getBoundingClientRect().height }));
  const checkSticky = async () => {
    await settle();
    const nav = await bounds('.cove-navbar');
    const toolbar = await bounds('.list-page-toolbar');
    assert.ok(Math.abs(toolbar.top - nav.height) < 1, 'toolbar stays below navigation');
    if (await page.locator('.selection').count()) {
      const selection = await bounds('.selection');
      assert.ok(Math.abs(selection.top - nav.height - toolbar.height - 4) < 1, 'actions stay below toolbar');
    }
  };
  await page.evaluate(() => window.scrollTo(0, 900));
  await checkSticky();
  await page.locator('#select').click();
  await page.waitForSelector('[data-sticky-action-bar="selection"]');
  await checkSticky();
  await page.locator('#bulk').click();
  assert.equal(await page.evaluate(() => window.bulkClicked), true);
  await page.locator('#filter').click();
  assert.equal(await page.locator('.modal').evaluate(n => document.elementFromPoint(150, 150) === n), true, 'dialog above sticky controls');
  await page.locator('.modal').evaluate(n => n.remove());
  for (const width of [390, 768, 1200]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 1300));
    await checkSticky();
  }
  await page.locator('.cove-navbar').evaluate(n => { n.style.height = '96px'; });
  await settle(); await checkSticky();
  await page.locator('.list-page-title-group').evaluate(n => { n.style.minHeight = '150px'; });
  await settle(); await checkSticky();
  assert.equal(await page.locator('#chips').evaluate(n => getComputedStyle(n).position), 'static');
  assert.equal(await page.locator('#unrelated').evaluate(n => getComputedStyle(n).position), 'static');
  // Simulate SPA navigation to a newly mounted list, retaining detached nodes
  // to verify their extension-owned attributes and variables are removed.
  await page.evaluate(() => {
    window.oldList = document.querySelector('.list-page');
    const next = window.oldList.cloneNode(true);
    next.querySelectorAll('[data-sticky-action-bar]').forEach(n => n.removeAttribute('data-sticky-action-bar'));
    next.removeAttribute('style');
    window.oldList.replaceWith(next);
  });
  await settle(); await checkSticky();
  assert.equal(await page.evaluate(() => window.oldList.querySelectorAll('[data-sticky-action-bar]').length), 0);
  assert.equal(await page.evaluate(() => window.oldList.style.getPropertyValue('--sticky-action-bar-nav')), '');
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await page.screenshot({ path: new URL('../artifacts/browser-preview.png', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '') });
  await page.evaluate(() => window.extension.onUnload());
  assert.equal(await page.locator('[data-sticky-action-bar]').count(), 0);
  assert.equal(await page.locator('.list-page-toolbar').evaluate(n => getComputedStyle(n).position), 'static');
  assert.ok((await bounds('.list-page-toolbar')).top < 0, 'normal scrolling restored');
  await page.evaluate(() => { window.extension.onLoad(); window.extension.onLoad(); });
  await checkSticky();
  await page.evaluate(() => { window.extension.onUnload(); window.extension.onUnload(); });
  assert.deepEqual(errors, []);
  console.log('Passed: sticky filters/title/actions, selection while scrolled, clicks/dialog layering, mobile/tablet/desktop, dynamic heights, SPA navigation, unload and re-enable.');
} finally { await browser.close(); }
