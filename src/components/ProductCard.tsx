import Link from "next/link";
import type { Product } from "@/lib/products";
import { inclusions } from "@/lib/products";
import { money } from "@/lib/format";

/** canBuy=false: el plazo de compra terminó (se ve el paquete pero no el botón). */
export function ProductCard({ product, canBuy = true }: { product: Product; canBuy?: boolean }) {
  const featured = Boolean(product.highlight);
  return (
    <article className={`product-card${featured ? " product-card--featured" : ""}`}>
      <div className="product-card__photo" style={{ backgroundImage: product.image_url ? `url('${product.image_url}')` : undefined }}>
        {product.highlight && <span className="product-card__badge">{product.highlight}</span>}
        <span className="product-card__ref">Imagen referencial</span>
      </div>
      <div className="product-card__body">
        <div className="product-card__head">
          <h3 className="product-card__name">{product.name}</h3>
          <div className="product-card__price">{product.purchasable ? money(product.price) : "Próximamente"}</div>
        </div>
        <span className="product-card__includes">INCLUYE</span>
        <ul className="check-list">
          {inclusions(product).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {product.purchasable && canBuy && (
          <Link href={`/cuenta/activar/${product.slug}`} className="btn-orange product-card__cta">
            Activar paquete
          </Link>
        )}
      </div>
    </article>
  );
}
