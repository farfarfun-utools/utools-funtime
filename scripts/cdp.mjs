// 极简 Chrome DevTools Protocol 客户端。
// Node 22 自带全局 WebSocket 和 fetch，无需 Puppeteer / Playwright 依赖。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  path.join(os.homedir(), '.local/bin/chromium'),
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

export function findBrowser() {
  for (const candidate of CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COMMAND_TIMEOUT = 30_000;
const PROBE_TIMEOUT = 2_000;

export async function waitFor(probe, { timeout = 15_000, interval = 100, label = '条件' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`等待超时：${label}`);
    await sleep(interval);
  }
}

class Session {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(`${message.error.message} (${entry.method})`));
        else entry.resolve(message.result);
        return;
      }
      for (const handler of this.listeners.get(message.method) ?? []) handler(message.params);
    });

    socket.addEventListener('close', () => {
      for (const entry of this.pending.values()) entry.reject(new Error('CDP 连接已关闭'));
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP 命令超时：${method}`));
      }, COMMAND_TIMEOUT);
      const settle = (run) => (value) => {
        clearTimeout(timer);
        run(value);
      };
      this.pending.set(id, { resolve: settle(resolve), reject: settle(reject), method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const list = this.listeners.get(method) ?? [];
    list.push(handler);
    this.listeners.set(method, list);
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails;
      throw new Error(detail.exception?.description ?? detail.text ?? '页面内求值失败');
    }
    return result.result.value;
  }

  waitForExpression(expression, options = {}) {
    return waitFor(() => this.evaluate(expression), { label: expression, ...options });
  }
}

export async function launch({ url, binary = findBrowser(), headless = true, downloadPath } = {}) {
  if (!binary) throw new Error('找不到 Chromium 系浏览器');

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'utools-cdp-'));

  async function start(extra = []) {
    const args = [
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-gpu',
      '--window-size=1280,900',
      ...extra,
    ];
    if (headless) args.push('--headless=new');
    args.push('about:blank');

    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stderr = [];
    child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

    const state = { exited: false };
    child.on('exit', () => {
      state.exited = true;
    });

    const portFile = path.join(profile, 'DevToolsActivePort');
    const readPort = () => {
      if (state.exited) {
        const error = new Error(`浏览器启动失败：\n${stderr.join('')}`);
        error.stderr = stderr.join('');
        throw error;
      }
      if (!fs.existsSync(portFile)) return null;
      const first = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
      return first ? Number(first) : null;
    };

    const port = await waitFor(readPort, { label: 'DevToolsActivePort', timeout: 30_000 });
    return { child, port, state };
  }

  let started;
  try {
    started = await start();
  } catch (error) {
    if (!/No usable sandbox|Failed to move to new namespace/.test(error.stderr ?? '')) throw error;
    console.warn('[cdp] 当前系统不允许 Chromium 沙箱，改用 --no-sandbox 重试');
    fs.rmSync(path.join(profile, 'DevToolsActivePort'), { force: true });
    started = await start(['--no-sandbox']);
  }

  const { child, port, state } = started;
  const exited = () => state.exited;

  async function teardown() {
    if (!exited()) {
      child.kill('SIGTERM');
      for (let i = 0; i < 30 && !exited(); i += 1) await sleep(100);
      if (!exited()) child.kill('SIGKILL');
    }
    fs.rmSync(profile, { recursive: true, force: true });
  }

  async function connect() {
    const target = await waitFor(
      async () => {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
            signal: AbortSignal.timeout(PROBE_TIMEOUT),
          });
          const list = await response.json();
          return list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) ?? null;
        } catch {
          return null;
        }
      },
      { label: '页面 target' },
    );

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket 连接超时')), 15_000);
      const settle = (run) => () => {
        clearTimeout(timer);
        run();
      };
      socket.addEventListener('open', settle(resolve), { once: true });
      socket.addEventListener(
        'error',
        settle(() => reject(new Error('CDP WebSocket 连接失败'))),
        { once: true },
      );
    });

    const session = new Session(socket);
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    await session.send('Network.enable');
    await session.send('Log.enable');

    if (downloadPath) {
      fs.mkdirSync(downloadPath, { recursive: true });
      await session
        .send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath })
        .catch(() => session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath }));
    }

    return { session, socket };
  }

  let connected;
  try {
    connected = await connect();
  } catch (error) {
    await teardown();
    throw error;
  }
  const { session, socket } = connected;

  return {
    session,
    port,
    navigate: (to = url) => session.send('Page.navigate', { url: to }),
    async close() {
      try {
        socket.close();
      } catch {
        // ignore
      }
      await teardown();
    },
  };
}
