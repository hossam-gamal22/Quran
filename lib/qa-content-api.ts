import { db } from '@/config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QA_CACHE_KEY = '@qa_content_cache';

const LEGACY_QA_CATEGORY_NAMES_EN: Record<string, string> = {
  '7c8fcd8a-eab1-4748-80cd-065829bad2d0': 'Encyclopedia of Islamic Jurisprudence',
  'cab28cbe-1700-483f-846f-08dc2c7ef253': 'Islam Mailbox',
  '61837daf-9334-40ad-8471-08dc2c7ef253': 'One-Minute Fiqh',
  '12bd2def-39aa-4772-8936-08dc2c8f9689': 'With Those Who Fast',
  'a20aaf61-5ea8-4b79-97e2-3ab3239d3aa0': 'Between the Questioner and the Jurist',
  'cc9fabd4-5559-4f4a-8963-cbdf7fdec7b1': 'Asked and Answered',
};

const LEGACY_QA_QUESTIONS_EN: Record<string, string> = {
  'b2253655-85d7-49c2-a5d0-0442645edd4f': 'What is the ruling on making up a voluntary fast?',
  'b20ebedf-e5fd-4ec2-aa55-0535815154c8': 'What are the causes by which ownership is transferred in Islamic jurisprudence?',
  '8368c5d1-25a5-497a-9930-068580e8b7ea': 'What is usufruct, what rights does the beneficiary have, and what are its sources in Islamic law?',
  'f4b93353-27bf-4972-ba5c-06e2c9a6f285': 'What is the Fast of Dawud?',
  '9526c790-5b1d-4050-9f10-0f4d31a4db07': 'What is the concept of wages or rent, and what are its types?',
  '78eb2964-65dc-43fe-8ba5-719ac7d7584b': 'What is an ijarah contract, and what are its main characteristics?',
  '24b2e253-e653-41c6-b5c9-02b15ff3da63': 'What is the ruling on recreation and relaxation in Islam?',
  '385953b7-f269-4cdf-aa2c-0529cf97a71c': 'I want a divorce from my husband by release of claims. What rights may I still claim after this divorce?',
  'b6ea76f2-c778-41aa-b855-068f847fa1b1': 'How should a latecomer make up the part of the prayer missed with the imam?',
  'e7d4c58c-ef94-4c80-a9cc-09e3cdcb0be5': 'A woman died leaving a husband, mother, full brother, maternal brother, father, and daughter. Who inherits and who does not?',
  'fededaf4-5297-47dd-817b-0b4c4c554120': 'Who is entitled to the engagement jewelry and gifts if the engagement is broken off?',
  '444ab561-86d6-4dc4-9292-0e1f4b186c7c': 'What is kalalah, and how is its estate divided in light of the Quranic verses?',
  '66e9b282-b64e-4ce3-8ed2-00e1559baa84': 'What is the ruling on selling unlicensed medical supplies during crises?',
  '2f1f3499-8fab-4f20-a04a-01aa5b231279': 'What is the ruling on the mosque greeting prayer, and when is it performed?',
  '6ace1c47-6747-42fa-9a58-0902ab172798': 'What is the ruling on using nose or ear drops while fasting?',
  '4cda44f7-a120-4f2e-b3a1-09ea26b631ab': 'Can someone who is unable to perform Hajj personally appoint another person to perform it on their behalf?',
  '99922a06-a073-4aa9-9fbc-0af2b21377ea': 'In our village, graves are surrounded by homes on every side. May these graves be demolished and moved outside the village so the land becomes housing?',
  'd8882328-a95d-412d-ba30-0f221552dc6f': 'Must a husband pay for his wife’s medical treatment?',
  'beb5c872-8e86-4957-9408-022132be6ab6': 'Must the expiation for missed fasting be a meal enough for iftar and suhur, and may it be given to siblings?',
  '806099ae-f72d-464f-9daf-03650f7d22f4': 'What is meant by al-hal al-murtahil?',
  'bdd87525-fd4e-434e-bbcc-04aaa6750d96': 'How does a patient with a urinary catheter perform wudu?',
  '8e8d0cb4-36c9-4714-9def-07bb025cca3b': 'Is it permissible for a wife to wash her deceased husband, and vice versa?',
  'b8a3bc80-1047-4562-bc9e-07db5b968c59': 'Is it permissible to move a deceased person’s remains from one grave or country to another?',
  '829c7350-7c1d-4f56-96b9-09081965148d': 'If someone swears by divorce not to do something and then does it, does divorce occur?',
  '6946ac3b-c1d2-4571-82ab-0251ca4da749': 'What is the ruling on withdrawing from a sale because a higher price was offered?',
  '97a04fee-39a3-42d4-8be7-0258532f4915': 'Which should take priority: missed obligatory prayers or voluntary prayers?',
  'b56b65a6-6378-4181-80d6-0389ae2161cf': 'When can one’s children and spouse become enemies to a person?',
  '885e4ccc-f960-4ff6-beb2-071cf4c61f24': 'Is zakat due on gold bullion?',
  '5168f8f7-99be-4310-87a6-07c4f7411b6b': 'May I supplicate against someone who hit me with his car and injured me?',
  '444929f7-de34-495a-be66-09bfef8df7bc': 'What is the fiqh ruling if one forgets short surahs or the middle tashahhud in prayer?',
  '50b9fc31-73cd-496f-9610-0542e78480f0': 'Who accompanied Musa, peace be upon him, on the journey mentioned in Surat al-Kahf?',
  'dac383d3-ef1b-41f7-b568-0764680823e9': 'How did the Prophet ﷺ move his community from belief in rain stars to pure monotheism?',
  'c564cb9b-f24c-4d6b-9c92-0fb2d321345f': 'Can an apparent harm you see today be a greater good that Allah diverted from you? A wisdom from Luqman.',
  'e63ed69c-fadf-4e9d-943e-1a62f90887d4': 'What dhikr did the Prophet ﷺ recommend to his Companions?',
  'dca5dc0e-296c-4c41-b27d-1d1d3c773069': 'What is the purpose for which Allah created humankind?',
  '73cbb029-4667-4b14-aac5-21d4dc32e649': 'What is the virtue of charity and its effect in a believer’s life?',
};

