"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export function CompanyLogoUploader({
  companyId,
  companyName,
  currentLogoUrl,
}: {
  companyId: string;
  companyName: string;
  currentLogoUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no admitido. Usa PNG, JPG, SVG o WEBP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("El archivo supera los 2MB. Usa una imagen más liviana.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop() || "png";
    const path = `${companyId}/logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("company-logos").getPublicUrl(path);

    const { error: rpcError } = await supabase.rpc("update_company_logo", {
      p_logo_url: publicUrlData.publicUrl,
    });

    setUploading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.refresh();
  }

  async function handleRemove() {
    if (!window.confirm("¿Quitar el logotipo? Volverá a mostrarse el nombre de tu empresa.")) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_company_logo", { p_logo_url: null });
    setUploading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="logo-uploader">
      <div className="logo-uploader__preview">
        {currentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentLogoUrl} alt={`Logo de ${companyName}`} />
        ) : (
          <span className="logo-uploader__placeholder">{companyName}</span>
        )}
      </div>

      <div className="logo-uploader__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn-outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Subiendo..." : currentLogoUrl ? "Cambiar logotipo" : "Subir logotipo"}
        </button>
        {currentLogoUrl && (
          <button type="button" className="link-button" onClick={handleRemove} disabled={uploading}>
            Quitar logotipo
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="modal__note">PNG, JPG, SVG o WEBP · máximo 2MB. Se usará en tu portal, en el certificado y en el correo del beneficiario.</p>
    </div>
  );
}
