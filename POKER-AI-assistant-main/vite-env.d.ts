interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for AI Studio integration
interface Window {
  aistudio?: {
    openSelectKey?: () => Promise<void>;
    hasSelectedApiKey?: () => Promise<boolean>;
  };
}