const LEGACY_QA_ANSWERS_EN: Record<string, string> = {
  'b2253655-85d7-49c2-a5d0-0442645edd4f': 'Scholars differed about making up a voluntary fast if a person breaks it. The Maliki and Hanafi schools require making it up, especially if it was broken without an excuse, because a person should preserve an act of worship once begun. The Shafi‘i and Hanbali schools hold that no makeup is required because the fast was not obligatory. The matter is therefore one of scholarly disagreement, though it is better to complete a voluntary fast after starting it unless there is a valid excuse.',
  'b20ebedf-e5fd-4ec2-aa55-0535815154c8': 'Ownership may transfer compulsorily, such as through inheritance, or voluntarily by a person’s choice. Jurists also mention practical causes, such as hunting lawful land or sea game; verbal causes, chiefly contracts based on offer and acceptance, consent, and legal capacity; and transfers that occur without explicit wording, such as a customary hand-to-hand sale.',
  '8368c5d1-25a5-497a-9930-068580e8b7ea': 'Usufruct is a real right that allows a beneficiary to use or benefit from property owned by someone else without acquiring ownership of the property itself. The beneficiary may use it, lease it, or take its fruits so long as they do not harm or alter its substance. Its sources may include agreement between parties or a public permission connected to public, not private, property.',
  'f4b93353-27bf-4972-ba5c-06e2c9a6f285': 'The Fast of Dawud is to fast one day and not fast the next. It is recommended for someone who wants frequent voluntary fasting and is able to do so without harm. The Prophet ﷺ described it as the most beloved fasting to Allah, and Islamic law is governed by the principle that harm must be avoided.',
  '9526c790-5b1d-4050-9f10-0f4d31a4db07': 'The wage or rent is the compensation paid by the tenant or employer to the lessor or worker in return for the benefit received. It may be cash, a specified item equivalent to the cash rent, or another exchanged benefit, provided it is known and clearly defined.',
  '78eb2964-65dc-43fe-8ba5-719ac7d7584b': 'Ijarah is a contract of exchange in which compensation is paid for a benefit. It binds both parties: the lessor must deliver the benefit, and the lessee must pay the rent or wage. It covers many forms, such as leasing a home, land, or labor, and it is time-based because the amount of benefit is measured by the agreed duration.',
  '24b2e253-e653-41c6-b5c9-02b15ff3da63': 'Recreation is permissible in Islam when it remains within lawful limits. Islam balances spiritual, mental, and physical needs and recognizes human nature. The Prophet ﷺ lived a complete human life: he worshiped deeply, but also smiled, joked truthfully, married, ate, and dealt with people. Recreation should not lead to sin or neglect of obligations.',
  '385953b7-f269-4cdf-aa2c-0529cf97a71c': 'Divorce by release of claims means the wife gives up some or all of her financial marital rights in return for divorce, and it is valid for a legally competent woman. The release may cover the prompt or deferred dowry and past maintenance already due. It does not remove future maintenance before it becomes due, housing during the waiting period, or the children’s rights to support and housing.',
  'b6ea76f2-c778-41aa-b855-068f847fa1b1': 'A latecomer follows the imam in whatever part of the prayer they catch, then completes the missed rak‘ahs alone after the imam finishes. This follows the principle that the imam is appointed to be followed, and the missed portion is made up individually.',
  'e7d4c58c-ef94-4c80-a9cc-09e3cdcb0be5': 'The estate is divided as follows: the husband receives one quarter because there is a surviving daughter; the mother receives one sixth because there is a descendant heir and more than one sibling; the daughter receives one half; and the father receives one sixth plus the remainder by residuary entitlement. The full brother and maternal brother are excluded.',
  'fededaf4-5297-47dd-817b-0b4c4c554120': 'If the engagement jewelry was agreed to be part of the dowry, or custom treats it as part of the dowry, it must be returned to the suitor itself, or by equivalent value if it no longer exists. If it was not part of the dowry, it takes the ruling of gifts. Under the Hanafi position commonly applied in courts, gifts may be reclaimed if they still exist unchanged, but not if they have perished or been consumed.',
  '444ab561-86d6-4dc4-9292-0e1f4b186c7c': 'Kalalah most likely refers to a deceased person who leaves neither a descendant heir nor an ascendant father. The Quran mentions it in two inheritance contexts: maternal siblings share fixed portions, and full or paternal siblings inherit according to the rules in the final verse of Surat an-Nisa. The exact distribution depends on which heirs are present.',
  '66e9b282-b64e-4ce3-8ed2-00e1559baa84': 'The answer is handled by Dr. Magdy Ashour in the One-Minute Fiqh program. Because the bundled Arabic item only names the responding scholar and program, a detailed ruling is not included in the local fallback data.',
  '2f1f3499-8fab-4f20-a04a-01aa5b231279': 'The mosque greeting prayer is the prayer performed when entering a mosque. It is two rak‘ahs and is a Sunnah of the Prophet ﷺ. It may be prayed before the obligatory prayer or before the adhan when one enters. Whoever performs it is rewarded, and whoever leaves it is not sinful.',
  '6ace1c47-6747-42fa-9a58-0902ab172798': 'The answer is handled by Dr. Magdy Ashour in the One-Minute Fiqh program. Because the bundled Arabic item only names the responding scholar and program, a detailed ruling is not included in the local fallback data.',
  '4cda44f7-a120-4f2e-b3a1-09ea26b631ab': 'The answer is handled by Dr. Magdy Ashour in the One-Minute Fiqh program. Because the bundled Arabic item only names the responding scholar and program, a detailed ruling is not included in the local fallback data.',
  '99922a06-a073-4aa9-9fbc-0af2b21377ea': 'The answer is handled by Dr. Magdy Ashour in the One-Minute Fiqh program. Because the bundled Arabic item only names the responding scholar and program, a detailed ruling is not included in the local fallback data.',
  'd8882328-a95d-412d-ba30-0f221552dc6f': 'Medical treatment expenses for a wife are due from the husband, because treatment preserves her health and medicine is closely related to food. It therefore follows the same obligation of maintenance.',
  'beb5c872-8e86-4957-9408-022132be6ab6': 'The expiation for missed fasting should be a meal sufficient for the recipient’s iftar with enough remaining for suhur. Officially announced amounts are minimum estimates based on market prices and are not binding; one who can give more may do so. It may be given only to those eligible, such as the poor and needy. If one’s siblings are not poor, it should be given to someone who is entitled to it.',
  '806099ae-f72d-464f-9daf-03650f7d22f4': 'Al-hal al-murtahil is the person who completes the Quran and then begins again, reading Surat al-Fatihah and some verses from Surat al-Baqarah after reaching Surat an-Nas, as a hopeful sign of continuing the recitation and beginning another completion.',
  'bdd87525-fd4e-434e-bbcc-04aaa6750d96': 'A patient with a urinary catheter is treated as a person with a continuing excuse. Their wudu is valid unless something exits through the catheter that invalidates wudu. They should perform wudu for each prayer, and their wudu and prayer are valid.',
  '8e8d0cb4-36c9-4714-9def-07bb025cca3b': 'The preferred practice is that men wash deceased men and women wash deceased women. However, a wife may wash her deceased husband, based on the report from Aishah, may Allah be pleased with her. If emotional distress would delay washing and burial, another suitable person should do it.',
  'b8a3bc80-1047-4562-bc9e-07db5b968c59': 'The answer is attributed to Prof. Saif Rajab Qazamil in the With Those Who Fast program. The bundled Arabic item does not include the detailed ruling in the local fallback data.',
  '829c7350-7c1d-4f56-96b9-09081965148d': 'In this case divorce does not occur, but the person must offer expiation for breaking an oath: feeding ten poor people, or, if unable, fasting three days, whether consecutive or separate.',
  '6946ac3b-c1d2-4571-82ab-0251ca4da749': 'If buyer and seller have concluded an agreement, both parties must honor it. The seller may not withdraw merely because a higher price later appears, in accordance with the command to fulfill contracts.',
  '97a04fee-39a3-42d4-8be7-0258532f4915': 'Missed obligatory prayers have priority because they are obligations for which a person is accountable, while voluntary prayers are not obligatory. It is best to combine making up missed prayers with voluntary prayers if possible. If not, one should focus on making up the missed obligations, then resume voluntary prayers after reasonably completing them.',
  'b56b65a6-6378-4181-80d6-0389ae2161cf': 'Children and spouses may become enemies to a person when they prevent them from obeying Allah or push them toward unlawful earnings. This is connected to the Quranic warning that some spouses and children may be enemies, so believers should be cautious.',
  '885e4ccc-f960-4ff6-beb2-071cf4c61f24': 'Gold that is not used for personal adornment is subject to zakat. Therefore, zakat is due on gold bullion if it reaches the nisab and a lunar year has passed over it.',
  '5168f8f7-99be-4310-87a6-07c4f7411b6b': 'It is permissible to supplicate against an oppressor, but there are levels. The better course is to entrust the matter to Allah and seek reward through pardon and reform. Supplicating against the wrongdoer may mean the oppressed person has taken their right in this world, while saying "Allah is sufficient for me, and He is the best disposer of affairs" is better.',
  '444929f7-de34-495a-be66-09bfef8df7bc': 'Reciting a short surah and the middle tashahhud are Sunnah acts, not pillars. Forgetting either of them does not invalidate the prayer, even if the worshiper does not perform the prostration of forgetfulness at the end.',
  '50b9fc31-73cd-496f-9610-0542e78480f0': 'The companion of Musa, peace be upon him, in the journey mentioned in Surat al-Kahf was al-Khidr. Ibn Abbas held this view and Ubayy ibn Ka‘b supported it based on what he heard from the Prophet ﷺ about the story of Musa and al-Khidr.',
  'dac383d3-ef1b-41f7-b568-0764680823e9': 'The Prophet ﷺ corrected the pre-Islamic belief that stars independently cause rain. After rainfall at Hudaybiyah, he taught that whoever says rain came by Allah’s favor and mercy is a believer in Allah and rejects attribution to the stars, while whoever attributes it to a star has fallen into disbelief in this matter.',
  'c564cb9b-f24c-4d6b-9c92-0fb2d321345f': 'The reported wisdom from Luqman teaches that a disliked event may protect a person from something worse. In the story, a painful delay prevented Luqman and his son from reaching a city that was to be destroyed. What appears harmful may therefore be lighter than the harm Allah diverted.',
  'e63ed69c-fadf-4e9d-943e-1a62f90887d4': 'The dhikr mentioned is: "Subhan Allah, alhamdulillah, la ilaha illa Allah, Allahu akbar, wa la hawla wa la quwwata illa billah al-‘Aliyy al-‘Azim." The man was also taught to ask: "Allahumma irhamni, warzuqni, wa ‘afini, wahdini" - O Allah, have mercy on me, provide for me, grant me well-being, and guide me.',
  'dca5dc0e-296c-4c41-b27d-1d1d3c773069': 'The purpose for which Allah created humankind and jinn is worship, as stated in Surat adh-Dhariyat 51:56. This means servitude to Allah in ease and hardship. A truthful Muslim remains upright in obedience regardless of circumstances, and the one who holds firmly to religion in difficult times has a great reward.',
  '73cbb029-4667-4b14-aac5-21d4dc32e649': 'Charity has great virtue and protects its giver. The program mentions reports that charity cools the heat of the grave for its people and that the believer will be shaded by their charity on the Day of Resurrection. The best charity is that given while one has sufficient means, and a person should begin with those under their care.',
};

