# Trek.IQ Accessibility Quick Reference

## 🎯 Quick Overview

Trek.IQ is now fully accessible following WCAG 2.1 AA standards!

### ✅ What's New

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Skip Links** | Press Tab to reveal links to skip to main content | Faster keyboard navigation |
| **Screen Reader Support** | Full announcements for all actions | Blind/low vision accessibility |
| **Keyboard Shortcuts** | `/` search, `Ctrl+M` menu, `Ctrl+L` layers | Power user efficiency |
| **Focus Management** | Trapped focus in modals, visible indicators | Clear navigation context |
| **ARIA Labels** | Comprehensive labels and roles | Better screen reader experience |
| **Semantic HTML** | Proper landmarks (header, main, nav, aside) | Structural navigation |

---

## ⌨️ Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next element |
| `Shift + Tab` | Move to previous element |
| `Enter` or `Space` | Activate button/link |
| `Escape` | Close open panel/modal |
| `/` | Open search panel |
| `Ctrl/Cmd + M` | Open menu |
| `Ctrl/Cmd + L` | Open layers |

### In Modals
| Shortcut | Action |
|----------|--------|
| `Tab` | Cycle forward |
| `Shift + Tab` | Cycle backward |
| `Escape` | Close modal |

---

## 🔊 Screen Reader Announcements

### Panel Actions
- "Search panel opened/closed"
- "Navigation menu opened/closed"
- "Map layers panel opened/closed"
- "Transit information opened/closed"

### Route Actions
- "Finding accessible route..."
- "Route found. X kilometers Y minutes"
- "Navigation started. Turn-by-turn directions are now available."
- "Navigation ended"
- "Route cleared"

### Errors
- Clear, descriptive error messages
- Network/timeout/validation errors announced

---

## 🏷️ Semantic Structure

```
Trek.IQ App
├── Skip Links (Tab to reveal)
│   ├── Skip to main content
│   ├── Skip to search
│   └── Skip to map
│
├── Header (Banner)
│   └── Top navigation bar
│
└── Main Content
    ├── Map Region
    │   └── Interactive map
    │
    ├── Search Panel (Search landmark)
    │   └── Route planning
    │
    ├── Navigation Menu (Nav landmark)
    │   └── Side menu
    │
    └── Panels (Complementary)
        ├── Route details
        ├── Directions
        ├── Layers
        └── Transit info
```

---

## 🎨 Visual Accessibility

### Focus Indicators
- **Style:** 3px solid blue outline
- **Offset:** 2px from element
- **Visibility:** Only on keyboard focus

### Color Contrast
- **Normal text:** 4.5:1 ratio ✅
- **Large text:** 3:1 ratio ✅
- **Interactive elements:** High contrast ✅

### Touch Targets
- **Desktop:** 44x44px minimum ✅
- **Mobile:** 48x48px minimum ✅

---

## 🧪 Quick Test

### 1. Keyboard Navigation (2 min)
```
1. Load the app
2. Press Tab repeatedly
3. Verify focus is visible
4. Press Escape to close panels
```

### 2. Screen Reader (3 min)
```
1. Enable screen reader (Cmd+F5 on Mac)
2. Navigate by landmarks (rotor)
3. Listen to announcements
4. Test one user flow
```

### 3. Skip Links (1 min)
```
1. Reload page
2. Press Tab once
3. Press Enter on skip link
4. Verify navigation works
```

---

## 📱 Mobile Accessibility

### Touch
- Large touch targets (48x48px)
- No hover-only interactions
- Swipe gestures supported

### Screen Readers
- VoiceOver (iOS) supported
- TalkBack (Android) supported
- Swipe navigation works
- All content announced

---

## 🔧 Developer Usage

### Screen Reader Announcements
```javascript
import useScreenReaderAnnouncement from '../hooks/useScreenReaderAnnouncement';

const MyComponent = () => {
  const { announce } = useScreenReaderAnnouncement();
  
  const handleAction = () => {
    announce("Action completed", "polite");
  };
  
  return <button onClick={handleAction}>Action</button>;
};
```

