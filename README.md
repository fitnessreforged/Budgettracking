# Budget Dash

A single-page budget dashboard — no build step, no dependencies. Tracks your income (steady base pay + variable commission), fixed costs, variable spending, and how you want the leftover surplus split between savings, a track/car fund, and discretionary spending. Data is saved in your browser only (localStorage) — nothing is sent anywhere.

## File structure

```
budget-app/
├── index.html
├── assets/
│   ├── style.css
│   └── app.js
└── README.md
```

## Run locally

Just open `index.html` in a browser — it's fully static.

## Host on GitHub Pages

1. Create a new GitHub repo (e.g. `budget-dash`) and push these files to it:
   ```bash
   git init
   git add .
   git commit -m "Initial budget dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/budget-dash.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Set branch to `main` and folder to `/ (root)`, then **Save**.
5. GitHub will publish it at:
   ```
   https://YOUR_USERNAME.github.io/budget-dash/
   ```
   (Takes a minute or two after the first push.)

## Editing your numbers

Every field is editable directly on the page — paycheck amount, commission, fixed cost line items (add/remove as needed), variable spending, and the savings/track-fund/fun percentage split. Toggle between **Lean Month** (base pay only) and **Commission Month** to see the gauge and totals update for each scenario.
