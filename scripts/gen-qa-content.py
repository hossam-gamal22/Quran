#!/usr/bin/env python3
"""
Regenerates the bilingual (ar + en) Q&A data used by the app and the Firestore uploader.

It does two things:
  1. Updates the 5 "non-answers" in data/json/qa-data.json (Arabic) with full rulings.
  2. Extracts the existing English maps from lib/qa-content-api.ts, overrides the same
     5 answers with full English translations, and writes a single unified
     translations file: data/json/qa-translations-en.json

Run from project root:  python3 scripts/gen-qa-content.py
"""
import json
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_DATA = os.path.join(ROOT, 'data/json/qa-data.json')
API_TS = os.path.join(ROOT, 'lib/qa-content-api.ts')
OUT_EN = os.path.join(ROOT, 'data/json/qa-translations-en.json')

# ── New full Arabic answers for the 5 previously-incomplete questions ─────────
NEW_AR = {
    # ما حكم بيع المستلزمات الطبية غير المرخصة في وقت الأزمات؟
    '66e9b282-b64e-4ce3-8ed2-00e1559baa84': (
        "أولًا، قال النبي ﷺ: «مَن غشّنا فليس منّا».\n\n"
        "فكل من يبيع مستلزمات طبية، أو أي سلعة غير مرخّصة أو مغشوشة، فهو داخل في معنى الغش الذي نهى عنه النبي ﷺ. "
        "وهذا الفعل ليس من أخلاق المسلمين، لأنه يقوم على خداع الناس والإضرار بهم.\n\n"
        "والغش حرام شرعًا، وتزداد حرمته إذا كان في وقت الأزمات أو عند احتياج الناس، لأن فيه استغلالًا لحاجتهم "
        "وتعريضًا لحياتهم أو صحتهم للخطر. ومن يفعل ذلك فقد ارتكب إثمًا عظيمًا، وقد يكون من الكبائر إذا ترتب عليه ضرر بالناس.\n\n"
        "كما أن المال الناتج عن بيع هذه السلع مال حرام، لا بركة فيه، ويخشى على صاحبه أن يدخل على نفسه وأهل بيته مالًا خبيثًا. "
        "وقد قال النبي ﷺ: «أيما جسد نبت من سُحت فالنار أولى به».\n\n"
        "لذلك فالواجب على كل مسلم أن يتقي الله في بيعه وشرائه، وأن يعلم أن الربح الحرام لا يدوم، "
        "وأن سلامة الناس وحقوقهم أمانة سيحاسب عليها أمام الله."
    ),
    # ما حكم وضع النقط في الأنف والأذن أثناء الصيام؟
    '6ace1c47-6747-42fa-9a58-0902ab172798': (
        "أولًا: قطرة الأنف أثناء الصيام\n\n"
        "وضع النقط في الأنف قد يكون مفسدًا للصوم إذا وصل الدواء إلى داخل الجوف أو إلى ما يُعد منفذًا إليه. "
        "فإذا وصل الدواء إلى الخيشوم، وهو أعلى داخل الأنف، وكان له أثر يصل إلى الحلق أو الجوف، فالأحوط أن يُعد ذلك مفطرًا، ويلزم القضاء.\n\n"
        "أما إذا كانت القطرة في أول الأنف فقط، ولم تتجاوز موضعها، ولم يشعر الصائم بوصول شيء منها إلى الحلق أو الجوف، فالصوم صحيح ولا قضاء عليه.\n\n"
        "ثانيًا: قطرة الأذن أثناء الصيام\n\n"
        "أما التقطير في الأذن، فقد ذهب جمهور الفقهاء إلى أنه يفسد الصوم إذا وصل أثر الدواء إلى الداخل، "
        "واعتبروا الأذن منفذًا قد يصل منه الدواء إلى الدماغ أو الجوف.\n\n"
        "بينما ذهب بعض أهل العلم، ومنهم بعض الشافعية، إلى أن قطرة الأذن لا تفطر، لأن الأذن ليست منفذًا معتادًا مباشرًا إلى الجوف، "
        "وما يصل منها إنما يكون عن طريق المسام، وهذا يشبه الكحل ونحوه.\n\n"
        "والمرجع في تحقق وصول الدواء إلى الداخل من الناحية الطبية هو قول الأطباء، وعلى الإنسان أن يأخذ بما يناسب حالته. "
        "ومع ذلك، فإن الاحتياط أولى، فمن استطاع تأجيل استعمال القطرة إلى ما بعد الإفطار فهو أفضل خروجًا من الخلاف، "
        "إلا إذا كان محتاجًا إليها أو متضررًا من تركها."
    ),
    # من لم يستطع الحج بنفسه هل يمكنه أن ينيب عنه؟
    '4cda44f7-a120-4f2e-b3a1-09ea26b631ab': (
        "بسم الله الرحمن الرحيم، الحمد لله، والصلاة والسلام على سيدنا ومولانا رسول الله، وعلى آله وصحبه ومن والاه.\n\n"
        "إذا تحققت في الإنسان شروط وجوب الحج، لكنه عجز عن الذهاب بنفسه عجزًا مستمرًا، جاز له أن ينيب غيره ليحج عنه.\n\n"
        "وقد ورد عن عبد الله بن عباس رضي الله عنهما أن رسول الله ﷺ سمع رجلًا يقول: لبيك عن شُبْرُمة، "
        "فقال له النبي ﷺ: «ومن شبرمة؟» قال: أخ لي أو قريب لي. فقال له النبي ﷺ: «أحججت عن نفسك؟» قال: لا. "
        "قال: «حج عن نفسك، ثم حج عن شبرمة».\n\n"
        "ويُؤخذ من هذا الحديث وغيره جواز الحج عن الغير، سواء كان ذلك تبرعًا أو مقابل نفقة وأجر، "
        "لكن بشرط أن يكون من يحج عن غيره قد حج عن نفسه أولًا.\n\n"
        "كما يشترط أن يكون الشخص الذي يُحج عنه عاجزًا عن أداء الحج بنفسه، كأن يكون ميتًا، أو مصابًا بعجز بدني شديد، "
        "أو مرض لا يُرجى شفاؤه، أو عاهة تمنعه من الحركة والسفر، أو أي مانع دائم يجعله غير قادر على الذهاب للحج بنفسه.\n\n"
        "أما من كان عجزه مؤقتًا ويُرجى زواله، فينتظر حتى يستطيع أداء الحج بنفسه."
    ),
    # المقابر تحفها المساكن — هدمها ونقلها
    '99922a06-a073-4aa9-9fbc-0af2b21377ea': (
        "إذا كانت المقابر في القرية محاطة بالمساكن من كل اتجاه، فلا يجوز هدمها أو نقل ما فيها من الموتى إلى مكان آخر "
        "إلا لضرورة معتبرة، وبعد التأكد من أن أجساد المقبورين قد اندثرت، وبليت عظامهم، واستحالت إلى تراب.\n\n"
        "ويشترط في ذلك أن يكون لمن يقوم بالنقل حق التصرف في الأرض، وأن يتم الأمر وفق القوانين واللوائح المنظمة لهذا الشأن، "
        "ودون اعتداء على حرمة الموتى أو مخالفة شرعية أو قانونية.\n\n"
        "ويُستثنى من ذلك مقابر العلماء والأولياء والصالحين، فلا يجوز التعرض لها أو نقلها أو هدمها، لما لها من حرمة ومكانة، "
        "ولما قد يترتب على ذلك من مفاسد.\n\n"
        "وعليه، فالأصل هو احترام حرمة المقابر وعدم التعرض لها، ولا يُلجأ إلى نقلها أو إزالة ما فيها إلا عند الضرورة، "
        "وبالضوابط الشرعية والقانونية المعتبرة."
    ),
    # هل يجوز نقل رفاة المتوفي من مقبرة إلى أخرى أو من بلد إلى آخر؟
    'b8a3bc80-1047-4562-bc9e-07db5b968c59': (
        "المسلم مأمور بالصبر على قضاء الله تعالى وقدره، واحتساب الأجر عند المصيبة. قال الله تعالى:\n\n"
        "﴿وَلَنَبْلُوَنَّكُمْ بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ وَنَقْصٍ مِّنَ الْأَمْوَالِ وَالْأَنفُسِ وَالثَّمَرَاتِ ۗ وَبَشِّرِ الصَّابِرِينَ ۝ "
        "الَّذِينَ إِذَا أَصَابَتْهُم مُّصِيبَةٌ قَالُوا إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ ۝ "
        "أُولَـٰئِكَ عَلَيْهِمْ صَلَوَاتٌ مِّن رَّبِّهِمْ وَرَحْمَةٌ ۖ وَأُولَـٰئِكَ هُمُ الْمُهْتَدُونَ﴾.\n\n"
        "وهذا الثواب العظيم يكون لمن صبر عند الصدمة الأولى، وسلّم لأمر الله، واحتسب مصيبته، واسترجع بقوله: "
        "إنا لله وإنا إليه راجعون، فينال صلوات من ربه ورحمة وهداية.\n\n"
        "والأصل في الدفن أن يُدفن الميت في المكان الذي مات فيه، كما وقع في شهداء غزوة أحد، حيث دُفنوا في موضع استشهادهم. "
        "وقد رُوي عن هشام بن عامر الأنصاري رضي الله عنه أن الأنصار جاءوا إلى رسول الله ﷺ يوم أحد فقالوا: أصابنا قرح وجهد، "
        "فقال: «احفروا وأوسعوا، واجعلوا الرجلين والثلاثة في القبر».\n\n"
        "ومع ذلك، فقد أجاز بعض الفقهاء نبش القبر ونقل الميت إذا وُجدت حاجة معتبرة أو مصلحة راجحة، مع مراعاة حرمة الميت وعدم امتهانه.\n\n"
        "ومن أدلة ذلك ما رُوي عن جابر بن عبد الله رضي الله عنهما أنه قال: دُفن مع أبي رجل، فلم تطب نفسي حتى أخرجته، "
        "فجعلته في قبر على حدة. ويُستفاد من هذا الأثر جواز نبش القبر ونقل الميت لأمر يتعلق بمصلحة الحي أو طيب نفسه، "
        "ما دام لا يترتب على ذلك ضرر أو امتهان للميت.\n\n"
        "كما نُقل عن الإمام أحمد أنه لم ير بأسًا في نقل الموتى من مواضع غير مناسبة، وذكر أن معاذًا رضي الله عنه نبش قبر امرأته. "
        "وجاء في موطأ الإمام مالك أن سعد بن أبي وقاص وسعيد بن زيد رضي الله عنهما ماتا بالعقيق، فحُملا إلى المدينة ودُفنا بها، "
        "وفي ذلك دلالة على جواز نقل الميت من الموضع الذي مات فيه إلى موضع آخر ليدفن فيه، عند الحاجة أو المصلحة.\n\n"
        "وعليه، ففي واقعة السؤال، إذا مات الابن في الحج، ودُفن بعيدًا عن أهله، ولم يعلم والده إلا بعد مدة، وتأثر بذلك تأثرًا شديدًا، "
        "فلا حرج من اتخاذ الإجراءات اللازمة لنقل الجثمان إلى بلد أهله أو قريته، بشرط مراعاة الضوابط الشرعية والطبية والصحية والقانونية، "
        "وأن يتم ذلك بما يحفظ حرمة الميت، ودون انتهاك أو امتهان لجسده.\n\n"
        "ويكون ذلك جائزًا خاصة إذا كان في نقله تطييب لخاطر والده وأهله، وتحقيق مصلحة معتبرة لا تخالف قواعد الشريعة.\n\n"
        "والله تعالى أعلى وأعلم."
    ),
}

