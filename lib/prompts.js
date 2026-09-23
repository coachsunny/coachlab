export const FRAMEWORKS = {
  nvc: {
    id: "nvc",
    name: "非暴力沟通 (NVC)",
    subtitle: "四要素：观察、感受、需要、请求",
    description: "由马歇尔·卢森堡博士创立。通过专注于无评判的事实观察、深层情绪、普世心理需求与具体正向请求，化解冲突并建立深刻连接。",
    steps: [
      { name: "1. 观察 (Observation)", desc: "清楚陈述具体发生的事实，不带任何评价、批判、诊断或推论。" },
      { name: "2. 感受 (Feeling)", desc: "坦率辨识内在的情绪状态（如失落、焦虑、欣慰），而非想法或受害者语言。" },
      { name: "3. 需要 (Need)", desc: "找出情绪背后普世的人性价值与心理需求（如安全感、尊重、自主、归属）。" },
      { name: "4. 请求 (Request)", desc: "提出具体、正向、当下可行且非强迫性的请求，区分请求与命令。" }
    ],
    tips: "避免说“你总是/你从不/我觉得你...”等评判语言。试着确认对方的感受与需要，而非急于给建议或辩解。"
  },
  satir_iceberg: {
    id: "satir_iceberg",
    name: "萨提亚/萨提尔冰山模型 (Satir Iceberg)",
    subtitle: "从水面应对姿态，潜入深层期待与渴望",
    description: "由维琴尼亚·萨提亚创立。将人的内在比喻为冰山，外在行为与事件只是水面上的一角，水面下隐藏着丰富的感受、信念、期待、内在渴望与生命力自我。",
    steps: [
      { name: "水面上：行为与事件", desc: "外显的言行、动作与引发的情境事件。" },
      { name: "应对姿态", desc: "指责型、讨好型、超理智型、打岔型。探索其惯用的保护机制。" },
      { name: "感受与感受的感受", desc: "身体与情绪反应，以及对自我有此感受的态度（如因生气而感到自责）。" },
      { name: "观点与信念", desc: "深植的信念、规条、假设、偏见（如“我不能示弱”、“事情没做好就是无能”）。" },
      { name: "期待", desc: "对自己的期待、对他人的期待、他人对自己的期待。" },
      { name: "渴望", desc: "人类核心精神渴望：被爱、被接纳、被看见、自由、价值感、连接。" },
      { name: "自我 (Self)", desc: "核心本质、生命力、灵性价值。" }
    ],
    tips: "不要停留在指责或讲道理的表面姿态，带着好奇与温度，一层层往下探寻对方“真正渴望被看见的是什么”。"
  },
  grow: {
    id: "grow",
    name: "GROW 教练模型",
    subtitle: "Goal 目标 → Reality 现状 → Options 方案 → Will 意愿",
    description: "约翰·惠特默爵士发展的经典企业教练模型。协助被教练者从明确目标出发，厘清客观现实，自主发散多元方案，并落实为具体承诺与行动。",
    steps: [
      { name: "G (Goal) 目标", desc: "聚焦具体、可衡量、具挑战性且有意义的成果目标。" },
      { name: "R (Reality) 现状", desc: "客观检视目前的实际状况、已采取的尝试、内部与外部阻碍及盲点。" },
      { name: "O (Options) 方案", desc: "发散思考、破除框架，鼓励对方提出各种可能性，暂不批判可行性。" },
      { name: "W (Will/Way Forward) 意愿", desc: "选择最优方案，设定具体时程、检核点与需要的支援，确立自主承诺。" }
    ],
    tips: "身为教练，多用开放式提问（什么、如何、还有呢？），少给指导棋，让对话者自己产出答案与责任感。"
  },
  orid: {
    id: "orid",
    name: "ORID 焦点讨论法",
    subtitle: "客观见 → 反映感 → 诠释思 → 决定行",
    description: "结构化对话流程，遵循大脑自然认知节奏，从事实数据、情感直觉、意义价值到最终具体决策，引导团队或个人深度思考。",
    steps: [
      { name: "O (Objective) 客观事实", desc: "看到什么？听到什么？发生了哪些具体事实？" },
      { name: "R (Reflective) 反映感性", desc: "第一反应是什么？感到惊讶、兴奋、困惑还是抗拒？" },
      { name: "I (Interpretive) 诠释意义", desc: "这代表了什么？有什么深层含义？学到了什么关键？" },
      { name: "D (Decisional) 决定行动", desc: "我们的结论是什么？下一步具体该怎么做？" }
    ],
    tips: "按顺序推进，切忌跳过 O 与 R 直接讨论 D，确保对话奠基于共同事实与真实情感之上。"
  },
  sfbc: {
    id: "sfbc",
    name: "焦点解决教练 (SFBC)",
    subtitle: "专注于解决之道、微小成功与资源赋能",
    description: "不钻研问题发生的历史与过错，而是关注“想要达到的未来”、“过去有用的例外经验”以及“当下能迈出的微小一步”。",
    steps: [
      { name: "奇迹提问 (Miracle Question)", desc: "想象如果今晚发生了奇迹，问题完全解决了，明天醒来会有什么不同？" },
      { name: "评量提问 (Scaling 1-10)", desc: "如果 10 分是完全理想，1 分是最糟，你现在在几分？如何从 4 分进步到 5 分？" },
      { name: "例外提问 (Exceptions)", desc: "在过去什么时候，这个问题比较不严重，或是情况好一些？当时你做了什么？" },
      { name: "赞美与赋能 (Compliments)", desc: "真诚看见对方的优势、努力与已经拥有的资源。" }
    ],
    tips: "避免追问“为什么会犯错”，改问“你希望发生什么？”以及“什么时候事情稍微顺利一点？”"
  },
  custom: {
    id: "custom",
    name: "自定义沟通模式",
    subtitle: "依据使用者自定义之原则与教练架构",
    description: "支持自由指定企业内部 SOP、共情原则或专属谈话流程。",
    steps: [],
    tips: "系统将根据您在设置中输入的自定义原则进行引导与复盘评估。"
  }
};

