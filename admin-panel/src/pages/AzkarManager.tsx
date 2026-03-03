// admin-panel/src/pages/AzkarManager.tsx
// إدارة الأذكار مع الترجمات الموثقة (بدون ترجمة آلية)
// ========================================================

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Chip, Tabs, Tab, CircularProgress, Snackbar, Alert,
  Select, MenuItem, FormControl, InputLabel, Card, CardContent,
  Grid, LinearProgress, Tooltip, Accordion, AccordionSummary,
  AccordionDetails, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Download, Refresh, VolumeUp, CloudUpload,
  CheckCircle, Error, Search, ExpandMore, Language, Link as LinkIcon,
  PlayArrow, Stop, ContentCopy
} from '@mui/icons-material';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ==================== الأنواع ====================
interface Translation {
  text: string;
  source: string; // مصدر الترجمة (مثل: Dar-us-Salam, IslamHouse)
  verified: boolean;
}

interface Zikr {
  id?: string;
  numericId: number;
  hisnNumber: number; // رقم الذكر في حصن المسلم
  category: string;
  arabic: string;
  transliteration: string;
  translations: {
    ar: Translation;
    en: Translation;
    fr: Translation;
    de: Translation;
    hi: Translation;
    id: Translation;
    ms: Translation;
    tr: Translation;
    ur: Translation;
    bn: Translation;
    es: Translation;
    ru: Translation;
  };
  count: number;
  reference: string;
  benefit?: string;
  audio?: string;
  audioSource?: string;
}

