#!/usr/bin/env python3
"""
Add missing favorites namespace to translations.ts
Adds ~30 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===
# Find the subscription block in the interface and add favorites namespace before the closing }

interface_favorites = '''
  // المفضلة
  favorites: {
    title: string;
    verse: string;
    verseFrom: string;
    deleteConfirm: string;
    exportImage: string;
    saved: string;
    repeatCount: string;
    image: string;
    note: string;
    quran: string;
    bookmarks: string;
    azkar: string;
    other: string;
    sortByDate: string;
    sortBySurah: string;
    noQuranFavorites: string;
    addQuranHint: string;
    deleteBookmarkConfirm: string;
    noBookmarks: string;
    addBookmarkHint: string;
    noAzkarFavorites: string;
    addAzkarHint: string;
    namesOfAllah: string;
    noOtherFavorites: string;
    addOtherHint: string;
    removeFromFavoritesConfirm: string;
    chooseDesign: string;
    shareText: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
  };
'''

# Insert before the closing } of the interface (just before "// ==================== العربية ====================")
content = content.replace(
    '''  // الاشتراك
  subscription: {
    subscribeToAccess: string;
    upgrade: string;
  };
}
// ==================== العربية ====================''',
    '''  // الاشتراك
  subscription: {
    subscribeToAccess: string;
    upgrade: string;
  };
''' + interface_favorites + '''}
// ==================== العربية ===================='''
)

# === PART 2: Add translations to each language ===

# Translations for all 12 languages
translations = {
    'ar': {
        'title': 'المحفوظات',
        'verse': 'آية',
        'verseFrom': 'من سورة',
        'deleteConfirm': 'هل تريد حذف هذا العنصر من المحفوظات؟',
        'exportImage': 'تصدير كصورة',
        'saved': 'تم الحفظ',
        'repeatCount': 'عدد التكرار',
        'image': 'صورة',
        'note': 'ملاحظة',
        'quran': 'القرآن',
        'bookmarks': 'الإشارات المرجعية',
        'azkar': 'الأذكار',
        'other': 'أخرى',
        'sortByDate': 'ترتيب حسب التاريخ',
        'sortBySurah': 'ترتيب حسب السورة',
        'noQuranFavorites': 'لا توجد آيات محفوظة',
        'addQuranHint': 'اضغط على أيقونة القلب لحفظ آية',
        'deleteBookmarkConfirm': 'هل تريد حذف هذه الإشارة المرجعية؟',
        'noBookmarks': 'لا توجد إشارات مرجعية',
        'addBookmarkHint': 'اضغط مطولاً على آية لإضافة إشارة مرجعية',
        'noAzkarFavorites': 'لا توجد أذكار محفوظة',
        'addAzkarHint': 'اضغط على أيقونة القلب لحفظ ذكر',
        'namesOfAllah': 'أسماء الله الحسنى',
        'noOtherFavorites': 'لا توجد عناصر محفوظة',
        'addOtherHint': 'اضغط على أيقونة القلب لحفظ عنصر',
        'removeFromFavoritesConfirm': 'هل تريد إزالة هذا العنصر من المحفوظات؟',
        'chooseDesign': 'اختر التصميم',
        'shareText': 'مشاركة كنص',
        'addNote': 'إضافة ملاحظة',
        'notePlaceholder': 'اكتب ملاحظتك هنا...',
        'saveNote': 'حفظ الملاحظة',
    },
    'en': {
        'title': 'Favorites',
        'verse': 'Verse',
        'verseFrom': 'from Surah',
        'deleteConfirm': 'Do you want to delete this item from favorites?',
        'exportImage': 'Export as Image',
        'saved': 'Saved',
        'repeatCount': 'Repeat Count',
        'image': 'Image',
        'note': 'Note',
        'quran': 'Quran',
        'bookmarks': 'Bookmarks',
        'azkar': 'Azkar',
        'other': 'Other',
        'sortByDate': 'Sort by Date',
        'sortBySurah': 'Sort by Surah',
        'noQuranFavorites': 'No saved verses',
        'addQuranHint': 'Tap the heart icon to save a verse',
        'deleteBookmarkConfirm': 'Do you want to delete this bookmark?',
        'noBookmarks': 'No bookmarks',
        'addBookmarkHint': 'Long press on a verse to add a bookmark',
        'noAzkarFavorites': 'No saved adhkar',
        'addAzkarHint': 'Tap the heart icon to save a dhikr',
        'namesOfAllah': 'Names of Allah',
        'noOtherFavorites': 'No saved items',
        'addOtherHint': 'Tap the heart icon to save an item',
        'removeFromFavoritesConfirm': 'Do you want to remove this item from favorites?',
        'chooseDesign': 'Choose Design',
        'shareText': 'Share as Text',
        'addNote': 'Add Note',
        'notePlaceholder': 'Write your note here...',
        'saveNote': 'Save Note',
    },
    'fr': {
        'title': 'Favoris',
        'verse': 'Verset',
        'verseFrom': 'de la sourate',
        'deleteConfirm': 'Voulez-vous supprimer cet élément des favoris?',
        'exportImage': 'Exporter en image',
        'saved': 'Enregistré',
        'repeatCount': 'Nombre de répétitions',
        'image': 'Image',
        'note': 'Note',
        'quran': 'Coran',
        'bookmarks': 'Signets',
        'azkar': 'Adhkar',
        'other': 'Autre',
        'sortByDate': 'Trier par date',
        'sortBySurah': 'Trier par sourate',
        'noQuranFavorites': 'Aucun verset enregistré',
        'addQuranHint': 'Appuyez sur le cœur pour enregistrer un verset',
        'deleteBookmarkConfirm': 'Voulez-vous supprimer ce signet?',
        'noBookmarks': 'Aucun signet',
        'addBookmarkHint': 'Appuyez longuement sur un verset pour ajouter un signet',
        'noAzkarFavorites': 'Aucun adhkar enregistré',
        'addAzkarHint': 'Appuyez sur le cœur pour enregistrer un dhikr',
        'namesOfAllah': 'Noms d\'Allah',
        'noOtherFavorites': 'Aucun élément enregistré',
        'addOtherHint': 'Appuyez sur le cœur pour enregistrer un élément',
        'removeFromFavoritesConfirm': 'Voulez-vous retirer cet élément des favoris?',
        'chooseDesign': 'Choisir le design',
        'shareText': 'Partager en texte',
        'addNote': 'Ajouter une note',
        'notePlaceholder': 'Écrivez votre note ici...',
        'saveNote': 'Enregistrer la note',
    },
    'de': {
        'title': 'Favoriten',
        'verse': 'Vers',
        'verseFrom': 'aus Sure',
        'deleteConfirm': 'Möchten Sie dieses Element aus den Favoriten löschen?',
        'exportImage': 'Als Bild exportieren',
        'saved': 'Gespeichert',
        'repeatCount': 'Wiederholungsanzahl',
        'image': 'Bild',
        'note': 'Notiz',
        'quran': 'Koran',
        'bookmarks': 'Lesezeichen',
        'azkar': 'Adhkar',
        'other': 'Andere',
        'sortByDate': 'Nach Datum sortieren',
        'sortBySurah': 'Nach Sure sortieren',
        'noQuranFavorites': 'Keine gespeicherten Verse',
        'addQuranHint': 'Tippen Sie auf das Herz, um einen Vers zu speichern',
        'deleteBookmarkConfirm': 'Möchten Sie dieses Lesezeichen löschen?',
        'noBookmarks': 'Keine Lesezeichen',
        'addBookmarkHint': 'Lange auf einen Vers drücken, um ein Lesezeichen hinzuzufügen',
        'noAzkarFavorites': 'Keine gespeicherten Adhkar',
        'addAzkarHint': 'Tippen Sie auf das Herz, um einen Dhikr zu speichern',
        'namesOfAllah': 'Namen Allahs',
        'noOtherFavorites': 'Keine gespeicherten Elemente',
        'addOtherHint': 'Tippen Sie auf das Herz, um ein Element zu speichern',
        'removeFromFavoritesConfirm': 'Möchten Sie dieses Element aus den Favoriten entfernen?',
        'chooseDesign': 'Design wählen',
        'shareText': 'Als Text teilen',
        'addNote': 'Notiz hinzufügen',
        'notePlaceholder': 'Schreiben Sie hier Ihre Notiz...',
        'saveNote': 'Notiz speichern',
    },
    'es': {
        'title': 'Favoritos',
        'verse': 'Verso',
        'verseFrom': 'de la sura',
        'deleteConfirm': '¿Quieres eliminar este elemento de favoritos?',
        'exportImage': 'Exportar como imagen',
        'saved': 'Guardado',
        'repeatCount': 'Cantidad de repeticiones',
        'image': 'Imagen',
        'note': 'Nota',
        'quran': 'Corán',
        'bookmarks': 'Marcadores',
        'azkar': 'Adhkar',
        'other': 'Otro',
        'sortByDate': 'Ordenar por fecha',
        'sortBySurah': 'Ordenar por sura',
        'noQuranFavorites': 'No hay versos guardados',
        'addQuranHint': 'Toca el corazón para guardar un verso',
        'deleteBookmarkConfirm': '¿Quieres eliminar este marcador?',
        'noBookmarks': 'No hay marcadores',
        'addBookmarkHint': 'Mantén pulsado en un verso para añadir un marcador',
        'noAzkarFavorites': 'No hay adhkar guardados',
        'addAzkarHint': 'Toca el corazón para guardar un dhikr',
        'namesOfAllah': 'Nombres de Allah',
        'noOtherFavorites': 'No hay elementos guardados',
        'addOtherHint': 'Toca el corazón para guardar un elemento',
        'removeFromFavoritesConfirm': '¿Quieres quitar este elemento de favoritos?',
        'chooseDesign': 'Elegir diseño',
        'shareText': 'Compartir como texto',
        'addNote': 'Añadir nota',
        'notePlaceholder': 'Escribe tu nota aquí...',
        'saveNote': 'Guardar nota',
    },
    'tr': {
        'title': 'Favoriler',
        'verse': 'Ayet',
        'verseFrom': 'sureden',
        'deleteConfirm': 'Bu öğeyi favorilerden silmek istiyor musunuz?',
        'exportImage': 'Resim olarak dışa aktar',
        'saved': 'Kaydedildi',
        'repeatCount': 'Tekrar sayısı',
        'image': 'Resim',
        'note': 'Not',
        'quran': 'Kuran',
        'bookmarks': 'Yer işaretleri',
        'azkar': 'Zikirler',
        'other': 'Diğer',
        'sortByDate': 'Tarihe göre sırala',
        'sortBySurah': 'Sureye göre sırala',
        'noQuranFavorites': 'Kaydedilmiş ayet yok',
        'addQuranHint': 'Bir ayeti kaydetmek için kalbe dokunun',
        'deleteBookmarkConfirm': 'Bu yer işaretini silmek istiyor musunuz?',
        'noBookmarks': 'Yer işareti yok',
        'addBookmarkHint': 'Yer işareti eklemek için bir ayete uzun basın',
        'noAzkarFavorites': 'Kaydedilmiş zikir yok',
        'addAzkarHint': 'Bir zikri kaydetmek için kalbe dokunun',
        'namesOfAllah': 'Allah\'ın isimleri',
        'noOtherFavorites': 'Kaydedilmiş öğe yok',
        'addOtherHint': 'Bir öğeyi kaydetmek için kalbe dokunun',
        'removeFromFavoritesConfirm': 'Bu öğeyi favorilerden kaldırmak istiyor musunuz?',
        'chooseDesign': 'Tasarım seç',
        'shareText': 'Metin olarak paylaş',
        'addNote': 'Not ekle',
        'notePlaceholder': 'Notunuzu buraya yazın...',
        'saveNote': 'Notu kaydet',
    },
    'ur': {
        'title': 'پسندیدہ',
        'verse': 'آیت',
        'verseFrom': 'سورۃ سے',
        'deleteConfirm': 'کیا آپ اس آئٹم کو پسندیدہ سے حذف کرنا چاہتے ہیں؟',
        'exportImage': 'تصویر کے طور پر برآمد کریں',
        'saved': 'محفوظ ہوگیا',
        'repeatCount': 'تکرار کی تعداد',
        'image': 'تصویر',
        'note': 'نوٹ',
        'quran': 'قرآن',
        'bookmarks': 'بُک مارکس',
        'azkar': 'اذکار',
        'other': 'دیگر',
        'sortByDate': 'تاریخ کے مطابق ترتیب',
        'sortBySurah': 'سورۃ کے مطابق ترتیب',
        'noQuranFavorites': 'کوئی محفوظ آیتیں نہیں',
        'addQuranHint': 'آیت محفوظ کرنے کے لیے دل پر ٹیپ کریں',
        'deleteBookmarkConfirm': 'کیا آپ اس بُک مارک کو حذف کرنا چاہتے ہیں؟',
        'noBookmarks': 'کوئی بُک مارکس نہیں',
        'addBookmarkHint': 'بُک مارک شامل کرنے کے لیے آیت پر دیر تک دبائیں',
        'noAzkarFavorites': 'کوئی محفوظ اذکار نہیں',
        'addAzkarHint': 'ذکر محفوظ کرنے کے لیے دل پر ٹیپ کریں',
        'namesOfAllah': 'اللہ کے نام',
        'noOtherFavorites': 'کوئی محفوظ آئٹمز نہیں',
        'addOtherHint': 'آئٹم محفوظ کرنے کے لیے دل پر ٹیپ کریں',
        'removeFromFavoritesConfirm': 'کیا آپ اس آئٹم کو پسندیدہ سے ہٹانا چاہتے ہیں؟',
        'chooseDesign': 'ڈیزائن منتخب کریں',
        'shareText': 'متن کے طور پر شیئر کریں',
        'addNote': 'نوٹ شامل کریں',
        'notePlaceholder': 'اپنا نوٹ یہاں لکھیں...',
        'saveNote': 'نوٹ محفوظ کریں',
    },
    'id': {
        'title': 'Favorit',
        'verse': 'Ayat',
        'verseFrom': 'dari Surah',
        'deleteConfirm': 'Apakah Anda ingin menghapus item ini dari favorit?',
        'exportImage': 'Ekspor sebagai Gambar',
        'saved': 'Tersimpan',
        'repeatCount': 'Jumlah Pengulangan',
        'image': 'Gambar',
        'note': 'Catatan',
        'quran': 'Al-Quran',
        'bookmarks': 'Penanda',
        'azkar': 'Dzikir',
        'other': 'Lainnya',
        'sortByDate': 'Urutkan berdasarkan Tanggal',
        'sortBySurah': 'Urutkan berdasarkan Surah',
        'noQuranFavorites': 'Tidak ada ayat tersimpan',
        'addQuranHint': 'Ketuk ikon hati untuk menyimpan ayat',
        'deleteBookmarkConfirm': 'Apakah Anda ingin menghapus penanda ini?',
        'noBookmarks': 'Tidak ada penanda',
        'addBookmarkHint': 'Tekan lama pada ayat untuk menambahkan penanda',
        'noAzkarFavorites': 'Tidak ada dzikir tersimpan',
        'addAzkarHint': 'Ketuk ikon hati untuk menyimpan dzikir',
        'namesOfAllah': 'Asmaul Husna',
        'noOtherFavorites': 'Tidak ada item tersimpan',
        'addOtherHint': 'Ketuk ikon hati untuk menyimpan item',
        'removeFromFavoritesConfirm': 'Apakah Anda ingin menghapus item ini dari favorit?',
        'chooseDesign': 'Pilih Desain',
        'shareText': 'Bagikan sebagai Teks',
        'addNote': 'Tambah Catatan',
        'notePlaceholder': 'Tulis catatan Anda di sini...',
        'saveNote': 'Simpan Catatan',
    },
    'ms': {
        'title': 'Kegemaran',
        'verse': 'Ayat',
        'verseFrom': 'dari Surah',
        'deleteConfirm': 'Adakah anda mahu memadamkan item ini dari kegemaran?',
        'exportImage': 'Eksport sebagai Imej',
        'saved': 'Disimpan',
        'repeatCount': 'Bilangan Ulangan',
        'image': 'Imej',
        'note': 'Nota',
        'quran': 'Al-Quran',
        'bookmarks': 'Penanda',
        'azkar': 'Zikir',
        'other': 'Lain-lain',
        'sortByDate': 'Susun mengikut Tarikh',
        'sortBySurah': 'Susun mengikut Surah',
        'noQuranFavorites': 'Tiada ayat disimpan',
        'addQuranHint': 'Ketik ikon hati untuk menyimpan ayat',
        'deleteBookmarkConfirm': 'Adakah anda mahu memadamkan penanda ini?',
        'noBookmarks': 'Tiada penanda',
        'addBookmarkHint': 'Tekan lama pada ayat untuk menambah penanda',
        'noAzkarFavorites': 'Tiada zikir disimpan',
        'addAzkarHint': 'Ketik ikon hati untuk menyimpan zikir',
        'namesOfAllah': 'Asmaul Husna',
        'noOtherFavorites': 'Tiada item disimpan',
        'addOtherHint': 'Ketik ikon hati untuk menyimpan item',
        'removeFromFavoritesConfirm': 'Adakah anda mahu membuang item ini dari kegemaran?',
        'chooseDesign': 'Pilih Reka Bentuk',
        'shareText': 'Kongsi sebagai Teks',
        'addNote': 'Tambah Nota',
        'notePlaceholder': 'Tulis nota anda di sini...',
        'saveNote': 'Simpan Nota',
    },
    'hi': {
        'title': 'पसंदीदा',
        'verse': 'आयत',
        'verseFrom': 'सूरह से',
        'deleteConfirm': 'क्या आप इस आइटम को पसंदीदा से हटाना चाहते हैं?',
        'exportImage': 'छवि के रूप में निर्यात करें',
        'saved': 'सहेजा गया',
        'repeatCount': 'दोहराव संख्या',
        'image': 'छवि',
        'note': 'नोट',
        'quran': 'कुरान',
        'bookmarks': 'बुकमार्क',
        'azkar': 'अज़कार',
        'other': 'अन्य',
        'sortByDate': 'तिथि के अनुसार क्रमबद्ध',
        'sortBySurah': 'सूरह के अनुसार क्रमबद्ध',
        'noQuranFavorites': 'कोई सहेजी गई आयतें नहीं',
        'addQuranHint': 'आयत सहेजने के लिए दिल के आइकन पर टैप करें',
        'deleteBookmarkConfirm': 'क्या आप इस बुकमार्क को हटाना चाहते हैं?',
        'noBookmarks': 'कोई बुकमार्क नहीं',
        'addBookmarkHint': 'बुकमार्क जोड़ने के लिए आयत पर देर तक दबाएं',
        'noAzkarFavorites': 'कोई सहेजे गए अज़कार नहीं',
        'addAzkarHint': 'ज़िक्र सहेजने के लिए दिल के आइकन पर टैप करें',
        'namesOfAllah': 'अल्लाह के नाम',
        'noOtherFavorites': 'कोई सहेजे गए आइटम नहीं',
        'addOtherHint': 'आइटम सहेजने के लिए दिल के आइकन पर टैप करें',
        'removeFromFavoritesConfirm': 'क्या आप इस आइटम को पसंदीदा से हटाना चाहते हैं?',
        'chooseDesign': 'डिज़ाइन चुनें',
        'shareText': 'टेक्स्ट के रूप में साझा करें',
        'addNote': 'नोट जोड़ें',
        'notePlaceholder': 'अपना नोट यहाँ लिखें...',
        'saveNote': 'नोट सहेजें',
    },
    'bn': {
        'title': 'পছন্দসই',
        'verse': 'আয়াত',
        'verseFrom': 'সূরা থেকে',
        'deleteConfirm': 'আপনি কি এই আইটেমটি পছন্দসই থেকে মুছতে চান?',
        'exportImage': 'ছবি হিসেবে রপ্তানি করুন',
        'saved': 'সংরক্ষিত',
        'repeatCount': 'পুনরাবৃত্তির সংখ্যা',
        'image': 'ছবি',
        'note': 'নোট',
        'quran': 'কুরআন',
        'bookmarks': 'বুকমার্ক',
        'azkar': 'আযকার',
        'other': 'অন্যান্য',
        'sortByDate': 'তারিখ অনুসারে সাজান',
        'sortBySurah': 'সূরা অনুসারে সাজান',
        'noQuranFavorites': 'কোনো সংরক্ষিত আয়াত নেই',
        'addQuranHint': 'আয়াত সংরক্ষণ করতে হৃদয় আইকনে ট্যাপ করুন',
        'deleteBookmarkConfirm': 'আপনি কি এই বুকমার্ক মুছতে চান?',
        'noBookmarks': 'কোনো বুকমার্ক নেই',
        'addBookmarkHint': 'বুকমার্ক যোগ করতে একটি আয়াতে দীর্ঘ চাপ দিন',
        'noAzkarFavorites': 'কোনো সংরক্ষিত আযকার নেই',
        'addAzkarHint': 'যিকির সংরক্ষণ করতে হৃদয় আইকনে ট্যাপ করুন',
        'namesOfAllah': 'আল্লাহর নাম',
        'noOtherFavorites': 'কোনো সংরক্ষিত আইটেম নেই',
        'addOtherHint': 'আইটেম সংরক্ষণ করতে হৃদয় আইকনে ট্যাপ করুন',
        'removeFromFavoritesConfirm': 'আপনি কি এই আইটেমটি পছন্দসই থেকে সরাতে চান?',
        'chooseDesign': 'ডিজাইন নির্বাচন করুন',
        'shareText': 'টেক্সট হিসেবে শেয়ার করুন',
        'addNote': 'নোট যোগ করুন',
        'notePlaceholder': 'এখানে আপনার নোট লিখুন...',
        'saveNote': 'নোট সংরক্ষণ করুন',
    },
    'ru': {
        'title': 'Избранное',
        'verse': 'Аят',
        'verseFrom': 'из суры',
        'deleteConfirm': 'Вы хотите удалить этот элемент из избранного?',
        'exportImage': 'Экспортировать как изображение',
        'saved': 'Сохранено',
        'repeatCount': 'Количество повторений',
        'image': 'Изображение',
        'note': 'Заметка',
        'quran': 'Коран',
        'bookmarks': 'Закладки',
        'azkar': 'Азкар',
        'other': 'Другое',
        'sortByDate': 'Сортировать по дате',
        'sortBySurah': 'Сортировать по суре',
        'noQuranFavorites': 'Нет сохраненных аятов',
        'addQuranHint': 'Нажмите на сердце, чтобы сохранить аят',
        'deleteBookmarkConfirm': 'Вы хотите удалить эту закладку?',
        'noBookmarks': 'Нет закладок',
        'addBookmarkHint': 'Нажмите и удерживайте аят, чтобы добавить закладку',
        'noAzkarFavorites': 'Нет сохраненных азкаров',
        'addAzkarHint': 'Нажмите на сердце, чтобы сохранить зикр',
        'namesOfAllah': 'Имена Аллаха',
        'noOtherFavorites': 'Нет сохраненных элементов',
        'addOtherHint': 'Нажмите на сердце, чтобы сохранить элемент',
        'removeFromFavoritesConfirm': 'Вы хотите удалить этот элемент из избранного?',
        'chooseDesign': 'Выбрать дизайн',
        'shareText': 'Поделиться как текст',
        'addNote': 'Добавить заметку',
        'notePlaceholder': 'Напишите здесь свою заметку...',
        'saveNote': 'Сохранить заметку',
    },
}


def generate_favorites_block(lang, trans):
    """Generate the favorites object for a language"""
    lines = ['  favorites: {']
    for key, value in trans.items():
        # Escape single quotes
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    lines.append('  },')
    return '\n'.join(lines)


# Now we need to add favorites to each language translation block
# We'll add it after the subscription block in each language

for lang, trans in translations.items():
    favorites_block = generate_favorites_block(lang, trans)
    
    # Find the subscription block for this language and add favorites after it
    # The pattern is: subscription: { ... }, followed by other keys or the end
    pattern = rf'(const {lang}: TranslationKeys = \{{[\s\S]*?subscription: \{{\n    subscribeToAccess: [^\n]+\n    upgrade: [^\n]+\n  \}},)'
    
    def add_favorites(match):
        return match.group(1) + '\n' + favorites_block
    
    content = re.sub(pattern, add_favorites, content)


# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added favorites namespace to interface")
print("✅ Added favorites translations to all 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
