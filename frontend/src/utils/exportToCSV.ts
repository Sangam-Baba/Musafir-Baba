interface ExportCSVOptions {
  fileName?: string; // Default: "export"
  headers?: string[]; // Custom headers (optional)
  delimiter?: string; // Default: ","
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportCSVOptions = {}
) {
  const { fileName = "export", headers, delimiter = "," } = options;

  if (!data || data.length === 0) {
    console.warn("exportToCSV: No data to export");
    alert("No data available to export");
    return;
  }

  // Use provided headers or infer from first row
  const keys = headers ?? Object.keys(data[0]);

  const escapeValue = (value: unknown): string => {
    if (value == null) return "";
    const str = String(value).replace(/"/g, '""'); // Escape quotes
    return `"${str}"`; // Wrap all values in quotes
  };

  const csvRows = [
    keys.join(delimiter), // Header row
    ...data.map((row) =>
      keys.map((key) => escapeValue(row[key])).join(delimiter)
    ),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  // Trigger browser download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