# ── New full English answers (faithful translations of the Arabic above) ──────
NEW_EN = {
    '66e9b282-b64e-4ce3-8ed2-00e1559baa84': (
        "First, the Prophet ﷺ said: “Whoever cheats us is not one of us.”\n\n"
        "So anyone who sells medical supplies — or any goods — that are unlicensed or adulterated falls under the meaning of "
        "the cheating (ghish) that the Prophet ﷺ forbade. This conduct is not part of the morals of Muslims, because it is built on "
        "deceiving people and harming them.\n\n"
        "Cheating is forbidden in Islam, and its prohibition becomes greater in times of crisis or when people are in need, because it "
        "exploits their need and endangers their lives or health. Whoever does this has committed a grave sin, which may be among the "
        "major sins if it results in harm to people.\n\n"
        "Moreover, the money earned from selling such goods is unlawful money with no blessing in it, and such a person risks bringing "
        "unlawful, impure wealth upon himself and his household. The Prophet ﷺ said: “Any flesh that grows from unlawful gain, the "
        "Fire is more deserving of it.”\n\n"
        "Therefore, every Muslim must fear Allah in his buying and selling, and know that unlawful profit does not last, and that the "
        "safety and rights of people are a trust for which he will be held accountable before Allah."
    ),
    '6ace1c47-6747-42fa-9a58-0902ab172798': (
        "First: Nose drops while fasting\n\n"
        "Putting drops in the nose may break the fast if the medicine reaches the interior of the body (the jawf) or what is considered "
        "a passage to it. If the medicine reaches the upper nasal cavity (the khayshum) and has an effect that reaches the throat or the "
        "interior, the more cautious view is that this breaks the fast and the day must be made up.\n\n"
        "But if the drops remain only at the front of the nose and do not go beyond their place, and the fasting person does not sense "
        "anything of it reaching the throat or interior, then the fast is valid and no makeup is required.\n\n"
        "Second: Ear drops while fasting\n\n"
        "As for putting drops in the ear, the majority of jurists held that it breaks the fast if the effect of the medicine reaches the "
        "interior, considering the ear a passage through which medicine may reach the brain or the interior.\n\n"
        "Some scholars, however — including some of the Shafi‘is — held that ear drops do not break the fast, because the ear is not "
        "a normal direct passage to the interior, and what reaches it does so through the pores, similar to kohl and the like.\n\n"
        "The reference for whether the medicine actually reaches the interior, medically, is the statement of doctors, and a person should "
        "act according to what suits his condition. Nevertheless, caution is better: whoever is able to delay using the drops until after "
        "breaking the fast, that is preferable in order to avoid the disagreement — unless he is in need of them or is harmed by leaving them."
    ),
    '4cda44f7-a120-4f2e-b3a1-09ea26b631ab': (
        "In the name of Allah, the Most Merciful, the Most Compassionate. Praise be to Allah, and prayers and peace be upon our master and "
        "guide, the Messenger of Allah, and upon his family and Companions and those who follow him.\n\n"
        "If the conditions making Hajj obligatory are fulfilled in a person, but he is unable to go himself with a continuing inability, "
        "then he may appoint someone else to perform Hajj on his behalf.\n\n"
        "It is reported from Abdullah ibn Abbas (may Allah be pleased with them both) that the Messenger of Allah ﷺ heard a man saying: "
        "“Labbayk (here I am) on behalf of Shubrumah.” The Prophet ﷺ said to him: “Who is Shubrumah?” He said: “A brother of mine,” "
        "or “a relative of mine.” The Prophet ﷺ said: “Have you performed Hajj for yourself?” He said: “No.” He said: "
        "“Perform Hajj for yourself, then perform Hajj on behalf of Shubrumah.”\n\n"
        "From this hadith and others, it is derived that performing Hajj on behalf of another is permissible, whether voluntarily or in "
        "return for expenses and a fee — but on the condition that the one performing Hajj on another’s behalf has already performed "
        "Hajj for himself first.\n\n"
        "It is also a condition that the person on whose behalf Hajj is performed be unable to perform it himself — such as being deceased, "
        "or suffering a severe physical disability, or an illness with no hope of recovery, or an impairment that prevents him from moving "
        "and traveling, or any permanent obstacle that makes him unable to go to Hajj himself.\n\n"
        "As for someone whose inability is temporary and expected to pass, he should wait until he is able to perform Hajj himself."
    ),
    '99922a06-a073-4aa9-9fbc-0af2b21377ea': (
        "If the graves in the village are surrounded by homes on every side, it is not permissible to demolish them or to move the dead "
        "within them to another place except for a recognized necessity, and after confirming that the bodies of those buried have "
        "decomposed, their bones have decayed, and they have turned to dust.\n\n"
        "It is also a condition that whoever carries out the relocation has the legal right to dispose of the land, that the matter be "
        "done in accordance with the laws and regulations governing this, and without violating the sanctity of the dead or committing "
        "any religious or legal breach.\n\n"
        "Excepted from this are the graves of scholars, righteous saints (awliya’), and the pious; it is not permissible to disturb, "
        "move, or demolish them, due to their sanctity and standing, and because of the harms that may result from doing so.\n\n"
        "Accordingly, the basic rule is to respect the sanctity of graves and not disturb them, and one should not resort to relocating "
        "them or removing what is in them except in case of necessity, and according to the recognized religious and legal controls."
    ),
    'b8a3bc80-1047-4562-bc9e-07db5b968c59': (
        "A Muslim is commanded to be patient with the decree and destiny of Allah Almighty, and to seek reward when afflicted. Allah "
        "Almighty says:\n\n"
        "“And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings "
        "to the patient — who, when disaster strikes them, say, ‘Indeed we belong to Allah, and indeed to Him we will return.’ Those are "
        "the ones upon whom are blessings from their Lord and mercy, and it is those who are the rightly guided.”\n\n"
        "This great reward is for the one who is patient at the first shock, submits to the command of Allah, seeks reward for his "
        "affliction, and says: ‘Indeed we belong to Allah, and indeed to Him we will return,’ so he attains blessings from his Lord, "
        "mercy, and guidance.\n\n"
        "The basic principle in burial is that the deceased is buried in the place where he died, as happened with the martyrs of the "
        "Battle of Uhud, who were buried at the site of their martyrdom. It is reported from Hisham ibn Amir al-Ansari (may Allah be "
        "pleased with him) that the Ansar came to the Messenger of Allah ﷺ on the day of Uhud and said: “We have suffered wounds and "
        "hardship,” so he said: “Dig, make the graves wide, and place two and three (men) in one grave.”\n\n"
        "Nevertheless, some jurists permitted exhuming a grave and moving the deceased if there is a recognized need or a preponderant "
        "interest (maslahah), while observing the sanctity of the deceased and not degrading him.\n\n"
        "Among the evidence for this is what is reported from Jabir ibn Abdullah (may Allah be pleased with them both), who said: “A man "
        "was buried with my father, but my soul was not at ease until I took him out and placed him in a separate grave.” It is derived "
        "from this report that it is permissible to exhume a grave and move the deceased for a matter relating to the interest of the "
        "living or their peace of mind, as long as no harm or degradation of the deceased results.\n\n"
        "It was also narrated from Imam Ahmad that he saw no harm in moving the dead from unsuitable places, and he mentioned that Mu‘adh "
        "(may Allah be pleased with him) exhumed his wife’s grave. It is stated in the Muwatta of Imam Malik that Sa‘d ibn Abi Waqqas and "
        "Sa‘id ibn Zayd (may Allah be pleased with them both) died at al-‘Aqiq and were carried to Madinah and buried there — which "
        "indicates the permissibility of moving the deceased from the place where he died to another place to be buried in, when there is "
        "a need or interest.\n\n"
        "Accordingly, in the case in question: if the son died during Hajj and was buried far from his family, and his father did not learn "
        "of it until after a period and was deeply affected by it, then there is no harm in taking the necessary steps to transport the "
        "body to the country or village of his family — on the condition of observing the religious, medical, health, and legal controls, "
        "and that it be done in a way that preserves the sanctity of the deceased, without violating or degrading his body.\n\n"
        "This is permissible especially if moving him brings comfort to his father and family and achieves a recognized interest that does "
        "not contradict the rules of the Shari‘ah.\n\n"
        "And Allah Almighty knows best."
    ),
}


