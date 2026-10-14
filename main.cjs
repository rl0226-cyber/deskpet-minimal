'use strict';
// Minimal main process: small transparent window + global cursor polling + config + chat proxy.
// No bundler, no store class: config is one JSON file in the project folder.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = __dirname;
// 打包后 asar 只读：配置改存用户数据目录（%APPDATA%/DeskPet）；开发时仍用项目目录的 config.json
const CONFIG_PATH = app.isPackaged
  ? path.join(app.getPath('userData'), 'config.json')
  : path.join(ROOT, 'config.json');
const DEFAULT_CONFIG = {
  modelPath: 'models/haru/haru_greeter_t03.model3.json',
  chat: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', systemPrompt: 'You are a small desktop companion. Reply briefly, in the user\'s language.' },
};

function loadConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; }
  catch { return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); }
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }

const isSelftest = process.argv.some((a) => a.startsWith('--selftest'));
let win = null;
let config = loadConfig();

function createWindow() {
  win = new BrowserWindow({
    width: 420, height: 700,
    transparent: true, frame: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: false,
    show: !isSelftest, // selftest runs offscreen and screenshots instead
    webPreferences: { webSecurity: false, preload: path.join(ROOT, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.on('console-message', (_e, level, msg, line, src) => console.log(`[renderer:${level}] ${msg} (${src}:${line})`));
  win.loadFile(path.join(ROOT, 'renderer', 'index.html'));
  if (isSelftest) win.webContents.on('did-finish-load', () => setTimeout(runSelftest, 1500));
  // Poll the global cursor so gaze follows the mouse even outside our small window.
  // Skip in selftest: synthetic cursor from the harness must not fight the real one.
  if (!isSelftest) setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    win.webContents.send('cursor', { x: cursor.x, y: cursor.y, winX: bounds.x, winY: bounds.y, winW: bounds.width, winH: bounds.height });
  }, 33);
}

// Selftest: move the OS cursor is not possible headlessly, so feed fake cursor
// positions through the same 'cursor' channel and read back Live2D params.
async function runSelftest() {
  const wc = win.webContents;
  const read = (js) => wc.executeJavaScript(js, true).catch((e) => ({ error: String(e) }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2000);
  await read(`window.__testGaze(-1, 0)`);
  await sleep(800);
  const left = await read(`window.__getGaze()`);
  await read(`window.__testGaze(1, 0)`);
  await sleep(800);
  const right = await read(`window.__getGaze()`);
  const shot = await wc.capturePage();
  fs.writeFileSync(path.join(ROOT, 'selftest.png'), shot.toPNG());
  // eslint-disable-next-line no-console
  console.log('[selftest] left', JSON.stringify(left), 'right', JSON.stringify(right));
  const ok = left && right && (right.eyeX - left.eyeX) > 0.3 && (right.headX - left.headX) > 2;
  // eslint-disable-next-line no-console
  console.log(`[selftest] GAZE ${ok ? 'PASS' : 'FAIL'} — eyeX ${left?.eyeX} -> ${right?.eyeX}, headX ${left?.headX} -> ${right?.headX}`);
  app.quit();
}

app.whenReady().then(() => {
  ipcMain.handle('config:get', () => config);
  ipcMain.handle('config:save', (_e, next) => { config = { ...config, ...next }; saveConfig(config); return config; });
  ipcMain.handle('chat', async (_e, messages) => {
    const { baseUrl, apiKey, model, systemPrompt } = config.chat;
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages] }),
    });
    if (!res.ok) throw new Error(`Chat API ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '(empty reply)';
  });
  ipcMain.on('window:drag', (_e, { dx, dy }) => { if (win) win.setPosition(win.getPosition()[0] + dx, win.getPosition()[1] + dy); });
  ipcMain.on('window:hide', () => win?.hide());
  ipcMain.on('window:show', () => win?.show());
  ipcMain.on('window:quit', () => app.quit());
  ipcMain.on('tray:show', () => win?.show());
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
