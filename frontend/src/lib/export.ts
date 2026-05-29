import type { ColumnDef, OilField } from './fields'
import { fmt } from './fields'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export function exportCSV(rows: OilField[], cols: ColumnDef[]) {
  const head = cols.map((c) => `"${c.label}${c.unit ? ` (${c.unit})` : ''}"`).join(',')
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c.key]
          const cell = v === null || v === undefined ? '' : String(v)
          return `"${cell.replace(/"/g, '""')}"`
        })
        .join(','),
    )
    .join('\n')
  download(new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8' }), `tigbourne-oilfields-${stamp()}.csv`)
}

/** Word-compatible HTML document (.doc) — Word opens this natively. */
export function exportDOCX(rows: OilField[], cols: ColumnDef[]) {
  const th = cols.map((c) => `<th>${c.label}${c.unit ? ` <span style="color:#8f581f">(${c.unit})</span>` : ''}</th>`).join('')
  const trs = rows
    .map(
      (r) =>
        `<tr>${cols.map((c) => `<td>${fmt(c, r[c.key])}</td>`).join('')}</tr>`,
    )
    .join('')
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
  <head><meta charset="utf-8"><title>Tigbourne Oil Field Export</title>
  <style>
    body{font-family:Calibri,Arial,sans-serif;color:#1a1a1a}
    h1{font-size:20pt;margin:0 0 2pt} .sub{color:#8f581f;font-size:10pt;margin:0 0 14pt}
    table{border-collapse:collapse;width:100%;font-size:8pt}
    th{background:#1a1a1a;color:#fff;text-align:left;padding:5pt 6pt;border:0.5pt solid #b07523}
    td{padding:4pt 6pt;border:0.5pt solid #ddd}
    tr:nth-child(even) td{background:#fbf7ed}
  </style></head>
  <body>
    <h1>Tigbourne Capital — Oil Field Intelligence</h1>
    <p class="sub">Field screening export • ${rows.length.toLocaleString()} fields • Generated ${new Date().toLocaleString()}</p>
    <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
    <p style="margin-top:16pt;font-size:7.5pt;color:#8e8e93">Confidential — covered by the Tigbourne Capital NDA and non-circumvention agreement.</p>
  </body></html>`
  download(new Blob([html], { type: 'application/msword' }), `tigbourne-oilfields-${stamp()}.doc`)
}

/** Print-to-PDF: opens a clean, branded layout and triggers the browser print dialog (Save as PDF). */
export function exportPDF(rows: OilField[], cols: ColumnDef[]) {
  const th = cols.map((c) => `<th>${c.short}${c.unit ? `<br><span class="u">${c.unit}</span>` : ''}</th>`).join('')
  const trs = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${fmt(c, r[c.key])}</td>`).join('')}</tr>`)
    .join('')
  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to export as PDF.')
    return
  }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tigbourne Oil Field Export</title>
  <style>
    @page{size:landscape;margin:14mm}
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;margin:0;padding:28px}
    .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #d4a749;padding-bottom:12px;margin-bottom:18px}
    .brand{font-size:22px;font-weight:700;letter-spacing:-0.02em}
    .brand b{color:#b07523}
    .meta{text-align:right;color:#6e6e73;font-size:11px;line-height:1.5}
    table{border-collapse:collapse;width:100%;font-size:9px}
    th{background:#1a1a1a;color:#fff;text-align:left;padding:6px 7px;font-weight:600}
    th .u{color:#dfbe6e;font-weight:400;font-size:8px}
    td{padding:5px 7px;border-bottom:1px solid #eee}
    tr:nth-child(even) td{background:#fbf7ed}
    .foot{margin-top:18px;font-size:9px;color:#8e8e93;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
    <div class="head">
      <div class="brand">TIGBOURNE<b>·</b>Oil Field Intelligence</div>
      <div class="meta">${rows.length.toLocaleString()} fields exported<br>${new Date().toLocaleString()}</div>
    </div>
    <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
    <div class="foot">Confidential — covered by the Tigbourne Capital NDA and non-circumvention agreement. Figures are screening estimates, not investment advice.</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),350)}</script>
  </body></html>`)
  win.document.close()
}
