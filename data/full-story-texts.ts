type StoryLike = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  brief?: string;
  briefEn?: string;
  story?: string[];
  storyEn?: string[];
  virtues?: string[];
  virtuesEn?: string[];
  transcript?: string;
  transcriptEn?: string;
};

type ProphetPresetLike = {
  id: string;
  transcript: string;
};

const COMMON_PROPHET_STORY_EXTENSION = [
  'ولا تقف العبرة في هذه القصة عند سرد الأحداث، بل تمتد إلى فهم سنة الله في عباده: فالدعوة تبدأ بكلمة حق، ثم يبتلى صاحبها بالصبر، ثم تظهر عاقبة الصدق ولو بعد حين. فكل نبي حمل لقومه نور التوحيد، وذكّرهم أن النجاة ليست في القوة ولا المال ولا العادة الموروثة، وإنما في الاستجابة لله.',
  'وتظهر في القصة كذلك رحمة الله بخلقه؛ فهو يرسل الرسل مبشرين ومنذرين قبل العقوبة، ويفتح باب التوبة قبل نزول البلاء، ويقيم الحجة حتى لا يكون للناس على الله حجة بعد الرسل. لذلك كانت قصص الأنبياء في القرآن تربية للقلوب قبل أن تكون أخبارًا للماضي.',
  'ومن يتأمل هذه السيرة يجد أن طريق الإيمان ليس دائمًا سهلًا: فيه تكذيب، وابتلاء، وغربة، ومقاومة من أهل الباطل، لكنه طريق محفوظ بعناية الله. فإذا صدق العبد مع ربه، جعل الله له من الضيق مخرجًا، ومن الضعف قوة، ومن طول الانتظار فرجًا.',
  'ولهذا تبقى القصة صالحة لكل زمان؛ فهي تعلّم المؤمن أن يبدأ بإصلاح قلبه، وأن يثبت على التوحيد، وأن يحسن الظن بربه، وأن يعرف أن النصر الحقيقي هو أن يموت الإنسان على الحق ولو تأخر ظهور النتائج في الدنيا.',
];

const COMMON_PROPHET_STORY_EXTENSION_EN = [
  'The lesson of this story is not limited to the events themselves. It reveals a pattern in the way Allah deals with His servants: a prophet calls with the truth, patience is tested, and the outcome of sincerity appears in the time Allah chooses. Every prophet carried the light of monotheism and reminded people that salvation is not found in power, wealth, or inherited habits, but in responding to Allah.',
  'The story also shows Allah\'s mercy toward creation. He sends messengers as bringers of good news and warners before punishment, opens the door of repentance before hardship descends, and establishes the proof clearly so people have no excuse after the messengers.',
  'Whoever reflects on these lives sees that the path of faith is not always easy. It may include denial, trial, loneliness, and resistance from people attached to falsehood. Yet it is a path guarded by Allah. When a servant is truthful with his Lord, Allah can turn narrowness into relief, weakness into strength, and long waiting into an opening.',
  'For this reason, the stories of the prophets remain alive for every generation. They teach the believer to begin by reforming the heart, to remain firm upon monotheism, to think well of Allah, and to know that real victory is to stay upon the truth even if results appear later in this world.',
];

