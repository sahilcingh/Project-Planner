export type StackOptionSeed = {
  slug: string;
  name: string;
  summary: string;
  components: {
    frontend?: string;
    backend?: string;
    database?: string;
    hosting?: string;
    auth?: string;
  };
  tags: {
    teamSize: ("solo" | "small" | "medium" | "large")[];
    budgetTier: ("free" | "low" | "medium" | "high")[];
    realtime: boolean;
    mobileSupport: boolean;
    learningCurve: "low" | "medium" | "high";
  };
};

/**
 * Curated reference catalog the scoring engine ranks against. Kept as a
 * plain TS module (not just DB rows) so it can be unit tested and seeded
 * deterministically.
 */
export const STACK_CATALOG: StackOptionSeed[] = [
  {
    slug: "nextjs-supabase",
    name: "Next.js + Supabase",
    summary:
      "TypeScript full-stack SaaS: Next.js frontend/API, Postgres + Auth via Supabase, deployed on Vercel.",
    components: {
      frontend: "Next.js",
      backend: "Next.js API routes / tRPC",
      database: "Postgres (Supabase)",
      hosting: "Vercel",
      auth: "Supabase Auth",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["free", "low", "medium"],
      realtime: false,
      mobileSupport: false,
      learningCurve: "low",
    },
  },
  {
    slug: "nextjs-supabase-realtime",
    name: "Next.js + Supabase Realtime",
    summary:
      "Same as Next.js + Supabase, but leans on Supabase Realtime channels for live collaboration/data sync.",
    components: {
      frontend: "Next.js",
      backend: "Next.js API routes / tRPC",
      database: "Postgres (Supabase)",
      hosting: "Vercel",
      auth: "Supabase Auth",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["low", "medium"],
      realtime: true,
      mobileSupport: false,
      learningCurve: "medium",
    },
  },
  {
    slug: "expo-supabase",
    name: "Expo (React Native) + Supabase",
    summary:
      "Cross-platform mobile app with a single React Native codebase, Supabase for backend/auth/data.",
    components: {
      frontend: "Expo / React Native",
      backend: "Supabase Edge Functions",
      database: "Postgres (Supabase)",
      hosting: "EAS / Vercel (web companion)",
      auth: "Supabase Auth",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["free", "low", "medium"],
      realtime: true,
      mobileSupport: true,
      learningCurve: "medium",
    },
  },
  {
    slug: "sveltekit-postgres",
    name: "SvelteKit + Postgres",
    summary:
      "Lightweight, fast-shipping full-stack option for small teams who want less framework overhead than Next.js.",
    components: {
      frontend: "SvelteKit",
      backend: "SvelteKit server routes",
      database: "Postgres (Neon/Railway)",
      hosting: "Vercel / Fly.io",
      auth: "Lucia / Auth.js",
    },
    tags: {
      teamSize: ["solo", "small"],
      budgetTier: ["free", "low"],
      realtime: false,
      mobileSupport: false,
      learningCurve: "low",
    },
  },
  {
    slug: "django-postgres",
    name: "Django + Postgres",
    summary:
      "Batteries-included Python framework — admin panel, ORM and auth built in. Great for data-heavy internal tools.",
    components: {
      frontend: "Django templates / React SPA",
      backend: "Django",
      database: "Postgres",
      hosting: "Render / Fly.io",
      auth: "Django auth",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["free", "low", "medium"],
      realtime: false,
      mobileSupport: false,
      learningCurve: "medium",
    },
  },
  {
    slug: "rails-postgres",
    name: "Ruby on Rails + Postgres",
    summary:
      "Convention-over-configuration full-stack framework, fast for CRUD-heavy MVPs with a small team.",
    components: {
      frontend: "Rails views / Hotwire",
      backend: "Rails",
      database: "Postgres",
      hosting: "Render / Heroku",
      auth: "Devise",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["free", "low", "medium"],
      realtime: true,
      mobileSupport: false,
      learningCurve: "medium",
    },
  },
  {
    slug: "nestjs-microservices",
    name: "NestJS Microservices + Postgres",
    summary:
      "Structured, modular Node backend for teams anticipating multiple services and larger engineering headcount.",
    components: {
      frontend: "Next.js / React SPA",
      backend: "NestJS (multi-service)",
      database: "Postgres",
      hosting: "AWS ECS / GCP Cloud Run",
      auth: "Auth0 / Cognito",
    },
    tags: {
      teamSize: ["medium", "large"],
      budgetTier: ["medium", "high"],
      realtime: true,
      mobileSupport: false,
      learningCurve: "high",
    },
  },
  {
    slug: "fastapi-postgres-ml",
    name: "FastAPI + Postgres (AI/data product)",
    summary:
      "Python backend suited to products doing ML inference, data pipelines, or heavy use of the Python AI ecosystem.",
    components: {
      frontend: "Next.js / React SPA",
      backend: "FastAPI",
      database: "Postgres + pgvector",
      hosting: "Fly.io / AWS",
      auth: "Auth.js / Clerk",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["low", "medium", "high"],
      realtime: false,
      mobileSupport: false,
      learningCurve: "medium",
    },
  },
  {
    slug: "astro-static",
    name: "Astro static site",
    summary:
      "Content-focused marketing/docs site with minimal JS, no real backend needed.",
    components: {
      frontend: "Astro",
      backend: undefined,
      database: undefined,
      hosting: "Vercel / Netlify / Cloudflare Pages",
      auth: undefined,
    },
    tags: {
      teamSize: ["solo", "small"],
      budgetTier: ["free"],
      realtime: false,
      mobileSupport: false,
      learningCurve: "low",
    },
  },
  {
    slug: "laravel-postgres",
    name: "Laravel + Postgres",
    summary:
      "Mature PHP full-stack framework with strong conventions — a solid fit for teams already fluent in PHP.",
    components: {
      frontend: "Blade / Inertia + React",
      backend: "Laravel",
      database: "Postgres / MySQL",
      hosting: "Laravel Forge / Render",
      auth: "Laravel Breeze",
    },
    tags: {
      teamSize: ["solo", "small", "medium"],
      budgetTier: ["free", "low", "medium"],
      realtime: true,
      mobileSupport: false,
      learningCurve: "medium",
    },
  },
];
