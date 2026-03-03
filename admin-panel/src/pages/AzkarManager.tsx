// admin-panel/src/pages/AzkarManager.tsx
// إدارة الأذكار مع الترجمة التلقائية
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Translate as TranslateIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

// ==========================================
// الأنواع
// ==========================================

type Language = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';

type CategoryType = 
  | 'morning'
  | 'evening'
  | 'sleep'
  | 'wakeup'
  | 'after_prayer'
  | 'quran_duas'
  | 'sunnah_duas'
  | 'ruqya';

interface Zikr {
  id?: string;
  numericId: number;
  category: CategoryType;
  arabic: string;
  transliteration: string;
  translation: Record<Language, string>;
  count: number;
  reference: string;
  benefit?: {
    ar?: string;
    en?: string;
    fr?: string;
  };
  audio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Category {
  id: CategoryType;
  name: Record<Language, string>;
  icon: string;
  color: string;
  order: number;
}

// ==========================================
// الثوابت
// ==========================================

const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

const CATEGORIES: Category[] = [
  { id: 'morning', name: { ar: 'أذكار الصباح', en: 'Morning Adhkar' } as any, icon: 'sunny', color: '#F59E0B', order: 1 },
  { id: 'evening', name: { ar: 'أذكار المساء', en: 'Evening Adhkar' } as any, icon: 'moon', color: '#8B5CF6', order: 2 },
  { id: 'sleep', name: { ar: 'أذكار النوم', en: 'Sleep Adhkar' } as any, icon: 'bed', color: '#3B82F6', order: 3 },
  { id: 'wakeup', name: { ar: 'أذكار الاستيقاظ', en: 'Wakeup Adhkar' } as any, icon: 'sun', color: '#10B981', order: 4 },
  { id: 'after_prayer', name: { ar: 'أذكار بعد الصلاة', en: 'After Prayer' } as any, icon: 'hands', color: '#EC4899', order: 5 },
  { id: 'quran_duas', name: { ar: 'أدعية من القرآن', en: 'Quran Duas' } as any, icon: 'book', color: '#14B8A6', order: 6 },
  { id: 'sunnah_duas', name: { ar: 'أدعية من السنة', en: 'Sunnah Duas' } as any, icon: 'star', color: '#F97316', order: 7 },
  { id: 'ruqya', name: { ar: 'الرقية الشرعية', en: 'Ruqyah' } as any, icon: 'shield', color: '#6366F1', order: 8 },
];

const EMPTY_ZIKR: Omit<Zikr, 'id'> = {
  numericId: 0,
  category: 'morning',
  arabic: '',
  transliteration: '',
  translation: {
    ar: '',
    en: '',
    ur: '',
    id: '',
    tr: '',
    fr: '',
    de: '',
    hi: '',
    bn: '',
    ms: '',
    ru: '',
    es: '',
  },
  count: 1,
  reference: '',
  benefit: {
    ar: '',
    en: '',
    fr: '',
  },
  audio: '',
};

// ==========================================
// المكون الرئيسي
// ==========================================

export default function AzkarManager() {
  // الحالة
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [filteredAzkar, setFilteredAzkar] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZikr, setEditingZikr] = useState<Zikr | null>(null);
  const [formData, setFormData] = useState<Omit<Zikr, 'id'>>(EMPTY_ZIKR);
  const [activeTab, setActiveTab] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ==========================================
  // تحميل البيانات
  // ==========================================

