// iOS Button System Documentation
// نظام الأزرار الموحد بنمط iOS
// This file documents the unified button system for the Quran app

/**
 * ========================================
 * UNIFIED iOS BUTTON SYSTEM DOCUMENTATION
 * ========================================
 * 
 * The app now uses a fully unified iOS-style button system across all screens.
 * All buttons should follow the iOS design patterns implemented in:
 * components/ui/ios-button.tsx
 * 
 * KEY FEATURES:
 * ✓ Glass morphism effects using BlurView
 * ✓ Haptic feedback automatically on press
 * ✓ Multiple button variants (primary, secondary, tertiary, glass)
 * ✓ Three size options (small, medium, large)
 * ✓ Color customization (green, red, blue, gray)
 * ✓ Dark mode support built-in
 * ✓ iOS standard animations and interactions
 * ✓ Consistent shadows and elevation
 * 
 * ========================================
 * UPDATED COMPONENTS
 * ========================================
 * 
 * 1. Prayer Screen (app/(tabs)/prayer.tsx)
 *    - Bottom buttons now wrapped in BlurView for glass effect
 *    - Consistent haptic feedback
 *    - Smooth state transitions
 * 
 * 2. Prayer List (components/ui/prayer/PrayerList.tsx)
 *    - Notification toggle uses glass effect + iOS toggle style
 *    - Bell icons (bell-ring/bell-off) indicate state
 *    - MarginLeft animation for thumb movement
 * 
 * 3. Prayer Card (components/ui/prayer/PrayerCard.tsx)
 *    - Removed location display (user request)
 *    - Cleaner interface focus on prayer time countdown
 * 
 * ========================================
 * BUTTON VARIANTS
 * ========================================
 * 
 * VARIANT: 'primary'
 * - Full color background
 * - White text
 * - Used for main actions
 * 
 * VARIANT: 'secondary'
 * - Subtle transparent background
 * - Adapts to dark/light mode
 * - Used for alternative actions
 * 
 * VARIANT: 'tertiary'
 * - Light tinted background
 * - Colored text
 * - Used for less important actions
 * 
 * VARIANT: 'glass'
 * - Transparent inside BlurView
 * - Glass morphism effect
 * - Used for modern, elegant buttons
 * 
 * ========================================
 * COLORS AVAILABLE
 * ========================================
 * 
 * - green (primary app color: #2f7659)
 * - red (#ef4444)
 * - blue (#3b82f6)
 * - gray (#999)
 * - custom (pass customColor prop)
 * 
 * ========================================
 * SIZES AVAILABLE
 * ========================================
 * 
 * - small: 40x40 with fontSize 12
 * - medium: 50x50 with fontSize 14 (default)
 * - large: 60x60 with fontSize 16
 * 
 * ========================================
 * USAGE EXAMPLES
 * ========================================
 * 
 * Import:
 * import { IOSButton, IOSToggle, GlassButton } from '@/components/ui/ios-button';
 * 
 * Basic Button:
 * <IOSButton
 *   label="اضغط هنا"
 *   icon="check"
 *   onPress={() => handleAction()}
 *   isDarkMode={isDarkMode}
 * />
 * 
 * Glass Button:
 * <IOSButton
 *   label="تأكيد"
 *   variant="glass"
 *   showGlass={true}
 *   glassIntensity={70}
 *   isDarkMode={isDarkMode}
 *   onPress={handleConfirm}
 * />
 * 
 * Toggle Switch:
 * <IOSToggle
 *   enabled={isEnabled}
 *   onToggle={(value) => setIsEnabled(value)}
 *   icon={{ on: 'bell-ring', off: 'bell-off' }}
 *   accentColor="#2f7659"
 *   isDarkMode={isDarkMode}
 * />
 * 
 * Custom Colored Button:
 * <IOSButton
 *   label="حذف"
 *   icon="delete"
 *   variant="primary"
 *   customColor="#ef4444"
 *   isDarkMode={isDarkMode}
 *   onPress={handleDelete}
 * />
 * 
 * ========================================
 * MIGRATING OLD BUTTONS TO NEW SYSTEM
 * ========================================
 * 
 * Old approach (TouchableOpacity):
 * <TouchableOpacity onPress={handlePress} style={styles.button}>
 *   <Text>Click</Text>
 * </TouchableOpacity>
 * 
 * New approach:
 * <IOSButton
 *   label="Click"
 *   onPress={handlePress}
 *   variant="primary"
 *   isDarkMode={isDarkMode}
 * />
 * 
 * ========================================
 * GLASS EFFECT USAGE
 * ========================================
 * 
 * For buttons that need glass morphism effect:
 * 
 * Option 1: Using IOSButton with glass variant
 * <IOSButton
 *   variant="glass"
 *   label="Glass Button"
 *   showGlass={true}
 *   glassIntensity={60}
 *   isDarkMode={isDarkMode}
 * />
 * 
 * Option 2: Using GlassButton wrapper
 * <GlassButton onPress={handlePress}>
 *   <View style={{ padding: 10 }}>
 *     <Text>Custom Glass Content</Text>
 *   </View>
 * </GlassButton>
 * 
 * Option 3: Direct BlurView (for advanced usage)
 * <BlurView intensity={60} style={{ borderRadius: 12 }}>
 *   <TouchableOpacity>
 *     {/* content */}
 *   </TouchableOpacity>
 * </BlurView>
 * 
 * ========================================
 * HAPTIC FEEDBACK CONFIGURATION
 * ========================================
 * 
 * By default, all buttons have haptic feedback enabled.
 * To disable for a specific button:
 * 
 * <IOSButton
 *   label="No Haptic"
 *   haptic={false}
 *   onPress={handlePress}
 *   isDarkMode={isDarkMode}
 * />
 * 
 * ========================================
 * DARK MODE SUPPORT
 * ========================================
 * 
 * All buttons automatically adapt to dark mode by passing isDarkMode prop.
 * This affects:
 * - Background colors
 * - Text colors
 * - Border colors
 * - Shadow intensities
 * 
 * ========================================
 * PENDING UPDATES
 * ========================================
 * 
 * The following components should be updated to use the unified system:
 * - Settings page buttons (should use primary/secondary variants)
 * - Modal and dialog buttons
 * - Form submission buttons
 * - Navigation buttons
 * 
 * All these updates can be done using IOSButton component with appropriate
 * props to maintain visual and functional consistency across the app.
 * 
 * ========================================
 * PERFORMANCE NOTES
 * ========================================
 * 
 * - BlurView effects are optimized and lightweight
 * - Haptic feedback uses expo-haptics for native performance
 * - All animations use react-native-reanimated for smooth 60fps
 * - No custom animations needed - system handles all transitions
 * 
 * ========================================
 */
