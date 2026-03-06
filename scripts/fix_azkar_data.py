#!/usr/bin/env python3
"""Fix azkar.json: rename wakingUp->wakeup, add salawat/istighfar/ayat_kursi categories"""

import json
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'json', 'azkar.json')

with open(FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Fix wakingUp -> wakeup
fixed = 0
for item in data['azkar']:
    if item['category'] == 'wakingUp':
        item['category'] = 'wakeup'
        fixed += 1
print(f'Fixed {fixed} wakingUp -> wakeup')

# 2. Add new categories
new_items = [
    # === SALAWAT ===
    {
        "id": 243,
        "category": "salawat",
        "arabic": "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
        "transliteration": "Allahumma salli 'ala Muhammadin wa 'ala aali Muhammad, kama sallayta 'ala Ibrahima wa 'ala aali Ibrahim, innaka Hamidun Majid. Allahumma barik 'ala Muhammadin wa 'ala aali Muhammad, kama barakta 'ala Ibrahima wa 'ala aali Ibrahim, innaka Hamidun Majid.",
        "translations": {
            "ar": "الصلاة الإبراهيمية",
            "en": "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.",
            "fr": "Ô Allah, prie sur Muhammad et sur la famille de Muhammad, comme Tu as prié sur Ibrahim et la famille d'Ibrahim.",
            "de": "O Allah, segne Muhammad und die Familie Muhammads, wie Du Ibrahim und die Familie Ibrahims gesegnet hast.",
            "hi": "हे अल्लाह, मुहम्मद और मुहम्मद के परिवार पर रहमत भेज, जैसे तूने इब्राहीम और इब्राहीम के परिवार पर रहमत भेजी।",
            "id": "Ya Allah, limpahkanlah shalawat kepada Muhammad dan keluarga Muhammad, sebagaimana Engkau telah melimpahkan shalawat kepada Ibrahim dan keluarga Ibrahim.",
            "ms": "Ya Allah, selawatkanlah ke atas Muhammad dan keluarga Muhammad, sebagaimana Engkau telah berselawat ke atas Ibrahim dan keluarga Ibrahim.",
            "tr": "Allah'ım, Muhammed'e ve Muhammed'in ailesine salât et, İbrahim'e ve İbrahim'in ailesine salât ettiğin gibi.",
            "ur": "اے اللہ، محمد ﷺ اور آل محمد پر رحمت نازل فرما جیسا کہ تو نے ابراہیم اور آل ابراہیم پر رحمت نازل فرمائی۔",
            "bn": "হে আল্লাহ, মুহাম্মাদ ও তাঁর পরিবারের উপর দরূদ পাঠাও, যেভাবে তুমি ইব্রাহীম ও তাঁর পরিবারের উপর পাঠিয়েছ।",
            "es": "Oh Alá, bendice a Muhammad y a la familia de Muhammad, como bendijiste a Ibrahim y a la familia de Ibrahim.",
            "ru": "О Аллах, благослови Мухаммада и семью Мухаммада, как Ты благословил Ибрахима и семью Ибрахима."
        },
        "count": 10,
        "reference": "البخاري 3370، مسلم 406",
        "benefit": "من صلّى عليّ صلاة واحدة صلّى الله عليه بها عشرًا",
        "audio": ""
    },
    {
        "id": 244,
        "category": "salawat",
        "arabic": "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ",
        "transliteration": "Allahumma salli wa sallim wa barik 'ala sayyidina Muhammad.",
        "translations": {
            "ar": "صلاة مختصرة على النبي",
            "en": "O Allah, send prayers, peace, and blessings upon our master Muhammad.",
            "fr": "Ô Allah, prie, accorde la paix et bénis notre maître Muhammad.",
            "de": "O Allah, sende Gebete, Frieden und Segen auf unseren Meister Muhammad.",
            "hi": "हे अल्लाह, हमारे स्वामी मुहम्मद पर दरूद, सलाम और बरकत भेज।",
            "id": "Ya Allah, limpahkanlah shalawat, salam dan keberkahan kepada junjungan kami Muhammad.",
            "ms": "Ya Allah, selawat, salam dan keberkatan ke atas junjungan kami Muhammad.",
            "tr": "Allah'ım, efendimiz Muhammed'e salât, selam ve bereket ver.",
            "ur": "اے اللہ، ہمارے سردار محمد ﷺ پر درود، سلام اور برکت نازل فرما۔",
            "bn": "হে আল্লাহ, আমাদের নেতা মুহাম্মাদের উপর দরূদ, সালাম ও বরকত পাঠাও।",
            "es": "Oh Alá, envía oraciones, paz y bendiciones sobre nuestro señor Muhammad.",
            "ru": "О Аллах, благослови, приветствуй и ниспошли баракат нашему господину Мухаммаду."
        },
        "count": 100,
        "reference": "الأحزاب: 56",
        "benefit": "إن أولى الناس بي يوم القيامة أكثرهم عليّ صلاة - رواه الترمذي",
        "audio": ""
    },
    {
        "id": 245,
        "category": "salawat",
        "arabic": "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ عَبْدِكَ وَرَسُولِكَ، وَصَلِّ عَلَى الْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ، وَالْمُسْلِمِينَ وَالْمُسْلِمَاتِ",
        "transliteration": "Allahumma salli 'ala Muhammadin 'abdika wa rasulika, wa salli 'alal-mu'mineena wal-mu'minat, wal-muslimeena wal-muslimat.",
        "translations": {
            "ar": "صلاة جامعة",
            "en": "O Allah, send prayers upon Muhammad Your servant and messenger, and upon the believing men and women, and the Muslim men and women.",
            "fr": "Ô Allah, prie sur Muhammad Ton serviteur et messager, et sur les croyants et croyantes.",
            "de": "O Allah, segne Muhammad, Deinen Diener und Gesandten, und die gläubigen Männer und Frauen.",
            "hi": "हे अल्लाह, अपने बंदे और रसूल मुहम्मद पर दरूद भेज, और मोमिन मर्दों और औरतों पर।",
            "id": "Ya Allah, limpahkanlah shalawat kepada Muhammad hamba dan utusan-Mu, serta kepada kaum mukmin dan mukminat.",
            "ms": "Ya Allah, selawatkanlah ke atas Muhammad hamba dan utusan-Mu, dan ke atas orang-orang mukmin lelaki dan perempuan.",
            "tr": "Allah'ım, kulun ve elçin Muhammed'e, mümin erkeklere ve kadınlara salât et.",
            "ur": "اے اللہ، اپنے بندے اور رسول محمد ﷺ پر درود بھیج اور مومن مردوں اور عورتوں پر۔",
            "bn": "হে আল্লাহ, তোমার বান্দা ও রসূল মুহাম্মাদের উপর দরূদ পাঠাও, এবং মুমিন নারী-পুরুষদের উপর।",
            "es": "Oh Alá, bendice a Muhammad Tu siervo y mensajero, y a los creyentes hombres y mujeres.",
            "ru": "О Аллах, благослови Мухаммада, Твоего раба и посланника, и верующих мужчин и женщин."
        },
        "count": 10,
        "reference": "ابن ماجه",
        "benefit": "من صلّى عليّ حين يصبح عشرًا وحين يمسي عشرًا أدركته شفاعتي يوم القيامة",
        "audio": ""
    },
    # === ISTIGHFAR ===
    {
        "id": 246,
        "category": "istighfar",
        "arabic": "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
        "transliteration": "Astaghfirullaha al-'Adheem alladhi la ilaha illa Huwal-Hayyul-Qayyum wa atubu ilayh.",
        "translations": {
            "ar": "استغفار مع التوبة",
            "en": "I seek forgiveness from Allah, the Magnificent, whom there is no deity but He, the Living, the Sustainer, and I repent to Him.",
            "fr": "Je demande pardon à Allah l'Immense, le Vivant, le Subsistant, et je me repens à Lui.",
            "de": "Ich bitte Allah den Großartigen um Vergebung, den Lebendigen, den Beständigen, und ich bereue zu Ihm.",
            "hi": "मैं अल्लाह महान से क्षमा मांगता हूं, जिसके अलावा कोई ईश्वर नहीं, जो सदैव जीवित और शाश्वत है, और मैं उसके पास तौबा करता हूं।",
            "id": "Aku memohon ampunan kepada Allah Yang Maha Agung yang tiada tuhan selain Dia, Yang Maha Hidup lagi Maha Berdiri Sendiri, dan aku bertaubat kepada-Nya.",
            "ms": "Aku memohon ampun kepada Allah Yang Maha Agung yang tiada tuhan selain Dia, Yang Maha Hidup lagi Maha Berdiri Sendiri, dan aku bertaubat kepada-Nya.",
            "tr": "Kendisinden başka ilah olmayan, Hay ve Kayyum olan Yüce Allah'tan bağışlanma diler ve O'na tövbe ederim.",
            "ur": "میں اللہ عظیم سے مغفرت طلب کرتا ہوں جس کے سوا کوئی معبود نہیں، وہ زندہ ہے، قائم رہنے والا ہے، اور میں اس کی طرف توبہ کرتا ہوں۔",
            "bn": "আমি আল্লাহ মহানের কাছে ক্ষমা চাই, যিনি ছাড়া কোনো ইলাহ নেই, তিনি চিরঞ্জীব, চিরস্থায়ী, এবং আমি তাঁর কাছে তওবা করি।",
            "es": "Pido perdón a Allah el Magnífico, no hay divinidad excepto Él, el Viviente, el Subsistente, y me arrepiento ante Él.",
            "ru": "Прошу прощения у Аллаха Великого, кроме Которого нет божества, Живого, Вседержителя, и каюсь перед Ним."
        },
        "count": 100,
        "reference": "أبو داود 1517، الترمذي 3577",
        "benefit": "من قالها غفر الله له وإن كان فرّ من الزحف",
        "audio": ""
    },
    {
        "id": 247,
        "category": "istighfar",
        "arabic": "أَسْتَغْفِرُ اللَّهَ",
        "transliteration": "Astaghfirullah.",
        "translations": {
            "ar": "استغفار مختصر",
            "en": "I seek forgiveness from Allah.",
            "fr": "Je demande pardon à Allah.",
            "de": "Ich bitte Allah um Vergebung.",
            "hi": "मैं अल्लाह से क्षमा मांगता हूं।",
            "id": "Aku memohon ampun kepada Allah.",
            "ms": "Aku memohon ampun kepada Allah.",
            "tr": "Allah'tan bağışlanma dilerim.",
            "ur": "میں اللہ سے مغفرت طلب کرتا ہوں۔",
            "bn": "আমি আল্লাহর কাছে ক্ষমা চাই।",
            "es": "Pido perdón a Allah.",
            "ru": "Прошу прощения у Аллаха."
        },
        "count": 100,
        "reference": "مسلم 2702",
        "benefit": "كان النبي ﷺ يستغفر الله في المجلس الواحد سبعين مرة",
        "audio": ""
    },
    {
        "id": 248,
        "category": "istighfar",
        "arabic": "اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ",
        "transliteration": "Allahumma anta Rabbi la ilaha illa ant, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mastata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi, faghfir li, fa innahu la yaghfirudh-dhunuba illa ant.",
        "translations": {
            "ar": "سيد الاستغفار",
            "en": "O Allah, You are my Lord. There is no deity but You. You created me and I am Your servant. I uphold Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your blessings upon me, and I confess my sins. So forgive me, for none forgives sins but You.",
            "fr": "Ô Allah, Tu es mon Seigneur. Il n'y a pas de divinité en dehors de Toi. Tu m'as créé et je suis Ton serviteur.",
            "de": "O Allah, Du bist mein Herr. Es gibt keinen Gott außer Dir. Du hast mich erschaffen und ich bin Dein Diener.",
            "hi": "हे अल्लाह, तू मेरा रब है। तेरे सिवा कोई ईश्वर नहीं। तूने मुझे पैदा किया और मैं तेरा बंदा हूं।",
            "id": "Ya Allah, Engkau adalah Tuhanku. Tiada tuhan selain Engkau. Engkau telah menciptakanku dan aku adalah hamba-Mu.",
            "ms": "Ya Allah, Engkau adalah Tuhanku. Tiada tuhan selain Engkau. Engkau telah menciptakanku dan aku adalah hamba-Mu.",
            "tr": "Allah'ım, Sen Rabbimsin. Senden başka ilah yoktur. Beni Sen yarattın ve ben Senin kulunum.",
            "ur": "اے اللہ، تو میرا رب ہے۔ تیرے سوا کوئی معبود نہیں۔ تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں۔",
            "bn": "হে আল্লাহ, তুমি আমার রব। তুমি ছাড়া কোনো ইলাহ নেই। তুমি আমাকে সৃষ্টি করেছ এবং আমি তোমার বান্দা।",
            "es": "Oh Alá, Tú eres mi Señor. No hay divinidad excepto Tú. Tú me creaste y soy Tu siervo.",
            "ru": "О Аллах, Ты — мой Господь. Нет божества, кроме Тебя. Ты создал меня и я — Твой раб."
        },
        "count": 3,
        "reference": "البخاري 6306",
        "benefit": "من قالها موقنًا بها حين يمسي فمات من ليلته دخل الجنة، ومن قالها حين يصبح فمات من يومه فمثل ذلك",
        "audio": ""
    },
    {
        "id": 249,
        "category": "istighfar",
        "arabic": "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الْغَفُورُ",
        "transliteration": "Rabbi-ghfir li wa tub 'alayya innaka anta at-Tawwabul-Ghafoor.",
        "translations": {
            "ar": "استغفار من السنة",
            "en": "My Lord, forgive me and accept my repentance. Indeed, You are the Acceptor of Repentance, the Forgiving.",
            "fr": "Mon Seigneur, pardonne-moi et accepte mon repentir. Tu es certes l'Accepteur du repentir, le Pardonneur.",
            "de": "Mein Herr, vergib mir und nimm meine Reue an. Du bist wahrlich der Reue-Annehmende, der Vergebende.",
            "hi": "मेरे रब, मुझे माफ कर दे और मेरी तौबा कबूल कर। बेशक तू तौबा कबूल करने वाला, बख्शने वाला है।",
            "id": "Ya Tuhanku, ampunilah aku dan terimalah taubatku. Sesungguhnya Engkau Maha Penerima taubat lagi Maha Pengampun.",
            "ms": "Ya Tuhanku, ampunilah aku dan terimalah taubatku. Sesungguhnya Engkau Maha Penerima taubat lagi Maha Pengampun.",
            "tr": "Rabbim, beni bağışla ve tövbemi kabul et. Sen Tevvab ve Gafur olansın.",
            "ur": "میرے رب، مجھے بخش دے اور میری توبہ قبول فرما۔ بلاشبہ تو بہت توبہ قبول کرنے والا، بخشنے والا ہے۔",
            "bn": "হে আমার রব, আমাকে ক্ষমা করো এবং আমার তওবা কবুল করো। নিশ্চয়ই তুমি তওবা কবুলকারী, ক্ষমাশীল।",
            "es": "Mi Señor, perdóname y acepta mi arrepentimiento. Ciertamente, Tú eres el Aceptador del arrepentimiento, el Perdonador.",
            "ru": "Мой Господь, прости меня и прими моё покаяние. Воистину, Ты — Принимающий покаяние, Прощающий."
        },
        "count": 100,
        "reference": "أبو داود، الترمذي",
        "benefit": "كان النبي ﷺ يقولها في المجلس الواحد مائة مرة",
        "audio": ""
    },
    # === AYAT AL-KURSI ===
    {
        "id": 250,
        "category": "ayat_kursi",
        "arabic": "اللَّهُ لاَ إِلَـٰهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ ۚ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاَّ بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ ۖ وَلاَ يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
        "transliteration": "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm, lahu ma fis-samawati wa ma fil-ard, man dhal-ladhi yashfa'u 'indahu illa bi idhnih, ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi shay'in min 'ilmihi illa bima sha', wasi'a kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifdhhuma, wa Huwal-'Aliyyul-'Adhim.",
        "translations": {
            "ar": "آية الكرسي - أعظم آية في القرآن",
            "en": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
            "fr": "Allah ! Point de divinité à part Lui, le Vivant, Celui qui subsiste par Lui-même. Ni somnolence ni sommeil ne Le saisissent.",
            "de": "Allah - es gibt keinen Gott außer Ihm, dem Lebendigen, dem Beständigen. Weder Schlummer noch Schlaf überkommt Ihn.",
            "hi": "अल्लाह - उसके सिवा कोई ईश्वर नहीं, सदैव जीवित, सृष्टि का पालनकर्ता। न उसे ऊंघ आती है न नींद।",
            "id": "Allah, tidak ada tuhan selain Dia, Yang Maha Hidup lagi terus menerus mengurus makhluk-Nya. Dia tidak mengantuk dan tidak tidur.",
            "ms": "Allah, tiada tuhan selain Dia, Yang Hidup kekal lagi terus menerus mentadbir makhluk-Nya. Dia tidak mengantuk dan tidak tidur.",
            "tr": "Allah, O'ndan başka ilah yoktur, Hayy'dır, Kayyum'dur. O'nu ne bir uyuklama ne de uyku tutar.",
            "ur": "اللہ، اس کے سوا کوئی معبود نہیں، وہ زندہ ہے، سب کا قائم رکھنے والا ہے۔ اسے نہ اونگھ آتی ہے نہ نیند۔",
            "bn": "আল্লাহ, তিনি ছাড়া কোনো ইলাহ নেই, তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাঁকে তন্দ্রা বা নিদ্রা স্পর্শ করে না।",
            "es": "Allah, no hay divinidad excepto Él, el Viviente, el Sustentador. No Le sobrecogen ni el sueño ni la somnolencia.",
            "ru": "Аллах — нет божества, кроме Него, Живого, Вседержителя. Им не овладевают ни дремота, ни сон."
        },
        "count": 3,
        "reference": "البقرة: 255",
        "benefit": "من قرأها في ليلة لم يزل عليه من الله حافظ ولا يقربه شيطان حتى يصبح - البخاري",
        "audio": ""
    },
    {
        "id": 251,
        "category": "ayat_kursi",
        "arabic": "آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ",
        "transliteration": "Amanar-Rasulu bima unzila ilayhi min Rabbihi wal-mu'minun, kullun amana billahi wa mala'ikatihi wa kutubihi wa rusulihi, la nufarriqu bayna ahadin min rusulihi, wa qalu sami'na wa ata'na ghufranaka Rabbana wa ilaykal-masir.",
        "translations": {
            "ar": "خواتيم سورة البقرة",
            "en": "The Messenger has believed in what was revealed to him from his Lord, and so have the believers. All have believed in Allah and His angels and His books and His messengers, saying: We make no distinction between any of His messengers. And they say: We hear and we obey. Grant us Your forgiveness, our Lord, and to You is the final destination.",
            "fr": "Le Messager a cru en ce qu'on a fait descendre vers lui de la part de son Seigneur, et les croyants aussi.",
            "de": "Der Gesandte glaubt an das, was ihm von seinem Herrn herabgesandt wurde, und die Gläubigen ebenso.",
            "hi": "रसूल ने जो कुछ उनके रब की ओर से उतारा गया उस पर ईमान लाया और मोमिन भी।",
            "id": "Rasul telah beriman kepada apa yang diturunkan kepadanya dari Tuhannya, demikian pula orang-orang yang beriman.",
            "ms": "Rasul telah beriman kepada apa yang diturunkan kepadanya dari Tuhannya, dan orang-orang yang beriman juga beriman.",
            "tr": "Peygamber, Rabbinden kendisine indirilene iman etti, müminler de.",
            "ur": "رسول نے جو کچھ اس کے رب کی طرف سے نازل ہوا اس پر ایمان لایا اور مومنوں نے بھی۔",
            "bn": "রসূল তাঁর রবের পক্ষ থেকে যা অবতীর্ণ হয়েছে তার উপর ঈমান এনেছেন এবং মুমিনরাও।",
            "es": "El Mensajero cree en lo que se le ha revelado de su Señor, así como los creyentes.",
            "ru": "Посланник уверовал в то, что ниспослано ему от Господа, и верующие тоже."
        },
        "count": 1,
        "reference": "البقرة: 285",
        "benefit": "من قرأ الآيتين من آخر سورة البقرة في ليلة كفتاه - البخاري ومسلم",
        "audio": ""
    },
    {
        "id": 252,
        "category": "ayat_kursi",
        "arabic": "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لاَ تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلاَ تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلاَ تُحَمِّلْنَا مَا لاَ طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلاَنَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        "transliteration": "La yukallifullahu nafsan illa wus'aha, laha ma kasabat wa 'alayha maktasabat. Rabbana la tu'akhidhna in nasina aw akhta'na, Rabbana wa la tahmil 'alayna isran kama hamaltahu 'alal-ladhina min qablina, Rabbana wa la tuhammilna ma la taqata lana bih, wa'fu 'anna waghfir lana warhamna, anta Mawlana fansurna 'alal-qawmil-kafirin.",
        "translations": {
            "ar": "خاتمة سورة البقرة",
            "en": "Allah does not charge a soul except with that within its capacity. It will have what it has gained, and it will bear what it has earned. Our Lord, do not impose blame upon us if we forget or make a mistake. Our Lord, and lay not upon us a burden like that which You laid upon those before us. Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people.",
            "fr": "Allah ne charge une âme que selon sa capacité.",
            "de": "Allah erlegt keiner Seele mehr auf als sie zu leisten vermag.",
            "hi": "अल्लाह किसी प्राणी पर उसकी क्षमता से अधिक बोझ नहीं डालता।",
            "id": "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.",
            "ms": "Allah tidak membebani seseorang melainkan sesuai dengan kemampuannya.",
            "tr": "Allah hiçbir nefse taşıyamayacağı yükü yüklemez.",
            "ur": "اللہ کسی جان کو اس کی طاقت سے زیادہ تکلیف نہیں دیتا۔",
            "bn": "আল্লাহ কোনো ব্যক্তিকে তার সামর্থ্যের বাইরে দায়িত্ব দেন না।",
            "es": "Allah no impone a nadie una carga mayor de la que puede soportar.",
            "ru": "Аллах не возлагает на душу сверх её возможностей."
        },
        "count": 1,
        "reference": "البقرة: 286",
        "benefit": "من قرأ الآيتين من آخر سورة البقرة في ليلة كفتاه - البخاري ومسلم",
        "audio": ""
    },
]

data['azkar'].extend(new_items)
data['totalCount'] = len(data['azkar'])

with open(FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Verify
cats = {}
for item in data['azkar']:
    c = item['category']
    cats[c] = cats.get(c, 0) + 1
print(f"Total items: {len(data['azkar'])}")
for c in sorted(cats.keys()):
    print(f"  {c}: {cats[c]} items")
