import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Globe, Terminal, ShieldCheck, ArrowRight } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'github' | 'google' | 'gsi'>('github');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const githubActionYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                網頁部署指南：GitHub Pages 與 Google Hosting
              </h2>
              <p className="text-xs text-slate-500">
                本系統為純前端靜態架構，可 100% 免費部署於 GitHub 或 Google
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-3 border-b-2 transition-all ${
              activeTab === 'github'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            01. 部署到 GitHub Pages (最簡單、完全免費)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`pb-3 px-3 border-b-2 transition-all ${
              activeTab === 'google'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            02. 部署到 Google Firebase Hosting
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gsi')}
            className={`pb-3 px-3 border-b-2 transition-all ${
              activeTab === 'gsi'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            03. Google 登入正式網域設定說明
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm text-slate-700">
          
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 text-xs">
                <span className="font-bold">為什麼推薦 GitHub Pages？</span>
                <p className="mt-1">
                  GitHub Pages 永久免費、免主機費，同仁只需點擊專屬網址（例如：<code>https://你的帳號.github.io/badminton-assessment/</code>）就能立即在手機或電腦填寫！
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">操作步驟：</h4>
                
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 1：建立 GitHub 專案庫 (Repository)</p>
                  <p className="text-xs text-slate-500">在 GitHub 上點選「New repository」，取名為如 <code>badminton-assessment</code>。</p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 2：設定 vite.config.ts 的 base 路徑</p>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs relative">
                    <code>{`export default defineConfig({
  base: '/badminton-assessment/', // 改為你的 GitHub repo 名稱
  // ... 其他設定保持不變
})`}</code>
                    <button
                      onClick={() => handleCopy('vite', `base: '/badminton-assessment/',`)}
                      className="absolute right-2 top-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"
                    >
                      {copiedKey === 'vite' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 3：使用 GitHub Action 自動發布 (一勞永逸)</p>
                  <p className="text-xs text-slate-500">
                    在專案根目錄建立 <code>.github/workflows/deploy.yml</code>，每次 push main 分支時會自動編譯並上線！
                  </p>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs relative max-h-48 overflow-y-auto">
                    <pre>{githubActionYaml}</pre>
                    <button
                      onClick={() => handleCopy('yaml', githubActionYaml)}
                      className="absolute right-2 top-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"
                    >
                      {copiedKey === 'yaml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 4：在 GitHub 倉庫開啟 Pages</p>
                  <p className="text-xs text-slate-500">
                    前往 GitHub 倉庫的 <strong>Settings → Pages → Build and deployment → Source</strong>，選擇 <strong>GitHub Actions</strong> 即可！
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-950 text-xs">
                <span className="font-bold">Google Firebase Hosting 部署特點：</span>
                <p className="mt-1">
                  由 Google 官方全球 CDN 加速，擁有自訂 Google 網域、超高速加載，非常適合公司內部大型賽事！
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">操作步驟：</h4>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 1：安裝 Firebase CLI 工具</p>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-xs flex items-center justify-between">
                    <code>npm install -g firebase-tools</code>
                    <button
                      onClick={() => handleCopy('fb1', 'npm install -g firebase-tools')}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      {copiedKey === 'fb1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 2：登入 Google 帳號並初始化專案</p>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-xs flex items-center justify-between">
                    <code>firebase login &amp;&amp; firebase init hosting</code>
                    <button
                      onClick={() => handleCopy('fb2', 'firebase login && firebase init hosting')}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      {copiedKey === 'fb2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    設定 Public directory 為 <code>dist</code>，並勾選 Single-page app (SPA) = Yes。
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">步驟 3：編譯並一鍵發布到 Google</p>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-xs flex items-center justify-between">
                    <code>npm run build &amp;&amp; firebase deploy --only hosting</code>
                    <button
                      onClick={() => handleCopy('fb3', 'npm run build && firebase deploy --only hosting')}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      {copiedKey === 'fb3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    完成後終端機將提供類似 <code>https://your-badminton.web.app</code> 的永久專屬網址！
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gsi' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 text-xs">
                <span className="font-bold">Google 登入運作機制：</span>
                <p className="mt-1">
                  本系統目前預設提供「安全 Google 帳號授權確認與 Email 唯讀鎖定」，使用者可一鍵以其 Google 帳號確認登入，確保信箱真實性。若需要限制公司內部 GSuite/Workspace 網域或啟用 Google Identity 原生彈跳視窗，可在 Google Cloud Console 設定 Client ID。
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-800">如何取得專屬 Google OAuth Client ID：</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">Google Cloud Console 憑證頁面</a>。</li>
                  <li>點擊「建立憑證」→「OAuth 用戶端 ID」。</li>
                  <li>應用程式類型選擇「網頁應用程式 (Web Application)」。</li>
                  <li>在「已授權的 JavaScript 來源」填入你的 GitHub Pages 網址或 Firebase 網址（例如：<code>https://你的帳號.github.io</code>）。</li>
                  <li>將產生的 Client ID 貼到設定中即可！</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            瞭解，關閉說明
          </button>
        </div>

      </div>
    </div>
  );
};
