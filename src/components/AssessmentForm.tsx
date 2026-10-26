import React, { useState, useEffect } from 'react';
import { UserAccount, PlayerSubmission, Gender, AssessmentMode } from '../types';
import { COACH_QUIZ_QUESTIONS, calculateQuizLevel } from '../data/coachQuiz';
import { BADMINTON_TIERS, getTierByLevel, getLevelDescription } from '../data/badmintonTiers';
import confetti from 'canvas-confetti';
import {
  User,
  Mail,
  Sparkles,
  CheckCircle2,
  Send,
  Award,
  Shield,
  MessageSquare,
  HelpCircle,
  CloudCheck,
} from 'lucide-react';

interface AssessmentFormProps {
  user: UserAccount | null;
  onSubmitPlayer: (submission: PlayerSubmission) => Promise<void> | void;
  existingSubmission?: PlayerSubmission | null;
  onViewOfficialChart: () => void;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  user,
  onSubmitPlayer,
  existingSubmission,
  onViewOfficialChart,
}) => {
  // Form fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState<Gender>('male');
  const [dominantHand, setDominantHand] = useState<'right' | 'left'>('right');
  const [notes, setNotes] = useState('');

  // Assessment mode
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('quiz');

  // Quiz answers (question id -> scoreLevel)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({
    q1_experience: 1.5,
    q2_serve: 3,
    q3_clear: 4,
    q4_attack: 4.5,
    q5_footwork: 5,
    q6_doubles_rotation: 5,
  });

  // Direct level selection (1-18)
  const [directLevel, setDirectLevel] = useState<number>(4);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Sync user info from props if provided and form is empty
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  // Load existing submission if any
  useEffect(() => {
    if (existingSubmission) {
      setName(existingSubmission.name);
      setEmail(existingSubmission.email);
      setGender(existingSubmission.gender);
      setDominantHand(existingSubmission.dominantHand);
      const initialNotes =
        existingSubmission.notes === '後場長球與殺球為主，希望搭檔擅長網前小球或防守'
          ? ''
          : existingSubmission.notes || '';
      setNotes(initialNotes);
      setAssessmentMode(existingSubmission.assessmentMode);
      if (existingSubmission.quizAnswers) {
        setQuizAnswers(existingSubmission.quizAnswers);
      }
      setDirectLevel(existingSubmission.level);
    }
  }, [existingSubmission]);

  // Calculate current active level
  const computedQuizLevel = calculateQuizLevel(quizAnswers);
  const activeLevel = assessmentMode === 'quiz' ? computedQuizLevel : directLevel;
  const currentTier = getTierByLevel(activeLevel);
  const currentLevelDesc = getLevelDescription(activeLevel);

  const handleSelectQuizOption = (questionId: string, scoreLevel: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: scoreLevel,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('請先填寫參賽姓名！');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      alert('請先填寫有效的聯絡 Email (例如：yourname@example.com)！');
      return;
    }

    setIsSubmitting(true);

    const docId =
      existingSubmission?.id ||
      email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_') ||
      `player-${Date.now()}`;

    const submission: PlayerSubmission = {
      id: docId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      gender,
      dominantHand,
      level: activeLevel,
      tierName: currentTier.name,
      assessmentMode,
      quizAnswers: assessmentMode === 'quiz' ? quizAnswers : undefined,
      notes: notes.trim(),
      submittedAt: existingSubmission?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSubmitPlayer(submission);
      setIsSubmittedSuccess(true);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#3b82f6'],
        });
      } catch {
        // ignore
      }
    } catch (err) {
      alert('資料送出發生錯誤，請重試或檢查網路連線。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Banner / Intro */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white overflow-hidden shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-xs font-semibold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              羽球賽事分組自評系統
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              義鼎杯羽球比賽．實力程度自評表
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              依據<strong className="text-white">「台灣羽球推廣協會 1~18 級制度」</strong>
              設計。請直接於下方輸入姓名與 Email 即可開始填寫。填寫完成送出後，資料將直接同步儲存至主辦人後台，安排實力最均衡、最刺激好玩的雙打組合！
            </p>
          </div>
        </div>
      </div>

      {/* Submission Success Banner */}
      {isSubmittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 flex items-start justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                🎉 自評資料已成功儲存至雲端資料庫！
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                選手：<span className="font-bold text-slate-900">{name}</span> ({email}) · 評估等級為：
                <span className="font-extrabold text-emerald-900"> 第 {activeLevel} 級 ({currentTier.name})</span>。
                主辦人後台已即時同步更新您的名單，比賽當天將依此為您安排戰力平衡的最佳拍檔！
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSubmittedSuccess(false)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline shrink-0 cursor-pointer"
          >
            再次修改
          </button>
        </div>
      )}

      {/* Main Assessment Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: 參賽者姓名與 Email (最先填寫，並即時連動顯示) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900">
                01. 選手基本資料登記
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Participant Name (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>參賽姓名 / 稱呼 <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-emerald-600 font-medium">必填</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：王小明 或 Kevin"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                請輸入比賽現場選手點名與分組表顯示的姓名或暱稱。
              </p>
            </div>

            {/* Email (Required, directly input) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>聯絡信箱 (Email) <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-emerald-600 font-medium">必填 (供通知與辨識)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="例如：yourname@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                用於辨識同一位選手，日後若修改資料將以此信箱更新既有紀錄。
              </p>
            </div>

            {/* Gender Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                性別 (男雙/女雙/混雙分組依據) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {[
                  { value: 'male', label: '男士 (Male)' },
                  { value: 'female', label: '女士 (Female)' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value as Gender)}
                    className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      gender === g.value
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 打完姓名與 Mail 即時回饋顯示卡 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {name ? name.trim().charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">選手基本資料預覽：</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {name.trim() || '（請輸入上方姓名）'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  {email.trim() || '（請輸入上方聯絡信箱）'}
                  <span className="text-slate-400 mx-1.5">|</span>
                  <span className="text-slate-700 font-sans">
                    {gender === 'male' ? '男士 (Male)' : '女士 (Female)'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-lg shrink-0">
              ✓ 資料即時連動中
            </div>
          </div>
        </div>

        {/* Section 2: 程度評估模式選擇 (問卷 vs 官方直選) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900">
                02. 程度評估（依據台灣羽協 1-18 級標準）
              </h2>
            </div>

            {/* Toggle Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAssessmentMode('quiz')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  assessmentMode === 'quiz'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                新手友善：6題快問快答 (推薦)
              </button>
              <button
                type="button"
                onClick={() => setAssessmentMode('direct')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  assessmentMode === 'direct'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                老手直選：0~18級
              </button>
            </div>
          </div>

          {/* Mode A: 6-Question Quiz */}
          {assessmentMode === 'quiz' && (
            <div className="space-y-6">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 sm:p-3.5 text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>新手不知自己幾級？沒關係！</strong>
                  請依您的直覺與平日打球習慣點選最符合的描述（完全沒打過可直接選第 1 項），系統將自動換算您的台灣羽協分級。
                </span>
              </div>

              <div className="space-y-5 sm:space-y-6">
                {COACH_QUIZ_QUESTIONS.map((q, qIndex) => {
                  const currentSelected = quizAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-2.5 sm:space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-[11px] sm:text-xs font-bold text-emerald-700 tracking-wide uppercase">
                          第 {qIndex + 1} 題 · {q.coachNote}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {q.title}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = currentSelected === opt.scoreLevel;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectQuizOption(q.id, opt.scoreLevel)}
                              className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold leading-tight">
                                  {opt.label}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                                {opt.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode B: Direct Level Selection 0-18 */}
          {assessmentMode === 'direct' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                如果您常打臨打或羽球賽事，熟知自己的分級，可直接從下方 0 到 18 級中點選：
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2">
                {Array.from({ length: 19 }, (_, i) => i).map((lvl) => {
                  const isSelected = directLevel === lvl;
                  const tier = getTierByLevel(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDirectLevel(lvl)}
                      className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-extrabold">Lv {lvl}</span>
                      <span
                        className={`text-[9px] sm:text-[10px] mt-0.5 truncate max-w-full px-1 rounded ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {lvl === 0 ? '超新手' : tier.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected level explanation card */}
              <div
                className={`p-4 rounded-xl border ${currentTier.colorClass.border} ${currentTier.colorClass.bg}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded ${currentTier.colorClass.badge}`}
                  >
                    {currentTier.name} (第 {directLevel} 級)
                  </span>
                  <span className="text-xs text-slate-600">{currentTier.experience}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-medium">
                  {currentLevelDesc}
                </p>
              </div>
            </div>
          )}

          {/* Real-time Coach Diagnosis Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  目前評估結果
                </span>
                <span className="text-xs text-slate-400">· 台灣羽協分級制度</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  第 {activeLevel} 級
                </span>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${currentTier.colorClass.badge}`}
                >
                  {currentTier.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {currentLevelDesc}
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs text-xs space-y-1 shrink-0 w-full md:w-auto">
              <p className="font-bold text-emerald-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                賽事分組預估：
              </p>
              <p className="text-slate-200">
                {activeLevel === 0 && '安排在「超新手體驗組」，人人平等體驗羽球樂趣，完全不擔心跟不上！'}
                {activeLevel >= 1 &&
                  activeLevel <= 3 &&
                  '安排在「歡樂推廣組」，對抗同級新手，體驗羽球來回樂趣！'}
                {activeLevel >= 4 &&
                  activeLevel <= 6 &&
                  '安排在「實力挑戰組」，適合一般零打中下程度，攻守有來有回！'}
                {activeLevel >= 7 &&
                  '安排在「菁英旗艦組」或「同級循環雙打」，發揮戰力核心角色！'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: 特殊需求或給主辦人的叮嚀 (選填) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>03. 特殊需求或給主辦人的叮嚀 (選填)</span>
            </h2>
          </div>

          <div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：後場長球與殺球為主，希望搭檔擅長網前小球或防守；或者膝蓋有舊傷移動稍慢..."
              className="w-full p-3.5 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              若無特殊需求可留空，主辦人後台將依照每位選手的戰力級數進行最佳化公平雙打分組。
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>點擊下方按鈕將即時寫入雲端資料庫，主辦人後台立刻可見！</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {isSubmitting ? (
              <span>雲端資料庫儲存中...</span>
            ) : (
              <>
                <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                <span>{existingSubmission ? '更新我的自評資料' : '確認送出羽球自評表'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