  const loadAzkar = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'azkar'));
      const data: Zikr[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Zikr);
      });
      data.sort((a, b) => a.numericId - b.numericId);
      setAzkar(data);
      setFilteredAzkar(data);
    } catch (error) {
      console.error('Error loading azkar:', error);
      showSnackbar('فشل في تحميل الأذكار', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAzkar();
  }, []);

  // ==========================================
  // الفلترة
  // ==========================================

  useEffect(() => {
    let filtered = [...azkar];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic.includes(query) ||
        z.translation.en?.toLowerCase().includes(query) ||
        z.reference.toLowerCase().includes(query)
      );
    }

    setFilteredAzkar(filtered);
  }, [azkar, selectedCategory, searchQuery]);

  // ==========================================
  // الترجمة التلقائية
  // ==========================================

  const translateText = async (text: string, targetLang: Language): Promise<string> => {
    try {
      // استخدام Google Translate API أو أي API ترجمة
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: 'ar',
            target: targetLang === 'ar' ? 'en' : targetLang,
            format: 'text',
          }),
        }
      );

      const data = await response.json();
      return data.data?.translations?.[0]?.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const translateAllLanguages = async () => {
    if (!formData.arabic) {
      showSnackbar('يرجى إدخال النص العربي أولاً', 'error');
      return;
    }

    setTranslating(true);

    try {
      const newTranslations = { ...formData.translation };
      newTranslations.ar = formData.arabic;

      // ترجمة لكل لغة
      for (const lang of LANGUAGES) {
        if (lang.code === 'ar') continue;
        
        const translated = await translateText(formData.arabic, lang.code);
        newTranslations[lang.code] = translated;
        
        // تأخير صغير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setFormData(prev => ({
        ...prev,
        translation: newTranslations,
      }));

      showSnackbar('تمت الترجمة بنجاح لجميع اللغات', 'success');
    } catch (error) {
      console.error('Translation error:', error);
      showSnackbar('فشل في الترجمة', 'error');
    }

    setTranslating(false);
  };

  // ==========================================
  // إضافة/تعديل الذكر
  // ==========================================

  const handleSave = async () => {
    if (!formData.arabic || !formData.reference) {
      showSnackbar('يرجى ملء الحقول المطلوبة', 'error');
      return;
    }

    try {
      if (editingZikr?.id) {
        // تعديل
        await updateDoc(doc(db, 'azkar', editingZikr.id), {
          ...formData,
          updatedAt: new Date(),
        });
        showSnackbar('تم تحديث الذكر بنجاح', 'success');
      } else {
        // إضافة جديد
        const maxId = azkar.reduce((max, z) => Math.max(max, z.numericId), 0);
        await addDoc(collection(db, 'azkar'), {
          ...formData,
          numericId: maxId + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        showSnackbar('تمت إضافة الذكر بنجاح', 'success');
      }

      setDialogOpen(false);
      setEditingZikr(null);
      setFormData(EMPTY_ZIKR);
      loadAzkar();
    } catch (error) {
      console.error('Save error:', error);
      showSnackbar('فشل في الحفظ', 'error');
    }
  };

  // ==========================================
  // حذف الذكر
  // ==========================================

  const handleDelete = async (zikr: Zikr) => {
    if (!zikr.id) return;
    
    if (!window.confirm(`هل أنت متأكد من حذف "${zikr.arabic.substring(0, 50)}..."؟`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'azkar', zikr.id));
      showSnackbar('تم حذف الذكر', 'success');
      loadAzkar();
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('فشل في الحذف', 'error');
    }
  };

  // ==========================================
  // تصدير JSON
  // ==========================================

  const exportJSON = () => {
    const data = {
      azkar: azkar.map(z => ({
        id: z.numericId,
        category: z.category,
        arabic: z.arabic,
        transliteration: z.transliteration,
        translation: z.translation,
        count: z.count,
        reference: z.reference,
        benefit: z.benefit,
        audio: z.audio,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'azkar.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showSnackbar('تم تصدير الملف', 'success');
  };

  // ==========================================
  // Snackbar
  // ==========================================

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // ==========================================
  // فتح Dialog للإضافة/التعديل
  // ==========================================

  const openAddDialog = () => {
    setEditingZikr(null);
    setFormData(EMPTY_ZIKR);
    setActiveTab(0);
    setDialogOpen(true);
  };

  const openEditDialog = (zikr: Zikr) => {
    setEditingZikr(zikr);
    setFormData({
      numericId: zikr.numericId,
      category: zikr.category,
      arabic: zikr.arabic,
      transliteration: zikr.transliteration,
      translation: zikr.translation,
      count: zikr.count,
      reference: zikr.reference,
      benefit: zikr.benefit || { ar: '', en: '', fr: '' },
      audio: zikr.audio || '',
    });
    setActiveTab(0);
    setDialogOpen(true);
  };

  // ==========================================
  // الإحصائيات
  // ==========================================

  const getStats = () => {
    const stats: Record<CategoryType, number> = {} as any;
    CATEGORIES.forEach(cat => {
      stats[cat.id] = azkar.filter(z => z.category === cat.id).length;
    });
    return stats;
  };

  const stats = getStats();

  // ==========================================
  // الرندر
  // ==========================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الأذكار
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportJSON}
          >
            تصدير JSON
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAzkar}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            إضافة ذكر
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {CATEGORIES.map(cat => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={cat.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedCategory === cat.id ? `2px solid ${cat.color}` : 'none',
                '&:hover': { boxShadow: 3 },
              }}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
            >
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h5" sx={{ color: cat.color }}>
                  {stats[cat.id] || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {cat.name.ar}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* البحث والفلترة */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="ابحث في الأذكار..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>التصنيف</InputLabel>
          <Select
            value={selectedCategory}
            label="التصنيف"
            onChange={(e) => setSelectedCategory(e.target.value as any)}
          >
            <MenuItem value="all">جميع التصنيفات</MenuItem>
            {CATEGORIES.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name.ar} ({stats[cat.id] || 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* الجدول */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell width={50}>#</TableCell>
                <TableCell width={120}>التصنيف</TableCell>
                <TableCell>النص العربي</TableCell>
                <TableCell width={100}>التكرار</TableCell>
                <TableCell width={150}>المرجع</TableCell>
                <TableCell width={100}>الترجمات</TableCell>
                <TableCell width={120}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAzkar.map((zikr) => {
                const category = CATEGORIES.find(c => c.id === zikr.category);
                const translationCount = Object.values(zikr.translation || {}).filter(t => t).length;
                
                return (
                  <TableRow key={zikr.id} hover>
                    <TableCell>{zikr.numericId}</TableCell>
                    <TableCell>
                      <Chip
                        label={category?.name.ar}
                        size="small"
                        sx={{ backgroundColor: category?.color + '20', color: category?.color }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          maxWidth: 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          direction: 'rtl',
                        }}
                      >
                        {zikr.arabic}
                      </Typography>
                    </TableCell>
                    <TableCell>{zikr.count}×</TableCell>
                    <TableCell>
                      <Typography variant="caption">{zikr.reference}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${translationCount}/12`}
                        size="small"
                        color={translationCount === 12 ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEditDialog(zikr)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(zikr)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog إضافة/تعديل */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingZikr ? 'تعديل الذكر' : 'إضافة ذكر جديد'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="البيانات الأساسية" />
            <Tab label="الترجمات (12 لغة)" />
            <Tab label="الفضل والمرجع" />
          </Tabs>

          {/* التاب الأول: البيانات الأساسية */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>التصنيف</InputLabel>
                  <Select
                    value={formData.category}
                    label="التصنيف"
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name.ar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="عدد التكرار"
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="النص العربي *"
                  multiline
                  rows={4}
                  value={formData.arabic}
                  onChange={(e) => setFormData(prev => ({ ...prev, arabic: e.target.value }))}
                  sx={{ direction: 'rtl' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="النطق (Transliteration)"
                  multiline
                  rows={2}
                  value={formData.transliteration}
                  onChange={(e) => setFormData(prev => ({ ...prev, transliteration: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="رابط الصوت (اختياري)"
                  value={formData.audio}
                  onChange={(e) => setFormData(prev => ({ ...prev, audio: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}

          {/* التاب الثاني: الترجمات */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={translating ? <CircularProgress size={20} /> : <TranslateIcon />}
                  onClick={translateAllLanguages}
                  disabled={translating || !formData.arabic}
                >
                  {translating ? 'جاري الترجمة...' : 'ترجمة تلقائية لجميع اللغات'}
                </Button>
              </Box>
              <Grid container spacing={2}>
                {LANGUAGES.map(lang => (
                  <Grid item xs={12} md={6} key={lang.code}>
                    <TextField
                      fullWidth
                      label={`${lang.nativeName} (${lang.name})`}
                      multiline
                      rows={2}
                      value={formData.translation[lang.code] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        translation: { ...prev.translation, [lang.code]: e.target.value },
                      }))}
                      sx={{ direction: lang.code === 'ar' || lang.code === 'ur' ? 'rtl' : 'ltr' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* التاب الثالث: الفضل والمرجع */}
          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="المرجع *"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="مثال: صحيح البخاري، سورة البقرة: 255"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الفضل (بالعربي)"
                  multiline
                  rows={2}
                  value={formData.benefit?.ar || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefit: { ...prev.benefit, ar: e.target.value },
                  }))}
                  sx={{ direction: 'rtl' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الفضل (بالإنجليزي)"
                  multiline
                  rows={2}
                  value={formData.benefit?.en || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefit: { ...prev.benefit, en: e.target.value },
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الفضل (بالفرنسي)"
                  multiline
                  rows={2}
                  value={formData.benefit?.fr || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    benefit: { ...prev.benefit, fr: e.target.value },
                  }))}
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
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
