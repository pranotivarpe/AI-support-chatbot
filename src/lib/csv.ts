const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote, escape quotes, and neutralise spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n");

export const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
