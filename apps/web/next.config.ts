import type { NextConfig } from "next";

// The local-AI rationale feature downloads a several-hundred-MB model and
// runs inference in-process — fine for a persistent server (`next start`),
// but Vercel's serverless functions are ephemeral and would have to
// re-download the model on every cold start, blowing past the function
// timeout. Auto-disable it whenever VERCEL is set (Vercel sets this on
// every build, preview or production), unless explicitly forced back on.
const localAiDisabled = process.env.VERCEL && process.env.LOCAL_AI_FORCE_ENABLE !== "true";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LOCAL_AI_DISABLED: localAiDisabled ? "1" : "",
  },
};

export default nextConfig;
