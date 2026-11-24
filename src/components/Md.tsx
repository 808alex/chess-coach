import type { ReactNode } from 'react';

/** Tiny markdown renderer: ### headings, paragraphs, - and 1. lists, **bold**, *italic*. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith('**') ? <strong key={i++}>{t.slice(2, -2)}</strong> : <em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="md">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*- /.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*- /, ''))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+\. /.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+\. /, ''))}</li>
              ))}
            </ol>
          );
        // A heading possibly followed by a list or paragraph in the same block.
        if (lines[0].startsWith('### ')) {
          return (
            <div key={i}>
              <h3>{inline(lines[0].slice(4))}</h3>
              {lines.length > 1 && <Md text={lines.slice(1).join('\n')} />}
            </div>
          );
        }
        const listStart = lines.findIndex((l) => /^\s*(- |\d+\. )/.test(l));
        if (listStart > 0)
          return (
            <div key={i}>
              <p>{inline(lines.slice(0, listStart).join(' '))}</p>
              <Md text={lines.slice(listStart).join('\n')} />
            </div>
          );
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}
