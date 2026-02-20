import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    original_url: string;
    colored_url: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleColorize = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/colorize`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Colorization failed");
      }

      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Architectural Blueprint Colorizer
      </h1>

      <div className="flex items-center gap-3 mb-4">
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm"
          disabled={loading}
        />
        <button
          onClick={handleColorize}
          disabled={!file || loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
        >
          {loading ? "Processing…" : "Colorize"}
        </button>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm mb-4">
          Generating colored version… this may take a minute.
        </p>
      )}

      {error && (
        <p className="text-destructive text-sm mb-4">{error}</p>
      )}

      {result && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium mb-1">Original</p>
              <img
                src={result.original_url}
                alt="Original blueprint"
                className="w-full border border-border rounded"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Colorized</p>
              <img
                src={result.colored_url}
                alt="Colorized blueprint"
                className="w-full border border-border rounded"
              />
            </div>
          </div>
          <a
            href={result.colored_url}
            download="colorized-blueprint.png"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
          >
            Download Colored Image
          </a>
        </div>
      )}
    </div>
  );
};

export default Index;
