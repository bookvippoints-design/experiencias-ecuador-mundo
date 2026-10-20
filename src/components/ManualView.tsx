/** Muestra un manual de usuario (HTML generado desde nuestro propio Markdown). */
export function ManualView({ html, title, lead }: { html: string; title: string; lead: string }) {
  return (
    <article className="manual">
      <header className="manual__head">
        <h2>{title}</h2>
        <p>{lead}</p>
        <a href="#" className="manual__print" data-print="1">Imprimir o guardar en PDF</a>
      </header>
      <nav className="manual__toc" aria-label="Contenido">
        <strong>Contenido</strong>
        <ol>{[...html.matchAll(/<h2>(.*?)<\/h2>/g)].map((m, i) => <li key={i}><a href={`#s${i + 1}`}>{m[1].replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
      </nav>
      <div className="manual__body" dangerouslySetInnerHTML={{ __html: (() => { let i = 0; return html.replace(/<h2>/g, () => `<h2 id="s${++i}">`); })() }} />
    </article>
  );
}
