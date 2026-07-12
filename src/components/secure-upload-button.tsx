import { useRef, useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { edgeFunctionsService } from "@/services";

type Contexto = "documento" | "equipamento" | "manutencao" | "pendencia" | "outro";

export function SecureUploadButton({
  contexto,
  referenciaId,
  label = "Enviar anexo",
  accept,
  onUploaded,
}: {
  contexto: Contexto;
  referenciaId?: string;
  label?: string;
  accept?: string;
  onUploaded?: (evidenceId: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErro(null);
    setState("uploading");
    try {
      const { evidenceId } = await edgeFunctionsService.uploadAnexoSeguro(file, contexto, referenciaId);
      setState("done");
      onUploaded?.(evidenceId, file);
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
      setState("idle");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
      >
        {state === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
         state === "done" ? <Check className="h-4 w-4 text-success" /> :
         <Upload className="h-4 w-4" />}
        {state === "done" ? "Enviado" : label}
      </button>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}