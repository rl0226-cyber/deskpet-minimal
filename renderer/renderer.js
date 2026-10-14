// Minimal renderer: two avatar modes.
// - live2d: real gaze (eyes + head follow the global cursor), needs a .model3.json
// - image ("photo mode"): an uploaded flat picture with 2.5D parallax tilt + idle bob.
//   A flat image has no layers/bones, so real eye/head tracking is impossible there —
//   the UI says so instead of faking it.
// Chat goes through main, so the key never lives in the page.
let model = null;
let cfg = null;
const gaze = { curEyeX: 0, curEyeY: 0, curHeadX: 0, curHeadY: 0, tgtEyeX: 0, tgtEyeY: 0, tgtHeadX: 0, tgtHeadY: 0 };
const par = { rx: 0, ry: 0, tx: 0, ty: 0, trx: 0, try: 0, ttx: 0, tty: 0 };
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');
const clamp = (v) => Math.max(-1, Math.min(1, v));

function setParam(id, v) {
  try { model?.internalModel?.coreModel?.setParameterValueById(id, v); } catch { /* model not ready */ }
}
function applyGaze() {
  // One lerp is the whole smoothing model: current chases target at 12% per frame.
  const k = 0.12;
  gaze.curEyeX += (gaze.tgtEyeX - gaze.curEyeX) * k;
  gaze.curEyeY += (gaze.tgtEyeY - gaze.curEyeY) * k;
  gaze.curHeadX += (gaze.tgtHeadX - gaze.curHeadX) * k;
  gaze.curHeadY += (gaze.tgtHeadY - gaze.curHeadY) * k;
  setParam('ParamEyeBallX', gaze.curEyeX);
  setParam('ParamEyeBallY', gaze.curEyeY);
  setParam('ParamAngleX', gaze.curHeadX);
  setParam('ParamAngleY', gaze.curHeadY);
  setParam('ParamBodyAngleX', gaze.curHeadX * 0.25);
}

async function initLive2D() {
  const app = new PIXI.Application({ width: 420, height: 700, transparent: true, autoStart: true });
  $('stage').appendChild(app.view);
  // Model path is relative to the project root; renderer lives in renderer/.
  const url = new URL(`../${cfg.modelPath}`, location.href).href;
  model = await PIXI.live2d.Live2DModel.from(url);
  // Auto-fit: native model canvas is far larger than the character, so scale to window.
  const fit = Math.min(400 / model.width, 680 / model.height);
  model.scale.set(fit);
  model.x = (420 - model.width) / 2;
  model.y = (700 - model.height) / 2;
  app.stage.addChild(model);
  // setInterval, not PIXI ticker: ticker is driven by requestAnimationFrame and
  // stalls when the window is hidden/offscreen; gaze must keep lerping anyway.
  setInterval(applyGaze, 16);

  // Blink: close eyes ~120ms every 4s. No motion files needed.
  setInterval(() => {
    setParam('ParamEyeLOpen', 0); setParam('ParamEyeROpen', 0);
    setTimeout(() => { setParam('ParamEyeLOpen', 1); setParam('ParamEyeROpen', 1); }, 120);
  }, 4000);

  // Global cursor -> gaze target. 600px = full deflection; clamp keeps params in range.
  window.pet.onCursor((pos) => {
    const cx = pos.winX + pos.winW / 2, cy = pos.winY + 260; // pet head anchor
    const dx = clamp((pos.x - cx) / 600), dy = clamp((pos.y - cy) / 600);
    gaze.tgtEyeX = dx * 0.8; gaze.tgtEyeY = -dy * 0.6;
    gaze.tgtHeadX = dx * 14; gaze.tgtHeadY = -dy * 9;
  });

  // Selftest hook: same channel as real cursor, but with a synthetic direction.
  // Split set / read so the main-process harness can wait for the ticker to lerp.
  window.__testGaze = (dx, dy) => {
    gaze.tgtEyeX = dx * 0.8; gaze.tgtEyeY = -dy * 0.6; gaze.tgtHeadX = dx * 14; gaze.tgtHeadY = -dy * 9;
    return true;
  };
  window.__getGaze = () => ({ eyeX: gaze.curEyeX, headX: gaze.curHeadX, tgtEyeX: gaze.tgtEyeX, tgtHeadX: gaze.tgtHeadX });
}