def extract_map(src, name):
    m = re.search(name + r':\s*Record<string, string>\s*=\s*\{(.*?)\n\};', src, re.S)
    block = m.group(1)
    out = {}
    for line in block.split('\n'):
        mm = re.match(r"\s*'([0-9a-f\-]+)':\s*'(.*)',\s*$", line)
        if mm:
            out[mm.group(1)] = mm.group(2)
    return out


def main():
    # 1. Update Arabic answers in qa-data.json
    data = json.load(open(QA_DATA, encoding='utf-8'))
    updated = 0
    for lst in data['items'].values():
        for it in lst:
            if it['id'] in NEW_AR:
                it['answer'] = NEW_AR[it['id']]
                updated += 1
    assert updated == len(NEW_AR), f"expected {len(NEW_AR)} AR updates, got {updated}"
    with open(QA_DATA, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"✅ Updated {updated} Arabic answers in qa-data.json")

    # 2. Build unified EN translations file
    src = open(API_TS, encoding='utf-8').read()
    cats = extract_map(src, 'LEGACY_QA_CATEGORY_NAMES_EN')
    questions = extract_map(src, 'LEGACY_QA_QUESTIONS_EN')
    answers = extract_map(src, 'LEGACY_QA_ANSWERS_EN')

    # override the 5 placeholder answers with full English
    for k, v in NEW_EN.items():
        assert k in answers, f"unknown id {k}"
        answers[k] = v

    all_ids = [it['id'] for lst in data['items'].values() for it in lst]
    missing = [i for i in all_ids if i not in questions or i not in answers]
    assert not missing, f"missing EN for: {missing}"

    out = {'categories': cats, 'questions': questions, 'answers': answers}
    with open(OUT_EN, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"✅ Wrote {OUT_EN} ({len(cats)} cats, {len(questions)} questions, {len(answers)} answers)")


if __name__ == '__main__':
    main()
