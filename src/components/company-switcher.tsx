import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EmpresaResumo } from "@/types";

type CompanySwitcherProps = {
  empresas: EmpresaResumo[];
  empresaAtual: EmpresaResumo;
  onSelectEmpresa: (empresaId: string) => Promise<void> | void;
};

export function CompanySwitcher({ empresas, empresaAtual, onSelectEmpresa }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false);

  const empresasOrdenadas = useMemo(
    () => [...empresas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [empresas],
  );

  const selecionarEmpresa = async (empresaId: string) => {
    if (empresaId === empresaAtual.id) {
      setOpen(false);
      return;
    }

    setOpen(false);
    await onSelectEmpresa(empresaId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecionar empresa"
          className="h-10 w-[240px] max-w-[280px] justify-between gap-2 px-3 text-left text-xs font-medium xl:w-[260px]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{empresaAtual.nome}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0">
        <Command shouldFilter>
          <div className="border-b px-3 py-2">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Buscar empresa
            </div>
            <CommandInput placeholder="Digite nome ou CNPJ..." />
          </div>

          <CommandList className="max-h-[360px]">
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup heading={`${empresasOrdenadas.length} empresas disponíveis`}>
              {empresasOrdenadas.map((empresa) => {
                const selected = empresa.id === empresaAtual.id;

                return (
                  <CommandItem
                    key={empresa.id}
                    value={`${empresa.nome} ${empresa.cnpj}`}
                    onSelect={() => selecionarEmpresa(empresa.id)}
                    className="items-start gap-3 py-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{empresa.nome}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        CNPJ {empresa.cnpj}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
