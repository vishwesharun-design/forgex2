/**
 * Universal Image Generation Intent Detector
 * Accurately determines if a user message is requesting image creation,
 * including handwritten notebook study notes, stop-motion claymation renders, and natural language creation.
 */

export interface ImageIntentResult {
  isImage: boolean;
  prompt: string;
  style?: string;
}

const CLAY_STYLE_REGEX = /\b(?:claymation|clay\s*mation|plasticine|polymer\s+clay|modeling\s+clay|modelling\s+clay|stop[\s-]*motion\s+clay|aardman|laika\s+clay|made\s+(?:of|with|out\s+of|from|using)\s+clay|looks?\s+(?:like|as\s+if\s+it\s+was\s+made\s+(?:of|with|using))\s+clay|as\s+if\s+(?:it\s+was|made)\s+(?:of|with|using)\s+clay|into\s+(?:a\s+)?clay|clay\s+(?:style|sculpture|figure|figurine|character|portrait|model|scene|world|city|man|woman|boy|girl|person|animal|avatar|version|render))\b/i;

function detectStyleFromPrompt(text: string): string | undefined {
  if (CLAY_STYLE_REGEX.test(text)) {
    return 'Claymation';
  }
  return undefined;
}

export function detectImageGenerationIntent(
  text: string,
  hasImageAttachment: boolean = false
): ImageIntentResult {
  if (!text || typeof text !== 'string') {
    return { isImage: false, prompt: '' };
  }
  const clean = text.trim();
  if (!clean) return { isImage: false, prompt: '' };

  // Negative filter: Quizzes, coding, feedback/complaints, trivia, tests, and structured diagrams/visual representations should NEVER trigger raster Imagen/Flux!
  const isDiagramOrSchemaRequest =
    /\b(?:visual\s+representation|diagram|schematic|flowchart|free[\s-]*body\s+diagram|venn\s+diagram|architecture\s+diagram|mind\s*map|org\s*chart|sequence\s+diagram|circuit\s+diagram|block\s+diagram|ray\s+diagram)\b/i.test(
      clean
    ) && !/\b(?:photorealistic|realistic\s+photo|photograph|claymation|watercolor|oil\s+painting|3d\s+render|anime)\b/i.test(clean);

  const isExcludedIntent =
    isDiagramOrSchemaRequest ||
    /not\s+working|keeps?\s+generating\s+this|why\s+is\s+it|broken|error|fix\s+this|issue\s+with/i.test(clean) ||
    /^(?:quiz|quizzes|trivia|question|questions|test|practice\s+questions|function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm)\b/i.test(
      clean.replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:create|make|give\s+me|generate)\s+(?:a\s+|an\s+|some\s+)?/i, '').trim()
    );
  if (isExcludedIntent) {
    return { isImage: false, prompt: '' };
  }

  // Analytical / vision comprehension questions should ALWAYS go to Gemini Vision rather than image generation
  const isVisionAnalysisQuestion =
    /^(?:how\s+(?:many|much|old|tall|far|long)|who\s+(?:is|are|'s|'re)|what(?:'s|\s+is|\s+are|\s+do|\s+does|\s+color|\s+kind|\s+type|\s+text|\s+number|\s+happened|\s+animal|\s+object|\s+person|\s+people)|where\s+(?:is|are|was|were)|when\s+(?:was|were|is)|why\s+(?:is|are)|which\s+|count\b|describe\b|explain\b|analyze\b|analyse\b|inspect\b|identify\b|read\b|transcribe\b|extract\b|ocr\b|tell\s+me\b|can\s+(?:you|u)\s+(?:see|count|tell|describe|explain|read|identify|analyze|analyse|find|check|spot|solve|answer|name|recognize|recognise)\b|could\s+(?:you|u)\s+(?:see|count|tell|describe|explain|read|identify|analyze|analyse|find|check|spot|solve|answer|name|recognize|recognise)\b|(?:is|are)\s+there\b|do\s+(?:you|u)\s+see\b)/i.test(
      clean
    );

  if (isVisionAnalysisQuestion) {
    return { isImage: false, prompt: '' };
  }

  if (
    hasImageAttachment &&
    !CLAY_STYLE_REGEX.test(clean) &&
    !/\bclay\b/i.test(clean) &&
    !/^\/(?:image|img|flux|picture|pic|draw|paint|art|generate|visual|render|clay|claymation)\b/i.test(clean) &&
    !/^(?:please\s+)?(?:can\s+you\s+)?(?:edit|modify|alter|change|transform|remix|style|convert|turn|create|generate|draw|paint|sketch|render|regenerate|make\s+(?:it|this)\s+(?:look|into))/i.test(
      clean
    )
  ) {
    return { isImage: false, prompt: '' };
  }

  // 1. HANDWRITTEN STUDY NOTES / NOTEBOOK NOTES INTENT ("notes like this", "handwritten notes", etc.)
  const isExplicitHandwrittenRequest =
    /(?:hand[\s-]*(?:written|wirtten|writen|writing|wrtn|crafted)?[\s-]*(?:study[\s-]*)?notes?|notes?[\s-]*(?:like\s+this|like\s+image|like\s+photo|like\s+screenshot)|study\s+notes?|notebook\s+notes?)/i.test(clean) ||
    /(?:create|make|generate|draw|give(?:\s+me)?|show(?:\s+me)?)\s+(?:me\s+)?(?:an?\s+|some\s+)?(?:hand[\s-]*(?:written|wirtten|writen|writing)?\s*)?(?:study\s+|notebook\s+)?notes?/i.test(clean);

  if (isExplicitHandwrittenRequest) {
    const handwrittenMatch = clean.match(
      /(?:(?:make|create|generate|draw|give(?:\s+me)?|show(?:\s+me)?|produce|design)\s+)?(?:my\s+ai\s+)?(?:an?\s+|some\s+)?(?:hand[\s-]*(?:written|wirtten|writen|writing|wrtn)?\s*)?(?:study\s+|notebook\s+|revision\s+)?notes?(?:\s+(?:on|about|of|for|like)\s+(.+))?/i
    );

    let rawTopic = (handwrittenMatch && handwrittenMatch[1] ? handwrittenMatch[1] : '').trim();
    rawTopic = rawTopic
      .replace(
        /like\s+this(?:\s*\(\d+\))?|like\s+the\s+image(?:\s*\d+)?|like\s+the\s+photo|like\s+screenshot|\(\d+\)|\[\d+\]|please|for\s+me|my\s+ai|should\s+be\s+able\s+to|there\s+should\s+be\s+no\s+spelling\s+mistack|everything\s+should\s+be\s+understandable|no\s+spelling\s+mistakes?|still\s+the\s+texts\s+are\s+not\s+clear|cant\s+even\s+understand\s+the\s+texts|only\s+the\s+topic\s+i\s+can\s+see|hand[\s-]*(?:written|wirtten|writen)?/gi,
        ''
      )
      .trim();
    rawTopic = rawTopic.replace(/^(?:of|on|about|for)\s+/i, '').trim();
    rawTopic = rawTopic.replace(/[?!.]+$/, '').trim();

    const isIonic = /ionic|bonding|chemistry|chemical|nacl/i.test(clean);
    const isPhotosynthesis = /photosynth|chloroplast|calvin/i.test(clean);

    const topic =
      rawTopic && rawTopic.length > 2
        ? rawTopic
        : isIonic
          ? 'Ionic Bonding : Formation, Properties, Dot and Cross Diagrams & Key Points'
          : isPhotosynthesis
            ? 'Photosynthesis : Light Reactions, Calvin Cycle & Chloroplast Structure'
            : 'Chapter 7 : The Mathematics of Maybe : Introduction to Probability';

    return {
      isImage: true,
      prompt: topic,
      style: 'Handwritten Notes',
    };
  }

  // 1b. Attached reference photo + clay/transform cue (e.g. "clay", "make this look like clay", "claymation style")
  if (hasImageAttachment && (CLAY_STYLE_REGEX.test(clean) || /\bclay\b/i.test(clean))) {
    const cleaned = clean.replace(/[?!.]+$/, '').trim();
    return {
      isImage: true,
      prompt:
        cleaned.length <= 18
          ? 'Transform this exact person, pose, expression, outfit, and background into a handcrafted stop-motion claymation sculpture made using clay'
          : cleaned,
      style: 'Claymation',
    };
  }

  // 2. Explicit slash commands (/image, /img, /flux, /picture, /pic, /draw, /paint, /art, /generate, /clay)
  const slashMatch = clean.match(/^\/(?:image|img|flux|picture|pic|draw|paint|art|generate|visual|render|clay|claymation)\b\s*(.*)$/i);
  if (slashMatch) {
    const isSlashClay = /^\/(?:clay|claymation)\b/i.test(clean);
    const p = (slashMatch[1] || '').trim();
    return {
      isImage: true,
      prompt: p || (isSlashClay ? 'A smiling young man in a black puffy vest and grey hoodie on a glowing city street at night, sculpted claymation' : 'A stunning creative visual masterpiece with intricate details'),
      style: isSlashClay ? 'Claymation' : detectStyleFromPrompt(p || clean),
    };
  }

  // 3. Colon prefix (image:, img:, draw:, paint:, visual:, wallpaper:, flux:, picture:, clay:)
  const colonMatch = clean.match(/^(?:image|img|draw|paint|picture|photo|artwork|illustration|visual|wallpaper|render|flux|clay|claymation)\s*:\s*(.+)$/i);
  if (colonMatch && colonMatch[1]) {
    const p = colonMatch[1].trim().replace(/[?!.]+$/, '');
    const isColonClay = /^(?:clay|claymation)\s*:/i.test(clean);
    return {
      isImage: true,
      prompt: p,
      style: isColonClay ? 'Claymation' : detectStyleFromPrompt(p),
    };
  }

  // 4. Short standalone phrases requesting creation without arguments
  if (
    /^(?:hey|hi|hello)?\s*(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:u\s+|you\s+)?(?:create|generate|make|draw|paint|give(?:\s+me)?|show(?:\s+me)?)(?:\s+something|\s+one|\s+an?\s+image|\s+an?\s+picture|\s+an?\s+art|\s+an?\s+artwork|\s+an?\s+visual|\s+an?\s+photo)?\s*[?!.]*$/i.test(
      clean
    )
  ) {
    return {
      isImage: true,
      prompt: 'A breathtaking futuristic digital artwork masterpiece with vibrant neon lighting and intricate details',
    };
  }

  // 5. Broad Action Verb + Image Noun + Subject
  const actionNounMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:i\s+(?:want|need|would\s+like)(?:\s+you)?\s+(?:to\s+)?)?(?:generate|create|make|draw|paint|render|show(?:\s+me)?|give(?:\s+me)?|send(?:\s+me)?|produce|design|craft|illustrate|sketch|visualize|imagine|display|provide(?:\s+me)?)\s+(?:an?\s+|some\s+|the\s+)?(?:claymation\s+|clay\s+)?(?:images?|pictures?|pics?|photos?|photographs?|illustrations?|drawings?|artworks?|graphics?|wallpapers?|portraits?|scenes?|visuals?|art|renders?|sculptures?|figures?|figurines?|models?)\s*(?:that\s+looks?\s+(?:like\s+)?(?:it\s+was\s+)?made\s+(?:of|with|using)\s+clay\s*)?(?:of|with|depicting|showing|featuring|having|containing|about|that\s+shows|where|for|made\s+using|made\s+of|in)?\s*(.*)$/i
  );
  if (actionNounMatch) {
    const rawPrompt = (actionNounMatch[1] || '').trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|quiz|test|trivia)\b/i.test(rawPrompt)) {
      const finalPrompt = rawPrompt.replace(/[?!.]+$/, '').trim() || 'A stunning creative visual composition with vibrant lighting';
      return {
        isImage: true,
        prompt: finalPrompt,
        style: detectStyleFromPrompt(clean),
      };
    }
  }

  // 6. Direct artistic / sculpting verbs:
  const directVerbMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:draw|paint|sketch|illustrate|visualize|imagine|render|sculpt|mold)\s+(?:me\s+)?(?:a|an|the|some)?\s*(.+?)[?!.]*$/i
  );
  if (directVerbMatch && directVerbMatch[1]) {
    const candidate = directVerbMatch[1].trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|diagram|chart|graph|flowchart|essay|story|poem|song|quiz|test)\b/i.test(candidate)) {
      return {
        isImage: true,
        prompt: candidate,
        style: detectStyleFromPrompt(clean),
      };
    }
  }

  // 7. Direct "create / generate / make [me] <visual subject>"
  const directCreateMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:create|generate|make)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+|the\s+)?([^.\n?!]+)[?!.]*$/i
  );
  if (directCreateMatch && directCreateMatch[1]) {
    const candidate = directCreateMatch[1].trim();
    if (
      !/^(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|test|tests|report|summary|presentation|document|quiz|quizzes|trivia|questions?)\b/i.test(
        candidate
      )
    ) {
      const isVisualSubject =
        /(?:wallpaper|portrait|drawing|painting|photo|scenery|landscape|car|vehicle|city|building|animal|cat|dog|dragon|robot|mech|character|nature|sunset|space|galaxy|flower|tree|ocean|mountain|notes?|sketch|render|artwork|illustration|clay|claymation|plasticine|sculpture|figurine|man|woman|boy|girl|person|street)/i.test(
          candidate
        ) || candidate.split(' ').length <= 8;

      if (isVisualSubject) {
        return {
          isImage: true,
          prompt: candidate,
          style: detectStyleFromPrompt(clean),
        };
      }
    }
  }

  // 8. Direct "image / picture / photo / claymation of <subject>"
  const nounOfMatch = clean.match(
    /^(?:an?\s+|the\s+)?(?:claymation\s+|clay\s+)?(?:images?|pictures?|pics?|photos?|photographs?|wallpapers?|illustrations?|drawings?|artworks?|portraits?|renders?|graphics?|visuals?|sculptures?|figures?|figurines?|models?)\s+(?:of|with|depicting|showing|featuring|for|about|made\s+(?:of|with|using))\s+(.+?)[?!.]*$/i
  );
  if (nounOfMatch && nounOfMatch[1]) {
    const candidate = nounOfMatch[1].trim();
    if (!/^(?:code|function|script|component|table|list|essay|story|poem|song|quiz|test)\b/i.test(candidate)) {
      return {
        isImage: true,
        prompt: candidate,
        style: detectStyleFromPrompt(clean),
      };
    }
  }

  // 9. Style descriptors: "a realistic photo of...", "a claymation portrait of...", "clay figure of..."
  const photoStyleMatch = clean.match(
    /^(?:a|an)\s+(?:realistic\s+photo|photorealistic\s+image|cinematic\s+shot|digital\s+art|concept\s+art|watercolor\s+painting|oil\s+painting|3d\s+render|detailed\s+drawing|claymation(?:\s+(?:portrait|image|scene|shot|character|figure|photo))?|clay\s+(?:sculpture|figure|figurine|portrait|character|model|scene|style\s+(?:portrait|image|photo)))\s+(?:of|with|showing|depicting|for)?\s*(.+?)[?!.]*$/i
  );
  if (photoStyleMatch && photoStyleMatch[1]) {
    return {
      isImage: true,
      prompt: clean.replace(/[?!.]+$/, '').trim(),
      style: detectStyleFromPrompt(clean),
    };
  }

  // 10. Edit / transform patterns: "edit this image to...", "make this look like clay", "turn this into clay"
  const editMatch =
    clean.match(
      /^(?:please\s+)?(?:can|could)?\s*(?:you|u)?\s*(?:edit|modify|alter|change|transform|remix|style|convert|turn)\s+(?:this\s+|the\s+|it\s+)?(?:image|picture|photo)?\s*(?:to|with|into|like|as)?\s*(.+?)[?!.]*$/i
    ) ||
    clean.match(
      /^(?:now\s+)?(?:make\s+(?:it|this)(?:\s+look)?(?:\s+like|\s+as\s+if\s+(?:it\s+was\s+)?made\s+(?:of|with|using))?|change\s+(?:it|this)\s+to|turn\s+(?:it|this)\s+into|edit\s+(?:it|this)\s+to|regenerate\s+with)\s+(.+?)[?!.]*$/i
    );
  if (editMatch && editMatch[1]) {
    const candidate = editMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|test|quiz)\b/i.test(candidate)) {
      return {
        isImage: true,
        prompt: candidate,
        style: detectStyleFromPrompt(clean),
      };
    }
  }

  return { isImage: false, prompt: '' };
}