### Focus Trapping
```javascript
import useFocusTrap from '../hooks/useFocusTrap';

const MyModal = ({ isOpen, onClose }) => {
  const containerRef = useFocusTrap(isOpen, onClose);
  
  return (
    <div ref={containerRef} role="dialog">
      {/* Content */}
    </div>
  );
};
```

### Keyboard Navigation
```javascript
import useKeyboardNavigation from '../hooks/useKeyboardNavigation';

useKeyboardNavigation({
  onOpenSearch: handleOpenSearch,
  onEscape: handleClose,
  enabled: true
});
```

---

## 📊 WCAG 2.1 AA Compliance

### Status: ✅ COMPLIANT

| Principle | Status |
|-----------|--------|
| **Perceivable** | ✅ Pass |
| **Operable** | ✅ Pass |
| **Understandable** | ✅ Pass |
| **Robust** | ✅ Pass |

**Details:** See `ACCESSIBILITY.md` for full compliance checklist

---

## 🛠️ Testing Tools

### Automated
- **Lighthouse** - Built into Chrome DevTools
- **axe DevTools** - Browser extension
- **WAVE** - Web accessibility checker

### Manual
- **NVDA** - Windows screen reader
- **VoiceOver** - Mac/iOS screen reader
- **TalkBack** - Android screen reader
- **Keyboard only** - Unplug mouse and test

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `ACCESSIBILITY.md` | Full accessibility documentation |
| `ACCESSIBILITY_IMPLEMENTATION_SUMMARY.md` | Technical implementation details |
| `ACCESSIBILITY_TESTING_CHECKLIST.md` | Complete testing checklist |
| `ACCESSIBILITY_QUICK_REFERENCE.md` | This file - quick reference |

---

## 🎓 Resources

### Learn More
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) - Free, Windows
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Paid, Windows
- VoiceOver - Built-in, Mac/iOS
- TalkBack - Built-in, Android

---

## 🚀 Getting Started

### For Users
1. Enable your screen reader
2. Press Tab to see skip links
3. Use keyboard shortcuts for faster navigation
4. All features work without a mouse

### For Developers
1. Read `ACCESSIBILITY.md`
2. Review `ACCESSIBILITY_IMPLEMENTATION_SUMMARY.md`
3. Use the provided hooks in `client/src/hooks/`
4. Test with `ACCESSIBILITY_TESTING_CHECKLIST.md`

### For Testers
1. Start with `ACCESSIBILITY_TESTING_CHECKLIST.md`
2. Run automated tests (Lighthouse, axe)
3. Test with keyboard only
4. Test with screen reader
5. Verify on mobile

---

## ✨ Best Practices

### Do's ✅
- Use semantic HTML first
- Provide alt text for images
- Ensure keyboard accessibility
- Maintain color contrast
- Test with real screen readers
- Respect user preferences (motion, contrast)

### Don'ts ❌
- Don't rely on color alone
- Don't create keyboard traps
- Don't hide focusable elements
- Don't use `tabindex` > 0
- Don't disable zoom
- Don't ignore screen reader testing

---

## 💡 Tips

### Keyboard Users
- Use skip links to jump to content
- Learn keyboard shortcuts for efficiency
- Focus indicator shows where you are

### Screen Reader Users
- Navigate by landmarks for faster access
- Listen for live region announcements
- Use heading navigation (H key in NVDA)

### Mobile Users
- All touch targets are large enough
- Swipe navigation works naturally
- Screen reader gestures supported

---

## 📞 Support

Found an accessibility issue?
1. Check `ACCESSIBILITY_TESTING_CHECKLIST.md`
2. Verify with automated tools
3. Report with details:
   - What you were trying to do
   - What happened
   - What you expected
   - Assistive technology used

---

**Trek.IQ: Accessible Navigation for Everyone** 🌍♿

*Making the web accessible, one PWA at a time.*