export interface QAQuestion {
  id: string;
  question: Record<string, string>;
  answer: Record<string, string>;
  internalSourceName?: string;
  internalSourceUrl?: string;
  internalNotes?: string;
  order: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QACategory {
  id: string;
  name: Record<string, string>;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: QAQuestion[];
}

export interface QAContent {
  categories: QACategory[];
  lastUpdated?: string;
  version?: number;
}

export async function fetchQAContent(): Promise<QAContent> {
  // 1. Try cache first (fast startup)
  try {
    const cached = await AsyncStorage.getItem(QA_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as QAContent;
      refreshQAContent();
      return data;
    }
  } catch {}

  // 2. Try Firestore
  try {
    const snap = await getDoc(doc(db, 'qaContent', 'main'));
    if (snap.exists()) {
      const data = snap.data() as QAContent;
      await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('[QA] Firestore fetch failed:', e);
  }

  // 3. Fallback to bundled JSON converted to QAContent format
  return convertLegacyData();
}

async function refreshQAContent(): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'qaContent', 'main'));
    if (snap.exists()) {
      await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(snap.data()));
    }
  } catch {}
}

export function subscribeToQAContent(
  callback: (data: QAContent) => void
): () => void {
  return onSnapshot(
    doc(db, 'qaContent', 'main'),
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as QAContent;
        try {
          await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(data));
        } catch {}
        callback(data);
      }
    },
    (error) => console.warn('[QA] Snapshot error:', error)
  );
}

