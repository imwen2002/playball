# 後台裁判名單：執法場次配額設定與智慧排程防呆 (已完成實作)

為羽球比賽管理後台的「裁判名單管理」新增每位裁判的執法場次配額設定（支援批次設定與個別微調），並升級隨機排程演算法以嚴格遵守場次上限；當裁判總執法容量不足以覆蓋全部賽事時，即時於後台顯示缺額提醒並在排程時阻擋防呆，明確告知尚缺場次與建議增聘人數。

## 實作完成狀態：已全數實作並通過編譯與型別檢查

> [!IMPORTANT]
> 請確認以下功能規劃是否符合您的預期，確認後將開始進行程式碼修改：

- **場次上限設定機制**：預設每位裁判執法 2 場（可自訂），後台提供「一鍵批次套用至全體 / 選手 / 外部專職」快捷鍵，並在每位裁判卡片/列中提供數字微調按鈕（+ / - / 直接輸入）。
- **容量計算與即時提示**：
  - 系統總需求場次：當前賽程全部比賽場次 $M$（例如 45 場）。
  - 當前裁判可執法總容量：$\sum \text{每位裁判設定場次}$。
  - 當容量不足時（例如 15 名選手 $\times 2$ 場 + 2 名外人 $\times 2$ 場 = 34 場，尚缺 11 場）：即時在統計資訊看板顯示紅色警示橫幅，清楚計算「尚缺 11 場裁判」，並依預設場次換算「需再增加約 6 位裁判」。
- **隨機排裁判防呆阻擋**：
  - 若在容量不足（或選手防延誤規則衝突導致無法排滿）的情況下點擊「🎲 隨機排裁判」，系統將彈出防呆警示視窗阻止或提示確認，列出無法排定裁判的場次編號與人力缺口，避免賽程產生隱形無裁判空檔。
  - 排程時嚴格遵守 3 大防延誤規定（同輪不可出賽、剛完賽下輪不當、當完裁判下輪不出賽），且每位裁判執法場次絕對不超過其設定的場次上限。

---

## 1. Overview & Core Concept

### 核心功能
1. **裁判個人化執法場次設定 (`targetMatches`)**：
   - 擴充 `TournamentReferee` 資料模型，新增 `targetMatches?: number` 欄位（預設值為 2 場，可設定 1~99 場）。
   - 在裁判名單列表為每位裁判增加專屬「預計執法場次」步進器（Stepper）與輸入框。
   - 新增頂部批次控制列：「全體設為 X 場」、「選手兼任設為 X 場」、「外部裁判設為 Y 場」。

2. **裁判人力總容量即時診斷看板**：
   - 即時計算公式：
     $$\text{總賽事場次 } M = \text{賽程所有場次加總}$$
     $$\text{裁判總配額 } C = \sum_{i=1}^{N} \text{referee}_i.\text{targetMatches}$$
     $$\text{缺額場次 } \Delta = \max(0, M - C)$$
     $$\text{建議增聘人數 } P_{\text{needed}} = \lceil \Delta / \text{預設每人場次} \rceil$$
   - 當 $\Delta > 0$ 時，以高對比琥珀/玫瑰紅警示橫幅呈現精確數據（如「總計 45 場，目前容量 34 場，尚缺 11 場裁判，建議增加 6 位裁判」）。

3. **智慧排程引擎升級 (`assignRefereesToSchedule`)**：
   - 排程演算法導入配額上限限制，每位裁判執法次數達到 `targetMatches` 後不再被挑選。
   - 兼顧 3 大防延誤硬性規則，若因人數不足或規則衝突而無法排滿，精確回傳未排定場次清單與具體原因。

---

## 2. User Experience & Visual Design

### 關鍵操作流程
1. **檢視與設定配額**：
   - 主辦人進入【後台管理】→【裁判名單】。
   - 頂部看板即時顯示：`賽事總場次`、`裁判執法總容量`、`容量差額狀態`。
   - 主辦人可在頂部點擊「批次設定：選手 2 場 / 專職 4 場」，亦可針對特定裁判點擊 `+` 或 `-` 個別調整。
