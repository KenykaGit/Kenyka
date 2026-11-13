// No dependencies: Node 22+ and an installed Chromium browser.
// CHROME_PATH may override the default Windows Chrome executable.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { readFile, mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

(async () => {
  const artifacts = await mkdtemp(path.join(tmpdir(), 'portfolio-themes-'));
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      response.end(data);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--remote-debugging-port=0', '--no-first-run', '--disable-gpu',
    `--user-data-dir=${path.join(artifacts, 'profile')}`, 'about:blank'
  ], { windowsHide: true });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000);
      let output = '';
      chrome.stderr.on('data', data => {
        output += data;
        const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.on('error', error => { clearTimeout(timer); reject(error); });
      chrome.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited: ${code}`)); });
    });
    const tabs = await (await fetch(`http://127.0.0.1:${new URL(endpoint).port}/json`)).json();
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let id = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      if (!pending.has(message.id)) return;
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    });
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 15000);
        pending.set(requestId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function navigate(url = base) {
      await evaluate('window.__themeTestDocumentReady = false');
      const navigation = await send('Page.navigate', { url });
      if (!navigation.loaderId) await send('Page.reload');
      for (let attempt = 0; attempt < 100; attempt++) {
        await delay(50);
        if (await evaluate(`window.__themeTestDocumentReady && !!document.querySelector('.theme-trigger')`)) break;
      }
      assert.ok(await evaluate(`!!document.querySelector('.theme-trigger')`), 'Theme picker initialized');
      await delay(850);
    }
    async function choose(theme) {
      await evaluate(`if (document.documentElement.dataset.theme !== '${theme}') document.querySelector('.theme-trigger').click()`);
      await delay(850);
      assert.equal(await evaluate('document.documentElement.dataset.theme'), theme);
    }
    async function key(key, code = key, extra = {}) {
      const keyCodes = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35 };
      const params = { key, code, windowsVirtualKeyCode: keyCodes[key], ...extra };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params, ...(key === 'Enter' ? { text: '\r' } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
    }
    async function screenshot(name) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(path.join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
    }
    async function swipe(direction) {
      const { x, y } = await evaluate('({x: innerWidth / 2, y: innerHeight * .65})');
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - direction * step * 15 }] });
        await delay(20);
      }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await delay(850);
    }
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__themeTestDocumentReady = true;
      const observer = new MutationObserver(() => {
        if (document.querySelector('link[rel="stylesheet"]')) {
          window.themeAtStyles = document.documentElement.dataset.theme;
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    ` });
    await navigate();
    if (process.argv.includes('--geometry')) {
      for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await delay(250);
        for (let slide = 0; slide < 3; slide++) {
          await evaluate(`goTo(${slide}, true)`);
          await delay(1200);
          const changed = await evaluate(`(async () => {
            const elements = [...document.querySelectorAll('header, nav, .theme-trigger, .slide.active .screen-body, .slide.active .hero-heading, .slide.active .hero-avatar, .slide.active h1, .slide.active h2, .slide.active .socials, .slide.active .discord-card, .slide.active .achievement-card, .slide.active .project-card')];
            const snapshot = () => elements.map(el => { const r = el.getBoundingClientRect(); return { name: el.className, x: r.x, y: r.y, width: r.width, height: r.height }; });
            const before = snapshot();
            document.querySelector('.theme-trigger').click();
            await new Promise(resolve => setTimeout(resolve, 900));
            return snapshot().flatMap((rect, i) => ['x','y','width','height'].filter(key => Math.abs(rect[key] - before[i][key]) > .5).map(key => ({ name: rect.name, key, before: before[i][key], after: rect[key] })));
          })()`);
          assert.deepEqual(changed, [], `${width} slide ${slide}: switching themes must preserve geometry`);
        }
      }
      assert.ok(await evaluate(`(async () => {
        const before = document.documentElement.dataset.theme;
        for (let i = 0; i < 8; i++) {
          document.querySelector('.theme-trigger').click();
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        await new Promise(resolve => setTimeout(resolve, 900));
        return document.documentElement.dataset.theme === before &&
          localStorage.getItem('kenyka-theme') === before &&
          !document.querySelector('.theme-menu') &&
          [...document.querySelectorAll('.screen-body, .project-content')].every(el => getComputedStyle(el).scrollbarWidth === 'none');
      })()`), 'Rapid toggles preserve the selection and do not introduce scrollbars');
      console.log('PASS theme toggle preserves geometry on desktop and mobile');
      return;
    }
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark', 'Default remains Dark');
    await evaluate(`goTo(1, true); document.querySelector('#sayte-trigger').click()`);
    await choose('claude');
    assert.equal(await evaluate('location.hash'), '#achievements');
    assert.equal(await evaluate(`document.querySelector('#sayte-trigger').getAttribute('aria-expanded')`), 'true');
    assert.equal(await evaluate(`getComputedStyle(document.body).backgroundColor`), 'rgb(250, 249, 246)');
    assert.equal(await evaluate(`document.querySelector('meta[name="theme-color"]').content`), '#FAF9F6');
    await navigate(base + '/#achievements');
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'claude', 'Choice survives reload');
    assert.equal(await evaluate('window.themeAtStyles'), 'claude', 'Theme restored before styles load');

    await evaluate(`document.querySelector('.theme-trigger').focus()`);
    await key('Enter');
    await delay(850);
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark', 'Enter toggles the theme directly');
    await key('Enter');
    await delay(850);
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'claude');
    assert.equal(await evaluate('location.hash'), '#achievements');
    assert.ok(await evaluate(`document.activeElement.matches('.theme-trigger') && !document.querySelector('.theme-menu')`));
    console.log('PASS one-click toggle, persistence, keyboard and section state');

    for (const theme of (process.argv.includes('--claude-only') ? ['claude'] : ['dark', 'claude'])) {
      await choose(theme);
      // 720x450 also exercises the effective viewport of 1440x900 at 200% zoom.
      for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568], [720, 450]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await delay(300);
        await evaluate(`goTo(0, true)`);
        await delay(1200);
        assert.ok(await evaluate(`(() => {
          const trigger = document.querySelector('.theme-trigger').getBoundingClientRect();
          const nav = document.querySelector('nav').getBoundingClientRect();
          const logo = document.querySelector('.logo').getBoundingClientRect();
          return trigger.width >= 44 && trigger.height >= 44 && trigger.right <= innerWidth && nav.right <= trigger.left && logo.right <= nav.left;
        })()`), `${theme} ${width}: header fits`);
        assert.ok(await evaluate(`!document.querySelector('.theme-menu') && !document.querySelector('.theme-current')`));
        assert.ok(await evaluate(`[...document.querySelectorAll('.screen-body, .project-content')].every(el => getComputedStyle(el).scrollbarWidth === 'none')`), 'No visible scrollbars');
        await screenshot(`${theme}-${width}-home`);
        await evaluate(`goTo(1, true); activateProdProject(null); fitScreens()`);
        await delay(1200);
        const before = await evaluate(`[...document.querySelectorAll('.achievement-card')].map(el => el.getBoundingClientRect().toJSON())`);
        await evaluate(`document.querySelector('#sayte-trigger').click()`);
        await delay(550);
        const after = await evaluate(`[...document.querySelectorAll('.achievement-card')].map(el => el.getBoundingClientRect().toJSON())`);
        after.forEach((rect, index) => Object.keys(rect).forEach(key => {
          assert.ok(Math.abs(rect[key] - before[index][key]) < 1, `${theme} ${width}: accordion preserves card ${index} ${key}: ${before[index][key]} -> ${rect[key]}`);
        }));
        await screenshot(`${theme}-${width}-achievements`);
        await evaluate(`goTo(2, true)`);
        await delay(300);
        await screenshot(`${theme}-${width}-projects-initial`);
        for (const row of ['apps', 'opensource']) {
          const count = await evaluate(`document.querySelectorAll('#${row} .project-card').length`);
          for (let i = 0; i < count; i++) {
            await evaluate(`document.querySelectorAll('#${row} .project-card')[${i}].click()`);
            await delay(800);
            const projectState = await evaluate(`(() => {
              const card = document.querySelector('#${row} .project-card.active');
              const content = card.querySelector('.project-content');
              const link = card.querySelector('.project-link');
              link.focus();
              const box = card.getBoundingClientRect(), bounds = link.getBoundingClientRect();
              return { fits: bounds.width > 0 && bounds.bottom <= box.bottom + 1 && bounds.right <= box.right + 1 && content.scrollWidth <= content.clientWidth + 1, box: box.toJSON(), link: bounds.toJSON(), scrollWidth: content.scrollWidth, clientWidth: content.clientWidth };
            })()`);
            assert.ok(projectState.fits, `${theme} ${width}: ${row}[${i}] link accessible: ${JSON.stringify(projectState)}`);
          }
        }
        await screenshot(`${theme}-${width}-projects`);
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal page overflow');
        console.log(`PASS ${theme} ${width}x${height}: toggle, accordion and every project`);
      }
    }
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const theme of ['dark', 'claude']) {
      await choose(theme);
      await evaluate(`goTo(0, true); document.querySelector('#home .screen-body').scrollTop = 10000`);
      await delay(850);
      await swipe(1);
      assert.equal(await evaluate('location.hash'), '#achievements', `${theme}: swipe advances at content boundary`);
      await evaluate(`document.querySelector('#achievements .screen-body').scrollTop = 0`);
      await delay(850);
      await swipe(-1);
      assert.equal(await evaluate('location.hash'), '#home', `${theme}: swipe returns to home`);
    }
    console.log('PASS touch navigation and scroll boundaries in both themes');
    await choose('claude');
    const contrast = await evaluate(`(() => {
      const styles = getComputedStyle(document.documentElement);
      const luminance = token => {
        const hex = styles.getPropertyValue(token).trim().slice(1);
        const channels = hex.match(/../g).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      return [['--text', '--bg'], ['--text-secondary', '--surface-muted'], ['--text', '--accent-soft'], ['--focus', '--surface-muted']].map(([fg,bg]) => {
        const a = luminance(fg), b = luminance(bg);
        return { fg, bg, ratio: (Math.max(a,b) + .05) / (Math.min(a,b) + .05) };
      });
    })()`);
    contrast.forEach(pair => assert.ok(pair.ratio >= 4.5, `Contrast ${pair.fg}/${pair.bg}: ${pair.ratio}`));
    console.log('PASS Claude text and button contrast >= 4.5:1');
    await navigate(base + '/404.html');
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'claude', '404 inherits theme');
    await screenshot('claude-404');
    await choose('dark');
    await navigate();
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark', '404 choice applies to home');
    await evaluate(`localStorage.setItem('kenyka-theme', 'invalid')`);
    await navigate();
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');

    const blocked = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });` });
    await navigate();
    await choose('claude');
    assert.equal(await evaluate('document.documentElement.dataset.theme'), 'claude', 'Works with blocked storage');
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blocked.identifier });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.track')).transitionDuration) < .001`));
    assert.deepEqual(errors, [], 'No uncaught JavaScript errors');
    console.log(`PASS 404, invalid/blocked storage and reduced motion\nScreenshots: ${artifacts}`);
  } finally {
    socket?.close();
    chrome.kill();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
