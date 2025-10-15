import React from 'react';
import './KeyboardShortcutsHelp.css';

/**
 * Keyboard Shortcuts Help Dialog
 * Displays available keyboard shortcuts for accessibility
 */
const KeyboardShortcutsHelp = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { key: 'Tab', description: 'Move focus to next interactive element' },
        { key: 'Shift + Tab', description: 'Move focus to previous interactive element' },
        { key: 'Enter/Space', description: 'Activate focused element' },
        { key: 'Escape', description: 'Close open panels or modals' },
      ],
    },
    {
      category: 'Quick Actions',
      items: [
        { key: '/', description: 'Open search panel' },
        { key: 'Ctrl/Cmd + M', description: 'Open main menu' },
        { key: 'Ctrl/Cmd + L', description: 'Open layers panel' },
      ],
    },
    {
      category: 'Accessibility',
      items: [
        { key: 'Tab (from top)', description: 'Access skip navigation links' },
        { key: 'Arrow Keys', description: 'Navigate within components (map, lists)' },
      ],
    },
  ];

  return (
    <div
      className="keyboard-shortcuts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        className={`keyboard-shortcuts-dialog ${isDarkMode ? 'dark' : 'light'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close keyboard shortcuts dialog"
          >
            ×
          </button>
        </div>

        <div className="shortcuts-content">
          {shortcuts.map((section) => (
            <section key={section.category} className="shortcuts-section">
              <h3>{section.category}</h3>
              <dl className="shortcuts-list">
                {section.items.map((item, index) => (
                  <div key={index} className="shortcut-item">
                    <dt className="shortcut-key">
                      <kbd>{item.key}</kbd>
                    </dt>
                    <dd className="shortcut-description">{item.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p className="shortcuts-note">
            <strong>Tip:</strong> Press <kbd>?</kbd> anytime to view this help.
          </p>
          <button onClick={onClose} className="close-btn">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;


