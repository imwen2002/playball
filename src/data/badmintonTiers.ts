import { TierInfo } from '../types';

export const BADMINTON_TIERS: TierInfo[] = [
  {
    tierId: 'tier-1',
    name: '新手階',
    levels: [1, 2, 3],
    experience: '球齡一年內，對於規則、場地、發力皆不熟悉',
    colorClass: {
      bg: 'bg-emerald-50 hover:bg-emerald-100/80',
      border: 'border-emerald-300',
      text: 'text-emerald-950',
      badge: 'bg-emerald-600 text-white',
    },
    levelDescriptions: {
      1: '剛接觸羽球學會比賽規則，並懂得比賽禮儀',
      2: '在中場距離中高球來回10拍，發球有一半以上成功率',
      3: '定點有一半可以打到2/3場後，發球有九成以上成功率',
    },
  },
  {
    tierId: 'tier-2',
    name: '初階',
    levels: [4, 5],
    experience: '球齡1~3年，一般零打團之初階',
    colorClass: {
      bg: 'bg-rose-50 hover:bg-rose-100/80',
      border: 'border-rose-300',
      text: 'text-rose-950',
      badge: 'bg-rose-600 text-white',
    },
    levelDescriptions: {
      4: '清楚正確握拍法。長球男生定點可以打到後場，女生可以打到中後場；會基本平推；正反轉拍不順暢。',
      5: '清楚正確握拍法，略懂基本腳步，基本球路在非受迫時有特定的表現',
    },
  },
  {
    tierId: 'tier-3',
    name: '初中階',
    levels: [6, 7],
    experience: '球齡3~5年，一般零打團之中下',
    colorClass: {
      bg: 'bg-amber-50 hover:bg-amber-100/80',
      border: 'border-amber-300',
      text: 'text-amber-950',
      badge: 'bg-amber-600 text-white',
    },
    levelDescriptions: {
      6: '清楚正確握拍法，略懂基本腳步，並懂得基本輪轉，尚不熟練，已開始會殺球及切球，非受迫時移動長球可至中後場',
      7: '殺球、切球或長球不論是定點或移動，成功率及穩定性有七成以上。已有基本防守能力，但無變化。',
    },
  },
  {
    tierId: 'tier-4',
    name: '中階',
    levels: [8, 9],
    experience: '球齡5~10年，一般零打團之中階',
    colorClass: {
      bg: 'bg-orange-50 hover:bg-orange-100/80',
      border: 'border-orange-300',
      text: 'text-orange-950',
      badge: 'bg-orange-600 text-white',
    },
    levelDescriptions: {
      8: '有基本戰略及打點，熟悉輪轉概念，切殺長吊均有七成以上準確性，防守有些微變化。',
      9: '切殺長吊中有三種球路有九成以上準確性及質量，發力及力道已有強度，防守要有一定程度的變化及穩定性',
    },
  },
  {
    tierId: 'tier-5',
    name: '中進階',
    levels: [10, 11, 12],
    experience: '球齡10年以上，一般零打團之中上',
    colorClass: {
      bg: 'bg-sky-50 hover:bg-sky-100/80',
      border: 'border-sky-300',
      text: 'text-sky-950',
      badge: 'bg-sky-600 text-white',
    },
    levelDescriptions: {
      10: '輪轉概念熟念並能活化運用，策略性戰略及打點皆能有效得分',
      11: '切殺長吊皆具準確性，發力及速度、策略兼具，輕鬆完成反拍各種球路。防守具有威脅性。',
      12: '有高速度移位及靈敏地走位與步法，殺切吊都具有高強度侵略性，常有一擊必殺的球路',
    },
  },
  {
    tierId: 'tier-6',
    name: '高階',
    levels: [13, 14, 15],
    experience: '校隊前段、體保、社會甲組等',
    colorClass: {
      bg: 'bg-slate-100 hover:bg-slate-200/80',
      border: 'border-slate-400',
      text: 'text-slate-950',
      badge: 'bg-slate-800 text-white',
    },
    levelDescriptions: {
      13: '校隊或社會甲組水準，球路穩定熟練，球速快且具戰術組織能力',
      14: '各種球路都穩定熟練，防守無死角、球速快質量高、戰略組織、爆發力都屬上等',
      15: '社會甲組前列實力，具備頂尖連續進攻與無死角防守變線能力',
    },
  },
  {
    tierId: 'tier-7',
    name: '職業級',
    levels: [16, 17, 18],
    experience: '甲組、國家代表選手',
    colorClass: {
      bg: 'bg-zinc-900 hover:bg-black',
      border: 'border-zinc-700',
      text: 'text-zinc-100',
      badge: 'bg-amber-400 text-zinc-950',
    },
    levelDescriptions: {
      16: '全國甲組職業水準，擊球點與速度達到職業水準',
      17: '各種球路、戰術、步法已爐火純青，且發展出個人獨特球路風格',
      18: '國家代表隊、國際頂級職業聯賽水準',
    },
  },
];

export function getTierByLevel(level: number): TierInfo {
  const found = BADMINTON_TIERS.find((t) => t.levels.includes(level));
  return found || BADMINTON_TIERS[0];
}

export function getLevelDescription(level: number): string {
  const tier = getTierByLevel(level);
  return tier.levelDescriptions[level] || '自訂評估程度';
}
