(function () {
  var PROMISES = [
    { icon: 'fas fa-shield-halved', title: '数据安全', desc: '你的数据只属于你，未经授权我们不会访问' },
    { icon: 'fas fa-arrows-rotate', title: '持续迭代', desc: '产品在持续打磨，定期更新优化功能' },
    { icon: 'fas fa-heart', title: '用户至上', desc: '你的反馈驱动产品方向，每条建议都被认真对待' },
    { icon: 'fas fa-eye', title: '诚实透明', desc: 'AI能力有边界，我们如实说明，不夸大效果' }
  ];

  window.NuxAboutData = {
    challengeplanet: {
      home: '/challengeplanet/', appName: '星轨挑战', appIcon: '🌍', slogan: 'AI打卡教练',
      description: '用AI生成挑战计划，陪你坚持',
      story: ['改变很难，但有人陪你就不一样。立下的flag总是倒下，不是因为不够努力，而是缺少科学的方法和陪伴。', '星轨挑战用AI生成适合你的挑战计划，陪你一步步坚持——让改变真正发生。'],
      features: [
        { icon: 'fas fa-flag', title: 'AI挑战计划', desc: 'AI生成个性化挑战计划' },
        { icon: 'fas fa-check-circle', title: '打卡签到', desc: '每日打卡跟踪进度' },
        { icon: 'fas fa-users', title: '小队协作', desc: '组队挑战互相督促' },
        { icon: 'fas fa-trophy', title: '排行榜', desc: '排行激励持续坚持' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#8B5CF6', accentHover: '#7C3AED'
    },
    onenote: {
      home: '/onenote/', appName: '拾光', appIcon: '📖', slogan: '生活剖析笔记',
      description: '拾取光阴，洞见自己',
      story: ['生活值得被认真对待。我们记下开销、记录心情、追踪健康，却很少把它们连起来看。', '拾光帮你记录生活的每个维度，用AI剖析背后的规律——看见更好的自己。'],
      features: [
        { icon: 'fas fa-pen-to-square', title: '笔记管理', desc: '多维度生活笔记记录' },
        { icon: 'fas fa-robot', title: 'AI助手', desc: 'AI帮你剖析生活规律' },
        { icon: 'fas fa-chart-pie', title: '概览分析', desc: '开销健康情绪可视化' },
        { icon: 'fas fa-bell', title: '智能提醒', desc: '重要事项智能提醒' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#8b5cf6', accentHover: '#a78bfa'
    },
    wisepath: {
      home: '/wisepath/', appName: '智途志愿', appIcon: '🎓', slogan: '选对路，比不浪费分更重要',
      description: 'AI驱动的志愿填报与教育规划平台',
      story: ['高考志愿是人生关键决策。每年有百万考生在信息不对称中选错方向，把分数浪费在不适合的专业。', '智途志愿用AI打破信息壁垒，结合学生特质与院校数据，帮每个学生找到真正适合的方向——因为适合比分数更重要。'],
      features: [
        { icon: 'fas fa-graduation-cap', title: '志愿评估', desc: 'AI评估志愿匹配度与录取概率' },
        { icon: 'fas fa-comments', title: 'AI对话教练', desc: '一对一对话解答教育困惑' },
        { icon: 'fas fa-bullseye', title: '智能匹配', desc: '学生特质与院校专业精准匹配' },
        { icon: 'fas fa-chart-line', title: '学习计划', desc: '个性化学习计划与进度报告' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#059669', accentHover: '#10b981'
    },
    goldenfish: {
      home: '/goldenfish/', appName: '金鱼助手', appIcon: '🐟', slogan: '智能闲鱼交易助手',
      description: 'AI帮你选品定价、管理交易',
      story: ['闲置交易有学问。选品、定价、谈判，每一步都影响收益。', '金鱼助手用AI帮你洞察市场、智能定价、管理交易——闲置不闲置，卖得更省心。'],
      features: [
        { icon: 'fas fa-box', title: '选品库存', desc: '智能选品与库存管理' },
        { icon: 'fas fa-tag', title: '智能定价', desc: 'AI基于市场数据智能定价' },
        { icon: 'fas fa-comments', title: 'AI交易对话', desc: 'AI代理沟通谈判' },
        { icon: 'fas fa-shield', title: '风险管理', desc: '交易风险识别与预警' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#155e75', accentHover: '#0891b2'
    },
    lifecompass: {
      home: '/lifecompass/', appName: '司南', appIcon: '🧭', slogan: 'AI人生路径推演系统',
      description: '从目标出发，逆向规划可执行路径',
      story: ['人生需要方向感。我们定下目标，却不知道怎么到达；做了很多事，却看不清是否在正确的路上。', '司南用AI帮你从目标逆向推演路径，把模糊的愿景拆解成可执行的步骤，并记录每个关键决策——让每一步都通向你想去的地方。'],
      features: [
        { icon: 'fas fa-route', title: 'AI逆向推演', desc: '从目标出发，逆向规划可执行路径' },
        { icon: 'fas fa-timeline', title: '决策记录', desc: '全程记录关键决策与进展' },
        { icon: 'fas fa-lightbulb', title: '自动洞察', desc: 'AI自动洞察与复盘建议' },
        { icon: 'fas fa-calendar-check', title: '签到打卡', desc: '每日签到保持节奏' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#0d9488', accentHover: '#14b8a6'
    },
    golden: {
      home: '/golden/', appName: '金股智投', appIcon: '📈', slogan: '明察市场，稳健投资',
      description: 'AI驱动的股票分析与投资决策助手',
      story: ['投资不该靠感觉。市场信息瞬息万变，情绪化决策让多少人追涨杀跌。', '金股智投用AI帮你客观分析市场、记录投资逻辑、管理风险——让每一笔投资都有据可依。'],
      features: [
        { icon: 'fas fa-chart-line', title: '股票分析', desc: 'AI选股与技术分析' },
        { icon: 'fas fa-briefcase', title: '投资组合', desc: '组合管理与机会发现' },
        { icon: 'fas fa-book', title: '投资日志', desc: '投资逻辑记录与预警' },
        { icon: 'fas fa-robot', title: 'AI投资决策', desc: 'AI对话式投资决策助手' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#1d4ed8', accentHover: '#2563eb'
    },
    financialkg: {
      home: '/financialkg/', appName: '知识图谱平台', appIcon: '🕸️', slogan: 'AI驱动的知识抽取与智能问答',
      description: '从碎片信息中构建认知',
      story: ['信息爆炸时代，真正的知识来自关联。我们每天阅读大量新闻，却很难把信息连成体系。', '知识图谱用AI帮你从碎片信息中抽取实体、构建关联——让知识不再孤立。'],
      features: [
        { icon: 'fas fa-project-diagram', title: '实体关系提取', desc: 'AI抽取实体与关系构建图谱' },
        { icon: 'fas fa-sitemap', title: '图谱可视化', desc: '交互式图谱可视化分析' },
        { icon: 'fas fa-search', title: '智能搜索', desc: '基于图谱的智能问答' },
        { icon: 'fas fa-newspaper', title: '新闻分析', desc: '新闻实体抽取与关联分析' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#d97706', accentHover: '#f59e0b'
    },
    adsmart: {
      home: '/adsmart/', appName: '青鸟', appIcon: '📢', slogan: '智能广告投放系统',
      description: '用AI优化每一分预算的效果',
      story: ['广告投放需要数据驱动。但投放设置复杂、数据看不懂、优化无从下手。', '青鸟用AI帮你简化投放、读懂数据、持续优化——让每一分预算都花在刀刃上。'],
      features: [
        { icon: 'fas fa-wand-magic-sparkles', title: '智能中心', desc: 'AI投放策略智能生成' },
        { icon: 'fas fa-bullhorn', title: '投放管理', desc: '多渠道投放统一管理' },
        { icon: 'fas fa-chart-bar', title: '数据分析', desc: '效果数据可视化与优化建议' },
        { icon: 'fas fa-flask', title: 'AB测试', desc: '自动AB测试与模型训练' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#4e8cff', accentHover: '#3a7ae8'
    },
    resumeai: {
      home: '/resumeai/', appName: '跃职', appIcon: '💼', slogan: 'AI 职业伙伴',
      description: '用AI帮你讲好职业故事',
      story: ['求职是人生关键节点，但很多人不会展示自己。简历写不好、面试紧张、看不清职业方向。', '跃职用AI帮你梳理经历、构建简历、模拟面试——让每一份才华都被看见。'],
      features: [
        { icon: 'fas fa-file-lines', title: 'AI简历构建', desc: '对话式构建专业简历' },
        { icon: 'fas fa-palette', title: '多模板选择', desc: '多种简历模板自由切换' },
        { icon: 'fas fa-user-tie', title: '面试培训', desc: 'AI模拟面试与反馈' },
        { icon: 'fas fa-bell', title: '工作订阅', desc: '智能推荐匹配职位' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#6366f1', accentHover: '#818cf8'
    },
    geniusstudent: {
      home: '/geniusstudent/', appName: '天才学伴', appIcon: '📚', slogan: '懂孩子的 AI 学习伙伴',
      description: '每个孩子都值得一个懂他的学伴',
      story: ['学习不该是孤独的旅程。传统教育一刀切，每个孩子都被迫适应同一个节奏。', '天才学伴用AI成为孩子的个性化成长伙伴——懂他的节奏，陪他一起长大，让学习不再孤独。'],
      features: [
        { icon: 'fas fa-user-graduate', title: '学伴对话', desc: 'AI学伴陪聊陪学' },
        { icon: 'fas fa-tasks', title: '每日任务', desc: '智能生成每日学习任务与成就' },
        { icon: 'fas fa-book-open', title: '成长日记', desc: '记录成长轨迹与专注计时' },
        { icon: 'fas fa-book', title: '阅读书单', desc: '个性化推荐阅读书单' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#0891b2', accentHover: '#06b6d4'
    },
    aipet: {
      home: '/aipet/', appName: '宠康管家', appIcon: '🐾', slogan: '毛孩健康，小护相伴',
      description: '用AI听懂宠物的健康需求',
      story: ['毛孩不会说话，但它需要被理解。宠物不舒服时，主人往往手足无措。', '宠康管家用AI帮你解读宠物的健康信号，从日常护理到异常预警——让每个毛孩都被温柔以待。'],
      features: [
        { icon: 'fas fa-stethoscope', title: 'AI健康对话', desc: 'AI解读宠物健康问题' },
        { icon: 'fas fa-paw', title: '宠物管理', desc: '多宠物档案与健康管理' },
        { icon: 'fas fa-bell', title: '健康提醒', desc: '疫苗驱虫智能提醒' },
        { icon: 'fas fa-hospital', title: '医院查找', desc: '附近宠物医院导航' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#ec4899', accentHover: '#f472b6'
    },
    versecraft: {
      home: '/versecraft/', appName: '墨韵创作', appIcon: '✍️', slogan: '你不止是读者',
      description: 'AI驱动的小说创作与阅读平台',
      story: ['每个人心里都有故事。但提笔时，灵感往往卡壳。', '墨韵创作用AI陪你一起创作——从角色设定到情节发展，让创作不再孤独，让读者也成为共创者。'],
      features: [
        { icon: 'fas fa-pen-fancy', title: '小说创作', desc: 'AI辅助小说创作' },
        { icon: 'fas fa-list-ol', title: '章节编辑', desc: '章节管理与角色设定' },
        { icon: 'fas fa-shuffle', title: '创意组合器', desc: '随机组合激发灵感' },
        { icon: 'fas fa-book-reader', title: '沉浸阅读', desc: '专注式阅读体验' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#228FBD', accentHover: '#2BA3D6'
    },
    prompt: {
      home: '/prompt/', appName: '镕裁', appIcon: '⚡', slogan: '让你把话问到位',
      description: '问对了，AI 才答得准',
      story: ['AI很强大，但用好AI需要技巧。同样的问题，不同的提问方式效果天差地别。', '镕裁帮你优化提示词，让AI真正为你所用——因为提问的方式，决定了答案的质量。'],
      features: [
        { icon: 'fas fa-wand-magic-sparkles', title: '案例优化', desc: '基于案例优化提示词' },
        { icon: 'fas fa-bolt', title: '零样本优化', desc: '零样本提示词智能优化' },
        { icon: 'fas fa-folder', title: '提示词库', desc: '管理与复用提示词' },
        { icon: 'fas fa-balance-scale', title: '效果对比', desc: '优化前后效果对比' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#4f46e5', accentHover: '#6366f1'
    },
    codeblock: {
      home: '/codeblock/', appName: '编程学伴', appIcon: '🧩', slogan: '点亮每一颗好奇心',
      description: '拖拖积木，就能做出自己的小程序',
      story: ['好奇心是最珍贵的。但传统编程教育门槛太高，让孩子望而却步。', '编程学伴用积木编程降低门槛，用AI导师陪伴探索——让每个孩子都能享受创造的快乐。'],
      features: [
        { icon: 'fas fa-puzzle-piece', title: '积木编程', desc: '拖拽积木学编程' },
        { icon: 'fas fa-microchip', title: '电路实验', desc: '虚拟电路实验' },
        { icon: 'fas fa-robot', title: 'AI导师', desc: 'AI一对一编程指导' },
        { icon: 'fas fa-share-nodes', title: '项目分享', desc: '作品展示与社区分享' }
      ],
      promises: PROMISES, version: '1.0.0', accent: '#f97316', accentHover: '#fb923c'
    },
    pptcraft: {
      home: '/pptcraft/', appName: '汇报通', appIcon: '📊', slogan: '几分钟出一份能直接开讲的汇报',
      description: '你只需说清楚想汇报什么，AI 会帮你：核对真实资料、设计汇报结构、撰写每页内容、生成逐页演讲稿。生成后可下载 PPTX 编辑，或导出网页分享给别人。',
      version: '2.0.0', accent: '#1F4E79', accentHover: '#1F4E79'
    }
  };
})();