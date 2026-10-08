import { NATIONAL_DESTINATIONS, INTERNATIONAL_INSPIRATION, unsplashUrl } from "@/lib/destinations";

export function NationalGallery() {
  return (
    <div className="gallery">
      {NATIONAL_DESTINATIONS.map((d) => (
        <div key={d.name} className="gallery__item" style={{ backgroundImage: `url('${unsplashUrl(d.imageId, 500, 360)}')` }}>
          <span className="gallery__ref">Imagen referencial</span>
          <div className="gallery__label">
            <strong>{d.name}</strong>
            <span>{d.caption}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InternationalGallery() {
  return (
    <div className="gallery">
      {INTERNATIONAL_INSPIRATION.map((d) => (
        <div key={d.name} className="gallery__item" style={{ backgroundImage: `url('${unsplashUrl(d.imageId, 500, 360)}')` }}>
          <span className="gallery__ref">Imagen referencial</span>
          <div className="gallery__label">
            <strong>{d.name}</strong>
            <span>Uno de más de 130 destinos</span>
          </div>
        </div>
      ))}
    </div>
  );
}
