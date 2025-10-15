# Trek.IQ Accessibility Features

This document outlines the comprehensive accessibility features implemented in Trek.IQ PWA, following WCAG 2.1 AA guidelines and PWA accessibility best practices.

## Table of Contents
- [Overview](#overview)
- [Implemented Features](#implemented-features)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Testing Accessibility](#testing-accessibility)
- [WCAG 2.1 Compliance](#wcag-21-compliance)

## Overview

Trek.IQ is designed to be fully accessible to all users, including those with:
- Visual impairments (blind, low vision, color blindness)
- Motor impairments (keyboard-only navigation)
- Cognitive disabilities
- Hearing impairments

## Implemented Features

### 1. Skip Navigation Links
Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content areas.

**Implementation:**
- Skip to main content
- Skip to search panel
- Skip to map

**Usage:** Press `Tab` when the page loads to reveal skip links.

### 2. Semantic HTML Landmarks
Proper HTML5 semantic elements ensure screen readers can navigate the page structure efficiently.

**Landmarks implemented:**
- `<header role="banner">` - Top navigation bar
- `<main role="main">` - Main content area
- `<nav role="navigation">` - Side menu navigation
- `<aside role="complementary">` - Panels (search, layers, transit info, etc.)
- `<section role="region">` - Map canvas

### 3. ARIA Attributes
Comprehensive ARIA labels and roles provide context to assistive technologies.

**Key ARIA implementations:**
- `aria-label` - Descriptive labels for complex elements
- `aria-live` - Dynamic content announcements
- `aria-hidden` - Hide decorative elements from screen readers
- `aria-modal` - Modal dialog identification
- `aria-busy` - Loading state indicators
- `aria-expanded` - Expandable panel states
- `aria-controls` - Relationship between controls and content

### 4. Screen Reader Announcements
Custom hook (`useScreenReaderAnnouncement`) provides real-time announcements for:

- Panel open/close states
- Route calculation results
- Navigation start/end
- Route clearing
- Error messages
- Success confirmations

**Announcement Priorities:**
- **Polite**: Non-urgent updates (panel toggles, route cleared)
- **Assertive**: Important updates (route found, navigation started)

### 5. Keyboard Navigation
Full keyboard accessibility with logical tab order and keyboard shortcuts.

**Global Keyboard Shortcuts:**
- `/` - Open search panel
- `Ctrl/Cmd + M` - Open menu
- `Ctrl/Cmd + L` - Open layers panel
- `Escape` - Close open panels/modals (cascading)

**Features:**
- Logical tab order through interactive elements
- Visible focus indicators (3px blue outline)
- Focus trapping in modals and panels
- Focus restoration when closing modals

### 6. Focus Management
Custom hook (`useFocusTrap`) ensures focus stays within modal dialogs and panels.

**Features:**
- Automatic focus on first interactive element
- Tab cycling within modal
- Escape key to close
- Focus restoration to previous element on close

### 7. Color Contrast
All text and interactive elements meet WCAG AA contrast ratios.

**Standards:**
- Normal text: 4.5:1 contrast ratio minimum
- Large text: 3:1 contrast ratio minimum
- Interactive elements: Clear focus indicators

### 8. Responsive Design
Fully responsive layout that works across all devices and screen sizes.

**Features:**
- Fluid layouts that adapt to viewport
- Touch targets minimum 44x44px (48x48px on mobile)
- Mobile-first approach
- Viewport scaling support

### 9. Motion Reduction
Respects user's motion preferences via `prefers-reduced-motion` media query.

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 10. High Contrast Mode
Support for high contrast mode with enhanced borders and outlines.

**Implementation:**
```css
@media (prefers-contrast: high) {
  *:focus-visible {
    outline: 4px solid;
    outline-offset: 3px;
  }
}
```

## Keyboard Navigation

### Navigation Flow
1. **Skip Links** (Tab from page load)
2. **Top Bar** (Menu, Search, Settings buttons)
3. **Search Panel** (When open)
4. **Map Canvas** (Interactive map)
5. **Route Panels** (When active)
6. **FAB Cluster** (Quick actions)

### Focus Indicators
- **Visible outline**: 3px solid blue (#4A90E2)
- **Offset**: 2px from element
- **Only on keyboard focus**: No outline for mouse clicks

### Modal Focus Trapping
When a modal opens:
1. Focus moves to first interactive element
2. Tab cycles through modal elements only
3. Shift+Tab cycles backwards
4. Escape closes modal
5. Focus returns to trigger element

## Screen Reader Support

### Tested Screen Readers
- **Windows**: NVDA, JAWS
- **macOS**: VoiceOver
- **iOS**: VoiceOver
- **Android**: TalkBack

### Screen Reader Features
1. **Live Regions** - Dynamic content updates announced automatically
2. **Semantic Structure** - Proper heading hierarchy and landmarks
3. **Alternative Text** - Descriptive labels for all images and icons
4. **Form Labels** - Clear association between labels and inputs
5. **Button Descriptions** - Descriptive text for icon buttons
6. **State Announcements** - Loading, error, and success states

### Example Announcements
```
"Route found. 2.3 kilometers 15 minutes"
"Navigation started. Turn-by-turn directions are now available."
"Search panel opened"
"Map layers panel closed"
"Route cleared"
```

## Testing Accessibility

### Manual Testing

#### Keyboard Navigation Test
1. Load the app
2. Press Tab repeatedly
3. Verify focus is visible at all times
4. Verify tab order is logical
5. Test all keyboard shortcuts
6. Ensure Escape closes panels

#### Screen Reader Test
1. Enable screen reader (NVDA, VoiceOver, etc.)
2. Navigate through all landmarks
3. Trigger route calculation
4. Start navigation
5. Verify all announcements are clear
6. Check all buttons have labels

#### Color Contrast Test
1. Use browser DevTools Accessibility Inspector
2. Verify all text meets 4.5:1 ratio (normal text)
3. Verify all large text meets 3:1 ratio
4. Check focus indicators are visible

### Automated Testing Tools

#### Browser DevTools
```javascript
// Chrome DevTools Accessibility Inspector
// 1. Open DevTools (F12)
// 2. Go to Elements tab
// 3. Find Accessibility pane
// 4. Inspect each element
```

#### Lighthouse Audit
```bash
# Run Lighthouse audit
npm run lighthouse

# Or in Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Check "Accessibility"
# 4. Click "Generate report"
```

#### axe DevTools
```bash
# Install axe DevTools extension
# Chrome: https://chrome.google.com/webstore/detail/axe-devtools
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/

# Then:
# 1. Open DevTools
# 2. Go to axe DevTools tab
# 3. Click "Scan ALL of my page"
```

#### WAVE Tool
Visit: https://wave.webaim.org/
Enter your app URL or use the browser extension.

### Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible on all interactive elements
- [ ] Tab order is logical and intuitive
- [ ] Skip links work correctly
- [ ] All images have alt text
- [ ] All buttons have accessible labels
- [ ] Forms have proper labels
- [ ] Error messages are announced to screen readers
- [ ] Loading states are announced
- [ ] Modal dialogs trap focus
- [ ] Escape key closes modals/panels
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is readable at 200% zoom
- [ ] App works without mouse
- [ ] Screen reader announces all important updates

## WCAG 2.1 Compliance

Trek.IQ aims to meet WCAG 2.1 Level AA compliance.

### Perceivable
✅ **1.1.1 Non-text Content** - All images have alt text  
✅ **1.3.1 Info and Relationships** - Semantic HTML and ARIA labels  
✅ **1.3.2 Meaningful Sequence** - Logical reading order  
✅ **1.4.1 Use of Color** - Information not conveyed by color alone  
✅ **1.4.3 Contrast (Minimum)** - 4.5:1 for normal text, 3:1 for large text  
✅ **1.4.10 Reflow** - Content adapts to 320px width  
✅ **1.4.11 Non-text Contrast** - UI components meet 3:1 ratio  

### Operable
✅ **2.1.1 Keyboard** - All functionality available via keyboard  
✅ **2.1.2 No Keyboard Trap** - Focus can move away from all elements  
✅ **2.1.4 Character Key Shortcuts** - Can be disabled/remapped  
✅ **2.4.1 Bypass Blocks** - Skip navigation links provided  
✅ **2.4.3 Focus Order** - Logical and intuitive focus order  
✅ **2.4.7 Focus Visible** - Visible focus indicator  
✅ **2.5.3 Label in Name** - Accessible names match visible labels  
✅ **2.5.5 Target Size** - Touch targets minimum 44x44px  

### Understandable
✅ **3.1.1 Language of Page** - Page language identified  
✅ **3.2.1 On Focus** - No context changes on focus  
✅ **3.2.2 On Input** - No context changes on input  
✅ **3.3.1 Error Identification** - Errors clearly identified  
✅ **3.3.2 Labels or Instructions** - Clear form labels  

### Robust
✅ **4.1.2 Name, Role, Value** - All UI components have accessible names and roles  
✅ **4.1.3 Status Messages** - Status updates announced to screen readers  

## Best Practices

### For Developers

1. **Always use semantic HTML first** before adding ARIA
2. **Test with keyboard** before testing with mouse
3. **Use `announce()` for dynamic updates** to screen readers
4. **Provide meaningful labels** for all interactive elements
5. **Maintain focus management** in dynamic content
6. **Respect user preferences** (reduced motion, high contrast)
7. **Test with actual screen readers** not just automated tools

### For Designers

1. **Maintain 4.5:1 contrast ratio** for normal text
2. **Ensure touch targets are at least 44x44px**
3. **Don't rely on color alone** to convey information
4. **Provide clear focus indicators** for all states
5. **Design for keyboard navigation** from the start
6. **Consider reduced motion** preferences

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [NVDA (Windows)](https://www.nvaccess.org/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)
- VoiceOver (macOS/iOS) - Built-in
- TalkBack (Android) - Built-in

## Support

For accessibility issues or suggestions, please:
1. Open an issue on GitHub
2. Label it with `accessibility`
3. Provide detailed steps to reproduce
4. Include assistive technology used (if applicable)

## Changelog

### Version 1.0.0 (Current)
- ✅ Skip navigation links
- ✅ Semantic HTML landmarks
- ✅ ARIA labels and roles
- ✅ Screen reader announcements
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Color contrast compliance
- ✅ Responsive touch targets
- ✅ Motion reduction support
- ✅ High contrast mode support

## License

This accessibility implementation is part of Trek.IQ and follows the same license as the main project.