/**
 * 建立练习对象 AI 角色扮演 Prompt
 */
export function buildRoleplaySystemPrompt({ targetName, targetRole, traits, scenario, initialMood, difficulty, frameworkId, customFrameworkPrompt }) {
  const framework = FRAMEWORKS[frameworkId] || FRAMEWORKS.nvc;
  
  const difficultyNotes = {
    beginner: "【难度：初学温和】角色具备防卫或负面情绪，但只要使用者展现出基本的倾听与共情、不带敌意的询问，角色会相对较快卸下防备，愿意坦诚交流。",
    realistic: "【难度：写实逼真】角色如现实中的真实人类。若使用者说话带有指责、评价、说教或命令语气，角色会本能反弹、防卫或冷淡；若使用者持续运用深层倾听、确认感受与需要、营造心理安全感，角色会逐步打开心扉、展现软化。",
    challenging: "【难度：高难挑战】角色防卫心重、说话可能带刺或极度被动防御，对虚假客套或说教非常敏感。使用者必须展现非常精准的教练技巧与高情商共情，才能逐步化解僵局。"
  }[difficulty || "realistic"];

  return `你是一位世界顶级的沟通模拟训练演员。在本次对话中，你【绝对不要】以 AI 助理身份说话，你必须【完全沉浸式角色扮演】使用者所设定的练习对象。

【角色设定】
- 角色称呼 / 姓名：${targetName || "小陈"}
- 角色身份与关系：${targetRole || "团队成员 / 下属"}
- 性格特质与心理防卫机制：${traits || "做事认真但自尊心强，防卫心重，害怕承担责任被惩罚，习惯找借口或沉默"}
- 当前冲突情境 / 背景事件：${scenario || "上周承诺要完成的项目进度延误了三天，现在主管（使用者）找他谈话"}
- 初始情绪与态度：${initialMood || "紧绷、戒备、说话简短且带有防御心"}

【难度等级设定】
${difficultyNotes}

【演绎指引】
1. 完全代入该角色的心境、语气与心理状态。对话请使用地道通顺的简体中文（自然口语对话，不要文绉绉或打官腔，也不要一次长篇大论）。
2. 对话长度：每次回话通常在 1 到 3 句话左右（真实口语对话节奏），除非情绪激动倾诉。
3. 心理反馈机制：
   - 若使用者使用“说教”、“评判”、“你为什么不…”、“你应该…”或假装共情，角色应本能地感到不适，表现出辩解、冷淡、敷衍或委屈。
   - 若使用者给予真实的倾听、好奇探索、不带批判地描述事实、询问内在感受或需求，角色会从紧绷中感受到安全感，渐渐流露真实的担忧与想法。
4. 在每次回复的最后，请附上一行特殊的内心状态标签（这会帮助系统在画面上显示给使用者当前你的心理转折）：
   格式为：
   <!--inner: 当前心理状态，例如：防卫心略降 20%，感到主管没有一开口就责备，但依然担心受惩罚-->
   请确保该标签在回复的最末尾。`;
}

/**
 * 建立即时教练锦囊 (Coach Hint) Prompt
 */
