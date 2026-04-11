// lib/sdui/index.ts
// SDUI Module Exports — صادرات نظام الواجهة الديناميكية

// Types
export type {
  BaseSectionConfig,
  SDUISectionType,
  SectionConditions,
  HTMLBlockSection,
  SpacerSection,
  SDUISection,
  SDUIScreenConfig,
  ScreenSettings,
  SDUIConfigResponse,
} from './types';

// Registry
export {
  getSectionComponent,
  isSectionRegistered,
  registerSection,
  getRegisteredSectionTypes,
  renderSection,
  renderSections,
} from './section-registry';
export type { SectionProps, SectionAction, SectionComponent } from './section-registry';

// Hooks
export {
  useSDUIScreen,
  useAllSDUIScreens,
  getSection,
  getSectionsByType,
  isSectionEnabled,
} from './use-sdui';
export type { UseSDUIScreenResult, UseAllSDUIScreensResult } from './use-sdui';
