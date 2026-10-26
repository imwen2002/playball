import React, { useState } from 'react';
import { BADMINTON_TIERS } from '../data/badmintonTiers';
import { X, ZoomIn, Info, Shield, CheckCircle } from 'lucide-react';

interface OfficialChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel?: (level: number) => void;
  selectedLevel?: number;
}

export const OfficialChartModal: React.FC<OfficialChartModalProps> = ({
  isOpen,
  onClose,
  onSelectLevel,
  selectedLevel,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'image'>('table');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>台灣羽球推廣協會羽球程度分級制度</span>
              <span className="text-xs text-slate-500 font-normal">21.04.19 更新官方標準</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              本賽事評估基準：0~18級完整標準與詳細各球路技術說明
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                互動對照表
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'image' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                原始圖片
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'image' ? (
            <div className="flex flex-col items-center justify-center p-2 bg-slate-100 rounded-xl border border-slate-200">
              <img
                src="/public/assets/aistudio/S__139280542_e48f0cef.jpg"
                alt="台灣羽球推廣協會羽球程度分級制度圖"
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                台灣羽球推廣協會官方分級標準圖檔
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {BADMINTON_TIERS.map((tier) => (
                <div
                  key={tier.tierId}
                  className={`border rounded-xl p-4 transition-all ${tier.colorClass.border} ${tier.colorClass.bg}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${tier.colorClass.badge}`}>
                        {tier.name}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        級數：{tier.levels.join('、')} 級
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-medium">
                      {tier.experience}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {tier.levels.map((lvl) => {
                      const isSelected = selectedLevel === lvl;
                      return (
                        <div
                          key={lvl}
                          onClick={() => onSelectLevel && onSelectLevel(lvl)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            onSelectLevel ? 'cursor-pointer hover:scale-[1.01]' : ''
                          } ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                              : 'bg-white/90 hover:bg-white text-slate-900 border-slate-200/90 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              第 {lvl} 級
                            </span>
                            {isSelected && (
                              <span className="text-[11px] font-bold text-emerald-100 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> 已選定
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs leading-relaxed ${
                              isSelected ? 'text-white' : 'text-slate-700'
                            }`}
                          >
                            {tier.levelDescriptions[lvl]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>點擊任一級數卡片即可在問卷中直接採用</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            關閉視窗
          </button>
        </div>

      </div>
    </div>
  );
};
