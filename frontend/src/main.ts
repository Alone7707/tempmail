import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './style.css';

const renderFatalError = (error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const appRoot = document.querySelector('#app');
  if (appRoot) {
    appRoot.innerHTML = `
      <div style="padding:24px;font-family:Consolas,Menlo,monospace;color:#f56c6c;background:#0b1020;min-height:100vh;box-sizing:border-box;">
        <h2 style="margin:0 0 12px;">前端启动失败</h2>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#111827;padding:16px;border-radius:8px;color:#ffd2d2;">${message}</pre>
        <p style="margin-top:12px;color:#cbd5e1;">请把这段错误发给我，我直接继续修。</p>
      </div>
    `;
  }
};

window.addEventListener('error', (event) => {
  renderFatalError(event.error || event.message || '未知错误');
});

window.addEventListener('unhandledrejection', (event) => {
  renderFatalError(event.reason || '未处理的 Promise 异常');
});

try {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(ElementPlus);
  app.mount('#app');
} catch (error) {
  renderFatalError(error);
}
