import { useState, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import type { OilField } from '../data/types'

interface Props {
  data: OilField[]
}

export default function ExportMenu({ data }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const exportCSV = () => {
    const headers = [
      'ID', 'Field Name', 'Operator', 'Country', 'Region', 'Type', 'Status',
      'Depth (m)', 'Oil Rate (bpd)', 'Liquid Rate (bpd)', 'Water Rate (bpd)',
      'Water Cut (%)', 'API Gravity', 'Temperature (C)', 'Salinity (ppm)',
      'Viscosity (cP)', 'Porosity (%)', 'Permeability (mD)',
      'Lifting Cost (USD)', 'Drilling Cost (USD)', 'P&A Estimate (USD)',
    ]
    const rows = data.map(f => [
      f.id, f.fieldName, f.operator, f.country, f.region, f.type, f.status,
      f.depth_m, f.oilRate_bpd, f.liquidRate_bpd, f.waterRate_bpd,
      f.waterCut_pct, f.apiGravity, f.temperature_c, f.salinity_ppm,
      f.viscosity_cp, f.porosity_pct, f.permeability_md,
      f.liftingCost_usd, f.drillingCost_usd, f.paEstimate_usd ?? 'N/A',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    downloadFile(csv, 'tigbourne-fields.csv', 'text/csv')
    setOpen(false)
  }

  const exportPDF = () => {
    // Generates a printable HTML that opens in a new tab for PDF save
    const html = `<!DOCTYPE html>
<html><head><title>Tigbourne Capital - Field Data Export</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 16px; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Tigbourne Capital — Oil Field Data</h1>
<div class="subtitle">Exported ${new Date().toLocaleDateString()} | ${data.length} fields | CONFIDENTIAL</div>
<table>
<thead><tr>
  <th>ID</th><th>Field</th><th>Operator</th><th>Country</th><th>Type</th>
  <th>Oil (bpd)</th><th>WC%</th><th>API</th><th>Temp C</th><th>Lifting $/bbl</th>
</tr></thead><tbody>
${data.map(f => `<tr>
  <td>${f.id}</td><td>${f.fieldName}</td><td>${f.operator}</td><td>${f.country}</td><td>${f.type}</td>
  <td class="num">${f.oilRate_bpd.toLocaleString()}</td><td class="num">${f.waterCut_pct}</td>
  <td class="num">${f.apiGravity}</td><td class="num">${f.temperature_c}</td>
  <td class="num">$${f.liftingCost_usd.toFixed(2)}</td>
</tr>`).join('')}
</tbody></table>
<script>window.print()</script>
</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setOpen(false)
  }

  const exportDOCX = () => {
    // Simple HTML-based DOCX (Word can open .doc HTML files)
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Tigbourne Capital Field Export</title>
<style>
  body { font-family: Calibri, sans-serif; font-size: 10pt; }
  h1 { font-size: 16pt; color: #1a3a5c; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 3px 5px; font-size: 9pt; }
  th { background: #1a3a5c; color: white; }
</style></head><body>
<h1>Tigbourne Capital - Oil Field Data Export</h1>
<p style="color:#666">Generated: ${new Date().toLocaleDateString()} | ${data.length} fields</p>
<table>
<tr><th>ID</th><th>Field</th><th>Operator</th><th>Country</th><th>Type</th><th>Status</th>
<th>Oil bpd</th><th>Water Cut %</th><th>API Gravity</th><th>Temp C</th><th>Lifting $/bbl</th></tr>
${data.map(f => `<tr>
<td>${f.id}</td><td>${f.fieldName}</td><td>${f.operator}</td><td>${f.country}</td>
<td>${f.type}</td><td>${f.status}</td><td>${f.oilRate_bpd.toLocaleString()}</td>
<td>${f.waterCut_pct}%</td><td>${f.apiGravity}</td><td>${f.temperature_c}</td>
<td>$${f.liftingCost_usd.toFixed(2)}</td>
</tr>`).join('')}
</table></body></html>`
    downloadFile(html, 'tigbourne-fields.doc', 'application/msword')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-accent hover:bg-accent-bright text-surface-0 text-xs font-medium px-3.5 py-2 transition-colors cursor-pointer"
      >
        <Download size={13} />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border shadow-lg z-50 min-w-[140px]">
          <button
            onClick={exportCSV}
            className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-3 transition-colors cursor-pointer"
          >
            Export as CSV
          </button>
          <button
            onClick={exportPDF}
            className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-3 transition-colors border-t border-border cursor-pointer"
          >
            Export as PDF
          </button>
          <button
            onClick={exportDOCX}
            className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-3 transition-colors border-t border-border cursor-pointer"
          >
            Export as DOCX
          </button>
        </div>
      )}
    </div>
  )
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
