// Escape worksheet values because the printable window is written as raw HTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build a print-optimized standalone worksheet so lenders can export the exact
// selected scenario without depending on the app shell styles.
function buildWorksheetMarkup({
  appMeta,
  caseData,
  selectedScenario,
  calculationSummaryRows,
  loanCalculationRows,
  scoringSummaryRows,
  scoringMechanism,
  formatDate,
}) {
  const summaryRows = calculationSummaryRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.category)}</td>
          <td><strong>${escapeHtml(row.metric)}</strong></td>
          <td>${escapeHtml(row.formula)}</td>
          <td><strong>${escapeHtml(row.value)}</strong></td>
        </tr>`,
    )
    .join('');

  const loanRows = loanCalculationRows
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.loanId)}</strong></td>
          <td>${escapeHtml(row.currentRate)}</td>
          <td>${escapeHtml(row.proposedRate)}</td>
          <td>${escapeHtml(row.currentTerm)}</td>
          <td>${escapeHtml(row.proposedTerm)}</td>
          <td>${escapeHtml(row.currentPayment)}</td>
          <td>${escapeHtml(row.proposedPayment)}</td>
          <td>${escapeHtml(row.paymentChange)}</td>
          <td>${escapeHtml(row.actions)}</td>
        </tr>`,
    )
    .join('');

  const scoringRows = (scoringSummaryRows ?? [])
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.label)}</strong></td>
          <td>${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');

  const scoringNotes = (scoringMechanism ?? [])
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Servicing Term Analysis And Recommendation Worksheet</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #17334d; }
        h1, h2, h3, p { margin: 0 0 12px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 26px; }
        .meta-card { border: 1px solid #ccd7e2; border-radius: 12px; padding: 12px; background: #f8fafc; }
        .meta-card span { display: block; font-size: 12px; color: #5f7387; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #d7e1ea; padding: 10px 12px; text-align: left; vertical-align: top; font-size: 13px; }
        th { background: #edf6fd; color: #123b60; }
        .section-title { margin: 24px 0 12px; }
        .note-list { margin: 0 0 24px; padding-left: 20px; }
        .note-list li { margin-bottom: 8px; line-height: 1.5; }
        @media print { body { margin: 12px; } }
      </style>
    </head>
    <body>
      <h1>Servicing Term Analysis And Recommendation</h1>
      <p>${escapeHtml(appMeta.description || 'Loan servicing and restructuring worksheet')}</p>
      <h2 class="section-title">Lender Worksheet</h2>
      <div class="meta-grid">
        <div class="meta-card"><span>Borrower ID</span><strong>${escapeHtml(caseData.borrowerId || '--')}</strong></div>
        <div class="meta-card"><span>State / County</span><strong>${escapeHtml(`${caseData.state || '--'} / ${caseData.county || '--'}`)}</strong></div>
        <div class="meta-card"><span>Restructuring Date</span><strong>${escapeHtml(formatDate(caseData.proposedServicingDate))}</strong></div>
        <div class="meta-card"><span>Selected Scenario</span><strong>${escapeHtml(`${selectedScenario.rank ? `#${selectedScenario.rank} ` : ''}${selectedScenario.outcomeCode}`)}</strong></div>
      </div>
      <h3 class="section-title">Scoring Summary</h3>
      <table>
        <thead><tr><th>Scoring Component</th><th>Weight</th></tr></thead>
        <tbody>${scoringRows}</tbody>
      </table>
      <h3 class="section-title">How The Score Is Built</h3>
      <ul class="note-list">${scoringNotes}</ul>
      <h3 class="section-title">Portfolio Calculation Detail</h3>
      <table>
        <thead><tr><th>Category</th><th>Metric</th><th>Formula / Basis</th><th>Result</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
      <h3 class="section-title">Loan Calculation Detail</h3>
      <table>
        <thead><tr><th>Loan</th><th>Current Rate</th><th>Proposed Rate</th><th>Current Term</th><th>Proposed Term</th><th>Current Payment</th><th>Proposed Payment</th><th>Payment Reduction</th><th>Actions</th></tr></thead>
        <tbody>${loanRows}</tbody>
      </table>
    </body>
  </html>`;
}

export function useWorksheetExport() {
  function printViaIframe(markup) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentWindow?.document ?? iframe.contentDocument;
    if (!iframeDocument || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      throw new Error('Unable to prepare printable worksheet.');
    }

    iframeDocument.open();
    iframeDocument.write(markup);
    iframeDocument.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  }

  // Prefer a popup when allowed, but fall back to an off-screen iframe so the
  // worksheet still prints when the browser blocks `window.open`.
  function exportWorksheet(options) {
    const markup = buildWorksheetMarkup(options);
    const printWindow = window.open('', 'astar-worksheet', 'width=1200,height=900');

    if (!printWindow) {
      printViaIframe(markup);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(markup);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 150);
  }

  return { exportWorksheet };
}
