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

  useEffect(() => {
    setPreviewFailed(false);
  }, [url]);

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

  const canEmbed = !previewFailed && (fileInfo.isPdf || fileInfo.isImage);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name || title}</p>
          <p className="text-xs text-muted-foreground">
            {fileInfo.isPdf || fileInfo.isImage
              ? "Pré-visualização disponível. Se não carregar, abra em nova guia."
              : "Este formato não possui pré-visualização nativa no navegador."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-accent hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova guia
          </a>
          <a
            href={url}
            download={name || undefined}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" /> Baixar
          </a>
        </div>
      </div>

      {canEmbed ? (
        fileInfo.isImage ? (
          <div className="flex min-h-[420px] items-center justify-center overflow-auto rounded-xl border border-border bg-background p-4">
            <img
              src={url}
              alt={name || title}
              onError={() => setPreviewFailed(true)}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <iframe
            title={`Visualização de ${title}`}
            src={url}
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
                ? "Arquivos Word, Excel e PowerPoint normalmente não abrem embutidos no navegador. O anexo está salvo; use abrir em nova guia ou baixar."
                : "O arquivo está salvo, mas o navegador bloqueou ou não reconheceu a pré-visualização. Use abrir em nova guia ou baixar."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
