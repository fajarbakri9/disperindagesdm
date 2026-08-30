/** Browser acceptance check using an existing Chrome DevTools endpoint. */

const endpoint = process.env.CDP_HTTP || 'http://127.0.0.1:9223';
const targetUrl = process.argv[2] || 'https://disperindagesdm-pinrang.web.app/media-intelligence';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let targets;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.length) break;
  } catch (_) {}
  await sleep(250);
}
const pageTarget = targets?.find((target) => target.type === 'page' &&
  !target.url.startsWith('chrome-extension://'));
if (!pageTarget) throw new Error('Target halaman Chrome DevTools tidak tersedia.');

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    browserErrors.push(`exception: ${message.params.exceptionDetails.text}`);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    browserErrors.push(`console: ${message.params.args.map((arg) => arg.value || arg.description || '').join(' ')}`);
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    browserErrors.push(`log: ${message.params.entry.text}`);
  }
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await Promise.all([
  send('Page.enable'), send('Runtime.enable'), send('Log.enable'), send('Network.enable'),
]);
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
});
await send('Page.navigate', { url: targetUrl });
await sleep(8000);

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

const light = await evaluate(`(() => ({
  width: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  theme: document.documentElement.getAttribute('data-theme'),
  status: document.getElementById('systemFreshnessPill')?.innerText || '',
  mentions: document.getElementById('statMentions')?.innerText || '',
  cards: document.querySelectorAll('.news-card').length,
  ready: document.readyState,
  url: location.href,
  title: document.title,
  scripts: document.scripts.length,
  themeToggle: typeof window.toggleTheme
}))()`);
const toggleAvailable = light.themeToggle === 'function';
if (toggleAvailable) await evaluate('window.toggleTheme(); true');
else await evaluate("document.documentElement.setAttribute('data-theme', 'dark'); true");
await sleep(300);
const dark = await evaluate(`(() => ({
  theme: document.documentElement.getAttribute('data-theme'),
  background: getComputedStyle(document.body).backgroundColor,
  foreground: getComputedStyle(document.body).color
}))()`);

const checks = {
  page_complete: light.ready === 'complete',
  mobile_width: light.width === 390,
  no_horizontal_overflow: light.scrollWidth <= light.width + 1,
  live_snapshot_rendered: light.mentions !== '' && !['—', 'â€”'].includes(light.mentions) && light.cards > 0,
  status_visible: Boolean(light.status),
  theme_toggle_function: toggleAvailable,
  dark_mode_active: dark.theme === 'dark',
  dark_colors_applied: Boolean(dark.background) && Boolean(dark.foreground),
  no_console_or_runtime_error: browserErrors.length === 0,
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({ decision: failed.length ? 'FAIL' : 'PASS', checks, light, dark,
  browser_errors: browserErrors, failed }, null, 2));
socket.close();
process.exitCode = failed.length ? 1 : 0;