// اللغات المدعومة مع مصادر الترجمة
const LANGUAGES = [
  { code: 'ar', name: 'العربية', dir: 'rtl', source: 'Original' },
  { code: 'en', name: 'English', dir: 'ltr', source: 'Dar-us-Salam' },
  { code: 'fr', name: 'Français', dir: 'ltr', source: 'IslamHouse' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', source: 'IslamHouse' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', source: 'IslamHouse' },
  { code: 'id', name: 'Indonesia', dir: 'ltr', source: 'IslamHouse' },
  { code: 'ms', name: 'Melayu', dir: 'ltr', source: 'IslamHouse' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', source: 'IslamHouse' },
  { code: 'ur', name: 'اردو', dir: 'rtl', source: 'Dar-us-Salam' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr', source: 'IslamHouse' },
  { code: 'es', name: 'Español', dir: 'ltr', source: 'IslamHouse' },
  { code: 'ru', name: 'Русский', dir: 'ltr', source: 'IslamHouse' },
];

// الفئات
const CATEGORIES = [
  { id: 'morning', name: 'أذكار الصباح', nameEn: 'Morning Adhkar', icon: '🌅', hisnChapter: 27 },
  { id: 'evening', name: 'أذكار المساء', nameEn: 'Evening Adhkar', icon: '🌆', hisnChapter: 27 },
  { id: 'sleep', name: 'أذكار النوم', nameEn: 'Sleep Adhkar', icon: '🌙', hisnChapter: 28 },
  { id: 'wakeup', name: 'أذكار الاستيقاظ', nameEn: 'Waking Up Adhkar', icon: '☀️', hisnChapter: 1 },
  { id: 'after_prayer', name: 'أذكار بعد الصلاة', nameEn: 'After Prayer', icon: '🕌', hisnChapter: 26 },
  { id: 'quran_duas', name: 'أدعية من القرآن', nameEn: 'Quran Duas', icon: '📖', hisnChapter: 0 },
  { id: 'sunnah_duas', name: 'أدعية من السنة', nameEn: 'Sunnah Duas', icon: '⭐', hisnChapter: 0 },
  { id: 'ruqya', name: 'الرقية الشرعية', nameEn: 'Ruqyah', icon: '🛡️', hisnChapter: 32 },
];

// مصادر الصوت الموثقة
const AUDIO_SOURCES = {
  archive: {
    name: 'Archive.org - HisnulMuslim',
    baseUrl: 'https://archive.org/download/HisnulMuslimAudio_201510/',
    format: (num: number) => `n${num}.mp3`
  },
  salafi: {
    name: 'SalafiAudio',
    baseUrl: 'https://salafiaudio.files.wordpress.com/2015/07/',
    format: (num: number) => `hisn-al-muslim-audio-dua-${num}.mp3`
  }
};

// مصادر الترجمات الموثقة
const TRANSLATION_SOURCES = [
  { id: 'darussalam', name: 'Dar-us-Salam Publications', url: 'https://dar-us-salam.com' },
  { id: 'islamhouse', name: 'IslamHouse.com', url: 'https://islamhouse.com' },
  { id: 'myislam', name: 'MyIslam.org', url: 'https://myislam.org/hisnul-muslim/' },
  { id: 'sunnah', name: 'Sunnah.com', url: 'https://sunnah.com' },
  { id: 'ahadith', name: 'Ahadith.co.uk', url: 'https://ahadith.co.uk/fortressofthemuslim.php' },
];

// ==================== المكون الرئيسي ====================
const AzkarManager: React.FC = () => {
  // الحالات
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [filteredList, setFilteredList] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZikr, setEditingZikr] = useState<Zikr | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [expandedLang, setExpandedLang] = useState<string | false>(false);

  // نموذج فارغ
  const createEmptyTranslation = (): Translation => ({
    text: '',
    source: '',
    verified: false
  });

  const emptyZikr: Zikr = {
    numericId: 0,
    hisnNumber: 0,
    category: 'morning',
    arabic: '',
    transliteration: '',
    translations: {
      ar: createEmptyTranslation(),
      en: createEmptyTranslation(),
      fr: createEmptyTranslation(),
      de: createEmptyTranslation(),
      hi: createEmptyTranslation(),
      id: createEmptyTranslation(),
      ms: createEmptyTranslation(),
      tr: createEmptyTranslation(),
      ur: createEmptyTranslation(),
      bn: createEmptyTranslation(),
      es: createEmptyTranslation(),
      ru: createEmptyTranslation(),
    },
    count: 1,
    reference: '',
    benefit: '',
    audio: '',
    audioSource: ''
  };

  const [formData, setFormData] = useState<Zikr>(emptyZikr);

  // ==================== تحميل البيانات ====================
  useEffect(() => {
    loadAzkar();
  }, []);

  useEffect(() => {
    filterAzkar();
  }, [azkarList, selectedCategory, searchQuery]);

  // تنظيف الصوت عند إغلاق المكون
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const loadAzkar = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'azkar'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zikr));
      setAzkarList(data.sort((a, b) => a.numericId - b.numericId));
    } catch (error) {
      console.error('Error loading azkar:', error);
      showSnackbar('خطأ في تحميل الأذكار', 'error');
    }
    setLoading(false);
  };

  const filterAzkar = () => {
    let filtered = [...azkarList];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic.includes(query) ||
        z.transliteration.toLowerCase().includes(query) ||
        z.translations.en.text.toLowerCase().includes(query) ||
        z.reference.toLowerCase().includes(query) ||
        z.hisnNumber.toString() === query
      );
    }
    
    setFilteredList(filtered);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ==================== إدارة الصوت ====================
  const getAudioUrl = (hisnNumber: number, source: 'archive' | 'salafi' = 'archive'): string => {
    const audioSource = AUDIO_SOURCES[source];
    return audioSource.baseUrl + audioSource.format(hisnNumber);
  };

  const playAudio = (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      showSnackbar('خطأ في تشغيل الصوت', 'error');
      setPlayingAudio(null);
    };
    
    audio.play();
    setAudioElement(audio);
    setPlayingAudio(url);
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  const setAudioFromHisn = (hisnNumber: number) => {
    if (hisnNumber > 0) {
      const audioUrl = getAudioUrl(hisnNumber);
      setFormData(prev => ({
        ...prev,
        audio: audioUrl,
        audioSource: 'Archive.org - HisnulMuslim'
      }));
      showSnackbar(`تم تعيين صوت حصن المسلم رقم ${hisnNumber}`, 'success');
    }
  };

  // رفع صوت مخصص
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const storageRef = ref(storage, `azkar-audio/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({
        ...prev,
        audio: url,
        audioSource: 'Custom Upload'
      }));
      showSnackbar('تم رفع الصوت بنجاح', 'success');
    } catch (error) {
      showSnackbar('خطأ في رفع الصوت', 'error');
    }
    setUploadingAudio(false);
  };

  // ==================== إدارة الترجمات ====================
  const updateTranslation = (lang: string, field: keyof Translation, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: {
          ...prev.translations[lang as keyof typeof prev.translations],
          [field]: value
        }
      }
    }));
  };

  const copyFromSource = (lang: string, sourceUrl: string) => {
    window.open(sourceUrl, '_blank');
    showSnackbar(`افتح المصدر وانسخ الترجمة ${lang}`, 'info');
  };

  const getTranslationStatus = (zikr: Zikr): { complete: number; verified: number; total: number } => {
    const langs = Object.keys(zikr.translations) as Array<keyof typeof zikr.translations>;
    const complete = langs.filter(l => zikr.translations[l].text).length;
    const verified = langs.filter(l => zikr.translations[l].verified).length;
    return { complete, verified, total: langs.length };
  };

  // ==================== حفظ وحذف ====================
  const handleSave = async () => {
    // التحقق من البيانات الأساسية
    if (!formData.arabic.trim()) {
      showSnackbar('الرجاء إدخال النص العربي', 'error');
      return;
    }

    if (!formData.translations.en.text.trim()) {
      showSnackbar('الرجاء إدخال الترجمة الإنجليزية على الأقل', 'error');
      return;
    }

    try {
      // تعيين النص العربي كترجمة عربية
      const dataToSave = {
        ...formData,
        translations: {
          ...formData.translations,
          ar: {
            ...formData.translations.ar,
            text: formData.arabic,
            source: 'Original',
            verified: true
          }
        }
      };

      if (editingZikr?.id) {
        await updateDoc(doc(db, 'azkar', editingZikr.id), dataToSave);
        showSnackbar('تم تحديث الذكر بنجاح', 'success');
      } else {
        // تعيين رقم جديد
        const maxId = azkarList.reduce((max, z) => Math.max(max, z.numericId), 0);
        dataToSave.numericId = maxId + 1;
        await addDoc(collection(db, 'azkar'), dataToSave);
        showSnackbar('تم إضافة الذكر بنجاح', 'success');
      }

      setDialogOpen(false);
      setEditingZikr(null);
      setFormData(emptyZikr);
      loadAzkar();
    } catch (error) {
      console.error('Error saving:', error);
      showSnackbar('خطأ في الحفظ', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الذكر؟')) return;

    try {
      await deleteDoc(doc(db, 'azkar', id));
      showSnackbar('تم حذف الذكر', 'success');
      loadAzkar();
    } catch (error) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const handleEdit = (zikr: Zikr) => {
    setEditingZikr(zikr);
    setFormData(zikr);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingZikr(null);
    setFormData(emptyZikr);
    setDialogOpen(true);
  };

  // ==================== تصدير البيانات ====================
  const exportToJson = () => {
    // تحويل البيانات للتنسيق المطلوب للتطبيق
    const exportData = {
      azkar: azkarList.map(z => ({
        id: z.numericId,
        category: z.category,
        arabic: z.arabic,
        transliteration: z.transliteration,
        translations: Object.fromEntries(
          Object.entries(z.translations).map(([lang, trans]) => [lang, trans.text])
        ),
        count: z.count,
        reference: z.reference,
        benefit: z.benefit || '',
        audio: z.audio || ''
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('تم تصدير البيانات', 'success');
  };

  // ==================== الإحصائيات ====================
  const getStats = () => {
    const stats = {
      total: azkarList.length,
      withAudio: azkarList.filter(z => z.audio).length,
      byCategory: {} as Record<string, number>,
      translationCoverage: {} as Record<string, number>
    };

    CATEGORIES.forEach(cat => {
      stats.byCategory[cat.id] = azkarList.filter(z => z.category === cat.id).length;
    });

    LANGUAGES.forEach(lang => {
      stats.translationCoverage[lang.code] = azkarList.filter(
        z => z.translations[lang.code as keyof typeof z.translations]?.text
      ).length;
    });

    return stats;
  };

  const stats = getStats();

  // ==================== العرض ====================
  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان والأزرار */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          🕌 إدارة الأذكار
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download />} onClick={exportToJson}>
            تصدير JSON
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadAzkar}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            إضافة ذكر
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>إجمالي الأذكار</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>مع صوت</Typography>
              <Typography variant="h4">{stats.withAudio}</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(stats.withAudio / stats.total) * 100} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>عدد الفئات</Typography>
              <Typography variant="h4">{CATEGORIES.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>اللغات المدعومة</Typography>
              <Typography variant="h4">{LANGUAGES.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الفلاتر */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={selectedCategory}
            label="الفئة"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">جميع الفئات</MenuItem>
            {CATEGORIES.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name} ({stats.byCategory[cat.id] || 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="بحث"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالعربي أو الإنجليزي أو رقم حصن المسلم..."
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Box>

      {/* جدول الأذكار */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>حصن</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الفئة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 300 }}>النص العربي</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الترجمات</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>صوت</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredList.map((zikr) => {
                const transStatus = getTranslationStatus(zikr);
                return (
                  <TableRow key={zikr.id} hover>
                    <TableCell>{zikr.numericId}</TableCell>
                    <TableCell>
                      {zikr.hisnNumber > 0 ? (
                        <Chip label={zikr.hisnNumber} size="small" color="primary" />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CATEGORIES.find(c => c.id === zikr.category)?.name || zikr.category}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ 
                        fontFamily: 'Amiri, serif',
                        fontSize: '1.1rem',
                        direction: 'rtl',
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {zikr.arabic}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`${transStatus.complete}/${transStatus.total} مكتمل، ${transStatus.verified} موثق`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(transStatus.complete / transStatus.total) * 100}
                            sx={{ width: 60, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption">
                            {transStatus.complete}/{transStatus.total}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {zikr.audio ? (
                        <IconButton
                          size="small"
                          color={playingAudio === zikr.audio ? 'secondary' : 'primary'}
                          onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio!)}
                        >
                          {playingAudio === zikr.audio ? <Stop /> : <PlayArrow />}
                        </IconButton>
                      ) : (
                        <Chip label="لا يوجد" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(zikr)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(zikr.id!)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* مصادر الترجمات الموثقة */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>📚 مصادر الترجمات الموثقة:</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {TRANSLATION_SOURCES.map(source => (
            <Chip
              key={source.id}
              label={source.name}
              component="a"
              href={source.url}
              target="_blank"
              clickable
              icon={<LinkIcon />}
            />
          ))}
        </Box>
      </Box>

      {/* Dialog إضافة/تعديل */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingZikr ? 'تعديل الذكر' : 'إضافة ذكر جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="البيانات الأساسية" />
            <Tab label="الترجمات الموثقة" />
            <Tab label="الصوت" />
          </Tabs>

          {/* تاب البيانات الأساسية */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>الفئة</InputLabel>
                  <Select
                    value={formData.category}
                    label="الفئة"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="رقم حصن المسلم"
                  type="number"
                  value={formData.hisnNumber}
                  onChange={(e) => setFormData({ ...formData, hisnNumber: parseInt(e.target.value) || 0 })}
                  helperText="للربط مع الصوت والترجمات"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="عدد التكرار"
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="النص العربي *"
                  value={formData.arabic}
                  onChange={(e) => setFormData({ ...formData, arabic: e.target.value })}
                  sx={{ direction: 'rtl', fontFamily: 'Amiri, serif' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="النطق (Transliteration)"
                  value={formData.transliteration}
                  onChange={(e) => setFormData({ ...formData, transliteration: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="المرجع"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="مثال: البخاري 1/152، مسلم 1/288"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="الفائدة (اختياري)"
                  value={formData.benefit}
                  onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                />
              </Grid>
            </Grid>
          )}

          {/* تاب الترجمات */}
          {activeTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  ⚠️ <strong>مهم:</strong> يرجى استخدام الترجمات الموثقة فقط من المصادر الإسلامية المعتمدة.
                  انقر على "فتح المصدر" للحصول على الترجمة الصحيحة.
                </Typography>
              </Alert>

              {LANGUAGES.map((lang) => (
                <Accordion 
                  key={lang.code}
                  expanded={expandedLang === lang.code}
                  onChange={(_, expanded) => setExpandedLang(expanded ? lang.code : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography sx={{ fontWeight: 'bold' }}>{lang.name}</Typography>
                      {formData.translations[lang.code as keyof typeof formData.translations]?.text ? (
                        <Chip 
                          size="small" 
                          label={formData.translations[lang.code as keyof typeof formData.translations].verified ? "موثق ✓" : "غير موثق"}
                          color={formData.translations[lang.code as keyof typeof formData.translations].verified ? "success" : "warning"}
                        />
                      ) : (
                        <Chip size="small" label="فارغ" variant="outlined" />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label={`الترجمة ${lang.name}`}
                          value={formData.translations[lang.code as keyof typeof formData.translations]?.text || ''}
                          onChange={(e) => updateTranslation(lang.code, 'text', e.target.value)}
                          sx={{ direction: lang.dir }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>مصدر الترجمة</InputLabel>
                          <Select
                            value={formData.translations[lang.code as keyof typeof formData.translations]?.source || ''}
                            label="مصدر الترجمة"
                            onChange={(e) => updateTranslation(lang.code, 'source', e.target.value)}
                          >
                            {TRANSLATION_SOURCES.map(src => (
                              <MenuItem key={src.id} value={src.name}>{src.name}</MenuItem>
                            ))}
                            <MenuItem value="Manual">إدخال يدوي</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<CheckCircle />}
                          color={formData.translations[lang.code as keyof typeof formData.translations]?.verified ? "success" : "inherit"}
                          onClick={() => updateTranslation(
                            lang.code, 
                            'verified', 
                            !formData.translations[lang.code as keyof typeof formData.translations]?.verified
                          )}
                        >
                          {formData.translations[lang.code as keyof typeof formData.translations]?.verified ? 'موثق ✓' : 'تحديد كموثق'}
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<LinkIcon />}
                          onClick={() => copyFromSource(lang.name, 'https://myislam.org/hisnul-muslim/')}
                        >
                          فتح المصدر
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* تاب الصوت */}
          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    🔊 يمكنك استخدام ملفات الصوت من حصن المسلم المتاحة على Archive.org
                    أو رفع ملف صوتي خاص.
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>استخدام صوت حصن المسلم</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="رقم حصن المسلم"
                        type="number"
                        value={formData.hisnNumber}
                        onChange={(e) => setFormData({ ...formData, hisnNumber: parseInt(e.target.value) || 0 })}
                        size="small"
                      />
                      <Button
                        variant="contained"
                        onClick={() => setAudioFromHisn(formData.hisnNumber)}
                        disabled={!formData.hisnNumber}
                      >
                        تعيين الصوت
                      </Button>
                    </Box>
                    {formData.hisnNumber > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<PlayArrow />}
                          onClick={() => playAudio(getAudioUrl(formData.hisnNumber))}
                        >
                          تجربة Archive.org
                        </Button>
                        <Button
                          size="small"
                          startIcon={<PlayArrow />}
                          onClick={() => playAudio(getAudioUrl(formData.hisnNumber, 'salafi'))}
                        >
                          تجربة SalafiAudio
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>رفع صوت مخصص</Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingAudio ? <CircularProgress size={20} /> : <CloudUpload />}
                      disabled={uploadingAudio}
                    >
                      {uploadingAudio ? 'جاري الرفع...' : 'اختر ملف MP3'}
                      <input type="file" accept="audio/*" hidden onChange={handleAudioUpload} />
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="رابط الصوت"
                  value={formData.audio}
                  onChange={(e) => setFormData({ ...formData, audio: e.target.value })}
                  InputProps={{
                    endAdornment: formData.audio && (
                      <IconButton onClick={() => playingAudio ? stopAudio() : playAudio(formData.audio!)}>
                        {playingAudio === formData.audio ? <Stop /> : <PlayArrow />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="مصدر الصوت"
                  value={formData.audioSource}
                  onChange={(e) => setFormData({ ...formData, audioSource: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingZikr ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AzkarManager;
