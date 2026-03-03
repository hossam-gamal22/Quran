// admin-panel/src/pages/AzkarManager.tsx
// إدارة الأذكار مع الترجمات الموثقة وربط الصوت
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Chip, Tabs, Tab, CircularProgress, Snackbar, Alert,
  Select, MenuItem, FormControl, InputLabel, Card, CardContent,
  Grid, LinearProgress, Tooltip, Accordion, AccordionSummary,
  AccordionDetails, Switch, FormControlLabel, Pagination
} from '@mui/material';
import {
  Add, Edit, Delete, Download, Refresh, VolumeUp, CloudUpload,
  CheckCircle, Search, ExpandMore, Link as LinkIcon,
  PlayArrow, Stop, Upload, AudioFile, Verified
} from '@mui/icons-material';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ==================== الأنواع ====================
interface Translation {
  text: string;
  source: string;
  verified: boolean;
}

interface Zikr {
  id?: string;
  numericId: number;
  hisnNumber: number;
  category: string;
  arabic: string;
  transliteration: string;
  translations: Record<string, Translation>;
  count: number;
  reference: string;
  benefit: string;
  audio: string;
  audioSource: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// اللغات المدعومة
const LANGUAGES = [
  { code: 'ar', name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'en', name: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', dir: 'ltr', flag: '🇮🇩' },
  { code: 'ms', name: 'Melayu', dir: 'ltr', flag: '🇲🇾' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'ur', name: 'اردو', dir: 'rtl', flag: '🇵🇰' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr', flag: '🇧🇩' },
  { code: 'es', name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
];

// الفئات
const CATEGORIES = [
  { id: 'morning', name: 'أذكار الصباح', nameEn: 'Morning Adhkar', icon: '🌅', color: '#F59E0B' },
  { id: 'evening', name: 'أذكار المساء', nameEn: 'Evening Adhkar', icon: '🌆', color: '#8B5CF6' },
  { id: 'sleep', name: 'أذكار النوم', nameEn: 'Sleep Adhkar', icon: '🌙', color: '#3B82F6' },
  { id: 'wakeup', name: 'أذكار الاستيقاظ', nameEn: 'Waking Up', icon: '☀️', color: '#10B981' },
  { id: 'after_prayer', name: 'أذكار بعد الصلاة', nameEn: 'After Prayer', icon: '🕌', color: '#EC4899' },
  { id: 'quran_duas', name: 'أدعية من القرآن', nameEn: 'Quran Duas', icon: '📖', color: '#14B8A6' },
  { id: 'sunnah_duas', name: 'أدعية من السنة', nameEn: 'Sunnah Duas', icon: '⭐', color: '#F97316' },
  { id: 'ruqya', name: 'الرقية الشرعية', nameEn: 'Ruqyah', icon: '🛡️', color: '#6366F1' },
];

// مصادر الصوت
const AUDIO_SOURCES = {
  archive: {
    name: 'Archive.org - HisnulMuslim',
    getUrl: (num: number) => `https://archive.org/download/HisnulMuslimAudio_201510/n${num}.mp3`
  },
  salafi: {
    name: 'SalafiAudio',
    getUrl: (num: number) => `https://salafiaudio.files.wordpress.com/2015/07/hisn-al-muslim-audio-dua-${num}.mp3`
  }
};

// مصادر الترجمات الموثقة
const TRANSLATION_SOURCES = [
  { id: 'darussalam', name: 'Dar-us-Salam', url: 'https://dar-us-salam.com' },
  { id: 'islamhouse', name: 'IslamHouse.com', url: 'https://islamhouse.com' },
  { id: 'myislam', name: 'MyIslam.org', url: 'https://myislam.org/hisnul-muslim/' },
  { id: 'sunnah', name: 'Sunnah.com', url: 'https://sunnah.com' },
  { id: 'ahadith', name: 'Ahadith.co.uk', url: 'https://ahadith.co.uk/fortressofthemuslim.php' },
  { id: 'quranenc', name: 'Quran Encyclopedia', url: 'https://quranenc.com' },
];

// ==================== المكون الرئيسي ====================
const AzkarManager: React.FC = () => {
  // الحالات
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [filteredList, setFilteredList] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZikr, setEditingZikr] = useState<Zikr | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [expandedLang, setExpandedLang] = useState<string | false>('en');
  const [page, setPage] = useState(1);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  const ITEMS_PER_PAGE = 20;

  // إنشاء ترجمة فارغة
  const createEmptyTranslation = (): Translation => ({
    text: '',
    source: '',
    verified: false
  });

  // إنشاء ترجمات فارغة لكل اللغات
  const createEmptyTranslations = (): Record<string, Translation> => {
    const translations: Record<string, Translation> = {};
    LANGUAGES.forEach(lang => {
      translations[lang.code] = createEmptyTranslation();
    });
    return translations;
  };

  // نموذج فارغ
  const emptyZikr: Zikr = {
    numericId: 0,
    hisnNumber: 0,
    category: 'morning',
    arabic: '',
    transliteration: '',
    translations: createEmptyTranslations(),
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
      showSnackbar(`تم تحميل ${data.length} ذكر`, 'success');
    } catch (error) {
      console.error('Error loading azkar:', error);
      showSnackbar('خطأ في تحميل الأذكار', 'error');
    }
    setLoading(false);
  };

  const filterAzkar = useCallback(() => {
    let filtered = [...azkarList];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic?.includes(query) ||
        z.transliteration?.toLowerCase().includes(query) ||
        z.translations?.en?.text?.toLowerCase().includes(query) ||
        z.reference?.toLowerCase().includes(query) ||
        z.hisnNumber?.toString() === query ||
        z.numericId?.toString() === query
      );
    }
    
    setFilteredList(filtered);
    setPage(1);
  }, [azkarList, selectedCategory, searchQuery]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  // ==================== إدارة الصوت ====================
  const playAudio = (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      showSnackbar('خطأ في تشغيل الصوت - قد يكون الرابط غير صحيح', 'error');
      setPlayingAudio(null);
    };
    
    audio.play().catch(() => {
      showSnackbar('لا يمكن تشغيل الصوت', 'error');
    });
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

  const setAudioFromHisn = (hisnNumber: number, source: 'archive' | 'salafi' = 'archive') => {
    if (hisnNumber > 0) {
      const audioUrl = AUDIO_SOURCES[source].getUrl(hisnNumber);
      setFormData(prev => ({
        ...prev,
        audio: audioUrl,
        audioSource: AUDIO_SOURCES[source].name
      }));
      showSnackbar(`تم تعيين صوت حصن المسلم رقم ${hisnNumber}`, 'success');
    }
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      showSnackbar('يرجى اختيار ملف صوتي', 'error');
      return;
    }

    setUploadingAudio(true);
    try {
      const fileName = `azkar-audio/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({
        ...prev,
        audio: url,
        audioSource: 'Custom Upload'
      }));
      showSnackbar('تم رفع الصوت بنجاح', 'success');
    } catch (error) {
      console.error('Error uploading audio:', error);
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
          ...(prev.translations[lang] || createEmptyTranslation()),
          [field]: value
        }
      }
    }));
  };

  const getTranslationStatus = (zikr: Zikr) => {
    const langs = LANGUAGES.map(l => l.code);
    const complete = langs.filter(l => zikr.translations?.[l]?.text).length;
    const verified = langs.filter(l => zikr.translations?.[l]?.verified).length;
    return { complete, verified, total: langs.length };
  };

  // ==================== حفظ وحذف ====================
  const handleSave = async () => {
    if (!formData.arabic?.trim()) {
      showSnackbar('الرجاء إدخال النص العربي', 'error');
      return;
    }

    if (!formData.translations?.en?.text?.trim()) {
      showSnackbar('الرجاء إدخال الترجمة الإنجليزية على الأقل', 'error');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        translations: {
          ...formData.translations,
          ar: {
            text: formData.arabic,
            source: 'Original',
            verified: true
          }
        },
        updatedAt: new Date()
      };

      if (editingZikr?.id) {
        await updateDoc(doc(db, 'azkar', editingZikr.id), dataToSave);
        showSnackbar('تم تحديث الذكر بنجاح', 'success');
      } else {
        const maxId = azkarList.reduce((max, z) => Math.max(max, z.numericId || 0), 0);
        dataToSave.numericId = maxId + 1;
        dataToSave.createdAt = new Date();
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
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الذكر؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await deleteDoc(doc(db, 'azkar', id));
      showSnackbar('تم حذف الذكر', 'success');
      loadAzkar();
    } catch (error) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const handleEdit = (zikr: Zikr) => {
    // التأكد من وجود جميع الترجمات
    const translations = { ...createEmptyTranslations() };
    if (zikr.translations) {
      Object.keys(zikr.translations).forEach(lang => {
        translations[lang] = { ...createEmptyTranslation(), ...zikr.translations[lang] };
      });
    }
    
    setEditingZikr(zikr);
    setFormData({ ...emptyZikr, ...zikr, translations });
    setActiveTab(0);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingZikr(null);
    setFormData(emptyZikr);
    setActiveTab(0);
    setDialogOpen(true);
  };

  // ==================== استيراد/تصدير ====================
  const exportToJson = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      totalCount: azkarList.length,
      azkar: azkarList.map(z => ({
        id: z.numericId,
        hisnNumber: z.hisnNumber,
        category: z.category,
        arabic: z.arabic,
        transliteration: z.transliteration,
        translations: Object.fromEntries(
          Object.entries(z.translations || {}).map(([lang, trans]) => [
            lang,
            { text: trans.text, source: trans.source, verified: trans.verified }
          ])
        ),
        count: z.count,
        reference: z.reference,
        benefit: z.benefit || '',
        audio: z.audio || '',
        audioSource: z.audioSource || ''
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar(`تم تصدير ${azkarList.length} ذكر`, 'success');
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson);
      
      if (!data.azkar || !Array.isArray(data.azkar)) {
        showSnackbar('صيغة JSON غير صحيحة - يجب أن يحتوي على مصفوفة azkar', 'error');
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      for (const zikr of data.azkar) {
        const docRef = doc(collection(db, 'azkar'));
        
        // تحويل الترجمات للصيغة الجديدة
        const translations: Record<string, Translation> = {};
        if (zikr.translations) {
          Object.entries(zikr.translations).forEach(([lang, value]) => {
            if (typeof value === 'string') {
              translations[lang] = { text: value, source: 'Imported', verified: false };
            } else if (typeof value === 'object' && value !== null) {
              translations[lang] = {
                text: (value as any).text || '',
                source: (value as any).source || 'Imported',
                verified: (value as any).verified || false
              };
            }
          });
        }

        batch.set(docRef, {
          numericId: zikr.id || count + 1,
          hisnNumber: zikr.hisnNumber || 0,
          category: zikr.category || 'morning',
          arabic: zikr.arabic || '',
          transliteration: zikr.transliteration || '',
          translations,
          count: zikr.count || 1,
          reference: zikr.reference || '',
          benefit: zikr.benefit || '',
          audio: zikr.audio || '',
          audioSource: zikr.audioSource || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        count++;
      }

      await batch.commit();
      showSnackbar(`تم استيراد ${count} ذكر بنجاح`, 'success');
      setImportDialogOpen(false);
      setImportJson('');
      loadAzkar();
    } catch (error) {
      console.error('Import error:', error);
      showSnackbar('خطأ في الاستيراد - تأكد من صحة JSON', 'error');
    }
  };

  // ==================== الإحصائيات ====================
  const getStats = () => {
    const stats = {
      total: azkarList.length,
      withAudio: azkarList.filter(z => z.audio).length,
      byCategory: {} as Record<string, number>,
      translationCoverage: {} as Record<string, { complete: number; verified: number }>
    };

    CATEGORIES.forEach(cat => {
      stats.byCategory[cat.id] = azkarList.filter(z => z.category === cat.id).length;
    });

    LANGUAGES.forEach(lang => {
      const complete = azkarList.filter(z => z.translations?.[lang.code]?.text).length;
      const verified = azkarList.filter(z => z.translations?.[lang.code]?.verified).length;
      stats.translationCoverage[lang.code] = { complete, verified };
    });

    return stats;
  };

  const stats = getStats();

  // الصفحات
  const paginatedList = filteredList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

  // ==================== العرض ====================
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          🕌 إدارة الأذكار والأدعية
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<Upload />} onClick={() => setImportDialogOpen(true)}>
            استيراد
          </Button>
          <Button variant="outlined" startIcon={<Download />} onClick={exportToJson}>
            تصدير JSON
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadAzkar} disabled={loading}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            إضافة ذكر جديد
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#3B82F6', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي الأذكار</Typography>
              <Typography variant="h3">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#10B981', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>مع صوت</Typography>
              <Typography variant="h3">{stats.withAudio}</Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.total ? (stats.withAudio / stats.total) * 100 : 0} 
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#8B5CF6', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>الفئات</Typography>
              <Typography variant="h3">{CATEGORIES.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#F59E0B', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>اللغات</Typography>
              <Typography variant="h3">{LANGUAGES.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* تغطية الترجمات */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📊 تغطية الترجمات</Typography>
          <Grid container spacing={1}>
            {LANGUAGES.map(lang => {
              const coverage = stats.translationCoverage[lang.code] || { complete: 0, verified: 0 };
              const percentage = stats.total ? (coverage.complete / stats.total) * 100 : 0;
              return (
                <Grid item xs={6} md={2} key={lang.code}>
                  <Tooltip title={`${coverage.complete} مكتمل، ${coverage.verified} موثق من ${stats.total}`}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {lang.flag} {lang.name}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ height: 8, borderRadius: 4 }}
                        color={percentage === 100 ? 'success' : percentage > 50 ? 'primary' : 'warning'}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {coverage.complete}/{stats.total}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* الفلاتر */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={selectedCategory}
            label="الفئة"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">جميع الفئات ({stats.total})</MenuItem>
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
          placeholder="بحث بالنص أو الرقم..."
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Box>

      {/* الجدول */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredList.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            لا توجد أذكار {selectedCategory !== 'all' ? 'في هذه الفئة' : ''}
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd} sx={{ mt: 2 }}>
            إضافة ذكر جديد
          </Button>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 60 }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 70 }}>حصن</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 120 }}>الفئة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النص العربي</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>الترجمات</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 80 }}>صوت</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedList.map((zikr) => {
                  const transStatus = getTranslationStatus(zikr);
                  const category = CATEGORIES.find(c => c.id === zikr.category);
                  return (
                    <TableRow key={zikr.id} hover>
                      <TableCell>{zikr.numericId}</TableCell>
                      <TableCell>
                        {zikr.hisnNumber > 0 ? (
                          <Chip label={zikr.hisnNumber} size="small" color="primary" variant="outlined" />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={category?.name || zikr.category}
                          size="small"
                          sx={{ bgcolor: category?.color, color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ 
                          fontFamily: '"Amiri", "Traditional Arabic", serif',
                          fontSize: '1rem',
                          direction: 'rtl',
                          maxWidth: 350,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {zikr.arabic}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`${transStatus.complete} مكتمل، ${transStatus.verified} موثق`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(transStatus.complete / transStatus.total) * 100}
                              sx={{ width: 50, height: 6, borderRadius: 3 }}
                              color={transStatus.complete === transStatus.total ? 'success' : 'primary'}
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
                            onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                          >
                            {playingAudio === zikr.audio ? <Stop /> : <PlayArrow />}
                          </IconButton>
                        ) : (
                          <Typography variant="caption" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(zikr)} color="primary">
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(zikr.id!)} color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* الترقيم */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* مصادر الترجمات */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📚 مصادر الترجمات الموثقة</Typography>
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
                variant="outlined"
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Dialog إضافة/تعديل */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !saving && setDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {editingZikr ? `✏️ تعديل الذكر #${editingZikr.numericId}` : '➕ إضافة ذكر جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab label="📝 البيانات الأساسية" />
            <Tab label="🌐 الترجمات الموثقة" />
            <Tab label="🔊 الصوت" />
          </Tabs>

          {/* تاب البيانات الأساسية */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>الفئة *</InputLabel>
                  <Select
                    value={formData.category}
                    label="الفئة *"
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
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="رقم حصن المسلم"
                  type="number"
                  value={formData.hisnNumber || ''}
                  onChange={(e) => setFormData({ ...formData, hisnNumber: parseInt(e.target.value) || 0 })}
                  helperText="للربط مع الصوت (1-267)"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="عدد التكرار"
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="النص العربي *"
                  value={formData.arabic}
                  onChange={(e) => setFormData({ ...formData, arabic: e.target.value })}
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      direction: 'rtl',
                      fontFamily: '"Amiri", "Traditional Arabic", serif',
                      fontSize: '1.3rem',
                      lineHeight: 2
                    }
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="النطق (Transliteration)"
                  value={formData.transliteration}
                  onChange={(e) => setFormData({ ...formData, transliteration: e.target.value })}
                  placeholder="Alhamdu lillahi rabbil 'alamin..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المرجع"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="البخاري 1/152، مسلم 1/288"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الفائدة (اختياري)"
                  value={formData.benefit}
                  onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                  placeholder="من قالها حين يصبح..."
                />
              </Grid>
            </Grid>
          )}