export function buildCoachHintPrompt({ frameworkId, customFrameworkPrompt, targetName, targetRole, scenario, transcript }) {
  const framework = FRAMEWORKS[frameworkId] || FRAMEWORKS.nvc;
  const frameworkDetail = frameworkId === "custom" && customFrameworkPrompt ? customFrameworkPrompt : framework.description;

  return `你是一位资深的高级教练督导（Master Certified Coach）。
使用者正在与练习对象进行对话练习，现在使用者在对话中感到卡关，向你求助“教练锦囊提示”。

【当前练习设定】
- 选用理论模型：${framework.name}（${framework.subtitle}）
- 理论核心原则：${frameworkDetail}
- 练习对象：${targetName} (${targetRole})
- 背景情境：${scenario}

【对话迄今记录】
${transcript}

【你的督导任务】
请以温暖、启发性且敏锐的视角，为使用者提供当下回复的“即时锦囊”，字数约 180~250 字，结构包含：
1. 💡【对象现状心态读取】：对方刚才那句话背后的真实情绪、防卫姿态或潜台词是什么？
2. 🎯【本架构切入焦点】：依据“${framework.name}”，此时此刻教练最适合施展的核心心法或步骤是什么？（例如：不要急于给方案，先确认感受；或探索冰山下的渴望）
3. 🚀【推荐三种提问/回应方向】：
   - 方向 A（共情/确认）：例句构想
   - 方向 B（深层好奇探索）：例句构想
   - 方向 C（推进或赋能）：例句构想

请使用简体中文，亲切且精炼有力。`;
}

/**
 * 建立练习后全方位评估报告 (Evaluation) Prompt
 */
export function buildEvaluationPrompt({ frameworkId, customFrameworkPrompt, targetName, targetRole, scenario, difficulty, transcript }) {
  const framework = FRAMEWORKS[frameworkId] || FRAMEWORKS.nvc;
  const frameworkDetail = frameworkId === "custom" && customFrameworkPrompt ? customFrameworkPrompt : framework.description;

  return `你是一位顶尖的教练评审与沟通分析专家（ICF 考官级别）。
使用者刚完成了一场“沟通/教练对话实战模拟练习”。请你根据完整的对话记录，以“${framework.name}”为核心基准，为使用者产出一份专业、客观、具体、富含启发性的诊断评估报告。

【练习设定】
- 运用架构：${framework.name}（${framework.subtitle}）
- 架构核心原则：${frameworkDetail}
- 练习对象：${targetName}（${targetRole}）
- 背景事件：${scenario}
- 难度等级：${difficulty}

【完整对话记录】
${transcript}

【评估要求】
请深入剖析使用者在各个回合中的提问技术、共情品质、心态姿态、节奏把控，并严格以简体中文输出符合以下 JSON Schema 的纯 JSON 格式（不要使用 markdown 代码块外的多余文字）：

{
  "overallScore": number (0-100 总评分),
  "overallLevel": string ("精熟大师" | "优秀教练" | "具备雏形" | "起步探索"),
  "dimensionScores": {
    "frameworkProficiency": number (0-100, 理论架构掌握度),
    "empathyListening": number (0-100, 共情心与深度倾听),
    "powerfulQuestioning": number (0-100, 有力提问与启发性),
    "psychologicalSafety": number (0-100, 心理安全感营造),
    "forwardMomentum": number (0-100, 推进与责任赋能)
  },
  "summary": string (约 120-180 字的总体评价与肯定赞赏),
  "strengths": [
    {
      "title": string (亮点标题),
      "quote": string (精确引用使用者在对话中所说的具体原话),
      "analysis": string (深入分析这句话为什么好？它如何符合了 ${framework.name} 或高情商沟通原则？对对象产生了何种正面效果？)
    }
  ],
  "growthAreas": [
    {
      "title": string (改善机会标题),
      "quote": string (精确引用使用者在对话中表现未臻完善或引发防卫的原话),
      "impact": string (分析这句话的问题所在，例如是否陷入评判、急于给建议、封闭式提问，以及对象当下的反弹或抗拒),
      "betterAlternative": string (为使用者打造的示范金句，提供更好的替换说法),
      "rationale": string (说明为什么示范金句更能发挥 ${framework.name} 的威力)
    }
  ],
  "frameworkDeepDive": {
    "frameworkName": "${framework.name}",
    "stageAnalysis": string (针对此模型各要素或冰山层级的探讨深度分析，例如：是否停留在表层、何时触及深层需求),
    "keyTakeaway": string (此理论最核心的心法提醒)
  },
  "deliberatePracticeTips": [
    string (具体可落地的刻意练习建议 1),
    string (具体可落地的刻意练习建议 2),
    string (具体可落地的刻意练习建议 3)
  ]
}

请确保 strengths 与 growthAreas 各至少提供 2 个具体实例，必须精确引用对话中的真实原句！`;
}
