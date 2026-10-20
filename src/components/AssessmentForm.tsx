import React, { useState, useEffect } from 'react';
import { UserAccount, PlayerSubmission, Gender, AssessmentMode } from '../types';
import { COACH_QUIZ_QUESTIONS, calculateQuizLevel } from '../data/coachQuiz';
import { BADMINTON_TIERS, getTierByLevel, getLevelDescription } from '../data/badmintonTiers';
import confetti from 'canvas-confetti';
import {
  Lock,
  User,
  Mail,
  Sparkles,
  CheckCircle2,
  Send,
  Award,
  Shield,
  MessageSquare
} from 'lucide-react';

interface AssessmentFormProps {
  user: UserAccount | null;
  onOpenLogin: () => void;
  onSubmitPlayer: (submission: PlayerSubmission) => void;
  existingSubmission?: PlayerSubmission | null;
  onViewOfficialChart: () => void;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  user,
  onOpenLogin,
  onSubmitPlayer,
  existingSubmission,
  onViewOfficialChart,
}) => {
  // Form fields
  const [name, setName] = useState(user?.name || '');
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

  // Success state
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Sync user name when user logs in
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user]);

  // Load existing submission if any
  useEffect(() => {
    if (existingSubmission) {
      setName(existingSubmission.name);
      setGender(existingSubmission.gender);
      setDominantHand(existingSubmission.dominantHand);
      const initialNotes = existingSubmission.notes === '後場長球與殺球為主，希望搭檔擅長網前小球或防守' ? '' : (existingSubmission.notes || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.isSignedIn) {
      onOpenLogin();
      return;
    }

    if (!name.trim()) {
      alert('請填寫您的姓名或參賽稱呼！');
      return;
    }

    const submission: PlayerSubmission = {
      id: existingSubmission?.id || `player-${Date.now()}`,
      email: user.email, // Locked from Google
      name: name.trim(),
      gender,
      dominantHand,
      level: activeLevel,
      tierName: currentTier.name,
      assessmentMode,
      quizAnswers: assessmentMode === 'quiz' ? quizAnswers : undefined,
      notes: notes.trim(),
      submittedAt: existingSubmission?.submittedAt || new Date().toLocaleString('zh-TW', { hour12: false }),
      updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
    };

    onSubmitPlayer(submission);
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
              羽球教練 賽事分組自評系統
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              義鼎杯羽球比賽．實力程度自評表
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              依據<strong className="text-white">「台灣羽球推廣協會 1~18 級制度」</strong>設計。透過簡單直覺的問卷，幫助主辦人精準掌握大家程度，安排實力最均衡、最刺激好玩的雙打組合，絕不讓新手被電，大家都能盡情享受羽球樂趣！
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onViewOfficialChart}
              className="px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-xs cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>查看官方 1~18 級圖表</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Login Status Alert if not signed in */}
      {(!user || !user.isSignedIn) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                請先登入 Google 帳號以綁定報名資格
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                系統將會自動讀取並顯示您的 Google Mail（該欄位將鎖定唯讀），姓名則可自由輸入，方便主辦人核對。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl shadow-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>點此進行 Google 登入</span>
          </button>
        </div>
      )}

      {/* Submission Success Banner */}
      {isSubmittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                評估資料已成功送出！
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                您的評估等級為：<span className="font-extrabold text-emerald-900">第 {activeLevel} 級 ({currentTier.name})</span>。主辦人後台已同步更新您的資料，賽前將依此為您安排最適當的隊友與對手！
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
        
        {/* Section 1: 參賽者帳號與基本資料 */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-base font-bold text-slate-900">
              01. 選手基本資料與帳號認證
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Google Email (Strictly Read-Only as requested) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Google 認證信箱 <span className="text-rose-500">*</span></span>
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  唯讀鎖定 · 不可修改
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={user?.email || '未登入 (請先完成 Google 登入)'}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-100 text-slate-600 border border-slate-200 rounded-xl cursor-not-allowed select-none font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                此欄位由 Google 登入授權提供，保障真實身份與防範重複灌票。
              </p>
            </div>

            {/* Participant Name (Editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>參賽姓名 / 稱呼 <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-emerald-600 font-medium">可自行修改</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：王小明 或 Kevin"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                請填寫方便同事與主辦人識別的姓名或暱稱。
              </p>
            </div>

            {/* Gender Selection (Strictly Male and Female only, "other" removed) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                性別 (供男雙/女雙/混雙分組依據) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
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

            {/* Dominant Hand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                慣用手 (雙打走位默契參考)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'right', label: '右手持拍' },
                  { value: 'left', label: '左手持拍 (黃金左手)' },
                ].map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setDominantHand(h.value as 'right' | 'left')}
                    className={`py-2.5 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      dominantHand === h.value
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: 程度評估模式選擇 (問卷 vs 官方直選) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900">
                02. 程度評估（台灣羽協 1-18 級制度）
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAssessmentMode('quiz')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  assessmentMode === 'quiz'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>教練快問快答 (新手推薦)</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessmentMode('direct')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  assessmentMode === 'direct'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>官方 1~18 級圖表直選</span>
              </button>
            </div>
          </div>

          {/* Mode A: 教練直覺快問快答 */}
          {assessmentMode === 'quiz' && (
            <div className="space-y-6">
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">教練貼心提醒：</strong>
                  不用擔心羽球專有名詞！請依照平常在球場上的「真實情況」勾選以下 6 個情境，系統會立刻為您精算對應的羽協級數。
                </div>
              </div>

              <div className="space-y-6">
                {COACH_QUIZ_QUESTIONS.map((q) => (
                  <div key={q.id} className="border border-slate-200/80 rounded-xl p-4 sm:p-5 bg-slate-50/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        {q.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 italic">
                        {q.coachNote}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => {
                        const isSelected = quizAnswers[q.id] === opt.scoreLevel;
                        return (
                          <div
                            key={oIndex}
                            onClick={() => handleSelectQuizOption(q.id, opt.scoreLevel)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div>
                                <p className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                  {opt.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {opt.description}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
                              約 {opt.scoreLevel} 級
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode B: 官方 1~18 級手動點選 */}
          {assessmentMode === 'direct' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  請直接對照「台灣羽球推廣協會」分級制度，點選最符合您目前實力的級數：
                </p>
                <button
                  type="button"
                  onClick={onViewOfficialChart}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  查看分級制度原圖
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                  const isSelected = directLevel === lvl;
                  const tier = getTierByLevel(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDirectLevel(lvl)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="block text-lg font-black tracking-tight">
                        第 {lvl} 級
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                        isSelected ? 'bg-white/20 text-white' : tier.colorClass.badge
                      }`}>
                        {tier.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected level explanation card */}
              <div className={`p-4 rounded-xl border ${currentTier.colorClass.border} ${currentTier.colorClass.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${currentTier.colorClass.badge}`}>
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
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${currentTier.colorClass.badge}`}>
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
                {activeLevel <= 3 && '安排在「歡樂推廣組」，對抗同級新手，體驗羽球來回樂趣！'}
                {activeLevel >= 4 && activeLevel <= 6 && '安排在「實力挑戰組」，適合一般零打中下程度，攻守有來有回！'}
                {activeLevel >= 7 && '安排在「菁英旗艦組」或「強帶弱互補雙打」，發揮戰力核心角色！'}
              </p>
            </div>
          </div>

        </div>

        {/* Section 3: 特殊需求或給主辦人的叮嚀 (參賽組別已拿掉，僅保留特殊需求) */}
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
              placeholder="後場長球與殺球為主，希望搭檔擅長網前小球或防守"
              className="w-full p-3.5 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              若無特殊需求可留空，主辦人後台將依照每位同仁的戰力級數進行最佳化公平分組。
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <span>提交後主辦人後台將即時接收您的自評資料，賽前可隨時回到此頁修改。</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>{existingSubmission ? '更新自評資料' : '確認送出羽球自評表'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
