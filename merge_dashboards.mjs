import fs from 'fs';

const dashboardPath = './src/app/pages/Dashboard.tsx';
const accountPath = './src/app/pages/Account.tsx';
const destPath = './src/app/pages/Account.tsx';

let dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
let accountCode = fs.readFileSync(accountPath, 'utf8');

// 1. Merge Imports
// We'll just grab the imports from Dashboard that aren't in Account.
// To be safe, we'll manually specify the missing imports.
const missingImports = `
import {
  LayoutGrid, Image as ImageIcon, Wallet, Users, Inbox,
  Aperture, Check, X, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import exifr from "exifr";
import { type Orientation, type Photographer, type Brief } from "../data/photos";
import { fetchPhotos, fetchBriefs, fetchPhotographers, fetchPayouts, fetchPhotographerStats, fetchPhotographerMonthlyRevenue, fetchPhotographerWeeklyDownloads, fetchPhotographerTopCategories, fetchFollowerCount, updatePhotoPrice, createPhoto, deletePhoto, updateBriefStatus, fetchPhotographerProfileSettings, upsertPhotographerProfileSettings, type Payout, fetchPaymentMethods, upsertPaymentMethod, createPayoutRequest, fetchPayoutRequests, type PhotographerPaymentMethod, type PayoutRequest, type CryptoWalletEntry } from "../data/db";
`;

// Inject missing imports below the first import in Account.tsx
accountCode = accountCode.replace(/import \{ useState, useEffect \} from "react";/, `import { useState, useEffect, useRef } from "react";\n${missingImports}`);

// 2. Update Nav
const newNavStr = `
const nav = [
  { id: "overview", label: "Profile", icon: User, heading: "PERSONAL" },
  { id: "collections", label: "Collections", icon: FolderHeart },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "licenses", label: "Licenses", icon: FileText },
  
  // Creator Hub (Rendered conditionally later, but defined here)
  { id: "dashboard", label: "Dashboard", icon: Activity, heading: "CREATOR HUB", isCreator: true },
  { id: "portfolio", label: "Portfolio", icon: ImageIcon, isCreator: true },
  { id: "analytics", label: "Analytics", icon: TrendingUp, isCreator: true },
  { id: "requests", label: "Requests", icon: Inbox, isCreator: true },
  { id: "payouts", label: "Payouts", icon: Wallet, isCreator: true },
  { id: "followers", label: "Followers", icon: Users, isCreator: true },

  { id: "activity", label: "Activity", icon: Bell, heading: "ACCOUNT", divider: true },
  { id: "security", label: "Settings", icon: Settings },
  { id: "billing", label: "Billing", icon: CreditCard },
];
`;
accountCode = accountCode.replace(/const nav = \[\s*\{ id: "overview"[\s\S]*?\];/, newNavStr);

// Also update SideNav instantiation to filter by role
accountCode = accountCode.replace(
  /<SideNav\s+items=\{nav\}/,
  `<SideNav\n          items={nav.filter(n => !n.isCreator || user?.role === "Photographer" || user?.role === "Admin")}`
);

// 3. Extract logic from Dashboard.tsx
// We need to extract everything between `const { user } = useAuth();` and `return (`
const logicRegex = /const \{ user \} = useAuth\(\);([\s\S]*?)\s*return \(/;
const logicMatch = dashboardCode.match(logicRegex);
const dashboardLogic = logicMatch ? logicMatch[1] : '';

// 4. Extract CustomTooltip
const tooltipRegex = /const CustomTooltip = \(\{ active, payload, label, prefix = "" \}: any\) => \{[\s\S]*?return null;\n\};\n/;
const tooltipMatch = dashboardCode.match(tooltipRegex);
const tooltipCode = tooltipMatch ? tooltipMatch[0] : '';

// Inject CustomTooltip and logic into Account.tsx
// We'll put CustomTooltip before `export function Account()`
accountCode = accountCode.replace(/export function Account\(\) \{/, `${tooltipCode}\nexport function Account() {`);

// We'll put dashboardLogic right after `const { user, ... } = useAuth();`
accountCode = accountCode.replace(/(const \{ user, [^}]+\} = useAuth\(\);\n  const \[params, setParams\] = useSearchParams\(\);\n  const requestedTab = params\.get\("tab"\);\n  const active = nav\.some\(\(item\) => item\.id === requestedTab\) \? requestedTab! : "overview";\n  const setActive = \(\(id: string\) => \{[\s\S]*?\}\);\n)/, `$1\n${dashboardLogic}\n`);

// 5. Extract Tab JSX from Dashboard.tsx
// We need all the JSX inside `{active === "xxx" && (...)}`
const tabIds = ["dashboard", "portfolio", "analytics", "requests", "payouts", "payment-methods", "followers"];
let extractedTabs = '';
for (const id of tabIds) {
  // Regex to find `{active === "id" && (<div ...> ... </div>)}`
  // We'll use a simpler approach: just find the comment ` {/* X. TAB VIEW */}` and grab until the next one.
  const regex = new RegExp(`{\\/\\* \\d+\\. ${id.replace('-', ' ').toUpperCase()} VIEW \\*\\/}([\\s\\S]*?)(?:{\\/\\* \\d+\\.|<\\/div>\\s*<\\/div>\\s*\\)$)`);
  const match = dashboardCode.match(regex);
  if (match) {
    extractedTabs += `\n{/* --- DASHBOARD PORTED TAB: ${id} --- */}\n` + match[1];
  }
}

// Ensure we grabbed the payment methods modal as well which might be nested or at the end.
// Actually, let's just grab by regex for `{active === "..." && (` and carefully balance brackets if needed.
// A better way is to split Dashboard.tsx by `active ===` and just manually stitch it.

fs.writeFileSync('merge_dashboards_debug.json', JSON.stringify({
  success: true,
  logicLength: dashboardLogic.length,
  tooltipLength: tooltipCode.length,
  extractedTabsLength: extractedTabs.length
}, null, 2));

// Since regex bracket matching is hard in JS, let's just extract the entire block between `{/* 1. OVERVIEW VIEW */}` and `{/* END OF VIEWS */}` if we added a marker, but there is no marker.
// Let's use a simpler marker: from `{/* 1. OVERVIEW VIEW */}` to the end of the return statement.
const viewsRegex = /({\/\* 1\. OVERVIEW VIEW \*\/}[\s\S]*?)(\s*<\/div>\s*<\/div>\s*\)\s*;\s*\}\s*$)/;
const viewsMatch = dashboardCode.match(viewsRegex);
if (viewsMatch) {
  let viewsCode = viewsMatch[1];
  // Replace `active === "overview"` with `active === "dashboard"` for the dashboard overview tab to avoid colliding with Account's overview tab
  viewsCode = viewsCode.replace(/\{active === "overview" && \(/g, '{active === "dashboard" && (');
  
  // Inject these views into Account.tsx just before `{/* Mobile nav */}`
  accountCode = accountCode.replace(/(\s*{\/\* Mobile nav \*\/})/, `\n${viewsCode}\n$1`);
}

fs.writeFileSync(destPath, accountCode);
console.log("Merge complete!");
