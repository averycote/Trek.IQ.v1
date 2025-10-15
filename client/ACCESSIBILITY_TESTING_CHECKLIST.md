# Trek.IQ Accessibility Testing Checklist

Use this checklist to verify all accessibility features are working correctly.

## Pre-Testing Setup

### Required Tools
- [ ] Screen reader installed (NVDA for Windows, VoiceOver for Mac/iOS, TalkBack for Android)
- [ ] Browser DevTools (Chrome or Firefox)
- [ ] axe DevTools browser extension (optional but recommended)
- [ ] Color contrast checker (optional)

### Test Environment
- [ ] Test on desktop browser
- [ ] Test on mobile browser (iOS and/or Android)
- [ ] Test with keyboard only (unplug mouse or don't touch trackpad)
- [ ] Test with screen reader enabled

---

## 1. Keyboard Navigation Tests

### Basic Navigation
- [ ] **Tab key** moves focus through all interactive elements in logical order
- [ ] **Shift + Tab** moves focus backwards through elements
- [ ] **Enter** or **Space** activates focused buttons and links
- [ ] Focus is always visible (3px blue outline)
- [ ] Tab order makes logical sense (top to bottom, left to right)

### Skip Links
- [ ] Press Tab from page load - skip links appear
- [ ] "Skip to main content" link works
- [ ] "Skip to search" link works
- [ ] "Skip to map" link works
- [ ] Skip links disappear when not focused

### Keyboard Shortcuts
- [ ] Press **/** to open search panel
- [ ] Press **Ctrl/Cmd + M** to open menu
- [ ] Press **Ctrl/Cmd + L** to open layers panel
- [ ] Shortcuts don't trigger when typing in input fields

### Escape Key
- [ ] Escape closes barrier report modal (highest priority)
- [ ] Escape closes side menu
- [ ] Escape closes layers panel
- [ ] Escape closes search panel
- [ ] Escape closes transit info panel
- [ ] Escape closes system status panel

### Modal Focus Trapping
1. Open barrier report modal
   - [ ] Focus moves to first interactive element
   - [ ] Tab cycles through modal elements only
   - [ ] Shift+Tab cycles backwards
   - [ ] Can't tab outside the modal
   - [ ] Escape closes modal
   - [ ] Focus returns to trigger button when closed

2. Repeat for other modals/panels
   - [ ] Search panel
   - [ ] Layers panel
   - [ ] Side menu

---

## 2. Screen Reader Tests

### Screen Reader Setup
- **Windows (NVDA):** Download from nvaccess.org, press Insert+Q to quit
- **Mac (VoiceOver):** Cmd+F5 to enable/disable
- **iOS (VoiceOver):** Settings > Accessibility > VoiceOver
- **Android (TalkBack):** Settings > Accessibility > TalkBack

### Landmarks Navigation
With screen reader enabled:
- [ ] Navigate by landmarks (NVDA: D key, VoiceOver: rotor)
- [ ] "Banner" landmark (header) is announced
- [ ] "Main" landmark is announced
- [ ] "Navigation" landmark (side menu) is announced
- [ ] "Complementary" landmarks (panels) are announced
- [ ] "Search" landmark is announced

### Content Reading
- [ ] All text is read correctly
- [ ] Buttons have descriptive labels
- [ ] Links are clearly identified
- [ ] Images have alt text (if any)
- [ ] Form inputs have labels
- [ ] Headings are properly structured (H1, H2, H3...)

### Dynamic Content Announcements
1. **Search Panel**
   - [ ] Opening search panel announces "Search panel opened"
   - [ ] Closing search panel announces "Search panel closed"

2. **Route Calculation**
   - [ ] Starting route search announces "Finding accessible route"
   - [ ] Route found announces "Route found. X kilometers Y minutes"
   - [ ] Route errors are announced clearly

3. **Navigation**
   - [ ] Starting navigation announces "Navigation started. Turn-by-turn directions are now available."
   - [ ] Ending navigation announces "Navigation ended"
   - [ ] Clearing route announces "Route cleared"

4. **Panel Toggles**
   - [ ] Opening menu announces "Navigation menu opened"
   - [ ] Closing menu announces "Navigation menu closed"
   - [ ] Opening layers announces "Map layers panel opened"
   - [ ] Closing layers announces "Map layers panel closed"
   - [ ] Transit info toggles are announced

5. **Loading States**
   - [ ] System loading announces progress messages
   - [ ] Map loading is announced
   - [ ] Page loading is announced

### ARIA Attributes
Using browser DevTools Accessibility Inspector:
- [ ] All interactive elements have accessible names
- [ ] Buttons have roles and labels
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Live regions have `aria-live` attribute
- [ ] Hidden elements have `aria-hidden="true"`
- [ ] Expanded/collapsed states use `aria-expanded`

---

## 3. Visual Accessibility Tests

### Focus Indicators
- [ ] All interactive elements show focus indicator when tabbed to
- [ ] Focus indicator is clearly visible (3px blue outline)
- [ ] Focus indicator has sufficient contrast (3:1 ratio)
- [ ] Focus indicator doesn't get cut off by overflow
- [ ] Focus indicator visible in both light and dark modes

### Color Contrast
Using DevTools or contrast checker:
- [ ] Normal text has 4.5:1 contrast ratio
- [ ] Large text has 3:1 contrast ratio
- [ ] Interactive elements have 3:1 contrast
- [ ] Dark mode maintains sufficient contrast
- [ ] Color is not used as only indicator (icons/text supplement)

### Touch Targets
On mobile device:
- [ ] All buttons are at least 44x44px (48x48px on mobile)
- [ ] Buttons are easily tappable without hitting wrong target
- [ ] Sufficient spacing between interactive elements

### Zoom/Magnification
- [ ] Page works at 200% zoom
- [ ] Content reflows without horizontal scroll
- [ ] No text is cut off at high zoom
- [ ] Layout remains usable when zoomed

### High Contrast Mode
Turn on OS high contrast mode:
- [ ] All content is visible
- [ ] Borders are enhanced
- [ ] Focus indicators are prominent
- [ ] No information is lost

### Reduced Motion
Set OS to reduce motion:
- [ ] Animations are minimal or removed
- [ ] Transitions are instant
- [ ] No jarring movements
- [ ] Scroll behavior is smooth/instant

---

## 4. Semantic HTML Tests

### Using DevTools Elements Panel
- [ ] `<header>` element wraps top bar
- [ ] `<main>` element wraps main content
- [ ] `<nav>` element wraps navigation menu
- [ ] `<aside>` elements wrap supplementary panels
- [ ] `<section>` with `role="region"` for map
- [ ] Heading hierarchy is logical (H1 → H2 → H3)
- [ ] No skipped heading levels

### ARIA Roles
- [ ] Application role on root div
- [ ] Banner role on header
- [ ] Main role on main content
- [ ] Navigation role on menu
- [ ] Search role on search panel
- [ ] Complementary roles on panels
- [ ] Dialog role on modals
- [ ] Status role on loading states
- [ ] Alert role for important announcements

---

## 5. Mobile Accessibility Tests

### Touch Gestures
- [ ] All functionality available via touch
- [ ] No hover-only interactions
- [ ] Touch targets are large enough (48x48px)
- [ ] Gestures are simple and discoverable

### Mobile Screen Reader (iOS VoiceOver / Android TalkBack)
- [ ] All content is announced
- [ ] Swipe navigation works logically
- [ ] Buttons and links are identified
- [ ] Custom gestures work (if any)
- [ ] Rotor/Local context menu navigation works

### Orientation
- [ ] App works in portrait mode
- [ ] App works in landscape mode
- [ ] Content reflows appropriately
- [ ] No content is lost on orientation change

---

## 6. Forms Accessibility Tests

### Search Form
- [ ] All inputs have visible labels
- [ ] Labels are associated with inputs (`for` attribute or `aria-labelledby`)
- [ ] Required fields are marked (`aria-required="true"`)
- [ ] Error messages are announced
- [ ] Error messages are associated with inputs (`aria-describedby`)
- [ ] Success confirmations are announced

### Barrier Report Form
- [ ] All form fields are keyboard accessible
- [ ] Tab order is logical
- [ ] Error validation is accessible
- [ ] Submit button is clearly labeled
- [ ] Form submission success/failure is announced

---

## 7. Interactive Components Tests

### Search Panel
- [ ] Can be opened via keyboard (`/` or menu button)
- [ ] All inputs are keyboard accessible
- [ ] Location detect button has accessible label
- [ ] Search suggestions are keyboard navigable
- [ ] Can be closed via Escape key

### Route Panel
- [ ] Panel opens when route is calculated
- [ ] All buttons are keyboard accessible
- [ ] Route details are read by screen reader
- [ ] Start navigation button is accessible
- [ ] Close button works with keyboard

### Navigation Directions
- [ ] Step-by-step directions are readable
- [ ] Current step is clearly indicated
- [ ] Progress through steps is announced
- [ ] End navigation button is accessible

### Map Layers Panel
- [ ] Can be toggled via keyboard
- [ ] All layer checkboxes are keyboard accessible
- [ ] Layer states are announced when changed
- [ ] Close button works with keyboard

### Side Menu
- [ ] Opens/closes via keyboard
- [ ] All menu items are keyboard accessible
- [ ] Current page is indicated
- [ ] Settings toggles work with keyboard
- [ ] Theme switcher is accessible

---

## 8. Error Handling Tests

### Error Messages
- [ ] Network errors are announced
- [ ] Form validation errors are announced
- [ ] Route calculation errors are announced
- [ ] Location detection errors are announced
- [ ] Errors have sufficient color contrast
- [ ] Errors are associated with relevant elements

### Loading States
- [ ] Loading spinners have `aria-busy="true"`
- [ ] Loading messages are announced
- [ ] Loading doesn't trap focus
- [ ] User can't interact with loading elements

---

## 9. Automated Testing

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Run audit
   - [ ] Score is 90+ (ideally 100)
   - [ ] No critical issues
   - [ ] Address any warnings

### axe DevTools
1. Install axe DevTools extension
2. Open DevTools > axe DevTools tab
3. Click "Scan ALL of my page"
   - [ ] No critical issues
   - [ ] No serious issues
   - [ ] Review moderate issues
   - [ ] Address violations

### WAVE Tool
1. Go to https://wave.webaim.org/
2. Enter app URL
   - [ ] No errors
   - [ ] Review alerts
   - [ ] Verify features are detected

---

## 10. Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome/Edge (Chromium) - All features work
- [ ] Firefox - All features work
- [ ] Safari - All features work

### Mobile Browsers
- [ ] iOS Safari - All features work
- [ ] Chrome Mobile (Android) - All features work
- [ ] Samsung Internet - All features work

---

## Test Results Summary

### Date: ___________
### Tester: ___________

#### Overall Results
- [ ] All tests passed
- [ ] Minor issues found (document below)
- [ ] Major issues found (document below)

#### Issues Found
```
1. Issue description
   - Severity: [Critical/High/Medium/Low]
   - Location: [Component/Page]
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

2. [Add more as needed]
```

#### Recommendations
```
[List any recommendations for improvement]
```

---

## Quick Test (15 minutes)

For a quick accessibility check, test these critical items:

1. **Keyboard Navigation (5 min)**
   - [ ] Tab through entire page
   - [ ] Test skip links
   - [ ] Test Escape key on modals

2. **Screen Reader (5 min)**
   - [ ] Turn on screen reader
   - [ ] Navigate by landmarks
   - [ ] Test one user flow (search → route → navigate)

3. **Focus Indicators (2 min)**
   - [ ] Verify all interactive elements show focus
   - [ ] Check focus indicator contrast

4. **Automated Scan (3 min)**
   - [ ] Run Lighthouse audit
   - [ ] Check score is 90+

---

## Resources

### Screen Readers
- **NVDA (Windows):** https://www.nvaccess.org/
- **JAWS (Windows):** https://www.freedomscientific.com/products/software/jaws/
- **VoiceOver (Mac/iOS):** Built-in (Cmd+F5)
- **TalkBack (Android):** Built-in (Settings > Accessibility)

### Testing Tools
- **Chrome DevTools:** Built-in (F12)
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

### Documentation
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM:** https://webaim.org/

---

## Sign-off

**Accessibility Testing Complete**

Tester: ______________________  
Date: ______________________  
Signature: ______________________

**Status:** 
- [ ] Approved - Ready for production
- [ ] Approved with minor fixes needed
- [ ] Requires significant accessibility improvements


