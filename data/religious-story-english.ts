type StoryEnglishFields = {
  titleEn: string;
  briefEn: string;
  transcriptEn: string;
};

type StoryLookupInput = {
  id?: string;
  title?: string;
  titleEn?: string;
  brief?: string;
  transcript?: string;
};

function text(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n');
}

const PROPHET_ENGLISH_STORIES: Record<string, StoryEnglishFields> = {
  'prophet-adam': {
    titleEn: 'The Story of Prophet Adam',
    briefEn: 'The father of humankind and the first prophet, honored with knowledge and taught repentance.',
    transcriptEn: text([
      'Allah created Adam, peace be upon him, from clay, breathed into him from His spirit, and honored him with knowledge. Allah taught him the names of things, then showed the angels that Adam had been given a special rank through this knowledge.',
      'Allah commanded the angels to prostrate to Adam as an act of obedience to Allah and honor for Adam. They all prostrated except Iblis, who refused out of arrogance. From that moment began the old enmity between Satan and humankind.',
      'Allah placed Adam and his wife in Paradise and allowed them to enjoy its blessings, except for one tree. Iblis whispered to them until they ate from it, and they realized the consequence of disobedience.',
      'Adam did not persist in his mistake. He and his wife turned back to Allah and said: Our Lord, we have wronged ourselves; if You do not forgive us and have mercy on us, we will surely be among the losers. Allah accepted Adam\'s repentance.',
      'Adam descended to earth, and the human journey of worship, work, trial, and repentance began. His story teaches that human honor is found in obedience and knowledge, and that the door of repentance remains open for whoever returns sincerely to Allah.',
    ]),
  },
  'prophet-idris': {
    titleEn: 'The Story of Prophet Idris',
    briefEn: 'A truthful prophet whom Allah raised to a high rank.',
    transcriptEn: text([
      'Idris, peace be upon him, was one of the righteous prophets of Allah. The Qur\'an describes him as truthful and as a prophet, and truthfulness is a high rank built on sincere faith, honest speech, and righteous action.',
      'He called people to worship Allah, taught them goodness, and reminded them to remain upright at a time when people needed guidance and a connection to revelation.',
      'Allah said about him that He raised him to a high station. This teaches that the true measure of a person is not wealth or power, but sincerity, patience, and closeness to Allah.',
      'Although the authentic details of his life are few, the meaning is deep: a servant who was truthful with Allah was honored by being mentioned in the Qur\'an, so his story remains a lesson in honesty and steadfastness.',
    ]),
  },
  'prophet-nuh': {
    titleEn: 'The Story of Prophet Nuh',
    briefEn: 'The first messenger sent to the people of earth, who called his people with long patience.',
    transcriptEn: text([
      'Allah sent Nuh, peace be upon him, to a people who had fallen into idol worship and left pure monotheism. He called them to worship Allah alone, reminded them of Allah\'s blessings, and warned them of the end of disbelief.',
      'Nuh remained among his people for nine hundred and fifty years, calling them by night and day, privately and publicly. Most of them answered with mockery and stubbornness, covering their ears and refusing to listen.',
      'Allah revealed to Nuh that he should build the ark. He built it by Allah\'s command while his people laughed at him, but Nuh stayed firm because he was obeying revelation, not seeking people\'s approval.',
      'Then the flood came. Water burst from the earth and poured from the sky. Allah saved Nuh and those who believed with him in the ark, while those who denied the truth were drowned.',
      'The story of Nuh teaches long patience, sincere calling to Allah, and the truth that guidance belongs to Allah. It also teaches that salvation is not by family ties or status, but by faith and righteous action.',
    ]),
  },
  'prophet-hud': {
    titleEn: 'The Story of Prophet Hud',
    briefEn: 'The messenger sent to Aad, a powerful people who were destroyed after their arrogance.',
    transcriptEn: text([
      'Allah sent Hud, peace be upon him, to Aad, a powerful people known for strength, buildings, and pride. They were impressed by their own power and forgot that all strength belongs to Allah.',
      'Hud called them to worship Allah alone, to leave arrogance and injustice, and to be grateful for the blessings they had been given. They accused him of foolishness and madness and mocked the warning.',
      'Hud stood firm and declared his trust in Allah, the Lord of all. He did not fear their idols or their threats, because his heart was attached to the One who controls every creature.',
      'Allah sent upon them a fierce wind that destroyed them and cut off their pride, while Hud and the believers were saved by Allah\'s mercy.',
      'His story teaches that civilization without faith can become arrogance, and that power without humility and fear of Allah can become the path to ruin.',
    ]),
  },
  'prophet-salih': {
    titleEn: 'The Story of Prophet Salih',
    briefEn: 'The messenger of Thamud, whose people rejected the sign of the she-camel.',
    transcriptEn: text([
      'Allah sent Salih, peace be upon him, to Thamud, a people who carved homes in the mountains and enjoyed skill and strength. He called them to worship Allah alone and to stop spreading corruption.',
      'They demanded a sign, so Allah brought forth for them a remarkable she-camel as a clear sign. Salih told them that she had a day to drink and they had a day to drink, and that they must not harm her.',
      'Instead of submitting to the truth, they conspired against the sign and killed the she-camel. Salih warned them to enjoy their homes for three days before the promise of Allah came.',
      'The cry and the quake seized them, and they were left lifeless in their dwellings. Allah saved Salih and those who believed with him.',
      'This story teaches that signs do not benefit a heart determined to reject the truth, and that violating Allah\'s limits leads to loss even if people appear strong.',
    ]),
  },
  'prophet-ibrahim': {
    titleEn: 'The Story of Prophet Ibrahim',
    briefEn: 'The close friend of Allah and imam of monotheism, tested repeatedly and found faithful.',
    transcriptEn: text([
      'Ibrahim, peace be upon him, grew up among people who worshipped idols and heavenly bodies. By sound reason, pure nature, and revelation from his Lord, he rejected their worship and declared that Allah alone is the Creator worthy of worship.',
      'He debated his father and his people with wisdom, then exposed the helplessness of their idols by breaking them and leaving the largest one, forcing them to face the truth: how could they worship what could not speak, benefit, or harm?',
      'They threw him into the fire, but Allah commanded the fire to be coolness and safety for Ibrahim. The fire became a sign that whoever stands with Allah will never be abandoned by Allah.',
      'Ibrahim was tested with migration, leaving his family in a barren valley, and the command to sacrifice his son. He and Ismail submitted to Allah, so Allah ransomed Ismail with a great sacrifice.',
      'Ibrahim and Ismail raised the foundations of the Kaaba and prayed that Allah accept from them. His story is the story of pure monotheism, patience through trial, and complete trust in the promise of Allah.',
    ]),
  },
  'prophet-lut': {
    titleEn: 'The Story of Prophet Lut',
    briefEn: 'A prophet who called his people to purity and was saved when they rejected the truth.',
    transcriptEn: text([
      'Allah sent Lut, peace be upon him, to a people among whom immorality, corruption, and public sin had spread. He called them to fear Allah, to return to purity, and to leave what opposed natural disposition and revelation.',
      'Lut faced a people who mocked advice and treated purity as something strange. They even wanted to expel his family because they were people who kept themselves pure.',
      'Angels came to Lut in the form of guests, and he feared for them because of his people. They told him they were messengers from his Lord and that the punishment was coming.',
      'Allah commanded Lut to leave by night with his family and not to look back. Allah saved him and the believers and destroyed the wrongdoers with a severe punishment.',
      'His story teaches that purity is worship, and that a society that normalizes corruption and mocks reformers exposes itself to the justice of Allah.',
    ]),
  },
  'prophet-ismail': {
    titleEn: 'The Story of Prophet Ismail',
    briefEn: 'The son of Ibrahim, a model of obedience, patience, and service to the Sacred House.',
    transcriptEn: text([
      'Ismail, peace be upon him, was the son of Ibrahim and Hajar. Ibrahim left Hajar and her infant son by Allah\'s command in a barren valley near the Sacred House. Hajar relied on Allah, and Zamzam came as mercy and blessing.',
      'Ismail grew up in Makkah as a forbearing child. When Ibrahim saw in a dream that he was to sacrifice him, Ismail submitted and said that his father should do what he had been commanded, and that he would find him patient by Allah\'s will.',
      'When they both surrendered to Allah\'s command, Allah ransomed Ismail with a great sacrifice. The story remains a sign of obedience and trust in Allah during Eid al-Adha.',
      'Ismail helped his father raise the foundations of the Kaaba, and they prayed: Our Lord, accept from us; indeed, You are the Hearing, the Knowing.',
      'His life teaches obedience to parents, patience, sincerity, and the truth that a single act of obedience can become blessed in a person, a family, and an entire nation.',
    ]),
  },
  'prophet-yaqub': {
    titleEn: 'The Story of Prophets Ishaq and Yaqub',
    briefEn: 'The story of father and son: the glad tiding of Ishaq, the conflict between Esau and Yaqub over the blessing, Yaqub\'s migration, his beautiful patience, and his death in Egypt.',
    transcriptEn: text([
      'Allah gave Ibrahim and Sarah the glad tiding of Ishaq in their old age, a sign of His power. Ishaq grew up in the house of prophethood, and Allah sent him as a prophet to the people of Sham, carrying his father Ibrahim\'s call to monotheism.',
      'Ishaq married and was given twins: Esau and Yaqub. Esau was the firstborn, a strong hairy hunter loved by his father. Yaqub was calm and devout, drawn to the house, and especially loved by his mother for his goodness and faith.',
      'When Ishaq grew old and his sight weakened, he asked Esau to hunt and prepare food so he could pray over him with the paternal blessing before his death. While Esau was away, the mother — knowing by the light of guidance that Yaqub deserved the prophetic blessing — prepared the food herself, dressed Yaqub in his brother\'s clothes with goat skin on his hands and neck, and sent him to his father.',
      'Yaqub entered and his father, reassured by the touch, ate and prayed over him with blessing, prophethood, and a great line of descendants. When Esau returned and learned what had happened, his anger blazed and he swore to kill Yaqub in revenge. Yaqub\'s mother warned him, and his father commanded him to flee to his uncle Laban in Haran and marry from his daughters.',
      'On the journey, Yaqub slept with a stone for his pillow and saw a great vision: a ladder between earth and heaven with angels ascending and descending, and a promise from Allah of protection and return. He worked for his uncle Laban as a shepherd for years, married, and was granted twelve sons — the fathers of the tribes of the children of Israel. After twenty years he returned to Canaan, was reconciled with his brother Esau, and settled there.',
      'Yaqub loved his son Yusuf for the signs of prophethood he saw in him. His other sons envied him, threw him into a well, sold him into Egypt, and brought their father his shirt stained with false blood. Yaqub did not believe them and said his immortal words: patience is most fitting, and Allah is the One sought for help. The trial extended, and he lost Benjamin too. His eyes whitened from sorrow, yet he never despaired of Allah\'s mercy.',
      'After decades, relief came. Yusuf identified himself in Egypt and sent his shirt; when it was cast on Yaqub\'s face his sight returned. Yaqub moved with his family to Egypt, where Yusuf received him as a ruler and a son, and the dream of childhood came true: eleven stars and the sun and the moon prostrating.',
      'When death approached, Yaqub gathered his twelve sons and asked: What will you worship after me? They answered: Your God and the God of your fathers, Ibrahim, Ismail, and Ishaq, one God, and to Him we submit. His heart settled, knowing the inheritance of monotheism was safe.',
      'Yaqub died in Egypt and willed to be buried in Palestine beside his fathers. Yusuf carried his body to Hebron and buried him in the cave that Ibrahim had bought, beside Ishaq and Ibrahim, then returned to Egypt.',
      'In the story of father and son are lessons: that blessing is in Allah\'s hand, that resentment harms only the resentful, that beautiful patience is not the absence of pain but the heart\'s clinging to Allah, that the greatest inheritance a father leaves is faith, and that relief comes when hope seems lost.',
    ]),
  },
  'prophet-yusuf': {
    titleEn: 'The Story of Prophet Yusuf',
    briefEn: 'The best of stories: from the well and prison to authority, forgiveness, and honor.',
    transcriptEn: text([
      'Yusuf, peace be upon him, saw a great dream as a child and told it to his father Yaqub. His father understood that his son would have a special future and warned him not to tell the dream to his brothers.',
      'His brothers envied him and threw him into the well. He was later sold as a slave in Egypt, but Allah protected him and moved him from one stage to another until he was tested by the wife of the minister. Yusuf chose obedience to Allah and said: I seek refuge in Allah.',
      'Yusuf entered prison unjustly, yet he remained a caller to Allah and an interpreter of dreams. The prison did not stop him from doing good. Later, his innocence became clear and he was released.',
      'Allah gave him authority in Egypt and placed him over its storehouses. With wisdom and trustworthiness, he helped save people from years of famine.',
      'When his brothers came to him in need, he did not take revenge. He forgave them and said there would be no blame upon them that day. His story shows the hidden kindness of Allah and that the final outcome belongs to patience and piety.',
    ]),
  },
  'prophet-ayyub': {
    titleEn: 'The Story of Prophet Ayyub',
    briefEn: 'The prophet of patience, tested in health, wealth, and family while remembering Allah.',
    transcriptEn: text([
      'Ayyub, peace be upon him, was a righteous and grateful servant. Allah had blessed him with wealth, family, and health, and he met those blessings with praise and obedience.',
      'Ayyub was tested severely in his body, wealth, and family. He remained patient in a remarkable way and did not abandon remembrance of Allah or good expectation of his Lord.',
      'When the trial became long, he called upon Allah with beautiful manners: harm has touched me, and You are the Most Merciful of the merciful. He did not object; he entrusted his matter to Allah\'s mercy.',
      'Allah answered him, removed his hardship, restored his well-being, and made him a sign for the patient.',
      'His story teaches that patience is not a slogan for times of ease, but steadfastness during pain, and that the mercy of Allah is close to His patient servants.',
    ]),
  },
  'prophet-shuayb': {
    titleEn: 'The Story of Prophet Shuayb',
    briefEn: 'The eloquent prophet who called his people to monotheism and honesty in trade.',
    transcriptEn: text([
      'Allah sent Shuayb, peace be upon him, to Madyan. They cheated people in measure and weight, while corruption had spread in belief and behavior.',
      'Shuayb called them to worship Allah alone, to be fair in buying and selling, and to stop spreading corruption on earth. He spoke with wisdom and clarity, which is why he became known as the eloquent preacher among the prophets.',
      'He told them that he only wanted reform as much as he was able, and that his success was only by Allah. Yet his people answered with threats and mockery.',
      'When they persisted in injustice, the quake seized them, and Allah saved Shuayb and the believers with him.',
      'His story connects faith with economic honesty. Worship cannot be separated from justice in people\'s dealings and rights.',
    ]),
  },
  'prophet-musa': {
    titleEn: 'The Story of Prophet Musa',
    briefEn: 'The prophet who spoke to Allah, faced Pharaoh, and led the Children of Israel out of tyranny.',
    transcriptEn: text([
      'Musa, peace be upon him, was born at a time when Pharaoh was killing the sons of the Children of Israel and sparing their women. Allah inspired Musa\'s mother to nurse him and then place him in the river, promising that He would return him to her and make him one of the messengers.',
      'The chest reached Pharaoh\'s palace, and Allah caused Musa to be raised in the house of his enemy. Then Allah returned him to his mother so she could nurse him and find comfort. Thus the story of Allah\'s protection began before people knew Musa\'s future.',
      'Musa left Egypt after the incident with the Copt and traveled to Madyan. There he helped two women water their flock, married, and lived for years. On his return with his family, he received the call at Mount Tur: Indeed, I am Allah, Lord of the worlds.',
      'Allah sent him to Pharaoh with signs and supported him with his brother Harun. Musa called Pharaoh to worship Allah and to stop enslaving people, but Pharaoh became arrogant and claimed lordship for himself.',
      'Allah showed signs: the staff, the shining hand, the flood, locusts, lice, frogs, and blood. Still, Pharaoh and his people remained stubborn.',
      'Musa left with the Children of Israel, and Pharaoh followed them with his army. When the two groups saw each other, Musa\'s companions said they would be overtaken. Musa replied with certainty: No, my Lord is with me; He will guide me. The sea split, Musa and those with him were saved, and Pharaoh and his army were drowned.',
      'The story of Musa continues after the sea with the long journey of the Children of Israel, the appointment at the mountain, the Torah, the trial of the calf, and many tests. His story teaches that tyranny may appear powerful, but its end is downfall, and that whoever is with Allah is not harmed by small numbers or a difficult road.',
    ]),
  },
  'prophet-harun': {
    titleEn: 'The Story of Prophet Harun',
    briefEn: 'The brother and supporter of Musa, a prophet who helped carry the message.',
    transcriptEn: text([
      'Harun, peace be upon him, was the brother of Musa. Musa asked Allah to make Harun his helper because Harun was more fluent in speech, and Allah answered by making him a prophet and supporter in confronting Pharaoh.',
      'Harun stood with Musa in calling Pharaoh to monotheism. He supported his brother on a path that required patience, courage, and wisdom.',
      'When Musa went to the appointed meeting with his Lord, he left Harun in charge of his people. They were tested by worshipping the calf, and Harun tried to bring them back to the truth while fearing that greater division would occur before Musa returned.',
      'His story teaches the value of sincere brotherhood in calling to Allah. True support is helping another person remain obedient and firm upon truth.',
    ]),
  },
  'prophet-dhul-kifl': {
    titleEn: 'The Story of Dhul-Kifl',
    briefEn: 'A righteous servant mentioned by Allah among the patient and the best.',
    transcriptEn: text([
      'Dhul-Kifl, peace be upon him, is mentioned in the Qur\'an among righteous and chosen servants. Allah praised him with patience and goodness.',
      'The authentic reports do not give many details about his life, but his mention in the Qur\'an is enough to show that Allah raises those who remain patient and faithful.',
      'His story teaches that not every beneficial story needs many details. Sometimes Allah mentions a quality of a servant so the lesson becomes clear.',
      'The main lesson is patience, loyalty, and fulfilling what Allah loves. A high rank with Allah does not require fame among people; it requires sincerity and steadfastness.',
    ]),
  },
  'prophet-dawud': {
    titleEn: 'The Story of Prophet Dawud',
    briefEn: 'A prophet and king who was given the Zabur, wisdom, and strength.',
    transcriptEn: text([
      'Dawud, peace be upon him, was a noble prophet and a just king. Allah gave him the Zabur, made the mountains and birds glorify Allah with him, and softened iron for him so he could make armor.',
      'Dawud was known for supporting the truth. Allah gave him courage, judgment, wisdom, and clear speech in deciding matters.',
      'Despite his kingdom, he was devoted to worship. He fasted and broke his fast, prayed at night and rested, combining strength with humility and authority with repentance.',
      'His story teaches that leadership joined with piety becomes mercy and justice, and that every great blessing needs constant gratitude.',
    ]),
  },
  'prophet-sulayman': {
    titleEn: 'The Story of Prophet Sulayman',
    briefEn: 'A prophet and king to whom Allah subjected the wind, jinn, and birds.',
    transcriptEn: text([
      'Sulayman, peace be upon him, inherited prophethood and kingdom from Dawud. Allah gave him a magnificent kingdom not given to anyone after him, and subjected the wind, jinn, and birds to him.',
      'He understood the speech of birds and ants, yet he did not become arrogant. He saw blessings as a test from Allah and said: This is from the favor of my Lord to test whether I am grateful or ungrateful.',
      'Among his famous stories is the story of the Queen of Saba. The hoopoe brought him news of a people worshipping the sun, so Sulayman invited her to monotheism. She later came and submitted to Allah, Lord of the worlds.',
      'His story teaches that true kingdom is not measured by armies and wealth, but by gratitude to Allah and using blessings for guidance and justice.',
    ]),
  },
  'prophet-ilyas': {
    titleEn: 'The Story of Prophet Ilyas',
    briefEn: 'A prophet who called his people to leave Baal worship and return to Allah.',
    transcriptEn: text([
      'Ilyas, peace be upon him, was a prophet of Allah sent to people who worshipped an idol called Baal and left the worship of Allah, the Creator and Provider.',
      'Ilyas called them to fear Allah and asked them how they could call upon Baal and leave the best of creators, Allah, their Lord and the Lord of their forefathers.',
      'Most of his people denied him, so they deserved warning, while Allah saved His sincere servants and left Ilyas with a good mention among later generations.',
      'His story reminds believers that monotheism is the foundation of all messages, and that a caller may stand against a deep-rooted custom while truth remains truth even if supporters are few.',
    ]),
  },
  'prophet-alyasa': {
    titleEn: 'The Story of Prophet Alyasa',
    briefEn: 'A prophet from among the chosen and righteous servants of Allah.',
    transcriptEn: text([
      'Alyasa, peace be upon him, was a noble prophet mentioned by Allah in the Qur\'an among the best and the chosen servants who carried guidance.',
      'The authentic texts do not give many details about his life, but his mention among the prophets proves his rank and the truth of his call.',
      'The lesson of his story is that a believer accepts and loves all prophets of Allah, whether their details are known or not, because their path was one: worship Allah alone.',
      'Alyasa remains an example of a servant chosen by Allah to convey guidance, and his name remains part of the chain of light that Allah sent to humanity.',
    ]),
  },
  'prophet-yunus': {
    titleEn: 'The Story of Prophet Yunus',
    briefEn: 'The companion of the whale, saved by glorifying Allah in the depths of darkness.',
    transcriptEn: text([
      'Allah sent Yunus, peace be upon him, to his people, and he called them to monotheism. When their denial continued, he left in anger before Allah gave him permission.',
      'He boarded a ship, and the sea became rough. The people drew lots, and Yunus was among those selected. He was thrown into the sea, and the whale swallowed him by Allah\'s command.',
      'In the darkness of the sea, the whale, and the night, Yunus called upon his Lord: There is no god but You; glory be to You; indeed, I was among the wrongdoers. Allah answered him and saved him from distress.',
      'His people believed before the punishment came, so Allah removed the punishment from them and allowed them to enjoy life for a time.',
      'His story teaches that returning to Allah opens doors of rescue, and that sincere glorification and supplication in hardship can become a cause of relief.',
    ]),
  },
  'prophet-zakariya': {
    titleEn: 'The Story of Prophet Zakariya',
    briefEn: 'A prophet who called upon his Lord privately and was granted Yahya in old age.',
    transcriptEn: text([
      'Zakariya, peace be upon him, was a righteous prophet devoted to worship. He cared for Maryam, peace be upon her, and saw the special provision Allah gave her, which increased his certainty in Allah\'s power.',
      'He called upon his Lord quietly, asking for a righteous child who would carry guidance, even though he was very old and his wife had been barren.',
      'Allah answered him and gave him glad tidings of Yahya, a name not given before. The glad tiding was a sign that Allah\'s power is not limited by visible causes.',
      'His story teaches the manners of supplication and that a servant should not despair even when the apparent means are weak. The Creator gives whom He wills what He wills.',
    ]),
  },
  'prophet-yahya': {
    titleEn: 'The Story of Prophet Yahya',
    briefEn: 'A prophet given wisdom as a child, righteous, pure, and dutiful to his parents.',
    transcriptEn: text([
      'Yahya, peace be upon him, was the son of Zakariya and came after long supplication and a glad tiding from Allah. Allah gave him wisdom as a child and made him blessed and pious.',
      'Yahya loved worship, was detached from worldly distractions, and was dutiful to his parents. Allah gathered in him purity of heart and strength in truth.',
      'He called people to repentance and uprightness and became an example of a young person raised in obedience to Allah, not overcome by worldly desires.',
      'His story teaches that youth can be a time of closeness to Allah, and that righteousness and dutifulness to parents are among the greatest causes of honor with Allah.',
    ]),
  },
  'prophet-isa': {
    titleEn: 'The Story of Prophet Isa',
    briefEn: 'The word Allah cast to Maryam, supported with miracles and sent to call to monotheism.',
    transcriptEn: text([
      'Isa, peace be upon him, was born to Maryam without a father, as a sign of Allah\'s power. He spoke from the cradle and said: I am the servant of Allah; He has given me the Scripture and made me a prophet.',
      'Allah supported him with miracles. He healed the blind and the leper and brought the dead to life by Allah\'s permission, so people would know that all power belongs to Allah alone.',
      'Isa called the Children of Israel to worship Allah, confirmed the Torah before him, and gave glad tidings of a messenger to come after him named Ahmad.',
      'Some people denied him and others exaggerated about him, but Allah raised him and saved him from the plot of his enemies. Isa remains the servant and messenger of Allah, and belief in him is part of Muslim faith.',
      'His story teaches honoring prophets without exaggeration, believing in Allah\'s power, and knowing that the truth remains protected no matter how people try to distort it.',
    ]),
  },
  'prophet-muhammad': {
    titleEn: 'The Story of Prophet Muhammad',
    briefEn: 'The final prophet and mercy to the worlds, through whom Allah brought people from darkness to light.',
    transcriptEn: text([
      'Prophet Muhammad, peace and blessings be upon him, was born in Makkah in the Year of the Elephant. He was an orphan, then lost his mother at a young age, and was cared for by his grandfather Abdul-Muttalib and then his uncle Abu Talib.',
      'He grew up known for truthfulness and trustworthiness, until his people called him al-Amin, the trustworthy. When he reached forty, revelation came to him in the cave of Hira, beginning the greatest message: worship Allah alone, leave idolatry and injustice, and perfect noble character.',
      'He faced harm from Quraysh and remained patient. The earliest believers among men and women supported him, then he migrated to Madinah where he built a Muslim community on faith, brotherhood, justice, and mercy.',
      'He struggled with the Qur\'an, wisdom, patience, and mercy. Allah opened hearts through him and completed the religion, until people entered Islam in large numbers.',
      'He passed away after delivering the message, fulfilling the trust, and advising the Ummah. He left Muslims with the Book of Allah and his Sunnah. His life is light for believers in worship, mercy, leadership, patience, and character.',
    ]),
  },
};

