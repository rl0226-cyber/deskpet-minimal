// Minimal renderer: load one Live2D model, gaze follows the global cursor,
// hover shows the quick bar, chat goes through main (so the key never lives in the page).
let model = null;
let cfg = null;
const gaze = { curEyeX: 0, curEyeY: 0, curHeadX: 0, curHeadY: 0, tgtEyeX: 0, tgtEyeY: 0, tgtHeadX: 0, tgtHeadY: 0 };
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

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

async function init() {
  cfg = await window.pet.getConfig();
  const app = new PIXI.Application({ width: 420, height: 700, transparent: true, autoStart: true });
  $('stage').appendChild(app.view);
  // Model path is relative to the project root; renderer lives in renderer/.
  const url = new URL(`../${cfg.modelPath}`, location.href).href;
  model = await PIXI.live2d.Live2DModel.from(url);
  // Auto-fit: native model canvas is far larger than the character, so scale to window.
  model.scale.set(1);
  const fit = Math.min(400 / model.width, 680 / model.height);
  model.scale.set(fit);
  model.x = (420 - model.width) / 2;
  model.y = (700 - model.height) / 2;
  app.stage.addChild(model);
  // setInterval, not PIXI ticker: ticker is driven by requestAnimationFrame and
  // stalls when the window is hidden/offscreen; gaze must keep lerping anyway.
  setInterval(applyGaze, 16);

  // Blink: close eyes ~120ms every 3–6s. No motion files needed.
  setInterval(() => {
    setParam('ParamEyeLOpen', 0); setParam('ParamEyeROpen', 0);
    setTimeout(() => { setParam('ParamEyeLOpen', 1); setParam('ParamEyeROpen', 1); }, 120);
  }, 4000);

  // Global cursor -> gaze target. 600px = full deflection; clamp keeps params in range.
  window.pet.onCursor((pos) => {
    const cx = pos.winX + pos.winW / 2, cy = pos.winY + 260; // pet head anchor
    const dx = Math.max(-1, Math.min(1, (pos.x - cx) / 600));
    const dy = Math.max(-1, Math.min(1, (pos.y - cy) / 600));
    gaze.tgtEyeX = dx * 0.8; gaze.tgtEyeY = -dy * 0.6;
    gaze.tgtHeadX = dx * 14; gaze.tgtHeadY = -dy * 9;
  });

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

  // Panels
  $('btn-chat').onclick = () => { hide($('settings-panel')); show($('chat-panel')); $('chat-input').focus(); };
  $('btn-settings').onclick = () => {
    hide($('chat-panel')); show($('settings-panel'));
    $('set-model').value = cfg.modelPath; $('set-base').value = cfg.chat.baseUrl;
    $('set-key').value = cfg.chat.apiKey; $('set-modelname').value = cfg.chat.model;
    $('set-prompt').value = cfg.chat.systemPrompt;
  };
  $('btn-save').onclick = async () => {
    cfg = await window.pet.saveConfig({ modelPath: $('set-model').value.trim(), chat: { baseUrl: $('set-base').value.trim(), apiKey: $('set-key').value, model: $('set-modelname').value.trim(), systemPrompt: $('set-prompt').value } });
    hide($('settings-panel')); say('已保存，重启生效。');
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

  // Selftest hook: same channel as real cursor, but with a synthetic direction.
  // Split set / read so the main-process harness can wait for the ticker to lerp.
  window.__testGaze = (dx, dy) => {
    gaze.tgtEyeX = dx * 0.8; gaze.tgtEyeY = -dy * 0.6; gaze.tgtHeadX = dx * 14; gaze.tgtHeadY = -dy * 9;
    return true;
  };
  window.__getGaze = () => ({ eyeX: gaze.curEyeX, headX: gaze.curHeadX, tgtEyeX: gaze.tgtEyeX, tgtHeadX: gaze.tgtHeadX });
  say('你好，我是你的桌宠。悬停出菜单，拖动可移动。');
}
function say(t) { const b = $('bubble'); b.textContent = t; show(b); }
function appendChat(t) { $('chat-log').textContent += ( $('chat-log').textContent ? '\n\n' : '') + t; }
function replaceLastChat(t) { const log = $('chat-log'); log.textContent = log.textContent.replace(/…思考中$/, t); say(t.slice(0, 120)); }
init().catch((e) => say(`模型加载失败：${e.message}\n请在设置里检查模型路径（需指向 .model3.json）。`));