const PROPHET_ADDITIONS: Record<string, string[]> = {
  'prophet-adam': [
    'وتتسع قصة آدم عليه السلام لتكون أصل فهم الإنسان لنفسه: فهو مخلوق مكرم، لكنه يضعف ويخطئ، ولا ينجو إلا بالرجوع إلى ربه. فالخطأ لم يكن نهاية الطريق، وإنما كانت التوبة بداية جديدة للحياة في الأرض.',
    'ومن ذريته انتشر الناس، وجاءت الرسالات تذكرهم بالعهد الأول: أن الله هو الخالق والرازق والمعبود وحده، وأن الشيطان عدو قديم لا يريد للإنسان إلا الضلال.',
  ],
  'prophet-idris': [
    'ومع قلة التفاصيل الواردة عنه، فإن القرآن حين يذكره يضع أمام المؤمن معنى عظيمًا: أن قيمة الإنسان في صدقه وثباته، لا في كثرة ما يعرف الناس من أخباره.',
    'فكان ذكر إدريس عليه السلام تربية على احترام أنبياء الله جميعًا، والإيمان بأن لله عبادًا رفعهم بالصدق والصبر والعمل الصالح.',
  ],
  'prophet-nuh': [
    'كان نوح عليه السلام ينوع أساليب الدعوة؛ يرغبهم في المغفرة، ويذكرهم بالمطر والمال والبنين والجنات والأنهار، ويوقظ فيهم النظر إلى خلق السماوات والأرض. ومع ذلك بقي أكثرهم على كفرهم.',
    'ولما دعا ربه أني مغلوب فانتصر، جاء النصر في صورة أمر عجيب: صناعة سفينة في أرض لا يظهر فيها ماء. فتعلم المؤمنون أن الطاعة تسبق فهم التفاصيل، وأن وعد الله يأتي في وقته.',
  ],
  'prophet-hud': [
    'لم يكن هود عليه السلام يواجه أفرادًا ضعفاء، بل أمة تملك العمران والقوة وتتباهى بالبطش. ومع ذلك وقف وحده داعيًا إلى التوحيد، لأن قوة الحق لا تقاس بقوة الخصم.',
    'كانت نهايتهم درسًا باقيًا: الريح التي لا يملكها أحد صارت جندًا من جنود الله، فهدمت غرورهم وخلدت العبرة لمن بعدهم.',
  ],
  'prophet-salih': [
    'كانت الناقة آية ظاهرة ومعاهدة عملية في الوقت نفسه؛ لها حق معلوم، وللقوم حق معلوم. فكان الامتحان في احترام أمر الله ولو خالف أهواءهم ومصالحهم.',
    'ولما عقروا الناقة لم تكن الجريمة مجرد قتل دابة، بل كانت إعلان تمرد على آية الله، ولذلك جاء العذاب بعد إنذار واضح.',
  ],
  'prophet-ibrahim': [
    'وتتابعت ابتلاءات إبراهيم عليه السلام حتى صار إمامًا للناس. لم تكن الإمامة بكلمة تقال، بل بسلسلة طويلة من الصبر: مفارقة الوطن، ومعاداة القوم، والنجاة من النار، والهجرة، وتسليم القلب لأمر الله.',
    'ومن أعظم ما في سيرته أنه لم ينس الدعاء لذريته وللأمة من بعده. فبقي أثر دعائه في البيت الحرام، وفي ملة التوحيد، وفي بعثة خاتم الأنبياء ﷺ.',
  ],
  'prophet-lut': [
    'كان لوط عليه السلام غريبًا في قوم قلبوا الفطرة وجعلوا الطهارة عيبًا. ومع ذلك لم يساوم في الحق، ولم يترك نصحهم، بل ظل يذكرهم بأن النجاة في الرجوع إلى الله.',
    'وجاءت نجاته ليلًا بأمر الله، وفيها معنى عظيم: أن الله لا يضيع أهل الطاعة ولو أحاط بهم الفساد من كل جانب.',
  ],
  'prophet-ismail': [
    'ومن تمام قصته أنه نشأ في مكة على أثر دعاء أبيه إبراهيم، فصار موضع زمزم والبيت الحرام شاهدين على أن الطاعة قد يبدأ أثرها صغيرًا ثم يمتد في تاريخ الأمم.',
    'وكان إسماعيل عليه السلام صادق الوعد، يأمر أهله بالصلاة والزكاة، فجمع بين طاعة الابن، ونبوة الداعية، وعمارة البيت الحرام.',
  ],
  'prophet-yaqub': [
    'تجمع قصة إسحاق ويعقوب عليهما السلام بين معاني عجيبة: بشارة بعد طول انتظار، وتنازع بين أخوين على بركة، وهجرة طويلة، وصبر جميل على فقد ولدين، ونهاية كريمة في كنف ابن صار عزيز مصر. كل حلقة منها تشهد على أن تدبير الله فوق تدبير البشر.',
    'وحين أراد إسحاق أن يدعو لابنه البكر العيص بدعوة البركة، جرى قدر الله بأن انتقلت إلى يعقوب، فثارت حفيظة العيص وأقسم ليقتلن أخاه. هاجر يعقوب إلى خاله لابان حفاظًا على نفسه، فبدأت رحلته إلى الميقات الذي قدر الله أن يكون فيه أبا الأسباط ومنبت الأنبياء.',
    'ولم يكن صبر يعقوب صمتًا باردًا، بل قلبًا موجوعًا ولسانًا ذاكرًا. جمع بين الحزن البشري المشروع والثقة الكاملة في رحمة الله، فكان دعاؤه: إنما أشكو بثي وحزني إلى الله. وحين أرسل بنيه يتحسسون من يوسف وأخيه أوصاهم ألا ييأسوا من روح الله.',
    'ومات يعقوب في مصر بعد أن جمع أبناءه على عقيدة التوحيد، فأوصى أن يدفن في الخليل عند أبيه إسحاق وجده إبراهيم، فحمله يوسف ودفنه هناك. وبقيت قصته شاهدة على أن الميراث الحقيقي ليس الأرض ولا المال، وإنما الدين الذي يبقى حين يفنى كل شيء.',
  ],
  'prophet-yusuf': [
    'وفي كل مرحلة من قصة يوسف عليه السلام يظهر لطف الله الخفي: الجب طريق إلى القصر، والقصر طريق إلى السجن، والسجن طريق إلى الملك، وكل ما بدا شرًا كان في تدبير الله بابًا للتمكين.',
    'ومن جمال القصة أن يوسف لم يتغير حين تمكن؛ بقي عفيفًا في الفتنة، صادقًا في السجن، أمينًا في الحكم، رحيمًا عند القدرة، ولذلك كانت العاقبة له.',
  ],
  'prophet-ayyub': [
    'لم يكن بلاء أيوب عليه السلام عقوبة، بل رفعة واختبارًا، ولذلك بقي قلبه شاكرًا ولسانه ذاكرًا. ومن هنا صار اسمه رمزًا للصبر الجميل.',
    'ولما كشف الله ضره، لم يعد إليه العافية فقط، بل رد عليه الرحمة والبركة، ليعلم الناس أن الصبر مع الله لا يضيع.',
  ],
  'prophet-shuayb': [
    'كان فساد قوم شعيب في السوق والميزان دليلًا على أن خلل العقيدة يظهر في حياة الناس ومعاملاتهم. لذلك جمع شعيب بين الدعوة إلى التوحيد والدعوة إلى الأمانة.',
    'ومن كلماته الجامعة: إن أريد إلا الإصلاح ما استطعت. فهي تلخص رسالة المصلحين: لا مصلحة شخصية، ولا طلب سلطان، وإنما إصلاح يبتغي وجه الله.',
  ],
  'prophet-musa': [
    'وتمتد قصة موسى عليه السلام بعد النجاة من البحر إلى رحلة طويلة مع بني إسرائيل: الميقات، وإنزال التوراة، وفتنة العجل، والتيه، وكثرة الأسئلة والاعتراضات. فكان موسى نبيًا مجاهدًا صابرًا على فرعون وعلى قومه.',
    'ومن أعظم ما في قصته أنها تتكرر في حياة كل مؤمن: فرعون يمثل الطغيان، والبحر يمثل الطريق المسدود، والعصا تمثل أمر الله الذي يفتح المستحيل إذا صدق التوكل.',
  ],
  'prophet-harun': [
    'كان هارون عليه السلام مثال الوزير الصالح الذي لا يطلب الظهور لنفسه، بل يعين أخاه على البلاغ. وهذه منزلة عظيمة في العمل للدين.',
    'وحين عبد قومه العجل، بقي يحاول الإصلاح بأرفق ما يستطيع حتى لا يزيد الفتنة فتنة. فجمع بين الثبات والحكمة.',
  ],
  'prophet-dhul-kifl': [
    'وذكره مع الصابرين يفتح بابًا مهمًا: ليست كل قصة نافعة تحتاج إلى تفاصيل كثيرة، فقد يكفي أن يثبت القرآن صفة العبد حتى تكون العبرة واضحة.',
    'فمن أراد مقام الأخيار فطريقه الصبر والوفاء والقيام بما كلفه الله، سواء عرفه الناس أو لم يعرفوه.',
  ],
  'prophet-dawud': [
    'وكان داود عليه السلام مع الملك والقوة كثير الرجوع إلى الله، يسبح وتسبح معه الجبال والطير. فليست العبادة عزلة عن الحياة، بل نور يحكم حياة الملك والعامل والقاضي.',
    'وألان الله له الحديد، فاستعمل النعمة فيما ينفع الناس ويحميهم. وفي ذلك درس أن الصناعة والقوة إذا دخلها الشكر صارت عبادة وخدمة.',
  ],
  'prophet-sulayman': [
    'ومع اتساع ملك سليمان عليه السلام لم يكن قلبه أسيرًا للملك. كان يرى كل مشهد حوله آية: كلام النملة، خبر الهدهد، عرش بلقيس، وخضوع الجن والريح.',
    'وعندما رأى عرش بلقيس حاضرًا قال: هذا من فضل ربي. لم يقل هذا بذكائي أو سلطاني، فكانت كلمته ميزانًا لكل صاحب نعمة.',
  ],
  'prophet-ilyas': [
    'وقف إلياس عليه السلام أمام عبادة متوارثة، فدعاهم إلى الله ربهم ورب آبائهم الأولين. فالرجوع إلى الأصل الصحيح كان جوهر دعوته.',
    'وبقي سلام الله على إلياس في الآخرين، ليعلم الداعية أن أثر الكلمة الصادقة لا ينتهي عند حدود زمنه.',
  ],
  'prophet-alyasa': [
    'وكون التفاصيل قليلة لا يقلل من منزلته؛ فالقرآن يربي المؤمن على التسليم لما أخبر الله به، وعلى محبة كل من اختاره الله للنبوة.',
    'واليسع عليه السلام شاهد على امتداد خط الهداية في بني إسرائيل، وأن الله لا يترك الناس بلا مذكرين وهادين.',
  ],
  'prophet-yunus': [
    'لو بقي يونس عليه السلام في بطن الحوت بلا تسبيح لكان من الهالكين، لكن الذكر فتح باب النجاة. فالكلمة الصادقة في الظلمة قد تغير المصير بإذن الله.',
    'وقومه تميزوا بأنهم آمنوا قبل نزول العذاب، فرفع الله عنهم البلاء. وهذا يثبت أن التوبة الصادقة تنفع إذا جاءت قبل فوات الأوان.',
  ],
  'prophet-zakariya': [
    'كان دعاؤه خفيًا، وفي هذا أدب عظيم: فالله يسمع الهمس كما يسمع الجهر، ويعلم حاجة القلب قبل أن ينطق بها اللسان.',
    'ولما طلب الولي الصالح لم يطلب ولدًا للدنيا، بل طلب من يحمل أمانة الدين. فكانت البشارة بيحيى رحمة وامتدادًا للخير.',
  ],
  'prophet-yahya': [
    'اجتمع في يحيى عليه السلام صفاء الطفولة وحكمة النبوة، فكان آية على أن الله يهب الفضل لمن يشاء في أي عمر شاء.',
    'وكانت حياته دعوة إلى العفة والجدية والخشية، فليس صلاح الشاب أن ينتظر الكبر، بل أن يبدأ طريق الله مبكرًا.',
  ],
  'prophet-isa': [
    'وكانت معجزات عيسى عليه السلام كلها بإذن الله، ليبقى التوحيد واضحًا: النبي عبد مكرم، والقدرة لله وحده.',
    'ورفعه الله إليه وبقيت حقيقته محفوظة في القرآن: عبد الله ورسوله. وسيبقى الإيمان به جزءًا من إيمان المسلم بجميع رسل الله.',
  ],
  'prophet-muhammad': [
    'وتفاصيل سيرته ﷺ تمتد من مكة إلى المدينة: دعوة سرية ثم جهرية، صبر على الأذى، هجرة وبناء أمة، جهاد ورحمة، تعليم وعبادة، حتى اكتمل الدين.',
    'كان ﷺ رحمة في بيته، وعدلًا في حكمه، وشجاعًا في الميدان، وخاشعًا في محرابه، ومربيًا لأصحابه. فمن أراد القصة الكاملة للإسلام وجدها في سيرته قولًا وعملًا وخلقًا.',
  ],
};

