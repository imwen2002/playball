import { QuizQuestion } from '../types';

export const COACH_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1_experience',
    title: '1. 您的球齡與平時打球頻率？',
    coachNote: '教練解析：球齡與實戰經驗是肌肉記憶與臨場反應的基礎指標。',
    iconName: 'calendar',
    options: [
      {
        label: '完全沒打過 / 第一次拿羽球拍',
        description: '純粹想流汗體驗運動樂趣，完全無球齡經驗',
        scoreLevel: 0,
      },
      {
        label: '剛接觸 / 1年以內，偶爾運動才打',
        description: '還在熟悉規則與場地，打球頻率每月1次或更少',
        scoreLevel: 1.5,
      },
      {
        label: '打過 1~2 年，平均每個月打 1~2 次',
        description: '大致了解規則，會跟朋友打歡樂休閒局',
        scoreLevel: 3.5,
      },
      {
        label: '球齡 2~3 年，每週固定打 1~2 次羽球',
        description: '有參加民間零打團或固定球隊，懂得基本球路',
        scoreLevel: 5,
      },
      {
        label: '球齡 3~5 年以上，每週固定打 2 次以上',
        description: '經常零打或隊內對抗賽，熟悉雙打節奏',
        scoreLevel: 7,
      },
      {
        label: '球齡 5~10 年以上，長期征戰各大零打團',
        description: '實戰經驗豐富，具備穩定的體能與球感',
        scoreLevel: 9,
      },
      {
        label: '10年以上 / 曾受過專業校隊、系隊嚴格訓練',
        description: '底子深厚，動作標準，球路敏銳',
        scoreLevel: 11.5,
      },
    ],
  },
  {
    id: 'q2_serve',
    title: '2. 發球與基本中場對打能力？',
    coachNote: '教練解析：發球是羽球唯一不受對手干擾的技術，也是新手入門第一道門檻。',
    iconName: 'target',
    options: [
      {
        label: '完全不會發球 / 經常揮空或過不了網',
        description: '不知道發球規則或拋球打不到，需要手把手教學',
        scoreLevel: 0,
      },
      {
        label: '發球容易掛網或出界，中場來回偶爾揮空',
        description: '發球成功率約一半左右，需要多一點專注',
        scoreLevel: 1.5,
      },
      {
        label: '發球有9成以上成功率，中場能穩定對打5~10拍',
        description: '只要球速不快，能穩穩把球打回對方場地',
        scoreLevel: 3,
      },
      {
        label: '能掌握正手高遠發球與反手小球，失誤率低',
        description: '中場平抽擋與高球能連續來回15拍以上不失誤',
        scoreLevel: 5,
      },
      {
        label: '發球能壓在發球線邊緣，且會變換偷發後場球',
        description: '具備發接發搶前三拍主動權意識',
        scoreLevel: 7.5,
      },
      {
        label: '發球質量高、貼網過且落點精準，極少送分',
        description: '發接發能精準算計對手站位與破綻',
        scoreLevel: 10,
      },
    ],
  },
  {
    id: 'q3_clear',
    title: '3. 你的底線長球（高遠球）能打多遠？',
    coachNote: '教練解析：長球考驗發力協調性（側身引拍、內旋甩腕）。是區分新手與初中階的關鍵！',
    iconName: 'arrow-up-right',
    options: [
      {
        label: '完全沒概念 / 手臂沒力打不遠',
        description: '羽球只在自己身前落下，還不知道如何用身體協調發力',
        scoreLevel: 0,
      },
      {
        label: '多半只能打到「中場」，打不到對手後場',
        description: '常靠手臂硬揮，容易手痠且球飛不遠',
        scoreLevel: 2,
      },
      {
        label: '男生可打到後場 / 女生定點可打到中後場',
        description: '定點站好時能打出弧度，但被壓迫移位時容易變短球',
        scoreLevel: 4,
      },
      {
        label: '非受迫移動下，長球能穩定打到對方後場底線',
        description: '能打出夠高夠深的底線球，幫自己爭取回防時間',
        scoreLevel: 6,
      },
      {
        label: '不論定點或前後跑動，長球落點穩定度在七成以上',
        description: '可隨心所欲打平高球或防守高遠球，壓制對手底線兩角',
        scoreLevel: 7.5,
      },
      {
        label: '切殺長吊落點皆具九成以上準確性，且反手也能打到底線',
        description: '具備反手後場回擊能力，不畏懼被推底線反手區',
        scoreLevel: 10.5,
      },
    ],
  },
  {
    id: 'q4_attack',
    title: '4. 握拍方式與進攻球路（殺球、切球、平推）？',
    coachNote: '教練解析：正確菜刀握拍法與正反手轉拍，是進階殺球與下壓攻擊的基礎。',
    iconName: 'zap',
    options: [
      {
        label: '完全沒學過握拍 / 只會像蒼蠅拍般推碰球',
        description: '不知道正反手握拍區別，只希望球能碰過網就好',
        scoreLevel: 0,
      },
      {
        label: '用同一種像拿蒼蠅拍的方式握拍，正反拍切換不順',
        description: '還不太會殺球或切球，主要是用推擋碰回對面',
        scoreLevel: 2,
      },
      {
        label: '清楚正確握拍法，會基本平推，開始嘗試殺球或切球',
        description: '知道球要往下壓，但力道與角度還不夠刁鑽',
        scoreLevel: 4.5,
      },
      {
        label: '殺球、切球定點或移動有七成以上成功率，球速有出來',
        description: '有攻擊下壓威脅，但對手若擋回來時第二拍可能措手不及',
        scoreLevel: 6.5,
      },
      {
        label: '切殺長吊落點刁鑽，能打出速差與角度，連續進攻不中斷',
        description: '殺球有力道、切球貼網，有主動得分的終結能力',
        scoreLevel: 8.5,
      },
      {
        label: '具備一擊必殺重砲或假動作切停，殺球帶穿透力',
        description: '球速快、質量高、落點控制在邊線內側，極具侵略性',
        scoreLevel: 11,
      },
    ],
  },
  {
    id: 'q5_footwork',
    title: '5. 場上的跑動步伐與接殺防守？',
    coachNote: '教練解析：羽球「七分步伐三分手法」，步法順暢才能跑到位迎球，防守才能頂住攻擊。',
    iconName: 'footprints',
    options: [
      {
        label: '場上完全不會跑動 / 不知道要站哪裡',
        description: '看到球飛過來容易呆住或慢半拍，步伐還未建立',
        scoreLevel: 0,
      },
      {
        label: '球過來才看著跑，常常煞不住或跌跌撞撞',
        description: '對手殺球過來大多反應不及，容易驚慌失措',
        scoreLevel: 2,
      },
      {
        label: '略懂基本米字步，定點接球順暢，對手殺球能擋個幾拍',
        description: '已有些許防守能力，但對手如果變速或變線就會失位',
        scoreLevel: 5,
      },
      {
        label: '步伐順暢、能及時回中，面對重殺能穩定挑回後場或分球',
        description: '防守穩定度達七成以上，已具備初步反擊概念',
        scoreLevel: 7,
      },
      {
        label: '移位敏捷，防守有變化（挑底線、推腰身、放網前）',
        description: '防守不僅不失分，還能轉守為攻創造反撲機會',
        scoreLevel: 9,
      },
      {
        label: '防守幾近無死角，腳步輕盈快速，常能魚躍救球並迅速回位',
        description: '高強度攻防戰中步法依然節奏分明，體能充沛',
        scoreLevel: 11.5,
      },
    ],
  },
  {
    id: 'q6_doubles_rotation',
    title: '6. 雙打輪轉觀念與默契走位？',
    coachNote: '教練解析：公司比賽多為雙打！是否懂得「進攻前後、防守左右、誰接誰跑」，對分組最關鍵！',
    iconName: 'users',
    options: [
      {
        label: '完全沒打過雙打 / 毫無走位觀念',
        description: '不知道雙打規則與防守站位，只負責打自己面前的球',
        scoreLevel: 0,
      },
      {
        label: '不太懂雙打站位，常跟隊友卡在同一邊或差點撞拍',
        description: '球在中間時常猶豫「這球是你打還是我打？」',
        scoreLevel: 2,
      },
      {
        label: '懂基本觀念（發球後一人前一人後，被挑球各站一邊防守）',
        description: '知道大概位置，但高速來回時輪轉仍會稍顯混亂',
        scoreLevel: 5,
      },
      {
        label: '熟悉輪轉觀念，能順暢攻防補位（隊友後退我上前、隊友撲球我補位）',
        description: '懂得封網做球給後場搭檔進攻，失誤少且有默契',
        scoreLevel: 7.5,
      },
      {
        label: '輪轉熟練靈活，善用戰術與打點，製造搭檔連續得分契機',
        description: '懂得根據對手弱點（如專打新手或女角空檔）進行策略調動',
        scoreLevel: 9.5,
      },
      {
        label: '雙打意識極高，前場封網壓制、後場重砲分球，戰術無縫接軌',
        description: '甲組或高階球隊雙打水準，帶領搭檔輕鬆掌控比賽節奏',
        scoreLevel: 11.5,
      },
    ],
  },
];

export function calculateQuizLevel(answers: Record<string, number>): number {
  const values = Object.values(answers);
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / values.length;
  // Support 0 to 18 integer levels
  const finalLevel = Math.max(0, Math.min(18, Math.round(avg)));
  return finalLevel;
}
