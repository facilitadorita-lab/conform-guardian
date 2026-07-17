import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Eye, FileWarning } from "lucide-react";

type AttachmentViewerProps = {
  url?: string | null;
  name?: string | null;
  mimeType?: string | null;
  title: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const pdfMimeTypes = new Set(["application/pdf"]);
const officeMimeTypes = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function AttachmentViewer({
  url,
  name,
  mimeType,
  title,
  emptyTitle = "Pré-visualização do registro",
  emptyDescription = "Este registro ainda não possui arquivo disponível para abrir no navegador.",
}: AttachmentViewerProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [blobError, setBlobError] = useState<string | null>(null);

  const fileInfo = useMemo(() => {
    const normalizedMime = (mimeType ?? "").toLowerCase();
    const normalizedName = (name ?? title ?? "").toLowerCase();
    const isPdf = pdfMimeTypes.has(normalizedMime) || normalizedName.endsWith(".pdf");
    const isImage =
      normalizedMime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(normalizedName);
    const isOffice =
      officeMimeTypes.has(normalizedMime) || /\.(docx?|xlsx?|pptx?)$/i.test(normalizedName);

    return { isPdf, isImage, isOffice };
  }, [mimeType, name, title]);

  useEffect(() => {
    setPreviewFailed(false);
    setBlobError(null);
    setBlobUrl(null);
  }, [url]);

  useEffect(() => {
    if (!url || !(fileInfo.isPdf || fileInfo.isImage)) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setIsLoadingBlob(true);
    setBlobError(null);

    fetchAttachmentObjectUrl(url)
      .then((nextObjectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }

        objectUrl = nextObjectUrl;
        setBlobUrl(nextObjectUrl);
      })
      .catch((error: unknown) => {
        if (!cancelled) setBlobError(toAttachmentErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBlob(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileInfo.isImage, fileInfo.isPdf, url]);

  async function openAttachment() {
    if (!url) return;

    setBlobError(null);
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const objectUrl = blobUrl ?? (await fetchAttachmentObjectUrl(url));

      if (popup) {
        popup.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (popup) popup.close();
      setBlobError(toAttachmentErrorMessage(error));
    }
  }

  async function downloadAttachment() {
    if (!url) return;

    setBlobError(null);

    try {
      const objectUrl = blobUrl ?? (await fetchAttachmentObjectUrl(url));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name || title || "anexo";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      if (!blobUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      }
    } catch (error) {
      setBlobError(toAttachmentErrorMessage(error));
    }
  }

  if (!url) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
        <div className="max-w-md">
          <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-base font-semibold text-foreground">{emptyTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  const canEmbed = !previewFailed && Boolean(blobUrl) && (fileInfo.isPdf || fileInfo.isImage);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name || title}</p>
          <p className="text-xs text-muted-foreground">
            {fileInfo.isPdf || fileInfo.isImage
              ? "Pré-visualização segura dentro do app. Se o navegador bloquear o Storage, avisaremos aqui."
              : "Este formato não possui pré-visualização nativa no navegador."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAttachment}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-accent hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova guia
          </button>
          <button
            type="button"
            onClick={downloadAttachment}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" /> Baixar
          </button>
        </div>
      </div>

      {blobError ? (
        <AttachmentBlockedState isOffice={fileInfo.isOffice} message={blobError} />
      ) : isLoadingBlob && (fileInfo.isPdf || fileInfo.isImage) ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-background p-8 text-center">
          <div className="max-w-md">
            <Eye className="mx-auto h-10 w-10 animate-pulse text-muted-foreground" />
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Carregando anexo com segurança
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos preparando uma visualização temporária dentro do Conform Flow.
            </p>
          </div>
        </div>
      ) : canEmbed ? (
        fileInfo.isImage ? (
          <div className="flex min-h-[420px] items-center justify-center overflow-auto rounded-xl border border-border bg-background p-4">
            <img
              src={blobUrl ?? undefined}
              alt={name || title}
              onError={() => setPreviewFailed(true)}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <iframe
            title={`Visualização de ${title}`}
            src={blobUrl ?? undefined}
            onError={() => setPreviewFailed(true)}
            className="h-[70vh] min-h-[420px] w-full rounded-xl border border-border bg-background"
          />
        )
      ) : (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
          <div className="max-w-md">
            <FileWarning className="mx-auto h-10 w-10 text-warning" />
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Não consegui carregar o anexo aqui dentro
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {fileInfo.isOffice
                ? "Arquivos Word, Excel e PowerPoint normalmente não abrem embutidos no navegador. O anexo está salvo; use baixar para abrir no seu computador."
                : "O arquivo está salvo, mas o navegador bloqueou ou não reconheceu a pré-visualização."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AttachmentBlockedState({ isOffice, message }: { isOffice: boolean; message: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
      <div className="max-w-md">
        <FileWarning className="mx-auto h-10 w-10 text-warning" />
        <h3 className="mt-4 text-base font-semibold text-foreground">
          O navegador bloqueou o acesso ao anexo
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isOffice
            ? "Arquivos Word, Excel e PowerPoint normalmente precisam ser baixados para abrir. Mesmo assim, o navegador bloqueou o acesso ao Storage."
            : message}
        </p>
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
          No Microsoft Edge, desative temporariamente extensões de bloqueio/AdBlock ou adicione{" "}
          <strong>tvtpxgzwhakpypjdzphe.supabase.co</strong> à lista de sites permitidos.
        </p>
      </div>
    </div>
  );
}

async function fetchAttachmentObjectUrl(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });

  if (!response.ok) {
    throw new Error(`Falha ao carregar anexo (${response.status}).`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function toAttachmentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("load failed")) {
    return "O arquivo está salvo, mas o navegador bloqueou a conexão com o Storage do Supabase.";
  }

  return message || "Não foi possível carregar o anexo neste navegador.";
}
