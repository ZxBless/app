import { Platform } from 'react-native';
import type { WorkRecord } from '@/db/database';
import { formatDate, formatHours, formatCurrency, WORK_TYPE_LABELS } from './calculations';

function formatDurationFromHours(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function rateLabel(rate: number): string {
  return `${formatCurrency(rate)}/h`;
}

export async function exportPDF(
  records: WorkRecord[],
  dateRange?: { from: string; to: string }
): Promise<void> {
  if (Platform.OS === 'web') {
    exportPDFWeb(records, dateRange);
    return;
  }
  const { printToFileAsync } = await import('expo-print');
  const { shareAsync } = await import('expo-sharing');
  const html = buildHTML(records, dateRange);
  const file = await printToFileAsync({ html, base64: false });
  await shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'MAQUICHE - Reporte PDF',
  });
}

export async function exportExcel(
  records: WorkRecord[],
  dateRange?: { from: string; to: string }
): Promise<void> {
  const csv = buildCSV(records);
  if (Platform.OS === 'web') {
    downloadFile(csv, 'maquiche_reporte.csv', 'text/csv;charset=utf-8');
    return;
  }
  const { Paths, File } = await import('expo-file-system');
  const { shareAsync } = await import('expo-sharing');
  const file = new File(Paths.document, 'maquiche_reporte.csv');
  file.write(csv);
  await shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'MAQUICHE - Reporte Excel',
    UTI: 'public.comma-separated-values-text',
  });
}

