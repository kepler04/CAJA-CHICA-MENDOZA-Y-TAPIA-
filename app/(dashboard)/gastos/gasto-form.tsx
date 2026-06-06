"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Upload,
  FileText,
  X,
  ImageIcon,
} from "lucide-react";
import type { Area, Categoria, TipoComprobante } from "@prisma/client";

import { createGasto } from "@/app/actions/gastos";
import { uploadComprobante } from "@/lib/supabase/storage";
import {
  CATEGORIA_OPTIONS,
  TIPO_COMPROBANTE_OPTIONS,
  MONTO_MAXIMO,
} from "@/lib/gastos";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "application/pdf"];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function GastoForm({
  areas,
  onSuccess,
}: {
  areas: Area[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fecha, setFecha] = useState(hoyISO());
  const [areaId, setAreaId] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<
    TipoComprobante | ""
  >("");
  const [numeroComprobante, setNumeroComprobante] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // El monto máximo lo define el área seleccionada (fallback a la constante).
  const areaSeleccionada = areas.find((a) => a.id === areaId);
  const montoMaximo = areaSeleccionada?.montoMaximo ?? MONTO_MAXIMO;

  // Validación de monto en tiempo real
  const montoNum = parseFloat(monto);
  const montoExcedido = Number.isFinite(montoNum) && montoNum > montoMaximo;
  const montoInvalido = monto !== "" && (!Number.isFinite(montoNum) || montoNum <= 0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED.includes(f.type)) {
      setFileError("Formato no permitido. Usa JPG, PNG o PDF.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError("El archivo supera el máximo de 5MB.");
      return;
    }

    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  }

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const formValido =
    fecha &&
    areaId &&
    categoria &&
    descripcion.trim() &&
    Number.isFinite(montoNum) &&
    montoNum > 0 &&
    !montoExcedido &&
    tipoComprobante;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formValido) {
      setError("Completa todos los campos obligatorios correctamente.");
      return;
    }

    startTransition(async () => {
      // 1) Crear el gasto (sin comprobante aún) para obtener su id.
      const created = await createGasto({
        fecha,
        monto: montoNum,
        descripcion,
        categoria: categoria as Categoria,
        areaId,
        tipoComprobante: tipoComprobante as TipoComprobante,
        numeroComprobante,
      });

      if (!created.ok) {
        setError(created.error);
        return;
      }

      // 2) Si hay comprobante, subirlo y asociar la URL.
      if (file && created.data) {
        const uploaded = await uploadComprobante(file, created.data.id);
        if (uploaded.ok) {
          await fetch("/api/gastos/comprobante", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gastoId: created.data.id,
              comprobanteUrl: uploaded.url,
            }),
          }).catch(() => {});
        }
      }

      onSuccess();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {/* Fecha */}
        <div className="space-y-2">
          <Label htmlFor="g-fecha">
            Fecha <span className="text-destructive">*</span>
          </Label>
          <Input
            id="g-fecha"
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* Área */}
        <div className="space-y-2">
          <Label htmlFor="g-area">
            Área <span className="text-destructive">*</span>
          </Label>
          <Select
            value={areaId}
            onValueChange={setAreaId}
            disabled={isPending}
          >
            <SelectTrigger id="g-area">
              <SelectValue placeholder="Selecciona un área" />
            </SelectTrigger>
            <SelectContent>
              {areas.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  No hay áreas activas.
                </div>
              ) : (
                areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="g-categoria">
            Categoría <span className="text-destructive">*</span>
          </Label>
          <Select
            value={categoria}
            onValueChange={(v) => setCategoria(v as Categoria)}
            disabled={isPending}
          >
            <SelectTrigger id="g-categoria">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIA_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="g-desc">
            Descripción <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="g-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalle del gasto"
            disabled={isPending}
          />
        </div>

        {/* Monto con validación en tiempo real */}
        <div className="space-y-2">
          <Label htmlFor="g-monto">
            Monto (S/) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              S/
            </span>
            <Input
              id="g-monto"
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              disabled={isPending}
              className={cn(
                "pl-8 tabular-nums",
                (montoExcedido || montoInvalido) &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
          </div>
          {montoExcedido ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5" />
              El monto máximo por operación es S/ {montoMaximo}
            </p>
          ) : montoInvalido ? (
            <p className="text-xs text-destructive">
              Ingresa un monto válido mayor a 0.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Límite por operación: S/ {montoMaximo}
            </p>
          )}
        </div>

        {/* Tipo de comprobante */}
        <div className="space-y-2">
          <Label htmlFor="g-tipo">
            Tipo de comprobante <span className="text-destructive">*</span>
          </Label>
          <Select
            value={tipoComprobante}
            onValueChange={(v) => setTipoComprobante(v as TipoComprobante)}
            disabled={isPending}
          >
            <SelectTrigger id="g-tipo">
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_COMPROBANTE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Número de comprobante */}
        <div className="space-y-2">
          <Label htmlFor="g-numero">Número de comprobante</Label>
          <Input
            id="g-numero"
            value={numeroComprobante}
            onChange={(e) => setNumeroComprobante(e.target.value)}
            placeholder="Opcional (ej. F001-00012345)"
            disabled={isPending}
          />
        </div>

        {/* Upload de comprobante */}
        <div className="space-y-2">
          <Label>Comprobante (JPG, PNG o PDF · máx 5MB)</Label>
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <Upload className="size-5" />
              <span>Haz clic para subir un archivo</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Vista previa del comprobante"
                  className="size-14 rounded-md object-cover ring-1 ring-border"
                />
              ) : (
                <div className="grid size-14 place-items-center rounded-md bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                  <FileText className="size-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB ·{" "}
                  {file.type.startsWith("image/") ? "Imagen" : "PDF"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                disabled={isPending}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          {fileError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {fileError}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <SheetFooter>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isPending || !formValido}
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          <ImageIcon className="size-4" />
          Registrar gasto
        </Button>
      </SheetFooter>
    </form>
  );
}