function initPhoto() {
  const img = $('photo');
  img.src = cfg.avatarUrl;
  show(img);
  setInterval(() => {
    const k = 0.12;
    par.rx += (par.trx - par.rx) * k; par.ry += (par.try - par.ry) * k;
    par.tx += (par.ttx - par.tx) * k; par.ty += (par.tty - par.ty) * k;
    const bob = Math.sin(Date.now() / 1400) * 6; // idle breathing float
    img.style.transform =
      `translate(-50%,-50%) perspective(700px) rotateX(${par.rx.toFixed(2)}deg) rotateY(${par.ry.toFixed(2)}deg)` +
      ` translate(${par.tx.toFixed(1)}px, ${(par.ty + bob).toFixed(1)}px)`;
  }, 16);
  window.pet.onCursor((pos) => {
    const cx = pos.winX + pos.winW / 2, cy = pos.winY + pos.winH / 2;
    const dx = clamp((pos.x - cx) / 600), dy = clamp((pos.y - cy) / 600);
    par.try = dx * 10; par.trx = -dy * 8; par.ttx = dx * 14; par.tty = -dy * 10;
  });
}

function bindStage() {
  // Hover: show quick bar on pet, hide shortly after leaving (unless over the bar).
  let hideTimer = null;
  const stage = $('stage');
  stage.addEventListener('mouseenter', () => { clearTimeout(hideTimer); show($('quickbar')); });
  stage.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => hide($('quickbar')), 800); });
  $('quickbar').addEventListener('mouseenter', () => clearTimeout(hideTimer));
  $('quickbar').addEventListener('mouseleave', () => { hideTimer = setTimeout(() => hide($('quickbar')), 800); });

  // Drag: track mousedown offset, move the window through main.
  let dragging = null;
  stage.addEventListener('mousedown', (e) => { dragging = { x: e.screenX, y: e.screenY }; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    window.pet.drag(e.screenX - dragging.x, e.screenY - dragging.y);
    dragging = { x: e.screenX, y: e.screenY };
  });
  window.addEventListener('mouseup', () => { dragging = null; });
}

// ---- first-run wizard ----
let wizAvatar = { type: 'live2d', file: '' };
const wizChat = () => ({
  baseUrl: $('wiz-base').value.trim(), apiKey: $('wiz-key').value,
  model: $('wiz-model').value.trim(), systemPrompt: $('wiz-prompt').value,
});
function openWizard() {
  show($('wizard')); show($('wiz-1')); hide($('wiz-2'));
  $('wiz-base').value = cfg.chat.baseUrl; $('wiz-key').value = cfg.chat.apiKey;
  $('wiz-model').value = cfg.chat.model; $('wiz-prompt').value = cfg.chat.systemPrompt;
  wizAvatar = { ...(cfg.avatar || { type: 'live2d', file: '' }) };
  markWizAvatar();
}
function markWizAvatar() {
  $('wiz-use-live2d').classList.toggle('picked', wizAvatar.type === 'live2d');
  $('wiz-upload').classList.toggle('picked', wizAvatar.type === 'image');
}
function bindWizard() {
  $('wiz-test').onclick = async () => {
    $('wiz-test-result').textContent = '测试中…';
    try { await window.pet.testChat(wizChat()); $('wiz-test-result').textContent = '✅ 连接成功'; }
    catch (e) { $('wiz-test-result').textContent = `❌ ${String(e.message || e).slice(0, 80)}`; }
  };
  $('wiz-next').onclick = () => { hide($('wiz-1')); show($('wiz-2')); };
  $('wiz-back').onclick = () => { hide($('wiz-2')); show($('wiz-1')); };
  $('wiz-use-live2d').onclick = () => { wizAvatar = { type: 'live2d', file: '' }; hide($('wiz-preview')); markWizAvatar(); };
  $('wiz-upload').onclick = async () => {
    const r = await window.pet.pickAvatar();
    if (!r) return;
    wizAvatar = { type: 'image', file: r.file };
    $('wiz-preview').src = r.url; show($('wiz-preview')); markWizAvatar();
  };
  $('wiz-done').onclick = async () => {
    cfg = await window.pet.saveConfig({ setupDone: true, chat: wizChat(), avatar: wizAvatar });
    hide($('wizard'));
    say('设置完成！');
    location.reload(); // apply avatar mode
  };
}

