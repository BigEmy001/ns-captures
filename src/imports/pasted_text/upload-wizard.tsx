{
  "project": {
    "name": "NS CAPTURES",
    "type": "Enterprise Stock Photography Marketplace",
    "description": "A premium image marketplace similar to Unsplash, Pexels, Adobe Stock and ImageBroker. Built with modern architecture, reusable components and scalable design system."
  },

  "tech_stack": {
    "frontend": "Next.js 15 (App Router)",
    "language": "TypeScript",
    "styling": "Tailwind CSS v4",
    "components": "shadcn/ui",
    "icons": "Lucide React",
    "animation": "Framer Motion",
    "tables": "TanStack Table",
    "forms": "React Hook Form + Zod",
    "charts": "Recharts",
    "state": "Zustand",
    "server_state": "TanStack Query",
    "authentication": "Clerk",
    "database": "Supabase PostgreSQL",
    "storage": "Supabase Storage",
    "payments": [
      "Stripe",
      "Paystack",
      "Flutterwave"
    ]
  },

  "architecture": {
    "pattern": "Atomic Design + Feature Driven Architecture",
    "requirements": [
      "Everything must be component based.",
      "Never duplicate UI.",
      "Every repeated UI must become its own reusable component.",
      "Every page should be composed from reusable sections.",
      "Components should support variants.",
      "Every component must accept props.",
      "Everything must support dark mode.",
      "Everything must support responsive layouts."
    ]
  },

  "folder_structure": {
    "app": {},
    "components": {
      "ui": {},
      "layout": {},
      "navigation": {},
      "search": {},
      "cards": {},
      "gallery": {},
      "dashboard": {},
      "tables": {},
      "forms": {},
      "charts": {},
      "dialogs": {},
      "modals": {},
      "empty-states": {},
      "skeletons": {}
    },
    "features": {
      "auth": {},
      "gallery": {},
      "collections": {},
      "downloads": {},
      "payments": {},
      "upload": {},
      "portfolio": {},
      "analytics": {},
      "admin": {}
    }
  },

  "design_system": {
    "grid": "8pt",
    "border_radius": [
      8,
      12,
      16,
      24
    ],
    "spacing": [
      4,
      8,
      12,
      16,
      24,
      32,
      48,
      64,
      96
    ],
    "font": "Inter",
    "style": [
      "Apple",
      "Linear",
      "Notion",
      "Unsplash",
      "Pexels"
    ],
    "rules": [
      "Large photography.",
      "Minimal chrome.",
      "Lots of whitespace.",
      "Cards should breathe.",
      "Do not overuse shadows.",
      "No gradients unless necessary.",
      "Editorial typography."
    ]
  },

  "theme": {
    "light": {
      "background": "#FFFFFF",
      "surface": "#FAFAFA",
      "border": "#E5E7EB",
      "text": "#111827",
      "muted": "#6B7280",
      "primary": "#0057FF",
      "success": "#10B981",
      "warning": "#F59E0B",
      "danger": "#EF4444"
    },
    "dark": {
      "background": "#090909",
      "surface": "#141414",
      "border": "#262626",
      "text": "#FAFAFA",
      "muted": "#9CA3AF",
      "primary": "#4F8DFF",
      "success": "#34D399",
      "warning": "#FBBF24",
      "danger": "#F87171"
    }
  },

  "pages": {
    "public": [
      "Landing",
      "Explore",
      "Search Results",
      "Categories",
      "Collections",
      "Image Details",
      "Photographer Profile",
      "Pricing",
      "Licensing",
      "About",
      "Contact",
      "Blog"
    ],
    "authentication": [
      "Login",
      "Register",
      "Forgot Password",
      "Email Verification",
      "Two Factor Authentication"
    ],
    "user_dashboard": [
      "Overview",
      "Downloads",
      "Collections",
      "Favorites",
      "Purchase History",
      "Invoices",
      "Notifications",
      "Settings"
    ],
    "creator_dashboard": [
      "Overview",
      "Portfolio",
      "Upload",
      "Analytics",
      "Revenue",
      "Followers",
      "Payouts",
      "Verification"
    ],
    "admin": [
      "Dashboard",
      "Users",
      "Creators",
      "Assets",
      "Moderation",
      "Categories",
      "Collections",
      "Licenses",
      "Payments",
      "Analytics",
      "CMS",
      "Settings"
    ]
  },

  "components": [
    {
      "name": "Navbar",
      "path": "components/layout/navbar.tsx",
      "props": [
        "user",
        "notifications",
        "darkMode"
      ]
    },
    {
      "name": "HeroSearch",
      "path": "components/search/hero-search.tsx",
      "props": [
        "placeholder",
        "categories",
        "suggestions"
      ]
    },
    {
      "name": "PhotoCard",
      "path": "components/gallery/photo-card.tsx",
      "props": [
        "image",
        "photographer",
        "likes",
        "downloads",
        "license",
        "hoverActions"
      ]
    },
    {
      "name": "MasonryGrid",
      "path": "components/gallery/masonry-grid.tsx",
      "props": [
        "photos",
        "columns",
        "gap"
      ]
    },
    {
      "name": "UploadWizard",
      "path": "components/upload/upload-wizard.tsx",
      "props": [
        "step",
        "files",
        "metadata"
      ]
    },
    {
      "name": "RevenueChart",
      "path": "components/dashboard/revenue-chart.tsx",
      "props": [
        "data"
      ]
    }
  ],

  "engineering_rules": [
    "Every page MUST be built entirely from reusable React components.",
    "Every component must live inside the components directory.",
    "Every repeated layout must become a shared component.",
    "No inline styles.",
    "No duplicated JSX.",
    "No duplicated Tailwind classes when a reusable component can be created.",
    "Use class-variance-authority for variants.",
    "Use shadcn/ui primitives where appropriate.",
    "Every form must use React Hook Form and Zod.",
    "Every API request must use TanStack Query.",
    "Every table must use TanStack Table.",
    "Every chart must use Recharts.",
    "Everything must be fully typed with TypeScript.",
    "Use Server Components by default.",
    "Use Client Components only when interactive behavior is required.",
    "Create loading.tsx, error.tsx and not-found.tsx for every route.",
    "Every screen must have empty states.",
    "Every screen must have skeleton loaders.",
    "Every screen must support dark mode.",
    "Every screen must pass accessibility standards.",
    "Every reusable section should be exported independently."
  ],

  "final_instruction": "Generate production-ready code. Do not generate mockups. Build a complete application using reusable components. If a component is repeated twice, refactor it into a shared component. Create clean folder structures, typed props, reusable hooks, utility functions, constants, and configuration files. Build the design system first, then implement every page using those components. The output should be scalable enough to support hundreds of future screens without major refactoring."
}