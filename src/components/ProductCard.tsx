import Link from "next/link";
import type { Product } from "@/lib/products";
import { inclusions } from "@/lib/products";
import { money } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const featured = Boolean(product.highlight);
  return (
    <article className={`product-card${featured ? " product-card--featured" : ""}`}>
      <div className="product-card__photo" style={{ backgroundImage: product.image_url ? `url('${product.image_url}')` : undefined }}>
        {product.highlight && <span className="product-card__badge">{product.highlight}</span>}
        <span className="product-card__ref">Imagen referencial</span>
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        {product.tagline && <p className="product-card__tagline">{product.tagline}</p>}
        <div className="product-card__price">
          {product.purchasable ? money(product.price) : "Próximamente"}
          {product.purchasable && product.category === "escape" && <small> precio total</small>}
        </div>
        {product.international_count > 0 && <span className="fee-badge">Fee de emisión US$0</span>}
        <ul className="check-list">
          {inclusions(product).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="product-card__actions">
          <Link href={`/cuenta/catalogo/${product.slug}`} className="btn-ghost btn-small">
            Ver detalle
          </Link>
          {product.purchasable && (
            <>
              <Link href={`/cuenta/catalogo/${product.slug}?modo=self`} className="btn-blue btn-small">
                Lo quiero para mí
              </Link>
              <Link href={`/cuenta/catalogo/${product.slug}?modo=gift`} className="btn-orange btn-small">
                Quiero regalarlo
              </Link>
            </>
          )}
        </div>
        <Link href={`/cuenta/como-funciona#${product.category === "points" ? "puntos" : product.international_count > 0 ? "internacional" : "nacional"}`} className="product-card__how">
          ¿Cómo funciona?
        </Link>
      </div>
    </article>
  );
}
