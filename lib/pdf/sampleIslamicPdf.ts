import { COMPANIONS_EXTENDED_TRANSCRIPTS } from '@/data/companions-extra';
import { shareIslamicPdf } from './shareIslamicPdf';
import { IslamicPdfData } from './islamicPdfTemplate';

export function buildUmmKulthumSampleIslamicPdfData(): IslamicPdfData {
  const body = COMPANIONS_EXTENDED_TRANSCRIPTS['umm-kulthum-daughter']?.ar.split(/\n{2,}/) || [];

  return {
    title: 'أم كلثوم',
    subtitle: 'بنت رسول الله',
    shortDescription: 'ثالثة بنات النبي ﷺ، تزوجها عثمان بن عفان رضي الله عنه بعد أختها رقية رضي الله عنها.',
    category: 'سيرة آل بيت النبي ﷺ',
    footerTitle: 'رُوح المسلم',
    sections: [
      { title: 'النشأة والابتلاء الأول', body: body.slice(0, 3) },
      { title: 'زواجها ووفاتها', body: body.slice(3, 10) },
      { title: 'الدروس والعبر', body: body.slice(10) },
    ],
    virtues: [
      'ثالثة بنات النبي ﷺ',
      'زوج عثمان ذي النورين بعد رقية',
      'دفنت بالبقيع',
      'صبرت على فقد أختها',
    ],
    closingDua: 'اللهم ارضَ عن أم كلثوم، واجمعنا بها وبأبيها وأخواتها في جنات النعيم.',
  };
}

export async function shareUmmKulthumSampleIslamicPdf(): Promise<void> {
  await shareIslamicPdf(buildUmmKulthumSampleIslamicPdfData());
}
