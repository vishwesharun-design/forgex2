export interface WebSearchIntentResult {
  shouldSearch: boolean;
  searchQuery: string;
  reason: string;
}

/**
 * Universal ChatGPT-style Web Search Intent Classifier
 * Evaluates in real-time whether a prompt requires live external web search
 * or should be answered immediately from internal knowledge.
 */
export function detectWebSearchIntent(
  userQuery: string,
  searchMode: 'auto' | 'on' | 'off' = 'auto'
): WebSearchIntentResult {
  if (searchMode === 'off') {
    return { shouldSearch: false, searchQuery: '', reason: 'Web search disabled.' };
  }

  const clean = userQuery.trim().toLowerCase();

  // If search mode is explicitly forced ON
  if (searchMode === 'on') {
    const cleanSearchQuery =
      userQuery
        .replace(
          /^(?:please\s+)?(?:can\s+you\s+)?(?:search\s+(?:the\s+web\s+for|google\s+for|for)?|look\s+up|browse\s+(?:for)?|find\s+(?:information\s+on|out\s+about)?)\s*/i,
          ''
        )
        .replace(/[?!.]+$/, '')
        .trim() || userQuery.trim();
    return { shouldSearch: true, searchQuery: cleanSearchQuery, reason: 'Web search explicitly requested.' };
  }

  // searchMode === 'auto'
  // NEGATIVE FILTERS: Questions that CAN and SHOULD be answered from internal knowledge
  // 1. Math, word-arithmetic, and logic puzzles
  if (
    /^(?:calculate|compute|solve|what is|evaluate|\d+)\s*[\d\s+\-*/^().=]+$/i.test(clean) ||
    /^(?:what\s+is\s+)?\d+\s*(?:[\+\-\*\/]|multiplied\s+by|divided\s+by|times|plus|minus)\s*\d+/i.test(clean) ||
    /\b(?:all\s+but\s+\d+|how\s+many\s+remain)\b/i.test(clean)
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Pure math or logic reasoning.' };
  }

  // 2. Conversation meta-questions & explicit formatting/context-reset prompts
  if (
    /\b(?:first\s+question|previous\s+(?:question|answer|topic|message)|earlier\s+in\s+(?:this|our)\s+chat|ignore\s+(?:the\s+)?previous\s+topic)\b/i.test(
      clean
    )
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Conversational history or context switch query.' };
  }

  // 3. Standard algorithms, pure coding, regex, logic puzzles
  if (
    /(?:write|create|implement|give me|show me)\s+(?:a|an)?\s*(?:python|javascript|typescript|c\+\+|java|rust|go|html|css|sql)?\s*(?:function|script|class|code|algorithm|component|regex|query|loop|program)\s+(?:to|that|for)\s+(?:reverse|sort|filter|find|binary search|fibonacci|factorial|palindrome|validate email|center a div|traverse)/i.test(
      clean
    ) ||
    /(?:how\s+to|how\s+do\s+i)\s+(?:center\s+a\s+div|reverse\s+a\s+string|sort\s+an\s+array|use\s+useeffect|use\s+usestate|declare\s+a\s+variable|loop\s+through)/i.test(
      clean
    )
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Standard programming task.' };
  }

  // 4. Creative writing, poetry, roleplay, jokes, translations, bullet summaries
  if (
    /(?:write|compose|generate)\s+(?:a|an|exactly\s+\w+|\d+)?\s*(?:poem|story|haiku|essay|song|rap|limerick|joke|dialogue|script|letter|email template|bullet\s*points?)/i.test(
      clean
    ) ||
    /(?:tell\s+me|give\s+me)\s+(?:a\s+joke|a\s+riddle|a\s+story|advice)/i.test(clean) ||
    /(?:translate|how\s+do\s+you\s+say)\s+['"].+?['"]\s+(?:in|into|to)\s+[a-z]+/i.test(clean)
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Creative and linguistic query.' };
  }

  // 5. Platform identity
  if (
    /(?:who\s+(?:created|made|developed|built|designed|founded)\s+(?:you|forgex)|who\s+are\s+you|what\s+is\s+forgex|how\s+do\s+i\s+use\s+forgex)/i.test(
      clean
    )
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Platform identity.' };
  }

  // 6. Timeless classical science/humanities/networking
  if (
    /(?:what\s+is|explain|describe|define)\s+(?:photosynthesis|gravity|quantum\s+physics|relativity|evolution|mitosis|osmosis|plate\s+tectonics|thermodynamics|the\s+capital\s+of|the\s+speed\s+of\s+light|newton's\s+law|pythagorean\s+theorem|cellular\s+respiration|dna\s+replication|schrodinger|stoicism|existentialism|tcp|udp|http|how\s+rain\s+forms|rain\s+formation)/i.test(
      clean
    )
  ) {
    return { shouldSearch: false, searchQuery: '', reason: 'Universal conceptual science/humanities.' };
  }

  // POSITIVE SIGNALS: Queries that REQUIRE current, up-to-date, or external information
  let shouldSearch = false;
  let triggerReason = '';

  // A. Explicit search phrases
  if (
    /(?:search\s+(?:the\s+web|google|online|internet)|look\s+up\s+online|browse\s+(?:the\s+web|for)|find\s+(?:sources|articles|online|links)|google\s+this)/i.test(
      clean
    )
  ) {
    shouldSearch = true;
    triggerReason = 'Explicit web search requested.';
  }

  // B. Specific URLs or domain mentions
  if (/https?:\/\/[^\s]+|www\.[^\s]+/i.test(clean)) {
    shouldSearch = true;
    triggerReason = 'External URL reference detected.';
  }

  // C. Freshness anchors: 2024, 2025, 2026, 2027
  if (/\b(?:2024|2025|2026|2027)\b/.test(clean)) {
    shouldSearch = true;
    triggerReason = 'Current/recent year anchor detected.';
  }

  // D. Real-time temporal markers
  if (
    /\b(?:today|yesterday|tomorrow|this\s+week|this\s+month|this\s+year|currently|latest|newest|recent|recently|upcoming|right\s+now|nowadays|at\s+present)\b/i.test(
      clean
    )
  ) {
    shouldSearch = true;
    triggerReason = 'Real-time temporal marker detected.';
  }

  // E. Live metrics, financial markets, weather, inflation
  if (
    /\b(?:weather|temperature|forecast|stock\s+price|market\s+price|crypto|bitcoin|btc|eth|nasdaq|dow\s+jones|s&p\s*500|exchange\s+rate|inflation\s+rate|gas\s+price|mortgage\s+rate)\b/i.test(
      clean
    )
  ) {
    shouldSearch = true;
    triggerReason = 'Live external metric or market data requested.';
  }

  // F. Sports scores, live tournaments, elections, awards
  if (
    /\b(?:who\s+won|game\s+score|match\s+result|super\s*bowl|world\s*cup|olympics|championship|nba\s+finals|uefa|premier\s+league|f1\s+race|election\s+results|oscar\s+winners|grammy\s+winners|ballon\s+d'or)\b/i.test(
      clean
    )
  ) {
    shouldSearch = true;
    triggerReason = 'Live event, score, or tournament results lookup.';
  }

  // G. Breaking news, live developments, real-world status, prices, comparisons & factual lookups
  if (
    /\b(?:breaking\s+news|what\s+happened\s+(?:to|in|with)|latest\s+news|current\s+status\s+of|is\s+.*?still\s+alive|who\s+is\s+currently|who\s+(?:is|was|were)\s+|who\s+(?:invented|discovered|founded|wrote|directed|painted|composed)\s+|when\s+(?:did|was|were|is)\s+|where\s+is\s+|capital\s+of\s+|population\s+of\s+|ceo\s+of\s+|founder\s+of\s+|price\s+of\s+|cost\s+of\s+|how\s+much\s+(?:is|does|are|cost)|compare\s+.+\s+(?:vs|and|or)\s+|best\s+(?:\w+\s+){0,3}(?:in|for|of|2024|2025|2026)|top\s+\d+|tell\s+me\s+about\s+|history\s+of\s+|biography\s+of\s+|meaning\s+of\s+|define\s+|patch\s+notes|changelog|release\s+date\s+of|is\s+.*?released\s+yet|new\s+features\s+in)\b/i.test(
      clean
    )
  ) {
    shouldSearch = true;
    triggerReason = 'Real-world factual, encyclopedic, or current status lookup.';
  }

  // H. Quizzes & Trivia requiring current, real-world, or verified factual data
  const isQuizRequest = /\b(?:quiz|trivia|practice\s+questions|test\s+my\s+knowledge)\b/i.test(clean);
  if (isQuizRequest) {
    if (
      /\b(?:2024|2025|2026|latest|recent|current|news|today|real-world|verified|accurate|search\s+web|web\s+search|artemis|spacex|ai\s+models|nobel|election|olympics|champions\s+league|world\s+cup|oscar|grammy)\b/i.test(clean)
    ) {
      shouldSearch = true;
      triggerReason = 'Interactive quiz on verified real-world/recent facts.';
    }
  }

  if (shouldSearch) {
    const cleanSearchQuery =
      userQuery
        .replace(
          /^(?:please\s+)?(?:can\s+you\s+)?(?:tell\s+me|show\s+me|find|search\s+(?:for)?|what\s+is|what\s+are|who\s+is|who\s+won)\s*/i,
          ''
        )
        .replace(
          /^(?:make\s+it\s+do\s+|create\s+(?:an?\s+)?|give\s+me\s+(?:an?\s+)?|quiz\s+me\s+on\s+)?(?:interactive\s+)?(?:quizes|quiz|trivia|test)\s+(?:about|on|for)?\s*/i,
          ''
        )
        .replace(/(?:it\s+should\s+search\s+web.*|with\s+(?:accurate|perfect)\s+answers.*)/i, '')
        .replace(/[?!.]+$/, '')
        .trim() || userQuery.trim();

    return {
      shouldSearch: true,
      searchQuery: cleanSearchQuery,
      reason: triggerReason,
    };
  }

  return {
    shouldSearch: false,
    searchQuery: '',
    reason: 'Can be answered comprehensively from existing internal knowledge.',
  };
}
