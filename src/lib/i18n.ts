// Spanish display labels. Status rows keep their English label and value in
// the database (stage-type lookups key on them), so translation happens only
// at render time.
const STATUS_LABELS_ES: Record<string, string> = {
  new: "Nueva",
  draft: "Por aplicar",
  applied: "Postulado",
  "in-process": "En proceso",
  interview: "Entrevista",
  offer: "Oferta",
  "offer-accepted": "Oferta aceptada",
  "offer-declined": "Oferta rechazada",
  rejected: "No seleccionado",
  expired: "Vencida",
  archived: "Archivada",
  withdrawn: "Me retiré",
};

export function statusLabel(
  status?: { value?: string | null; label?: string | null } | null,
): string {
  if (!status) return "";
  return (
    (status.value && STATUS_LABELS_ES[status.value]) || status.label || ""
  );
}
