// Type declarations for Vite-style environment variables used in the app.
// Placed in `src/` so TS picks it up during compilation.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_PROJECT_ID?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  // add other VITE_... vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
