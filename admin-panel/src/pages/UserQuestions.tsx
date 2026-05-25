import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { sendQuestionAnsweredNotification } from '../services/pushNotifications';

interface UserQuestion {
  id: string;
  userName?: string;
  userEmail?: string;
  userId?: string | null;
  fcmToken?: string | null;
  registeredName?: string;
  question: string;
  language: string;
  status: 'pending' | 'reviewed' | 'answered';
  createdAt: string;
  notes?: string;
  requestMode?: 'assistant' | 'manual';
  autoAnswerStatus?: 'searching' | 'answered' | 'no_results' | 'failed' | 'unconfigured' | 'disabled' | 'daily_limit';
  autoAnswer?: string;
  autoAnswerDisclaimer?: string;
  autoAnswerSources?: Array<{ title: string; url: string; snippet?: string }>;
  adminCorrection?: boolean;
  adminCorrectedAt?: string;
  adminAnsweredAt?: string;
  adminNotes?: string;
  notifiedAt?: string;
  /** Server-detected response language (set by answerUserQuestionAutomatically) */
  autoAnswerLanguage?: string;
}

// Notification copy that will be shown to the user — must stay in sync with
// `QUESTION_ANSWERED_NOTIFICATION_TRANSLATIONS` in services/pushNotifications.ts
const NOTIFICATION_PREVIEW: Record<string, { title: string; body: string; flag: string; name: string }> = {
  ar: { title: 'تم الرد على سؤالك ✅', body: 'اضغط لقراءة الإجابة من فريق روح المسلم.', flag: '🇸🇦', name: 'العربية' },
  en: { title: 'Your question has been answered ✅', body: 'Tap to read the reply from the Rooh Al-Muslim team.', flag: '🇺🇸', name: 'English' },
  fr: { title: 'Réponse à votre question ✅', body: "Appuyez pour lire la réponse de l'équipe Rooh Al-Muslim.", flag: '🇫🇷', name: 'Français' },
  de: { title: 'Antwort auf deine Frage ✅', body: 'Tippe, um die Antwort des Ruh-Al-Muslim-Teams zu lesen.', flag: '🇩🇪', name: 'Deutsch' },
  es: { title: 'Respuesta a tu pregunta ✅', body: 'Toca para leer la respuesta del equipo de Rooh Al-Muslim.', flag: '🇪🇸', name: 'Español' },
  tr: { title: 'Sorunuza cevap geldi ✅', body: 'Rooh Al-Muslim ekibinin cevabını okumak için dokunun.', flag: '🇹🇷', name: 'Türkçe' },
  ur: { title: 'آپ کے سوال کا جواب آ گیا ✅', body: 'روح المسلم ٹیم کی طرف سے جواب پڑھنے کے لیے دبائیں۔', flag: '🇵🇰', name: 'اردو' },
  id: { title: 'Pertanyaan Anda dijawab ✅', body: 'Ketuk untuk membaca jawaban dari tim Rooh Al-Muslim.', flag: '🇮🇩', name: 'Indonesia' },
  ms: { title: 'Soalan anda telah dijawab ✅', body: 'Ketik untuk membaca jawapan daripada pasukan Rooh Al-Muslim.', flag: '🇲🇾', name: 'Melayu' },
  hi: { title: 'आपके सवाल का जवाब आ गया ✅', body: 'रूह अल-मुस्लिम टीम का जवाब पढ़ने के लिए टैप करें।', flag: '🇮🇳', name: 'हिन्दी' },
  bn: { title: 'আপনার প্রশ্নের উত্তর এসেছে ✅', body: 'রুহ আল-মুসলিম দলের উত্তর পড়তে ট্যাপ করুন।', flag: '🇧🇩', name: 'বাংলা' },
  ru: { title: 'Ответ на ваш вопрос ✅', body: 'Нажмите, чтобы прочитать ответ команды Rooh Al-Muslim.', flag: '🇷🇺', name: 'Русский' },
};

