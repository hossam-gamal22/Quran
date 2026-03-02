// إضافات على ملف Seasonal.tsx
// ================================

// 1. إضافة خيارات التوقيت في الأنواع
type TimezoneOption = 'user_local' | 'makkah' | 'utc' | 'custom';

interface TimeSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: TimezoneOption;
  customTimezone?: string;
  // إضافة دعم أوقات الصلاة
  relativeTo?: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'none';
  offsetMinutes?: number; // قبل أو بعد وقت الصلاة
}

// 2. الثوابت الجديدة
const TIMEZONE_OPTIONS: { value: TimezoneOption; label: string }[] = [
  { value: 'user_local', label: 'توقيت المستخدم المحلي' },
  { value: 'makkah', label: 'توقيت مكة المكرمة' },
  { value: 'utc', label: 'التوقيت العالمي UTC' },
  { value: 'custom', label: 'توقيت مخصص' },
];

const PRAYER_TIMES: { value: string; label: string }[] = [
  { value: 'none', label: 'بدون ربط بوقت صلاة' },
  { value: 'fajr', label: 'الفجر' },
  { value: 'sunrise', label: 'الشروق' },
  { value: 'dhuhr', label: 'الظهر' },
  { value: 'asr', label: 'العصر' },
  { value: 'maghrib', label: 'المغرب (الإفطار)' },
  { value: 'isha', label: 'العشاء' },
];

// 3. مكون معاينة الجهاز المحسّن
const DevicePreview: React.FC<{
  content: SeasonalContent;
  deviceType: 'iphone' | 'android';
  colorScheme: 'light' | 'dark';
  language: 'ar' | 'en';
}> = ({ content, deviceType, colorScheme, language }) => {
  const isRTL = language === 'ar';
  const title = language === 'ar' ? content.titleAr : content.titleEn;
  const text = language === 'ar' ? content.contentAr : content.contentEn;
  const buttonText = language === 'ar' 
    ? content.actionButton?.textAr 
    : content.actionButton?.textEn;

  return (
    <div className="flex flex-col items-center">
      {/* إطار الجهاز */}
      <div 
        className={`relative ${
          deviceType === 'iphone' 
            ? 'w-[280px] h-[580px] rounded-[45px]' 
            : 'w-[270px] h-[560px] rounded-[25px]'
        } bg-black p-2 shadow-2xl`}
      >
        {/* الشاشة */}
        <div 
          className={`w-full h-full overflow-hidden ${
            deviceType === 'iphone' ? 'rounded-[38px]' : 'rounded-[20px]'
          }`}
          style={{ 
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5' 
          }}
        >
          {/* Notch للآيفون */}
          {deviceType === 'iphone' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-full z-10" />
          )}
          
          {/* Status Bar */}
          <div 
            className={`flex items-center justify-between px-6 pt-3 pb-2 ${
              colorScheme === 'dark' ? 'text-white' : 'text-black'
            }`}
          >
            <span className="text-xs font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-current rounded-sm">
                <div className="w-3/4 h-full bg-current rounded-sm" />
              </div>
            </div>
          </div>

          {/* محتوى Splash Screen */}
          <div 
            className="flex-1 flex flex-col items-center justify-center p-6 mx-2 mt-2 rounded-2xl"
            style={{
              backgroundColor: content.backgroundColor,
              backgroundImage: content.backgroundImage 
                ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${content.backgroundImage})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '420px'
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* الأيقونة */}
            <div 
              className="text-6xl mb-4 animate-bounce"
              style={{ animationDuration: '2s' }}
            >
              {content.icon}
            </div>
            
            {/* العنوان */}
            <h2 
              className="text-2xl font-bold text-center mb-3"
              style={{ color: content.textColor }}
            >
              {title || 'العنوان'}
            </h2>
            
            {/* المحتوى */}
            <p 
              className="text-center text-sm leading-relaxed mb-6 px-2"
              style={{ color: content.textColor, opacity: 0.9 }}
            >
              {text || 'نص المحتوى يظهر هنا...'}
            </p>
            
            {/* زر الإجراء */}
            {buttonText && (
              <button
                className="px-8 py-3 rounded-xl font-bold text-sm shadow-lg"
                style={{ 
                  backgroundColor: content.accentColor,
                  color: content.backgroundColor
                }}
              >
                {buttonText}
              </button>
            )}
            
            {/* زر الإغلاق */}
            <button
              className="absolute top-20 left-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: content.textColor
              }}
            >
              ✕
            </button>
          </div>

          {/* Home Indicator للآيفون */}
          {deviceType === 'iphone' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full" />
          )}
        </div>
      </div>

      {/* معلومات الجهاز */}
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-gray-700">
          {deviceType === 'iphone' ? 'iPhone 14 Pro' : 'Samsung Galaxy S23'}
        </p>
        <p className="text-xs text-gray-500">
          {colorScheme === 'dark' ? 'الوضع الداكن' : 'الوضع الفاتح'} • {language === 'ar' ? 'عربي' : 'English'}
        </p>
      </div>
    </div>
  );
};