const STORY_MATCHERS: Array<{ id: string; terms: string[] }> = [
  { id: 'prophet-adam', terms: ['prophet-adam', 'آدم', 'adam'] },
  { id: 'prophet-idris', terms: ['prophet-idris', 'إدريس', 'ادريس', 'idris'] },
  { id: 'prophet-nuh', terms: ['prophet-nuh', 'نوح', 'nuh', 'noah'] },
  { id: 'prophet-hud', terms: ['prophet-hud', 'هود', 'hud'] },
  { id: 'prophet-salih', terms: ['prophet-salih', 'صالح', 'salih', 'saleh'] },
  { id: 'prophet-ibrahim', terms: ['prophet-ibrahim', 'إبراهيم', 'ابراهيم', 'ibrahim', 'abraham'] },
  { id: 'prophet-lut', terms: ['prophet-lut', 'لوط', 'lut', 'lot'] },
  { id: 'prophet-ismail', terms: ['prophet-ismail', 'إسماعيل', 'اسماعيل', 'ismail', 'ishmael'] },
  { id: 'prophet-yaqub', terms: ['prophet-yaqub', 'يعقوب', 'yaqub', 'jacob', 'إسحاق', 'اسحاق', 'ishaq', 'isaac'] },
  { id: 'prophet-yusuf', terms: ['prophet-yusuf', 'يوسف', 'yusuf', 'joseph'] },
  { id: 'prophet-ayyub', terms: ['prophet-ayyub', 'أيوب', 'ايوب', 'ayyub', 'job'] },
  { id: 'prophet-shuayb', terms: ['prophet-shuayb', 'شعيب', 'shuayb'] },
  { id: 'prophet-musa', terms: ['prophet-musa', 'موسى', 'موسي', 'musa', 'moses'] },
  { id: 'prophet-harun', terms: ['prophet-harun', 'هارون', 'harun', 'aaron'] },
  { id: 'prophet-dhul-kifl', terms: ['prophet-dhul-kifl', 'ذو الكفل', 'dhul-kifl', 'dhul kifl'] },
  { id: 'prophet-dawud', terms: ['prophet-dawud', 'داود', 'dawud', 'david'] },
  { id: 'prophet-sulayman', terms: ['prophet-sulayman', 'سليمان', 'sulayman', 'solomon'] },
  { id: 'prophet-ilyas', terms: ['prophet-ilyas', 'إلياس', 'الياس', 'ilyas', 'elijah'] },
  { id: 'prophet-alyasa', terms: ['prophet-alyasa', 'اليسع', 'alyasa', 'elisha'] },
  { id: 'prophet-yunus', terms: ['prophet-yunus', 'يونس', 'yunus', 'jonah'] },
  { id: 'prophet-zakariya', terms: ['prophet-zakariya', 'زكريا', 'zakariya', 'zechariah'] },
  { id: 'prophet-yahya', terms: ['prophet-yahya', 'يحيى', 'يحيي', 'yahya', 'john'] },
  { id: 'prophet-isa', terms: ['prophet-isa', 'عيسى', 'عيسي', 'isa', 'jesus'] },
  { id: 'prophet-muhammad', terms: ['prophet-muhammad', 'محمد', 'muhammad'] },
];