// Resolve which language the notification will actually be sent in.
// Priority: server-detected response language → submitted UI language → ar.
function resolveNotificationLanguage(q: { autoAnswerLanguage?: string; language?: string }): string {
  const candidate = (q.autoAnswerLanguage || q.language || 'ar').toLowerCase();
  return NOTIFICATION_PREVIEW[candidate] ? candidate : 'ar';
}

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'answered';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'جديد', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  reviewed: { label: 'تمت المراجعة', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  answered: { label: 'تم الرد', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

// Localized email greeting + subject by user language.
const EMAIL_TEMPLATES: Record<string, { subject: string; greeting: (name: string) => string; intro: string }> = {
  ar: {
    subject: 'رد على سؤالك في تطبيق روح المسلم',
    greeting: (name) => `السلام عليكم${name ? ' ' + name : ''}،`,
    intro: 'بخصوص سؤالك:',
  },
  en: {
    subject: 'Reply to your question on Rooh Al-Muslim',
    greeting: (name) => `Hello${name ? ', ' + name : ''},`,
    intro: 'Regarding your question:',
  },
  fr: {
    subject: 'Réponse à votre question sur Rooh Al-Muslim',
    greeting: (name) => `Bonjour${name ? ' ' + name : ''},`,
    intro: 'Concernant votre question :',
  },
  de: {
    subject: 'Antwort auf deine Frage in Rooh Al-Muslim',
    greeting: (name) => `Hallo${name ? ' ' + name : ''},`,
    intro: 'Bezüglich deiner Frage:',
  },
  es: {
    subject: 'Respuesta a tu pregunta en Rooh Al-Muslim',
    greeting: (name) => `Hola${name ? ', ' + name : ''},`,
    intro: 'Respecto a tu pregunta:',
  },
  tr: {
    subject: 'Rooh Al-Muslim uygulamasındaki sorunuza yanıt',
    greeting: (name) => `Merhaba${name ? ' ' + name : ''},`,
    intro: 'Sorunuzla ilgili:',
  },
  ur: {
    subject: 'روح المسلم ایپ میں آپ کے سوال کا جواب',
    greeting: (name) => `السلام علیکم${name ? ' ' + name : ''}،`,
    intro: 'آپ کے سوال کے بارے میں:',
  },
  id: {
    subject: 'Jawaban atas pertanyaan Anda di Rooh Al-Muslim',
    greeting: (name) => `Halo${name ? ', ' + name : ''},`,
    intro: 'Mengenai pertanyaan Anda:',
  },
  ms: {
    subject: 'Jawapan kepada soalan anda di Rooh Al-Muslim',
    greeting: (name) => `Hai${name ? ', ' + name : ''},`,
    intro: 'Mengenai soalan anda:',
  },
  hi: {
    subject: 'रूह अल-मुस्लिम पर आपके सवाल का जवाब',
    greeting: (name) => `नमस्ते${name ? ', ' + name : ''},`,
    intro: 'आपके सवाल के बारे में:',
  },
  bn: {
    subject: 'রুহ আল-মুসলিম অ্যাপে আপনার প্রশ্নের উত্তর',
    greeting: (name) => `হ্যালো${name ? ', ' + name : ''},`,
    intro: 'আপনার প্রশ্ন সম্পর্কে:',
  },
  ru: {
    subject: 'Ответ на ваш вопрос в Rooh Al-Muslim',
    greeting: (name) => `Здравствуйте${name ? ', ' + name : ''},`,
    intro: 'По поводу вашего вопроса:',
  },
};

function buildReplyEmail(q: { language?: string; userName?: string; registeredName?: string; question: string }): {
  subject: string;
  body: string;
} {
  const lang = (q.language || 'ar').toLowerCase();
  const template = EMAIL_TEMPLATES[lang] || EMAIL_TEMPLATES.en;
  const name = (q.userName || q.registeredName || '').trim();
  return {
    subject: template.subject,
    body: `${template.greeting(name)}\n\n${template.intro}\n"${q.question}"\n\n`,
  };
}

export default function UserQuestions() {
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<UserQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [disclaimerDraft, setDisclaimerDraft] = useState('');
  const [sourcesDraft, setSourcesDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'userQuestions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: UserQuestion[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as UserQuestion[];
      setQuestions(items);
      setLoading(false);
    }, (err) => {
      console.error('Error loading user questions:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const updateStatus = useCallback(async (id: string, status: UserQuestion['status']) => {
    try {
      await updateDoc(doc(db, 'userQuestions', id), {
        status,
        reviewedAt: new Date().toISOString(),
      });
      showToast('تم تحديث الحالة ✅');
    } catch (e) {
      console.error('Error updating status:', e);
      showToast('خطأ في التحديث ❌');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      await deleteDoc(doc(db, 'userQuestions', id));
      showToast('تم الحذف ✅');
    } catch (e) {
      console.error('Error deleting:', e);
      showToast('خطأ في الحذف ❌');
    }
  }, []);

  const handleDeletePending = useCallback(async () => {
    const pendingQuestions = questions.filter(q => q.status === 'pending');
    if (pendingQuestions.length === 0) {
      showToast('لا توجد أسئلة جديدة للحذف');
      return;
    }
    if (!confirm(`حذف ${pendingQuestions.length} سؤال جديد؟`)) return;
    try {
      await Promise.all(pendingQuestions.map(q => deleteDoc(doc(db, 'userQuestions', q.id))));
      showToast('تم حذف الأسئلة الجديدة ✅');
    } catch (e) {
      console.error('Error deleting pending:', e);
      showToast('خطأ في حذف الأسئلة الجديدة ❌');
    }
  }, [questions]);

  const handleDeleteAll = useCallback(async () => {
    if (questions.length === 0) {
      showToast('لا توجد أسئلة للحذف');
      return;
    }
    if (!confirm(`حذف كل الأسئلة (${questions.length})؟`)) return;
    try {
      await Promise.all(questions.map(q => deleteDoc(doc(db, 'userQuestions', q.id))));
      showToast('تم حذف كل الأسئلة ✅');
    } catch (e) {
      console.error('Error deleting all:', e);
      showToast('خطأ في حذف الكل ❌');
    }
  }, [questions]);

  const handleReply = useCallback((q: UserQuestion) => {
    if (!q.userEmail) {
      showToast('لا يوجد بريد إلكتروني للمستخدم');
      return;
    }
    const { subject, body } = buildReplyEmail(q);
    window.open(`mailto:${q.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    updateStatus(q.id, 'answered');
  }, [updateStatus]);

  const openAnswerEditor = useCallback((q: UserQuestion) => {
    setEditingQuestion(q);
    setAnswerDraft(q.autoAnswer || '');
    setDisclaimerDraft(q.autoAnswerDisclaimer || 'هذا الرد للمساعدة العامة ولا يغني عن سؤال أهل العلم في النوازل والمسائل الخاصة.');
    setSourcesDraft((q.autoAnswerSources || []).map((source) => `${source.title} | ${source.url}${source.snippet ? ` | ${source.snippet}` : ''}`).join('\n'));
    setNotesDraft(q.adminNotes || '');
  }, []);

  const parseSources = (raw: string) => raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      if (parts.length === 1) {
        return { title: `مصدر ${index + 1}`, url: parts[0] };
      }
      return { title: parts[0] || `مصدر ${index + 1}`, url: parts[1] || '', snippet: parts[2] || '' };
    })
    .filter((source) => source.url);

  const saveInAppAnswer = useCallback(async () => {
    if (!editingQuestion) return;
    const answer = answerDraft.trim();
    if (!answer) {
      showToast('اكتب الرد أو التصحيح أولا');
      return;
    }

    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'userQuestions', editingQuestion.id), {
        status: 'answered',
        autoAnswerStatus: 'answered',
        autoAnswer: answer,
        autoAnswerDisclaimer: disclaimerDraft.trim(),
        autoAnswerSources: parseSources(sourcesDraft),
        adminCorrection: true,
        adminCorrectedAt: now,
        adminAnsweredAt: editingQuestion.adminAnsweredAt || now,
        adminNotes: notesDraft.trim(),
        answerSource: 'admin',
      });

      const editedId = editingQuestion.id;
      const notificationLanguage = resolveNotificationLanguage(editingQuestion);
      const pushResult = await sendQuestionAnsweredNotification({
        questionId: editedId,
        userId: editingQuestion.userId || null,
        fcmToken: editingQuestion.fcmToken || null,
        language: notificationLanguage,
        questionPreview: editingQuestion.question,
      });

      if (pushResult.success) {
        await updateDoc(doc(db, 'userQuestions', editedId), { notifiedAt: now });
        showToast('تم نشر الرد وإرسال إشعار للمستخدم ✅');
      } else {
        const reason = pushResult.errors[0] || 'لا يوجد توكن';
        showToast(`تم نشر الرد، لم يُرسل الإشعار: ${reason}`);
      }

      setEditingQuestion(null);
    } catch (e) {
      console.error('Error saving in-app answer:', e);
      showToast('خطأ في حفظ الرد داخل التطبيق');
    }
  }, [answerDraft, disclaimerDraft, editingQuestion, notesDraft, sourcesDraft]);

  const handleResendNotification = useCallback(async (q: UserQuestion) => {
    if (!q.autoAnswer) {
      showToast('لا يوجد رد منشور لهذا السؤال بعد');
      return;
    }
    showToast('جاري إرسال الإشعار...');
    const result = await sendQuestionAnsweredNotification({
      questionId: q.id,
      userId: q.userId || null,
      fcmToken: q.fcmToken || null,
      language: resolveNotificationLanguage(q),
      questionPreview: q.question,
    });
    if (result.success) {
      await updateDoc(doc(db, 'userQuestions', q.id), { notifiedAt: new Date().toISOString() }).catch(() => {});
      showToast('تم إرسال الإشعار ✅');
    } else {
      showToast(`تعذر الإرسال: ${result.errors[0] || 'لا يوجد توكن'}`);
    }
  }, []);

  const filtered = questions.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
	        q.question.toLowerCase().includes(s) ||
	        (q.userName || '').toLowerCase().includes(s) ||
	        (q.userEmail || '').toLowerCase().includes(s) ||
	        (q.autoAnswer || '').toLowerCase().includes(s)
	      );
    }
    return true;
  });

  const counts = {
    all: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    reviewed: questions.filter(q => q.status === 'reviewed').length,
    answered: questions.filter(q => q.status === 'answered').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📩 أسئلة المستخدمين</h1>
        <p className="text-sm text-admin-muted mt-1">
          {questions.length} سؤال • {counts.pending} جديد
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'pending', 'reviewed', 'answered'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-admin-surface text-admin-muted hover:text-white'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_MAP[s].label} ({counts[s]})
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDeletePending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            disabled={counts.pending === 0}
          >
            حذف الجديد ({counts.pending})
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-700 text-white hover:bg-red-800 transition-colors"
            disabled={counts.all === 0}
          >
            حذف الكل ({counts.all})
          </button>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث..."
          className="flex-1 min-w-[200px] bg-admin-surface rounded-lg px-4 py-2 text-white text-sm border border-admin-border/50 focus:border-emerald-500/50 outline-none"
          dir="rtl"
        />
      </div>

      {/* Questions Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-admin-muted">
          <p className="text-4xl mb-4">📭</p>
	          <p>{search ? 'لا توجد نتائج للبحث' : 'لا توجد أسئلة بعد'}</p>
	        </div>
	      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <div key={q.id} className="bg-admin-surface rounded-xl p-4 border border-admin-border/50">
              <div className="flex items-start gap-4">
                {/* Content */}
                <div className="flex-1 min-w-0">
	                  <div className="flex flex-wrap items-center gap-2 mb-2">
	                    <span className={`px-2 py-0.5 rounded-full text-[11px] border ${
	                      q.requestMode === 'assistant'
	                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
	                        : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
	                    }`}>
	                      {q.requestMode === 'assistant' ? 'مساعد داخل التطبيق' : 'سؤال يدوي'}
	                    </span>
	                    {q.autoAnswerStatus && (
	                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-admin-bg text-admin-muted border border-admin-border/50">
	                        حالة الرد الفوري: {q.autoAnswerStatus}
	                      </span>
	                    )}
	                    {q.adminCorrection && (
	                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
	                        منشور من الإدارة
	                      </span>
	                    )}
	                  </div>
	                  <p className="text-white text-sm leading-relaxed mb-2">{q.question}</p>
	                  {q.autoAnswer && (
	                    <div className="mt-3 rounded-lg bg-admin-bg/80 border border-admin-border/40 p-3">
	                      <p className="text-[11px] text-admin-muted mb-1">الرد الظاهر في التطبيق حاليا</p>
	                      <p className="text-sm text-white leading-relaxed line-clamp-3">{q.autoAnswer}</p>
	                    </div>
	                  )}
	                  <div className="flex flex-wrap gap-3 text-xs text-admin-muted">
                    {q.userName && <span>👤 {q.userName}</span>}
                    {q.registeredName && q.registeredName !== q.userName && (
                      <span className="text-xs text-blue-400">🪪 مسجّل: {q.registeredName}</span>
                    )}
                    {q.userEmail && <span>📧 {q.userEmail}</span>}
                    <span>🌐 {q.language}</span>
                    <span>📅 {new Date(q.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[q.status]?.bg} ${STATUS_MAP[q.status]?.color}`}>
                    {STATUS_MAP[q.status]?.label}
                  </span>

                  <select
                    value={q.status}
                    onChange={e => updateStatus(q.id, e.target.value as UserQuestion['status'])}
                    className="bg-admin-bg text-white text-xs rounded-lg px-2 py-1.5 border border-admin-border/50 outline-none cursor-pointer"
                    aria-label="حالة السؤال"
                  >
                    <option value="pending">جديد</option>
                    <option value="reviewed">تمت المراجعة</option>
                    <option value="answered">تم الرد</option>
                  </select>

	                  {q.userEmail && (
                    <button
                      onClick={() => handleReply(q)}
                      className="p-1.5 text-admin-muted hover:text-emerald-400 transition-colors"
                      title="رد بالبريد"
                    >📧</button>
	                  )}

	                  <button
	                    onClick={() => openAnswerEditor(q)}
	                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
	                    title="رد أو تصحيح داخل التطبيق"
	                  >
	                    {q.autoAnswer ? 'تعديل الرد' : 'رد داخل التطبيق'}
	                  </button>

	                  {q.autoAnswer && (
	                    <button
	                      onClick={() => handleResendNotification(q)}
	                      className="p-1.5 text-admin-muted hover:text-amber-400 transition-colors"
	                      title={q.notifiedAt ? `أُرسل بتاريخ ${new Date(q.notifiedAt).toLocaleString('ar-EG')} — إعادة إرسال` : 'إرسال إشعار للمستخدم'}
	                    >🔔</button>
	                  )}

	                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-admin-muted hover:text-red-400 transition-colors"
                    title="حذف"
                  >🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
	      {toast && (
	        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-admin-surface text-white px-6 py-3 rounded-xl shadow-2xl border border-admin-border/50 text-sm z-50">
	          {toast}
	        </div>
	      )}

	      {editingQuestion && (
	        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
	          <div className="w-full max-w-3xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
	            <div className="p-5 border-b border-admin-border/50">
	              <div className="flex items-start justify-between gap-4">
	                <div>
	                  <h2 className="text-xl font-bold text-white">رد أو تصحيح داخل التطبيق</h2>
	                  <p className="text-sm text-admin-muted mt-1">
	                    الحفظ هنا يكتب في نفس مستند السؤال الذي يقرأه التطبيق، وأي محادثة مفتوحة أو محفوظة مرتبطة بهذا السؤال ستلتقط الرد عند فتح صفحة سؤال وجواب.
	                  </p>
	                </div>
	                <button
	                  onClick={() => setEditingQuestion(null)}
	                  className="px-3 py-1.5 rounded-lg bg-admin-bg text-admin-muted hover:text-white"
	                >
	                  إغلاق
	                </button>
	              </div>
	            </div>

	            <div className="p-5 space-y-4">
	              <div className="rounded-xl bg-admin-bg border border-admin-border/50 p-4">
	                <p className="text-xs text-admin-muted mb-2">السؤال</p>
	                <p className="text-white leading-relaxed">{editingQuestion.question}</p>
	              </div>

	              <label className="block">
	                <span className="block text-sm text-admin-muted mb-2">الرد أو التصحيح الذي سيظهر للمستخدم</span>
	                <textarea
	                  value={answerDraft}
	                  onChange={e => setAnswerDraft(e.target.value)}
	                  className="w-full min-h-[180px] bg-admin-bg text-white rounded-xl border border-admin-border px-4 py-3 outline-none focus:border-emerald-500"
	                  placeholder="اكتب الرد الصحيح هنا..."
	                />
	              </label>

	              <label className="block">
	                <span className="block text-sm text-admin-muted mb-2">تنبيه يظهر مع الرد</span>
	                <input
	                  value={disclaimerDraft}
	                  onChange={e => setDisclaimerDraft(e.target.value)}
	                  className="w-full bg-admin-bg text-white rounded-xl border border-admin-border px-4 py-3 outline-none focus:border-emerald-500"
	                  placeholder="مثال: هذا الرد للمساعدة العامة..."
	                />
	              </label>

	              <label className="block">
	                <span className="block text-sm text-admin-muted mb-2">المصادر، كل مصدر في سطر: العنوان | الرابط | مقتطف اختياري</span>
	                <textarea
	                  value={sourcesDraft}
	                  onChange={e => setSourcesDraft(e.target.value)}
	                  className="w-full min-h-[110px] bg-admin-bg text-white rounded-xl border border-admin-border px-4 py-3 outline-none focus:border-emerald-500 ltr:text-left"
	                  dir="rtl"
	                  placeholder="موقع الإسلام سؤال وجواب | https://example.com/article | مقتطف قصير"
	                />
	              </label>

	              <label className="block">
	                <span className="block text-sm text-admin-muted mb-2">ملاحظات داخلية لا تظهر للمستخدم</span>
	                <input
	                  value={notesDraft}
	                  onChange={e => setNotesDraft(e.target.value)}
	                  className="w-full bg-admin-bg text-white rounded-xl border border-admin-border px-4 py-3 outline-none focus:border-emerald-500"
	                  placeholder="سبب التصحيح أو اسم المراجع..."
	                />
	              </label>

	              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-100 leading-relaxed">
	                لو المستخدم كان فاتح شاشة سؤال وجواب فالرد يتحدث مباشرة. لو كان قافل التطبيق، الرد محفوظ في Firestore وسيظهر عندما يفتح نفس المحادثة أو صفحة السؤال والجواب لاحقا.
	              </div>

	              {/* Notification preview — shows exactly what the user will receive */}
	              {(() => {
	                const lang = resolveNotificationLanguage(editingQuestion);
	                const tpl = NOTIFICATION_PREVIEW[lang];
	                const isRTL = lang === 'ar' || lang === 'ur';
	                const detected = editingQuestion.autoAnswerLanguage;
	                const submitted = editingQuestion.language;
	                return (
	                  <div className="rounded-xl bg-admin-bg border border-amber-500/40 p-4 space-y-3">
	                    <div className="flex items-center justify-between gap-3 flex-wrap">
	                      <div className="flex items-center gap-2">
	                        <span className="text-2xl">🔔</span>
	                        <div>
	                          <p className="text-sm font-semibold text-white">معاينة الإشعار الذي سيُرسل للمستخدم</p>
	                          <p className="text-[11px] text-admin-muted mt-0.5">
	                            بنفس لغة سؤال المستخدم. لو غلط، السبب إن لغة الرد المكتشفة مختلفة.
	                          </p>
	                        </div>
	                      </div>
	                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
	                        {tpl.flag} {tpl.name}
	                      </span>
	                    </div>

	                    {/* iOS-style notification mockup */}
	                    <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 p-3.5 shadow-xl">
	                      <div className="flex items-start gap-2.5">
	                        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-base shrink-0">
	                          🕌
	                        </div>
	                        <div className="flex-1 min-w-0" dir={isRTL ? 'rtl' : 'ltr'}>
	                          <div className="flex items-baseline justify-between gap-2">
	                            <p className="text-[13px] font-semibold text-white truncate">{tpl.title}</p>
	                            <span className="text-[10px] text-white/50 shrink-0">now</span>
	                          </div>
	                          <p className="text-[12px] text-white/90 leading-snug mt-0.5">{tpl.body}</p>
	                        </div>
	                      </div>
	                    </div>

	                    <div className="text-[11px] text-admin-muted space-y-0.5">
	                      <p>🌐 لغة الواجهة عند الإرسال: <span className="text-white">{submitted || '—'}</span></p>
	                      {detected && detected !== submitted && (
	                        <p>🧠 لغة الرد المكتشفة (من نص السؤال): <span className="text-white">{detected}</span></p>
	                      )}
	                      <p>🔗 عند الضغط: <span className="text-white">/qa-thread/{editingQuestion.id}</span></p>
	                      {!editingQuestion.fcmToken && !editingQuestion.userId && (
	                        <p className="text-red-300 mt-1">⚠️ مفيش token للمستخدم — الإشعار مش هيتبعت.</p>
	                      )}
	                    </div>
	                  </div>
	                );
	              })()}

	              <div className="flex justify-end gap-3">
	                <button
	                  onClick={() => setEditingQuestion(null)}
	                  className="px-4 py-2 rounded-lg bg-admin-bg text-admin-muted hover:text-white"
	                >
	                  إلغاء
	                </button>
	                <button
	                  onClick={saveInAppAnswer}
	                  className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
	                >
	                  نشر داخل التطبيق
	                </button>
	              </div>
	            </div>
	          </div>
	        </div>
	      )}
	    </div>
	  );
	}