          {/* تاب الترجمات */}
          {activeTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>⚠️ مهم:</strong> يرجى استخدام الترجمات الموثقة فقط من المصادر الإسلامية المعتمدة.
                لا تستخدم الترجمة الآلية للأدعية والأذكار.
              </Alert>

              {LANGUAGES.filter(l => l.code !== 'ar').map((lang) => (
                <Accordion 
                  key={lang.code}
                  expanded={expandedLang === lang.code}
                  onChange={(_, expanded) => setExpandedLang(expanded ? lang.code : false)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography sx={{ fontWeight: 'bold', minWidth: 100 }}>
                        {lang.flag} {lang.name}
                      </Typography>
                      {formData.translations?.[lang.code]?.text ? (
                        <Chip 
                          size="small" 
                          icon={formData.translations[lang.code].verified ? <Verified /> : undefined}
                          label={formData.translations[lang.code].verified ? "موثق" : "غير موثق"}
                          color={formData.translations[lang.code].verified ? "success" : "warning"}
                        />
                      ) : (
                        <Chip size="small" label="فارغ" variant="outlined" color="error" />
                      )}
                      {formData.translations?.[lang.code]?.source && (
                        <Typography variant="caption" color="textSecondary">
                          المصدر: {formData.translations[lang.code].source}
                        </Typography>
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
                          value={formData.translations?.[lang.code]?.text || ''}
                          onChange={(e) => updateTranslation(lang.code, 'text', e.target.value)}
                          sx={{ direction: lang.dir }}
                          placeholder={lang.code === 'en' ? "Enter the authenticated translation..." : ""}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <FormControl fullWidth size="small">
                          <InputLabel>مصدر الترجمة</InputLabel>
                          <Select
                            value={formData.translations?.[lang.code]?.source || ''}
                            label="مصدر الترجمة"
                            onChange={(e) => updateTranslation(lang.code, 'source', e.target.value)}
                          >
                            {TRANSLATION_SOURCES.map(src => (
                              <MenuItem key={src.id} value={src.name}>{src.name}</MenuItem>
                            ))}
                            <MenuItem value="Scholar">عالم/شيخ</MenuItem>
                            <MenuItem value="Book">كتاب مطبوع</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.translations?.[lang.code]?.verified || false}
                              onChange={(e) => updateTranslation(lang.code, 'verified', e.target.checked)}
                              color="success"
                            />
                          }
                          label="ترجمة موثقة ✓"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          startIcon={<LinkIcon />}
                          onClick={() => window.open('https://myislam.org/hisnul-muslim/', '_blank')}
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
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info">
                  🔊 يمكنك استخدام ملفات الصوت الموثقة من حصن المسلم (Archive.org) أو رفع ملف صوتي خاص.
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <AudioFile sx={{ verticalAlign: 'middle', mr: 1 }} />
                      صوت حصن المسلم
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      <TextField
                        label="رقم حصن المسلم"
                        type="number"
                        value={formData.hisnNumber || ''}
                        onChange={(e) => setFormData({ ...formData, hisnNumber: parseInt(e.target.value) || 0 })}
                        size="small"
                        sx={{ width: 150 }}
                        inputProps={{ min: 1, max: 267 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setAudioFromHisn(formData.hisnNumber, 'archive')}
                        disabled={!formData.hisnNumber}
                      >
                        Archive.org
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setAudioFromHisn(formData.hisnNumber, 'salafi')}
                        disabled={!formData.hisnNumber}
                      >
                        SalafiAudio
                      </Button>
                      {formData.hisnNumber > 0 && (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<PlayArrow />}
                          onClick={() => playAudio(AUDIO_SOURCES.archive.getUrl(formData.hisnNumber))}
                        >
                          تجربة
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <CloudUpload sx={{ verticalAlign: 'middle', mr: 1 }} />
                      رفع صوت مخصص
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingAudio ? <CircularProgress size={20} /> : <CloudUpload />}
                      disabled={uploadingAudio}
                      fullWidth
                    >
                      {uploadingAudio ? 'جاري الرفع...' : 'اختر ملف MP3'}
                      <input type="file" accept="audio/mp3,audio/mpeg,audio/wav" hidden onChange={handleAudioUpload} />
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
                      <IconButton 
                        onClick={() => playingAudio === formData.audio ? stopAudio() : playAudio(formData.audio)}
                        color={playingAudio === formData.audio ? 'secondary' : 'primary'}
                      >
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
                  placeholder="Archive.org - HisnulMuslim"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {saving ? 'جاري الحفظ...' : (editingZikr ? 'تحديث' : 'إضافة')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog الاستيراد */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>📥 استيراد أذكار من JSON</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ سيتم إضافة الأذكار المستوردة كسجلات جديدة. تأكد من صحة البيانات قبل الاستيراد.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={15}
            label="JSON Data"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"azkar": [{"arabic": "...", "translations": {...}}]}'
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleImport} disabled={!importJson.trim()}>
            استيراد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AzkarManager;
