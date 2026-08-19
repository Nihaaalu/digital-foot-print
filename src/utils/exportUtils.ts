import { InvestigationResult } from '../types/osint';

export function exportInvestigationJson(result: InvestigationResult): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const filename = `DFI_Investigation_${result.target.normalized.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportInvestigationCsv(result: InvestigationResult): void {
  const rows: Array<[string, string, string, string, string, string]> = [
    ['Node Type', 'Label', 'Value', 'Confidence', 'Source', 'Timestamp'],
  ];

  for (const node of result.graph.nodes) {
    rows.push([
      node.type,
      `"${node.label.replace(/"/g, '""')}"`,
      `"${node.value.replace(/"/g, '""')}"`,
      node.confidence,
      `"${node.source.replace(/"/g, '""')}"`,
      node.timestamp,
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const filename = `DFI_Findings_${result.target.normalized.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function printInvestigationReport(): void {
  window.print();
}
