// lib/api/duas-api.ts
// API للحصول على أدعية عشوائية

export interface Dua {
  id: string;
  text: string;
  textAr?: string;
  source?: string;
  sourceAr?: string;
  virtue?: string;
  virtueAr?: string;
}

const DUAS_DB: Dua[] = [
  {
    id: '1',
    text: 'Allahumma inni as\'aluka al-aafiyah',
    textAr: 'اللهم إني أسألك العافية',
    sourceAr: 'من أدعية النبي ﷺ',
    virtueAr: 'طلب العافية والسلامة',
  },
  {
    id: '2',
    text: 'Allahumma tawwabi alayya innaka anta at-Tawwab ar-Rahim',
    textAr: 'اللهم توب علي إنك أنت التواب الرحيم',
    sourceAr: 'دعاء التوبة',
    virtueAr: 'دعاء قبول التوبة والمغفرة',
  },
  {
    id: '3',
    text: 'Allahumma inna na\'udhu bika min sharri anufusina',
    textAr: 'اللهم إنا نعوذ بك من شرور أنفسنا',
    sourceAr: 'من أدعية النبي ﷺ',
    virtueAr: 'الاستعاذة من شرور النفس',
  },
  {
    id: '4',
    text: 'Ya Hay ya Qayyum bi rahmatika astaghith',
    textAr: 'يا حي يا قيوم برحمتك أستغيث',
    sourceAr: 'الدعاء المشهور',
    virtueAr: 'دعاء عظيم لقضاء الحوائج',
  },
  {
    id: '5',
    text: 'Allahumma inni adAAa bika kulla da\'in adAAani',
    textAr: 'اللهم إني أدعوك كل دعاء دعاني',
    sourceAr: 'دعاء قرآني',
    virtueAr: 'إجابة الدعاء',
  },
  {
    id: '6',
    text: 'Rabb agfirliy dhanbi wa wassa\'li sadriy wa yassir liy amriy',
    textAr: 'رب اغفر لي ذنبي ووسع لي في داري ويسر لي أمري',
    sourceAr: 'دعاء موسى عليه السلام',
    virtueAr: 'دعاء طلب المغفرة والتيسير',
  },
  {
    id: '7',
    text: 'Allahumma a\'ini alaa dhikrika wa shukrika wa husni ibadatika',
    textAr: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك',
    sourceAr: 'دعاء عظيم',
    virtueAr: 'طلب المعونة على الطاعة',
  },
  {
    id: '8',
    text: 'Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina azaab an-nar',
    textAr: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار',
    sourceAr: 'آية قرآنية',
    virtueAr: 'دعاء شامل للدنيا والآخرة',
  },
];

// الحصول على دعاء عشوائي
export function getRandomDua(): Dua {
  return DUAS_DB[Math.floor(Math.random() * DUAS_DB.length)];
}

// الحصول على دعاء بـ ID معين
export function getDuaById(id: string): Dua | undefined {
  return DUAS_DB.find(dua => dua.id === id);
}

// البحث عن أدعية
export function searchDuas(query: string): Dua[] {
  return DUAS_DB.filter(dua =>
    dua.textAr?.includes(query) ||
    dua.sourceAr?.includes(query) ||
    dua.virtueAr?.includes(query)
  );
}
