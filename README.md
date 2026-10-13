# Sticky Action Bar

Keep Cove's list filters, title/count, toolbar actions, and bulk selection actions visible while scrolling. The toolbar sticks below Cove's navigation bar; the selection action row sticks below the toolbar. Offsets adapt to resizing and wrapped mobile toolbars.

## Install

Requires Cove **1.5.1 or newer**. In **Settings → Extensions → Install from URL**, paste:

```text
https://github.com/jiwenjimiran/sticky-action-bar/releases/download/v1.0.0/io.github.jiwenjimiran.sticky-action-bar-1.0.0.zip
```

Enable **Sticky Action Bar**. Refresh Cove if your host version does not reload frontend extensions immediately. Disable the extension to restore normal scrolling.

Applies to shared `.list-page` views. `.list-page-title-group` is inside `.list-page-toolbar` and stays visible with it. The separate bulk selection row also stays accessible when items are selected farther down the page. Uses existing controls and handlers, with no API calls or library writes.

The selection row currently has no named Cove class, so this extension matches its direct-child layout classes. Changes to Cove's list markup may require an extension update. Sticky positioning is bounded by each list, including embedded lists.

## Development

Requires .NET 10, Node.js, and PowerShell.

```powershell
./scripts/package.ps1
npm ci
npx playwright install chromium
npm test
```

The ZIP contains the compiled extension, manifest, and frontend assets at its root. Cove supplies its plugin contracts. Browser checks cover scrolling, selection while scrolled, responsive offsets, navigation, control clicks, and disabling/re-enabling.
