/**
 * Calcula las iniciales de forma dinámica a partir de un nombre real.
 * Nunca debe existir un valor fijo tipo "AM" en la interfaz: siempre se calcula aquí.
 */
export function getInitials(fullName: string): string {
  const clean = fullName.trim();
  if (!clean) return "??";

  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const capitals = clean.match(/[A-ZÁÉÍÓÚÑ]/g);
  if (capitals && capitals.length >= 2) {
    return (capitals[0] + capitals[1]).toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}