function fullText(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n');
}

function preferLongerText(primary = '', fallback = ''): string {
  const current = primary.trim();
  const candidate = fallback.trim();
  if (!current) return candidate;
  if (!candidate) return current;
  return candidate.length > current.length ? candidate : current;
}

export function expandProphetTranscript(id: string, transcript: string): string {
  return fullText([transcript, ...(PROPHET_ADDITIONS[id] || []), ...COMMON_PROPHET_STORY_EXTENSION]);
}

export function expandProphetEnglishTranscript(id: string, transcript = ''): string {
  return fullText([transcript, ...COMMON_PROPHET_STORY_EXTENSION_EN]);
}

// Per-companion full-depth transcripts (1500-2500 words). When a companion's
// id has an entry here, the full transcript replaces the generic 4-paragraph
// template below. Keyed source: data/companions-extra.ts.
import { COMPANIONS_EXTENDED_TRANSCRIPTS } from './companions-extra';

export function expandCompanionStory<T extends StoryLike>(companion: T): T {
  const story = companion.story || [];
  if (story.length === 0) return companion;
  const name = companion.nameAr || 'هذا الصحابي';
  const nameEn = companion.nameEn || name;
  const virtues = (companion.virtues || []).filter(Boolean);
  const virtuesEn = (companion.virtuesEn || []).filter(Boolean);

  // If we have a hand-written long-form transcript, prefer it wholesale —
  // the auto-generated template paragraphs are interchangeable filler that
  // makes every companion's story read the same. Card briefs in
  // app/companions.tsx still use companion.story directly, so this only
  // affects the long "read story" / listening view.
  const companionId = (companion as { id?: string }).id;
  const handWritten = companionId ? COMPANIONS_EXTENDED_TRANSCRIPTS[companionId] : undefined;
  if (handWritten) {
    return {
      ...companion,
      transcript: preferLongerText(companion.transcript, handWritten.ar),
      transcriptEn: preferLongerText(companion.transcriptEn, handWritten.en),
    };
  }

  const additions = [
    `ولا تكتمل قصة ${name} عند هذه المحطات وحدها؛ فحياته كانت جزءًا من بناء الجيل الذي حمل الإسلام من مكة والمدينة إلى العالم. كان قربه من النبي ﷺ، وثباته في المواقف، وخدمته للدين، علامات على صدق الإيمان لا مجرد أحداث متفرقة.`,
    virtues.length
      ? `ومن أبرز ما يميز سيرته: ${virtues.join('، ')}. وهذه المناقب ليست ألقابًا للزينة، بل خلاصة مواقف عملية عاشها في العبادة والجهاد والعلم والنصرة وبذل النفس والمال.`
      : '',
    `وتظهر قيمة هذه السيرة حين يقرأها المسلم كقصة تربية لا كخبر تاريخي فقط؛ ففيها معنى الصحبة الصادقة، والاستجابة للوحي، وتقديم رضا الله على راحة النفس، وحمل المسؤولية في أوقات الشدة.`,
    `لذلك بقي ذكر ${name} حاضرًا في قلوب المسلمين، لأن سير الصحابة رضي الله عنهم تشرح كيف تحوّل الإيمان إلى حياة كاملة: صلاة وصدق، علم وعمل، رحمة وشجاعة، وثبات حتى آخر الطريق.`,
  ].filter(Boolean);
  const expandedArabic = fullText([...story, ...additions]);
  const expandedEnglish = fullText([
    ...(companion.storyEn || []),
    companion.briefEn || companion.brief ? `${nameEn} is remembered in Islamic history for a life shaped by faith, sacrifice, and service to the message of Islam.` : '',
    virtuesEn.length
      ? `Among the qualities connected to this story are: ${virtuesEn.join(', ')}. These were not decorative titles, but lived meanings seen in worship, loyalty, knowledge, courage, and service.`
      : '',
    `The story of ${nameEn} should be read as more than a historical report. It is a lesson in companionship with the Prophet Muhammad, peace and blessings be upon him, sincere response to revelation, and placing the pleasure of Allah above comfort and desire.`,
    `This is why the lives of the Companions remain present in Muslim hearts. Their stories show how faith became a complete way of life: prayer and truthfulness, knowledge and action, mercy and courage, and steadfastness until the end.`,
  ]);

  return {
    ...companion,
    story: [...story, ...additions],
    transcript: preferLongerText(companion.transcript, expandedArabic),
    transcriptEn: preferLongerText(companion.transcriptEn, expandedEnglish),
  };
}

export function expandCompanionStories<T extends StoryLike>(companions: T[]): T[] {
  return companions.map(expandCompanionStory);
}

export function expandCompanionsContent<T extends { companions: StoryLike[] }>(content: T): T {
  return {
    ...content,
    companions: expandCompanionStories(content.companions),
  };
}
