// Try harder for the 6 broken reciters
const TIMEOUT_MS = 8000;
async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    return r.ok;
  } catch { return false; }
  finally { clearTimeout(t); }
}

const candidates = {
  'بندر بليلة': {
    everyAyah: ['Bandar_Baleela_192kbps', 'Bandar_Balila_128kbps', 'Bandar_Bin_Abdul-Aziz_Balila_192kbps'],
    quranicAudio: ['bandar_baleela', 'bandar_balila_128kbps'],
    mp3Quran: [[6, 'bandar'], [9, 'baleela'], [12, 'balela'], [13, 'baleela']],
  },
  'محمود علي البنا': {
    everyAyah: ['Mahmoud_Ali_Al-Banna_64kbps', 'Mahmoud_Ali_Al_Banna_64kbps', 'Mahmoud_Khalil_Al-Hussary_64kbps_Murattal'],
    quranicAudio: ['mahmoud_ali_al-banna', 'mahmoud_ali_albanna'],
    mp3Quran: [[10, 'banna'], [10, 'mhmod_albna'], [12, 'albanna']],
  },
  'إسلام صبحي': {
    everyAyah: ['Islam_Sobhi_128kbps', 'IslamSobhi128kbps'],
    quranicAudio: ['islam_subhi', 'islam_sobhy', 'islam_sobhi_full'],
    mp3Quran: [[6, 'subhi'], [13, 'islam'], [9, 'subhi'], [11, 'sobhi']],
  },
  'خالد الجليل': {
    everyAyah: ['Khalid_Al-Jaleel_128kbps', 'Khalid_Aljalil_128kbps', 'KhalidAljaleel'],
    quranicAudio: ['khalid_al_jaleel', 'khaalid_al-jaleel'],
    mp3Quran: [[8, 'jleel'], [10, 'jleel'], [13, 'aljalil']],
  },
  'فهد الكندري': {
    everyAyah: ['Fahad_Aziz_Niyaz_64kbps'],
    quranicAudio: ['fahad_alkandari', 'fahd_al_kandary', 'fahad_aziz_niyaz'],
    mp3Quran: [[7, 'kndri'], [11, 'fahd'], [10, 'kandari']],
  },
  'توفيق الصايغ': {
    everyAyah: ['Tawfeeq_As-Sayigh_64kbps', 'Tawfeeq_As-Sayegh_64kbps', 'Tawfiq_as-Sayegh_64kbps'],
    quranicAudio: ['tawfeeq_as-saayigh', 'tawfiq_alsaegh'],
    mp3Quran: [[6, 'sayegh'], [10, 'sayegh'], [11, 'sayegh']],
  },
};

for (const [name, c] of Object.entries(candidates)) {
  console.log(`\n=== ${name} ===`);
  for (const f of c.everyAyah) {
    const ok = await head(`https://everyayah.com/data/${f}/001001.mp3`);
    console.log(`  everyayah ${f.padEnd(40)} ${ok ? '✅' : '❌'}`);
  }
  for (const d of c.quranicAudio) {
    const ok = await head(`https://download.quranicaudio.com/quran/${d}/001.mp3`);
    console.log(`  quranicAudio ${d.padEnd(40)} ${ok ? '✅' : '❌'}`);
  }
  for (const [s, f] of c.mp3Quran) {
    const ok = await head(`https://server${s}.mp3quran.net/${f}/001.mp3`);
    console.log(`  mp3quran  server${s}/${f.padEnd(20)} ${ok ? '✅' : '❌'}`);
  }
}