interface FilteredCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: FilteredQuestion[];
}

interface FilteredQuestion {
  id: string;
  question: string;
  answer: string;
  order: number;
  isVisible: boolean;
}

function resolveLocalizedText(value: string | Record<string, string> | undefined, language: string): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[language] || value.en || value.ar || '';
}

export function filterVisibleContent(
  content: QAContent,
  language: string
): FilteredCategory[] {
  return content.categories
    .filter(cat => cat.isVisible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(cat => ({
      id: cat.id,
      icon: cat.icon || '',
      order: cat.order ?? 0,
      isVisible: true,
      name: resolveLocalizedText(cat.name, language),
      questions: (cat.questions || [])
        .filter(q => q.isVisible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(q => ({
          id: q.id,
          order: q.order ?? 0,
          isVisible: true,
          question: resolveLocalizedText(q.question, language),
          answer: resolveLocalizedText(q.answer, language),
        })),
    }));
}

function convertLegacyData(): QAContent {
  try {
    const raw = require('@/data/json/qa-data.json');
    const categories: QACategory[] = (raw.categories || []).map((cat: any, idx: number) => ({
      id: cat.id,
      name: { ar: cat.name, en: LEGACY_QA_CATEGORY_NAMES_EN[cat.id] || cat.name },
      icon: cat.image || '',
      order: idx,
      isVisible: true,
      questions: (raw.items?.[cat.id] || []).map((item: any, qIdx: number) => ({
        id: item.id,
        question: { ar: item.question, en: LEGACY_QA_QUESTIONS_EN[item.id] || item.question },
        answer: { ar: item.answer, en: LEGACY_QA_ANSWERS_EN[item.id] || item.answer },
        order: qIdx,
        isVisible: true,
      })),
    }));
    return { categories, version: 0 };
  } catch {
    return { categories: [], version: 0 };
  }
}
