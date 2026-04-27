# Metronome

一个 React + Vite + Tailwind 的节拍器 MVP，可通过 Capacitor 打包为 Android APK。

## 功能

- 三面板响应式布局：全局参数、播放控制、细分节奏。
- BPM 可拖拽数轴、加减微调、拍号、音色、第一拍强调。
- 每拍 3 档音色强度控制，播放时当前拍高亮。
- 每拍可独立选择四分、八分、十六分、前附点、后附点、三连音、swing。
- 节拍声音由 AudioWorklet 在音频线程调度，降低浏览器后台节流对节拍稳定性的影响。

## 开发

```bash
npm install
npm run dev
```

## 检查与构建

```bash
npm run lint
npm run build
```

## Android

同步 Capacitor Android 工程：

```bash
npm run cap:sync
```

在 Windows 本机生成 debug APK：

```bash
npm run android:apk
```

GitHub Actions 工作流位于 `.github/workflows/android-apk.yml`，会在 push 到 `main`、pull request 或手动触发时生成 `metronome-debug-apk` artifact。