function bindPanels() {
  // Panels
  $('btn-chat').onclick = () => { hide($('settings-panel')); show($('chat-panel')); $('chat-input').focus(); };
  let pendingAvatar = null;
  $('btn-settings').onclick = () => {
    hide($('chat-panel')); show($('settings-panel'));
    $('set-avatar-type').value = (cfg.avatar && cfg.avatar.type) || 'live2d';
    $('set-model').value = cfg.modelPath; $('set-base').value = cfg.chat.baseUrl;
    $('set-key').value = cfg.chat.apiKey; $('set-modelname').value = cfg.chat.model;
    $('set-prompt').value = cfg.chat.systemPrompt;
    $('upload-result').textContent = ''; pendingAvatar = null;
  };
  $('btn-upload').onclick = async () => {
    const r = await window.pet.pickAvatar();
    if (!r) return;
    pendingAvatar = { type: 'image', file: r.file };
    $('set-avatar-type').value = 'image';
    $('upload-result').textContent = '已上传，保存后生效';
  };
  $('btn-save').onclick = async () => {
    const avatar = pendingAvatar || { ...((cfg.avatar) || { type: 'live2d', file: '' }), type: $('set-avatar-type').value };
    const changed = !cfg.avatar || avatar.type !== cfg.avatar.type || avatar.file !== cfg.avatar.file;
    cfg = await window.pet.saveConfig({ modelPath: $('set-model').value.trim(), chat: { baseUrl: $('set-base').value.trim(), apiKey: $('set-key').value, model: $('set-modelname').value.trim(), systemPrompt: $('set-prompt').value }, avatar });
    pendingAvatar = null;
    hide($('settings-panel'));
    if (changed) location.reload(); else say('已保存，重启生效。');
  };
  $('btn-hide').onclick = () => window.pet.hide();
  $('btn-quit').onclick = () => window.pet.quit();
  $('chat-input').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const text = e.target.value.trim(); if (!text) return;
    e.target.value = ''; appendChat(`你：${text}`); appendChat('…思考中');
    try { replaceLastChat(await window.pet.chat([{ role: 'user', content: text }])); }
    catch (err) { replaceLastChat(`出错：${err.message}`); }
  });
  bindWizard();
}

function say(t) { const b = $('bubble'); b.textContent = t; show(b); }
function appendChat(t) { $('chat-log').textContent += (($('chat-log').textContent ? '\n\n' : '') + t); }
function replaceLastChat(t) { const log = $('chat-log'); log.textContent = log.textContent.replace(/…思考中$/, t); say(t.slice(0, 120)); }

async function init() {
  cfg = await window.pet.getConfig();
  try {
    if (cfg.avatar && cfg.avatar.type === 'image' && cfg.avatarUrl) initPhoto();
    else await initLive2D();
  } catch (e) {
    say(`模型加载失败：${e.message}\n请在设置里检查模型路径（需指向 .model3.json）。`);
  }
  bindStage();
  bindPanels();
  if (!cfg.setupDone) openWizard();
  else say('你好，我是你的桌宠。悬停出菜单，拖动可移动。');
}
init();
