import { describe, expect, test } from 'vitest';

import { getWidgetHowToSteps } from '@/lib/widget-how-to-steps';

describe('widget how-to-add instructions', () => {
  test('explains the complete iPhone add and edit-widget flow in Arabic', () => {
    const steps = getWidgetHowToSteps('ios', 'ar');

    expect(steps).toHaveLength(7);
    expect(steps.join('\n')).toContain('زر "+"');
    expect(steps.join('\n')).toContain('إضافة ودجت');
    expect(steps.join('\n')).toContain('تعديل الودجت');
    expect(steps.join('\n')).toContain('خانة "الودجت"');
    expect(steps.at(-1)).toContain('"تم"');
  });

  test('keeps Android instructions focused on the launcher widget picker', () => {
    const steps = getWidgetHowToSteps('android', 'ar');

    expect(steps).toHaveLength(4);
    expect(steps.join('\n')).toContain('"الودجات"');
    expect(steps.join('\n')).not.toContain('تعديل الودجت');
  });

  test('supports English iPhone instructions for non-Arabic app languages', () => {
    const steps = getWidgetHowToSteps('ios', 'en');

    expect(steps.join('\n')).toContain('Add Widget');
    expect(steps.join('\n')).toContain('Edit Widget');
    expect(steps.join('\n')).toContain('Widget row');
  });
});
