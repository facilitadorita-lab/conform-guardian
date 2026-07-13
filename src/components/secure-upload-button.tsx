import { useRef, useState } from "react";
import { Upload, Loader2, Check, Eye } from "lucide-react";
import { edgeFunctionsService } from "@/services";

type Contexto =
  "documentos" | "equipamentos" | "calibracoes" | "qualificacoes" | "manutencoes" | "pendencias";

export function SecureUploadButton({
  contexto,
  empresaId,
  referenciaId,
  finalidade,
  label = "Enviar anexo",
  accept,
  onUploaded,
}: {
  contexto: Contexto;
  empresaId: string;
  referenciaId: string;
  finalidade?: string;
  label?: string;
  accept?: string;
  onUploaded?: (evidenceId: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [successAnexoId, setSuccessAnexoId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErro(null);
    setSuccessUrl(null);
    setSuccessAnexoId(null);
    setProgress(0);
    setState("uploading");
    try {
      edgeFunctionsService.validateAttachmentFile(file);
      const { anexoId, signedUrl } = await edgeFunctionsService.uploadAnexoSeguro(file, {
        empresaId,
        modulo: contexto,
        registroId: referenciaId,
        finalidade,
        onProgress: setProgress,
      });
      setState("done");
      setSuccessUrl(signedUrl ?? null);
      setSuccessAnexoId(anexoId ?? null);
      onUploaded?.(anexoId ?? "", file);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
      setState("idle");
      setProgress(0);
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
        {state === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {state === "done" ? "Enviado" : label}
      </button>
      {state === "uploading" && (
        <div className="w-52 rounded-md border border-border bg-muted/30 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Enviando anexo</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {state === "done" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-success">
          <span>Anexo salvo com sucesso.</span>
          {successUrl && (
            <a
              href={successUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (successAnexoId) void edgeFunctionsService.registrarEventoAnexo(successAnexoId);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-success/30 px-2 py-1 font-medium hover:bg-muted"
            >
              <Eye className="h-3.5 w-3.5" /> Visualizar
            </a>
          )}
        </div>
      )}
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}
