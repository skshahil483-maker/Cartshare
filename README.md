# CartShare

CartShare is a no-account collaborative shopping cart for dorms, offices, and trips. Share a six-character room code with your group, add items to the same list, see each person's spend, and print or download a receipt.

## Features

- Create and join rooms with a display name; recent rooms are remembered in this browser.
- Shared cart with item quantities, categories, contributor badges, and owner/creator-only removal.
- Twelve quick-pick catalog items, per-person totals, free-shipping goal, and activity history.
- Live synchronization across open tabs in the same browser profile with BroadcastChannel and the storage event.
- Presence heartbeat, offline cleanup, activity filtering, and creator-only log clearing.
- Receipt with itemized totals, contributor or equal split, print layout, and CSV download.
- Responsive mobile cart cards, accessible controls, and persisted light/dark theme.

## Tech stack

HTML5, CSS3, vanilla JavaScript (ES6+), Bootstrap 5 via CDN, Bootstrap Icons, and browser storage APIs. There is no backend, framework, package manager, or build step.

## Folder structure

```text
cartshare/
├── index.html
├── room.html
├── css/
│   ├── style.css
│   └── print.css
├── js/
│   ├── storage.js
│   ├── auth.js
│   ├── cart.js
│   ├── sync.js
│   ├── activity.js
│   └── receipt.js
├── assets/
│   ├── logo.svg
│   └── favicon.svg
├── README.md
└── .gitignore
```

## Run locally

Open `index.html` in a current browser. For more reliable browser storage behavior, serve the folder with any static server, for example:

```bash
npx serve .
```

Then open the local URL printed by the server. Bootstrap, icons, and fonts load from CDNs, so those details require an internet connection. The app itself has no build step.

## Test multi-user behavior

1. Open the app in two tabs in the same browser window/profile. Incognito windows do **not** share localStorage with normal windows, so they cannot test a shared room together.
2. In the first tab create a room and note the code. In the second tab enter a different display name and join with that code.
3. Add items in either tab and confirm the cart, activity, and online participant list update in the other tab.
4. Add an item from the second user and confirm the first user cannot remove it unless they created the room.

## Deploy

The app is static and can be deployed as-is. Publish the repository root as the site directory; no build command is needed.

### GitHub Pages

1. Push the project to a GitHub repository.
2. In **Settings → Pages**, choose **Deploy from a branch**, select the branch and `/ (root)`, then save.
3. Wait for the Pages URL to appear in the Pages settings.

### Netlify

1. Import the GitHub repository or drag the project folder into Netlify Drop.
2. Set the publish directory to `.` and leave the build command empty.
3. Deploy the site.

### Vercel

1. Import the repository into Vercel.
2. Select the **Other** framework preset, leave the build command empty, and use `.` as the output directory.
3. Deploy.

## Screenshots

- Landing and room entry: `screenshots/landing.png` (add after capture)
- Shared cart desktop: `screenshots/cart-desktop.png` (add after capture)
- Shared cart mobile: `screenshots/cart-mobile.png` (add after capture)
- Printable receipt: `screenshots/receipt.png` (add after capture)

## Manual test checklist

- [ ] Create a room; confirm a six-character code, redirect, and recent-room entry.
- [ ] Join an existing code; verify an unknown code shows a Bootstrap alert.
- [ ] Add a custom item and a catalog item; change quantity and verify totals.
- [ ] Remove an item as its adder and as the creator; verify a different member is denied.
- [ ] Open two tabs in the same profile and confirm cart, activity, and participants sync.
- [ ] Change the shipping goal and add items until the progress message unlocks.
- [ ] Filter the activity feed by a participant and clear it as the creator.
- [ ] Generate a receipt, toggle equal split, download CSV, and inspect print preview.
- [ ] Check layouts at 360px, 768px, and 1200px widths; toggle dark mode.

## Submission

Use the submission name format `BatchID_FullName_CartShare`.

Initialize, commit, and push (replace the URL and branch details for your repository):

```bash
git init
git add .
git commit -m "Build CartShare collaborative shopping app"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## Future improvements

- Firebase or a WebSocket service for true cross-device synchronization and durable shared rooms.
- Authentication and access controls for private groups.
- Currency, tax, and store-specific delivery settings.
- Automated browser tests and hosted screenshots.

## Storage and sync note

Room objects are stored under `cartshare_room_<CODE>` in localStorage. Synchronization is limited to tabs sharing the same browser storage origin; it is not server-backed. As with any static application, users can edit local browser data, and simultaneous writes from separate devices are not supported.