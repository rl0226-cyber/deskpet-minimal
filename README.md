# DeskPet Minimal

最小版 Live2D 桌宠：自己写的全部代码，只依赖公开库，不抄任何现有桌宠项目的应用代码。

- **实时跟随**：主进程每 33ms 轮询全局鼠标，渲染层用 `ParamEyeBallX/Y + ParamAngleX/Y + ParamBodyAngleX` + 12% 插值平滑
- **悬停菜单**：鼠标移到桌宠上出快捷栏（聊天 / 设置 / 隐藏 / 退出），离开 800ms 自动收起
- **自定义形象**：换 `config.json` 里的 `modelPath`，指向任意 `.model3.json`（需 Cubism 标准参数名）
- **AI API 自接**：设置面板填任意 OpenAI 兼容的 Base URL / Key / 模型名 + 人设，Key 只存本地 `config.json`

## 运行

```bash
npm install
npm start
```

验证注视（离屏自测，注入假鼠标方向、读回参数、截图）：

```bash
npm run selftest
# 期望：[selftest] GAZE PASS — eyeX -0.79 -> 0.79, headX -13.9 -> 13.9
```

## 换模型

1. 把你的 Live2D 模型文件夹放到 `models/` 下（包含 `.model3.json` + `.moc3` + 贴图 + 动作）
2. 在设置面板把模型路径改成 `models/你的模型/xxx.model3.json`，保存后重启

注意：**一张平铺 PNG 做不了眼/头跟随**。Live2D 模型是分层 + 骨骼，不是一张图。用 Live2D Cubism Editor 把图拆层导出 `model3.json` 才能用。仓库里 `models/haru/` 只是 Live2D 官方免费示例，测试用，不要商用。

## 接 AI

设置面板填：Base URL（如 `https://api.openai.com/v1`，或 DeepSeek / 硅基流动等 OpenAI 兼容地址）、API Key、模型名、人设。聊天走主进程代理，Key 不进页面。

## 文件

| 文件 | 作用 |
|---|---|
| `main.cjs` | 透明窗 + 全局鼠标轮询 + 配置 + 聊天代理 + 自测 |
| `preload.cjs` | 安全桥接（contextBridge） |
| `renderer/renderer.js` | Live2D 加载 + 注视 + 悬停栏 + 聊天/设置 |
| `renderer/index.html` / `styles.css` | 结构 + 样式 |
| `config.json` | 本地配置（gitignore，不提交 Key） |

依赖：Electron + PixiJS 6 + `pixi-live2d-display`（Cubism 4 单包）+ Live2D Cubism Core（官方可再分发运行时，见 `renderer/vendor/`）。

## 没做的

- 没做 TTS / 语音输入 / 摸头特效 / 托盘 / 开机自启 / 全屏穿透（小窗 + 拖动已够用）
- 没做流式输出（聊天是非流式一次返回）
- 只在 Linux 离屏自测过注视；Windows 上 `npm start` 交互窗口未在这台机器上实测
