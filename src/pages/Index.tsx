import { useState, useRef } from "react";
import { Upload, Download, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    original_url: string;
    colored_url: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    } else {
      setPreview(null);
    }
  };

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
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Blueprint Colorizer</h1>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Upload area */}
          {!result && (
            <Card className="border-dashed">
              <CardContent className="py-10 flex flex-col items-center gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 rounded-md border border-border object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-10 w-10" />
                    <p className="text-sm">Upload a black & white blueprint</p>
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                  >
                    {preview ? "Change File" : "Choose File"}
                  </Button>

                  {preview && (
                    <Button
                      size="sm"
                      onClick={handleColorize}
                      disabled={!file || loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        "Colorize"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Original</p>
                    <img
                      src={result.original_url}
                      alt="Original blueprint"
                      className="w-full rounded border border-border"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Colorized</p>
                    <img
                      src={result.colored_url}
                      alt="Colorized blueprint"
                      className="w-full rounded border border-border"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                >
                  New Upload
                </Button>
                <Button size="sm" asChild>
                  <a
                    href={result.colored_url}
                    download="colorized-blueprint.png"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
