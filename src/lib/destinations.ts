export interface DestinationInfo {
  name: string;
  imageId: string;
  caption?: string;
}

export const NATIONAL_DESTINATIONS: DestinationInfo[] = [
  { name: "Quito", imageId: "photo-1641973240236-250ec59abb1c", caption: "Centro histórico y volcanes" },
  { name: "Guayaquil", imageId: "photo-1628004566999-83b23fdc411f", caption: "Malecón y río Guayas" },
  { name: "Manta", imageId: "photo-1603854690030-13b18ce2a495", caption: "Playa y mar del Pacífico" },
  { name: "Cuenca", imageId: "photo-1660962256234-4ea4f38d444b", caption: "Patrimonio y arquitectura" },
  { name: "Loja", imageId: "photo-1675809367383-ccee004bfab4", caption: "Música, naturaleza y tradición" },
];

/**
 * Imágenes de inspiración para la invitación internacional. Son solo ejemplos
 * referenciales: la invitación da acceso a más de 130 destinos en el mundo.
 */
export const INTERNATIONAL_INSPIRATION: DestinationInfo[] = [
  { name: "Cartagena", imageId: "photo-1672984181706-68495d988419" },
  { name: "Buenos Aires", imageId: "photo-1589909202802-8f4aadce1849" },
  { name: "Río de Janeiro", imageId: "photo-1518639192441-8fce0a366e2e" },
  { name: "Miami", imageId: "photo-1741023705528-2953cb652705" },
];

/** Fotos genéricas de hotel, siempre con la etiqueta "Imagen referencial". */
export const HOTEL_PHOTOS = [
  "photo-1520250497591-112f2f40a3f4",
  "photo-1566073771259-6a8506099945",
  "photo-1551882547-ff40c63fe5fa",
  "photo-1611892440504-42a792e24d32",
];

export function unsplashUrl(imageId: string, width = 400, height = 300): string {
  return `https://images.unsplash.com/${imageId}?w=${width}&h=${height}&fit=crop&auto=format&q=70`;
}