export function getProphetEnglishStory(id: string): StoryEnglishFields | undefined {
  return PROPHET_ENGLISH_STORIES[id];
}

function normalize(value?: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim();
}

// Per-prophet canonical phrases that must appear in the title to be considered
// an unambiguous match. Lone tokens like "آدم" are not used here — they appear
// in many non-prophet titles (e.g. the Dajjal title mentions "خلق آدم") and
// would leak this prophet's English fields into the wrong story.
const PROPHET_TITLE_ANCHORS: Record<string, string[]> = {
  'prophet-adam': ['آدم عليه السلام', 'قصة آدم'],
  'prophet-idris': ['إدريس عليه السلام', 'قصة إدريس'],
  'prophet-nuh': ['نوح عليه السلام', 'قصة نوح'],
  'prophet-hud': ['هود عليه السلام', 'قصة هود'],
  'prophet-salih': ['صالح عليه السلام', 'قصة صالح'],
  'prophet-ibrahim': ['إبراهيم عليه السلام', 'قصة إبراهيم'],
  'prophet-lut': ['لوط عليه السلام', 'قصة لوط'],
  'prophet-ismail': ['إسماعيل عليه السلام', 'قصة إسماعيل'],
  'prophet-yaqub': ['يعقوب عليه السلام', 'إسحاق ويعقوب', 'قصة يعقوب', 'قصة إسحاق'],
  'prophet-yusuf': ['يوسف عليه السلام', 'قصة يوسف'],
  'prophet-ayyub': ['أيوب عليه السلام', 'قصة أيوب'],
  'prophet-shuayb': ['شعيب عليه السلام', 'قصة شعيب'],
  'prophet-musa': ['موسى عليه السلام', 'قصة موسى'],
  'prophet-harun': ['هارون عليه السلام', 'قصة هارون'],
  'prophet-dhul-kifl': ['ذو الكفل عليه السلام', 'قصة ذو الكفل'],
  'prophet-dawud': ['داود عليه السلام', 'قصة داود'],
  'prophet-sulayman': ['سليمان عليه السلام', 'قصة سليمان'],
  'prophet-ilyas': ['إلياس عليه السلام', 'قصة إلياس'],
  'prophet-alyasa': ['اليسع عليه السلام', 'قصة اليسع'],
  'prophet-yunus': ['يونس عليه السلام', 'قصة يونس'],
  'prophet-zakariya': ['زكريا عليه السلام', 'قصة زكريا'],
  'prophet-yahya': ['يحيى عليه السلام', 'قصة يحيى'],
  'prophet-isa': ['عيسى عليه السلام', 'قصة عيسى'],
  'prophet-muhammad': ['النبي محمد', 'قصة النبي محمد'],
};

export function findReligiousStoryEnglishFields(story: StoryLookupInput): StoryEnglishFields | undefined {
  // 1) Exact id match — strongest signal for bundled/Firestore docs.
  if (story.id && PROPHET_ENGLISH_STORIES[story.id]) {
    return PROPHET_ENGLISH_STORIES[story.id];
  }

  // 2) Title anchor match — only return a prophet's English data when the
  // title contains a canonical, unambiguous phrase like "آدم عليه السلام" or
  // "قصة آدم". Bare prophet names are NOT enough: titles for non-prophet
  // stories often mention prophets in passing (the Dajjal title contains
  // "خلق آدم"; "وفاة الأنبياء من آدم إلى محمد" contains both آدم and محمد).
  const titleNorm = normalize(`${story.title || ''} ${story.titleEn || ''}`);
  if (!titleNorm) return undefined;
  for (const [id, anchors] of Object.entries(PROPHET_TITLE_ANCHORS)) {
    for (const anchor of anchors) {
      if (titleNorm.includes(normalize(anchor))) {
        return PROPHET_ENGLISH_STORIES[id];
      }
    }
  }
  return undefined;
}