2. **容量不足警示狀態**：
   - 當總配額小於賽事總場次時，看板立即切換為警示狀態，顯示缺額與需增聘人數。
3. **點擊「🎲 隨機排裁判」**：
   - 若容量充足：依場次配額與 3 大防延誤規定平均輪替指派，跳出成功通知並即時同步雲端 Firestore。
   - 若容量不足：彈出確認/警示視窗，明確顯示：「⚠️ 裁判人力容量不足！尚缺 X 場裁判（需再增加約 Y 人），確定要強制排定部分場次嗎？」，主辦人可選擇「前往補齊裁判」或「查看具體缺額」。

---

## 3. Key Product Decisions & Trade-Offs

| 決策項目 | 採用方案 | 考量與優勢 |
| :--- | :--- | :--- |
| **場次欄位預設值** | 預設為 `2` 場，保留彈性自由輸入 | 符合業餘與一般企業社團賽事「選手兼任裁判 1~2 場」的真實負擔上限。 |
| **批次操作 vs 個別自訂** | 同時提供頂部快速批次按鈕與個別卡片調整 | 兼顧數十人規模下的快速設定效率，以及個別外聘專職教練想多排（如 4~6 場）的個別彈性。 |
| **排程上限強制性** | 硬性上限（Hard Cap），達上限即排除候選 | 嚴格確保主辦人承諾選手/裁判的執法場次不被演算法超額超排。 |
| **雲端同步相容性** | 擴充 `firebase-blueprint.json` 與 `firebase.ts` | 儲存至 Firestore 的裁判資料無縫支援 `targetMatches` 欄位，跨裝置重新整理不丟失。 |

---

## 4. Technical Architecture & Data Strategy

### 系統元件與邏輯架構

```
┌─────────────────────────────────────────────────────────────┐
│                       AdminDashboard                        │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  Referee Quota Panel  │       │ Capacity Health Check │  │
│  │  - Batch Set Controls │       │ - Total Matches: M    │  │
│  │  - Individual Stepper │       │ - Total Capacity: C   │  │
│  │  - targetMatches      │       │ - Shortage Alert: Δ   │  │
│  └──────────┬────────────┘       └───────────┬───────────┘  │
│             │                                │              │
│             ▼                                ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           assignRefereesToSchedule Engine             │  │
│  │  1. Check Workload < targetMatches (Strict Cap)       │  │
│  │  2. Enforce 3 Delay-Prevention Rules                  │  │
│  │  3. Return updated rounds + unassignedMatches report  │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │      Cloud Sync (saveTournamentState in Firestore)    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 資料模型調整
在 `src/types.ts` 中的 `TournamentReferee`：
```typescript
export interface TournamentReferee {
  id: string;
  name: string;
  isPlayer: boolean;
  playerId?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  targetMatches?: number; // <<-- 新增：該裁判預計/最多執法場次（預設 2）
}
```

### 演算法調整 (`src/utils/courtScheduler.ts`)
1. 初始化工作量計數器 `refereeWorkload = new Map<string, number>()`。
2. 候選過濾時加入配額檢查：
   `const currentCount = refereeWorkload.get(ref.id) ?? 0;`
   `const maxAllowed = ref.targetMatches ?? 2;`
   `if (currentCount >= maxAllowed) continue;`
3. 回傳排程結果時，計算未排定場次數，若有缺額則提供結構化統計資訊回傳給後台介面。

---

## 5. Implementation Steps Summary

1. **更新型別與資料庫結構 (`src/types.ts` & `firebase-blueprint.json`)**：
   - 加入 `targetMatches?: number` 屬性。
2. **升級排程工具核心演算法 (`src/utils/courtScheduler.ts`)**：
   - 引入個別配額約束檢查與缺額偵測回報。
3. **改造後台裁判名單管理介面 (`src/components/AdminDashboard.tsx`)**：
   - 增加即時容量計算看板（總場次、已配總額、缺額、需增聘人數）。
   - 增加批次設定工具列與每位裁判名單的場次數調整輸入框。
   - 實作防呆排程警示彈窗，提供明確的錯誤說明。
4. **驗證與編譯測試**：
   - 執行 `compile_applet` 與 `lint_applet` 確保編譯與型別安全。