function buildHTML(records: WorkRecord[], dateRange?: { from: string; to: string }): string {
  const rangeLabel = dateRange
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    : 'Todos los registros';
  const firstRec = records[0];
  const lastRec = records[records.length - 1];
  const shiftStart = firstRec?.startTime ?? '--:--';
  const shiftEnd = lastRec?.endTime ?? '--:--';
  const client = firstRec?.client ?? 'No especificado';
  const project = firstRec?.project ?? 'No especificado';
  const operator = firstRec?.operator ?? 'No especificado';
  const workDate = firstRec ? formatDate(firstRec.date) : '--/--/----';
  const totalHours = records.reduce((s, r) => s + r.hours, 0);
  const totalPayment = records.reduce((s, r) => s + r.payment, 0);
  const excRecords = records.filter((r) => r.workType === 'excavacion');
  const martRecords = records.filter((r) => r.workType === 'martillo');
  const excHours = excRecords.reduce((s, r) => s + r.hours, 0);
  const martHours = martRecords.reduce((s, r) => s + r.hours, 0);
  const excPayment = excRecords.reduce((s, r) => s + r.payment, 0);
  const martPayment = martRecords.reduce((s, r) => s + r.payment, 0);

  const rows = records.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${WORK_TYPE_LABELS[r.workType]}</td>
      <td style="text-align:center">${r.startTime}</td>
      <td style="text-align:center">${r.endTime}</td>
      <td style="text-align:center">${formatDurationFromHours(r.hours)}</td>
      <td style="text-align:right">${rateLabel(r.rate)}</td>
      <td style="text-align:right;font-weight:700">${formatCurrency(r.payment)}</td>
    </tr>`).join('');

  return `
  <html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FF6B00; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -0.5px; }
    .header .brand { color: #FF6B00; }
    .header .date { color: #666; font-size: 14px; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; margin-bottom: 28px; background: #f9f9f9; border-radius: 8px; padding: 16px 20px; }
    .info-item { display: flex; gap: 8px; font-size: 14px; }
    .info-item .label { color: #888; font-weight: 600; min-width: 140px; }
    .info-item .value { font-weight: 700; }
    h2 { font-size: 16px; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px; }
    thead th { background: #1A1A1A; color: #FF6B00; padding: 10px 8px; text-align: left; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.center { text-align: center; }
    thead th.right { text-align: right; }
    tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    tbody tr:nth-child(even) { background: #FFF7F0; }
    .summary { background: #1a1a1a; border-radius: 10px; padding: 20px 24px; color: #fff; }
    .summary h2 { color: #FF6B00; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
    .summary-row .label { color: rgba(255,255,255,0.7); }
    .summary-row .value { font-weight: 700; }
    .summary-divider { height: 1px; background: rgba(255,255,255,0.15); margin: 8px 0; }
    .grand-total { display: flex; justify-content: space-between; padding-top: 16px; margin-top: 8px; border-top: 2px solid #FF6B00; }
    .grand-total .label { font-size: 18px; font-weight: 900; }
    .grand-total .value { font-size: 24px; font-weight: 900; color: #FF6B00; }
    .footer { margin-top: 32px; text-align: center; color: #999; font-size: 12px; }
  </style></head><body>
    <div class="header"><div>
      <h1><span class="brand">MAQUICHE</span></h1>
      <div class="date">Reporte de Trabajo &middot; ${rangeLabel}</div>
    </div></div>
    <div class="info-grid">
      <div class="info-item"><span class="label">Fecha:</span><span class="value">${workDate}</span></div>
      <div class="info-item"><span class="label">Cliente:</span><span class="value">${client}</span></div>
      <div class="info-item"><span class="label">Obra / Proyecto:</span><span class="value">${project}</span></div>
      <div class="info-item"><span class="label">Operador:</span><span class="value">${operator}</span></div>
      <div class="info-item"><span class="label">Inicio del turno:</span><span class="value">${shiftStart}</span></div>
      <div class="info-item"><span class="label">Fin del turno:</span><span class="value">${shiftEnd}</span></div>
      <div class="info-item"><span class="label">Tiempo total:</span><span class="value">${formatDurationFromHours(totalHours)}</span></div>
      <div class="info-item"><span class="label">Total ganado:</span><span class="value">${formatCurrency(totalPayment)}</span></div>
    </div>
    <h2>Detalle de Tramos</h2>
    <table><thead><tr>
      <th class="center" style="width:40px">#</th>
      <th>Herramienta</th>
      <th class="center">Inicio</th>
      <th class="center">Fin</th>
      <th class="center">Duración</th>
      <th class="right">Tarifa</th>
      <th class="right">Pago</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="summary"><h2>Resumen</h2>
      <div class="summary-row"><span class="label">Total horas Excavación:</span><span class="value">${formatHours(excHours)}</span></div>
      <div class="summary-row"><span class="label">Pago total Excavación:</span><span class="value">${formatCurrency(excPayment)}</span></div>
      <div class="summary-divider"></div>
      <div class="summary-row"><span class="label">Total horas Martillo Hidráulico:</span><span class="value">${formatHours(martHours)}</span></div>
      <div class="summary-row"><span class="label">Pago total Martillo Hidráulico:</span><span class="value">${formatCurrency(martPayment)}</span></div>
      <div class="grand-total"><span class="label">TOTAL GENERAL</span><span class="value">${formatCurrency(totalPayment)}</span></div>
    </div>
    <div class="footer">Documento generado por MAQUICHE &middot; ${new Date().toLocaleDateString('es-PE')}</div>
  </body></html>`;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCSV(records: WorkRecord[]): string {
  const excRecords = records.filter((r) => r.workType === 'excavacion');
  const martRecords = records.filter((r) => r.workType === 'martillo');
  const excHours = excRecords.reduce((s, r) => s + r.hours, 0);
  const martHours = martRecords.reduce((s, r) => s + r.hours, 0);
  const excPayment = excRecords.reduce((s, r) => s + r.payment, 0);
  const martPayment = martRecords.reduce((s, r) => s + r.payment, 0);
  const grandTotal = excPayment + martPayment;
  const header = 'Fecha,Cliente,Obra,Herramienta,Hora inicio,Hora fin,Tiempo trabajado,Tarifa por hora,Pago generado,Observaciones\n';
  const rows = records.map((r) => [
    formatDate(r.date), r.client ?? '', r.project ?? '', WORK_TYPE_LABELS[r.workType],
    r.startTime, r.endTime, formatDurationFromHours(r.hours),
    formatCurrency(r.rate) + '/h', r.payment.toFixed(2), r.observation ?? '',
  ].map(csvEscape).join(',')).join('\n');
  const summary = `\n\nRESUMEN\nTotal horas Excavación,${excHours.toFixed(2)}\nTotal horas Martillo Hidráulico,${martHours.toFixed(2)}\nPago total Excavación,S/${excPayment.toFixed(2)}\nPago total Martillo Hidráulico,S/${martPayment.toFixed(2)}\nTOTAL GENERAL,S/${grandTotal.toFixed(2)}`;
  return '\uFEFF' + header + rows + summary;
}

function exportPDFWeb(records: WorkRecord[], dateRange?: { from: string; to: string }): void {
  const html = buildHTML(records, dateRange);
  const w = window.open('', '_blank');
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
