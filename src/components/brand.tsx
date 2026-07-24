import brandMark from "@/assets/conform-flow-mark.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 50,
  imgClassName,
}: {
  className?: string;
  size?: number;
  imgClassName?: string;
}) {
  return (
    <div
      title="Conform Flow"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-[0_4px_14px_rgba(8,28,51,0.25)] ring-1 ring-white/25",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={brandMark.url}
        alt="Conform Flow"
        className={cn("h-[68%] w-[68%] object-contain", imgClassName)}
        draggable={false}
      />
    </div>
  );
}

export function BrandText({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-0 leading-tight", className)}>
      <div className="whitespace-nowrap text-[15px] font-[650] tracking-tight text-white">
        Conform Flow
      </div>
      <div className="mt-0.5 whitespace-nowrap text-[11px] font-medium text-sky-200/75">
        Gestão de conformidade
      </div>
    </div>
  );
}

export function BrandLockup({
  collapsed,
  size = 50,
}: {
  collapsed?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <BrandMark size={size} />
      {!collapsed ? <BrandText /> : null}
    </div>
  );
}