// 4. مكون نافذة المعاينة الكاملة
const FullPreviewModal: React.FC<{
  content: SeasonalContent;
  onClose: () => void;
}> = ({ content, onClose }) => {
  const [deviceType, setDeviceType] = useState<'iphone' | 'android'>('iphone');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [showNotification, setShowNotification] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        {/* الرأس */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">معاينة المحتوى</h2>
            <p className="text-sm text-gray-500">شاهد كيف سيظهر المحتوى للمستخدمين</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أدوات التحكم */}
        <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-gray-50">
          {/* نوع الجهاز */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">الجهاز:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setDeviceType('iphone')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  deviceType === 'iphone' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                 iPhone
              </button>
              <button
                onClick={() => setDeviceType('android')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  deviceType === 'android' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                🤖 Android
              </button>
            </div>
          </div>

          {/* الوضع */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">الوضع:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setColorScheme('light')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  colorScheme === 'light' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                ☀️ فاتح
              </button>
              <button
                onClick={() => setColorScheme('dark')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  colorScheme === 'dark' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                🌙 داكن
              </button>
            </div>
          </div>

          {/* اللغة */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">اللغة:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setLanguage('ar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  language === 'ar' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                عربي
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  language === 'en' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* عرض كإشعار */}
          <button
            onClick={() => setShowNotification(!showNotification)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showNotification 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            معاينة كإشعار
          </button>
        </div>

        {/* منطقة المعاينة */}
        <div className="p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-[500px] flex items-center justify-center gap-8 overflow-auto">
          {/* معاينة Splash Screen */}
          <DevicePreview
            content={content}
            deviceType={deviceType}
            colorScheme={colorScheme}
            language={language}
          />

          {/* معاينة الإشعار */}
          {showNotification && (
            <div className="flex flex-col items-center">
              <div 
                className={`w-[320px] p-4 rounded-2xl shadow-lg ${
                  colorScheme === 'dark' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white text-gray-800'
                }`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: content.backgroundColor }}
                  >
                    {content.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">روح المسلم</span>
                      <span className="text-xs opacity-50">الآن</span>
                    </div>
                    <p className="font-medium text-sm mt-1">
                      {language === 'ar' ? content.titleAr : content.titleEn}
                    </p>
                    <p className="text-xs opacity-70 mt-1 line-clamp-2">
                      {language === 'ar' ? content.contentAr : content.contentEn}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600">شكل الإشعار على الهاتف</p>
            </div>
          )}
        </div>

        {/* معلومات إضافية */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">الموسم</p>
              <p className="font-medium">
                {SEASON_TYPES.find(s => s.value === content.seasonType)?.labelAr}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">نوع المحتوى</p>
              <p className="font-medium">
                {CONTENT_TYPES.find(c => c.value === content.contentType)?.labelAr}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">الفترة</p>
              <p className="font-medium">
                {content.startDate} - {content.endDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">وقت العرض</p>
              <p className="font-medium">
                {content.showTime?.enabled 
                  ? `${content.showTime.startHour}:00 - ${content.showTime.endHour}:00`
                  : 'طوال اليوم'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. تحديث قسم الجدولة في المودال الرئيسي
// استبدال محتوى {modalTab === 'schedule'} بالتالي:

{modalTab === 'schedule' && (
  <div className="space-y-4">
    {/* نوع التاريخ */}
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={editingContent.isHijriDate}
          onChange={() => setEditingContent({ ...editingContent, isHijriDate: true })}
          className="w-4 h-4 text-emerald-600"
        />
        <span>تاريخ هجري</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={!editingContent.isHijriDate}
          onChange={() => setEditingContent({ ...editingContent, isHijriDate: false })}
          className="w-4 h-4 text-emerald-600"
        />
        <span>تاريخ ميلادي / يوم أسبوعي</span>
      </label>
    </div>
    
    {/* التواريخ */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          تاريخ البداية {editingContent.isHijriDate ? '(شهر-يوم)' : ''}
        </label>
        <input
          type="text"
          value={editingContent.startDate}
          onChange={(e) => setEditingContent({ ...editingContent, startDate: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          placeholder={editingContent.isHijriDate ? '9-1 (1 رمضان)' : 'friday أو 2026-03-15'}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          تاريخ النهاية
        </label>
        <input
          type="text"
          value={editingContent.endDate}
          onChange={(e) => setEditingContent({ ...editingContent, endDate: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          placeholder={editingContent.isHijriDate ? '9-30 (30 رمضان)' : 'friday أو 2026-03-20'}
        />
      </div>
    </div>

    {/* إعدادات الوقت */}
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={editingContent.showTime?.enabled || false}
          onChange={(e) => setEditingContent({
            ...editingContent,
            showTime: { 
              enabled: e.target.checked, 
              startHour: editingContent.showTime?.startHour || 0,
              endHour: editingContent.showTime?.endHour || 24,
              timezone: editingContent.showTime?.timezone || 'user_local'
            }
          })}
          className="w-5 h-5 text-emerald-600 rounded"
        />
        <span className="font-medium">تحديد وقت العرض</span>
      </div>
      
      {editingContent.showTime?.enabled && (
        <div className="space-y-4">
          {/* المنطقة الزمنية */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">المنطقة الزمنية</label>
            <select
              value={editingContent.showTime.timezone || 'user_local'}
              onChange={(e) => setEditingContent({
                ...editingContent,
                showTime: { 
                  ...editingContent.showTime!, 
                  timezone: e.target.value as TimezoneOption 
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {editingContent.showTime.timezone === 'user_local' && 
                '⏰ سيظهر المحتوى حسب التوقيت المحلي لكل مستخدم'}
              {editingContent.showTime.timezone === 'makkah' && 
                '🕋 سيظهر المحتوى حسب توقيت مكة المكرمة (UTC+3)'}
            </p>
          </div>

          {/* الربط بأوقات الصلاة */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">الربط بوقت صلاة</label>
            <select
              value={editingContent.showTime.relativeTo || 'none'}
              onChange={(e) => setEditingContent({
                ...editingContent,
                showTime: { 
                  ...editingContent.showTime!, 
                  relativeTo: e.target.value as any
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {PRAYER_TIMES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>

          {editingContent.showTime.relativeTo && editingContent.showTime.relativeTo !== 'none' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                الفرق بالدقائق (- قبل، + بعد)
              </label>
              <input
                type="number"
                value={editingContent.showTime.offsetMinutes || 0}
                onChange={(e) => setEditingContent({
                  ...editingContent,
                  showTime: { 
                    ...editingContent.showTime!, 
                    offsetMinutes: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                مثال: -30 يعني قبل {PRAYER_TIMES.find(p => p.value === editingContent.showTime?.relativeTo)?.label} بـ 30 دقيقة
              </p>
            </div>
          )}

          {/* أو تحديد ساعات محددة */}
          {(!editingContent.showTime.relativeTo || editingContent.showTime.relativeTo === 'none') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">من الساعة</label>
                <select
                  value={editingContent.showTime.startHour}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    showTime: { ...editingContent.showTime!, startHour: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00 {i < 12 ? 'ص' : 'م'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">إلى الساعة</label>
                <select
                  value={editingContent.showTime.endHour}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    showTime: { ...editingContent.showTime!, endHour: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {(i + 1).toString().padStart(2, '0')}:00 {(i + 1) < 12 ? 'ص' : 'م'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    
    {/* الأولوية والحالة */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
        <input
          type="number"
          value={editingContent.priority}
          onChange={(e) => setEditingContent({ ...editingContent, priority: parseInt(e.target.value) })}
          min={1}
          max={100}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-gray-500 mt-1">1 = الأعلى أولوية</p>
      </div>
      <div className="flex items-center pt-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editingContent.isActive}
            onChange={(e) => setEditingContent({ ...editingContent, isActive: e.target.checked })}
            className="w-5 h-5 text-emerald-600 rounded"
          />
          <span className="font-medium">نشط</span>
        </label>
      </div>
    </div>
  </div>
)}
