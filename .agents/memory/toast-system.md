---
name: Toast System
description: Global toast + confirm dialog replacing window.confirm/alert throughout the app
---

ToastProvider wraps the entire app in src/App.tsx (inside AppProvider and BrowserRouter).
Hook: `const toast = useToast()` available in any component.

Methods:
- `toast.success(title, message?)` — green, auto-dismiss 3.8s
- `toast.error(title, message?)` — red, auto-dismiss 3.8s  
- `toast.warning(title, message?)` — orange, auto-dismiss 3.8s
- `toast.info(title, message?)` — blue, auto-dismiss 3.8s
- `toast.confirm(title, message, { confirmText, cancelText, danger })` — Promise<boolean> modal dialog

**Why:** window.confirm/alert is not customizable and looks terrible on mobile. Need native-app feel.
**How to apply:** Import useToast in any component, call instead of window.confirm/alert.
