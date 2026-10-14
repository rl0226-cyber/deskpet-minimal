# DeskPet Minimal

最小版 Live2D 桌宠：自己写的全部代码，只依赖公开库，不抄任何现有桌宠项目的应用代码。

## 下载即用（Windows，不用碰代码）

去 [Releases](https://github.com/rl0226-cyber/deskpet-minimal/releases) 页面下载最新版：

- `DeskPet-v*-win32-x64.zip`：解压后双击里面的 `DeskPet.exe` 即用（免安装）

跑起来后：桌面上弹出 420×700 透明小窗，里面是测试模型 Haru；眼睛和头跟着鼠标转；悬停出菜单；拖动可移动。

exe 版的配置存在 `%APPDATA%\DeskPet\config.json`（安装版/免安装版通用）；API Key 在应用内的设置面板里填就行，不用手动改文件。

> 以下源码运行方式是给开发者看的，直接用 exe 的话跳过。

---

- **实时跟随**：主进程每 33ms 轮询全局鼠标，渲染层用 `ParamEyeBallX/Y + ParamAngleX/Y + ParamBodyAngleX` + 12% 插值平滑
- **悬停菜单**：鼠标移到桌宠上出快捷栏（聊天 / 设置 / 隐藏 / 退出），离开 800ms 自动收起
- **首次启动向导**：第一次打开自动弹出两步设置——①填 API（Base URL / Key / 模型名 / 人设，带"测试连接"按钮）②选形象（Live2D 默认或上传图片），全程不用碰配置文件
- **自定义形象**：设置面板可随时切换 —— Live2D 模型（换 `modelPath` 指向任意 `.model3.json`，需 Cubism 标准参数名）或上传单张图片（照片模式：图片随鼠标 3D 倾斜 + 呼吸浮动）
- **AI API 自接**：设置面板填任意 OpenAI 兼容的 Base URL / Key / 模型名 + 人设，Key 只存本地

> 本项目是源码运行版（`npm start` 直接跑），不是打包好的安装包（没有 .exe / .dmg / .AppImage）。想打包成安装包需要另加 `electron-builder`，当前版本没做。

## 通用准备

不管哪个系统，都需要这两样：

| 工具 | 要求 | 检查命令 |
|---|---|---|
| Node.js | 18+（建议 20 LTS 或更新） | `node -v` |
| Git | 任意新版 | `git --version` |

拿代码的方式都一样：

```bash
git clone https://github.com/rl0226-cyber/deskpet-minimal.git
cd deskpet-minimal
```

第一次运行前，先从模板复制一份本地配置（`config.json` 不进仓库，里面放你的 Key）：

```bash
# Windows PowerShell / CMD：
copy config.example.json config.json
# macOS / Linux：
cp config.example.json config.json
```

之后在任何系统上都是：

```bash
npm install
npm start
```

跑起来后：桌面上弹出 420×700 透明小窗，里面是测试模型 Haru；眼睛和头跟着鼠标转；悬停出菜单；拖动可移动。

---

## Windows（主力，实测目标：Windows 10 / 11 64 位）

### 1. 装 Node.js（二选一）

- 推荐：去 [nodejs.org](https://nodejs.org) 下载 LTS（.msi），一路下一步
- 或 PowerShell 里：`winget install OpenJS.NodeJS.LTS`

装完**关掉重开一个 PowerShell**，再跑：

```powershell
node -v
npm -v
```

能打出版本号就是装好了。

### 2. 装 Git（二选一）

- 去 [git-scm.com](https://git-scm.com) 下载 Git for Windows，一路下一步（保持默认勾选即可）
- 或 PowerShell 里：`winget install Git.Git`

### 3. 拉代码 + 跑

```powershell
git clone https://github.com/rl0226-cyber/deskpet-minimal.git
cd deskpet-minimal
copy config.example.json config.json
npm install
npm start
```

### Windows 常见问题

- `node 不是内部命令`：Node 没装好，或装完没重开 PowerShell；重开一个再试，仍不行就重装 Node（勾上 Add to PATH）
- `npm` 报“无法加载文件 npm.ps1，因为在此系统上禁止运行脚本”：这是 PowerShell 执行策略拦了 npm 的 `.ps1` 脚本。最省事的办法：命令写成 `npm.cmd`（如 `npm.cmd install`、`npm.cmd start`），不用改任何设置；想一劳永逸就跑 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`（只影响当前用户，不用管理员），重开 PowerShell 后直接用 `npm`
- `npm install` 很慢 / 报错：网络问题，多试一次；或换淘宝镜像：`npm config set registry https://registry.npmmirror.com` 再 `npm install`
- Windows Defender / 防火墙弹提示：点“允许”，Electron 是本地应用，不联网（除非你用它聊天调 API）
- 窗口闪一下就没了：看 PowerShell 里的报错，多半是模型路径不对或 Node 版本太低；先跑 `node -v` 确认 ≥18

---

## macOS（MacBook，macOS 13+）

### 1. 装 Node.js（二选一）

- 推荐：去 [nodejs.org](https://nodejs.org) 下载 macOS LTS（.pkg），一路下一步
- 或已装 Homebrew：`brew install node`

### 2. 装 Git

macOS 一般自带 Git。打开终端跑 `git --version`，如果提示要装 Command Line Developer Tools，点“安装”即可。或：`brew install git`

### 3. 拉代码 + 跑

```bash
git clone https://github.com/rl0226-cyber/deskpet-minimal.git
cd deskpet-minimal
cp config.example.json config.json
npm install
npm start
```

### macOS 常见问题

- 打不开、提示“无法验证开发者”：这是 Gatekeeper 拦未签名的 Electron。办法：Finder 里右键 `node_modules/electron/dist/Electron.app` → 打开 → 仍要打开；或终端跑：`xattr -cr node_modules/electron/dist/Electron.app` 再 `npm start`
- `npm install` 报错缺少编译工具：终端跑 `xcode-select --install` 装 Command Line Tools 后重试
- Apple Silicon（M1/M2/M3/M4）：Node 选 arm64 版，`npm install` 会自动装对应 Electron，不用 Rosetta

---

## Linux（Ubuntu / Debian / Fedora / Arch，X11 或 Wayland 桌面）

### 1. 装 Node.js + Git

```bash
# Ubuntu / Debian：
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Fedora：
sudo dnf install -y git nodejs

# Arch：
sudo pacman -S --noconfirm git nodejs npm
```

检查：`node -v` 应 ≥18，`git --version` 能打出版本。

### 2. 拉代码 + 跑

```bash
git clone https://github.com/rl0226-cyber/deskpet-minimal.git
cd deskpet-minimal
cp config.example.json config.json
npm install
npm start
```

### Linux 常见问题

- 没有图形桌面（服务器 / 无显示器）：`npm start` 需要显示器，跑不了。用离屏自测代替：
  ```bash
  sudo apt install -y xvfb
  npm run selftest
  # 期望：[selftest] GAZE PASS — eyeX -0.79 -> 0.79, headX -13.9 -> 13.9
  ```
- Wayland 下窗口位置异常：先切回 X11 会话测试；Wayland 的窗口定位各发行版行为不一，当前版本没做 Wayland 特殊适配
- `npm install` 缺系统库报错：Ubuntu 装 `sudo apt install -y build-essential` 后重试

---

## 手机 / 平板

**不支持。** 本项目是 Electron 桌面应用，只能在 Windows / macOS / Linux 桌面系统上跑，没有 iOS / Android 版。手机上想用，改走浏览器版（未做）才行。

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
| `config.example.json` | 配置模板（进仓库，第一次用复制成 `config.json`） |

依赖：Electron + PixiJS 6 + `pixi-live2d-display`（Cubism 4 单包）+ Live2D Cubism Core（官方可再分发运行时，见 `renderer/vendor/`）。

## 没做的

- 没做 TTS / 语音输入 / 摸头特效 / 托盘 / 开机自启 / 全屏穿透（小窗 + 拖动已够用）
- 没做流式输出（聊天是非流式一次返回）
- 没做打包安装包（.exe / .dmg / .AppImage），当前是源码运行
- 只在 Linux 离屏自测过注视；Windows / macOS 交互窗口未在这台机器上实测
