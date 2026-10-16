import ExcelJS from "exceljs";

export const MAX_BULK_ROWS = 1000;
export const PRODUCTS_SHEET = "Products";

export const BULK_COLUMNS = [
  { key: "name", header: "Product Name*", width: 32, required: true, help: "Name shown to customers." },
  { key: "description", header: "Description", width: 40, help: "Optional product description." },
  { key: "brand", header: "Brand", width: 16, help: "Optional." },
  { key: "weight", header: "Weight", width: 12, help: "Optional, free text (e.g. 1 kg)." },
  { key: "tags", header: "Tags", width: 24, help: "Optional, comma separated (e.g. rice, organic)." },
  { key: "headerName", header: "Main Group*", width: 20, required: true, help: "Exact Main Group name from the Categories sheet." },
  { key: "categoryName", header: "Category*", width: 20, required: true, help: "Category name that belongs to the chosen Main Group." },
  { key: "subcategoryName", header: "Sub-Category*", width: 20, required: true, help: "Sub-Category name that belongs to the chosen Category." },
  { key: "status", header: "Status", width: 12, help: "active (published) or inactive (draft). Blank = active." },
  { key: "sku", header: "Product SKU", width: 18, help: "Optional, must be unique. Blank = auto-generated." },
  { key: "lowStockAlert", header: "Low Stock Alert", width: 14, help: "Optional whole number. Blank = 5." },
  { key: "variantNames", header: "Variant Names*", width: 22, required: true, help: "Comma separated (e.g. 500g, 1kg, 5kg). Can be blank only if there is a single price." },
  { key: "variantPrices", header: "Variant Prices*", width: 20, required: true, help: "Comma separated, one per variant, same order (e.g. 60, 110, 520)." },
  { key: "variantSalePrices", header: "Variant Sale Prices", width: 20, help: "Optional, comma separated, same order. Leave a value empty or 0 for no sale (e.g. 55,,499). Must be lower than the price." },
  { key: "variantStocks", header: "Variant Stocks*", width: 18, required: true, help: "Comma separated whole numbers, same order (e.g. 40, 25, 10)." },
  { key: "variantSkus", header: "Variant SKUs", width: 22, help: "Optional, comma separated, same order. Blank = auto-generated." },
  { key: "mainImageUrl", header: "Main Image URL", width: 36, help: "Optional direct link to an image (https://...jpg/png/webp), max 5 MB." },
  { key: "galleryImageUrls", header: "Gallery Image URLs", width: 40, help: "Optional, up to 5 direct image links, comma separated." },
];

export const SAMPLE_PREFIX = "[SAMPLE]";
export const ERROR_COLUMN_HEADER = "Row Errors";
export const ORIGINAL_ROW_HEADER = "Original Row";

const normalizeHeader = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_LOOKUP = new Map(BULK_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]));

export function cellToString(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text || "").join("").trim();
    if (value.text !== undefined) return cellToString(value.text);
    if (value.result !== undefined) return cellToString(value.result);
    if (value.hyperlink) return String(value.hyperlink).trim();
    if (value.error) return "";
    return "";
  }
  return String(value).trim();
}

function styleHeaderRow(row, fillColor = "FF0F172A") {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 28;
}

function addProductsSheet(workbook, extraHeaders = []) {
  const sheet = workbook.addWorksheet(PRODUCTS_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    ...BULK_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width })),
    ...extraHeaders.map((h) => ({ header: h.header, key: h.key, width: h.width || 40 })),
  ];
  styleHeaderRow(sheet.getRow(1));
  BULK_COLUMNS.forEach((c, idx) => {
    sheet.getCell(1, idx + 1).note = c.help;
  });
  return sheet;
}

const columnLetter = (sheet, key) => sheet.getColumn(BULK_COLUMNS.findIndex((c) => c.key === key) + 1).letter;
const PATH_SEPARATOR = "|";

/**
 * Dependent dropdowns: Category lists only the chosen Main Group's categories,
 * Sub-Category only the chosen Main Group + Category's sub-categories.
 * The hidden "Lists" sheet holds lookup tables sorted so each parent's children
 * are contiguous; the validation formula OFFSETs into that block via MATCH/COUNTIF.
 */
function addHierarchyDropdowns(workbook, sheet, categoryPaths) {
  const lists = workbook.addWorksheet("Lists", { state: "veryHidden" });
  const byText = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });

  const headers = [...new Set(categoryPaths.map((p) => p.header))].sort(byText);
  const categoryPairs = [...new Map(categoryPaths.map((p) => [`${p.header}${PATH_SEPARATOR}${p.category}`, p])).values()]
    .sort((a, b) => byText(a.header, b.header) || byText(a.category, b.category));
  const subTriples = categoryPaths
    .map((p) => ({ key: `${p.header}${PATH_SEPARATOR}${p.category}`, sub: p.subcategory }))
    .sort((a, b) => byText(a.key, b.key) || byText(a.sub, b.sub));
  const statuses = ["active", "inactive"];

  headers.forEach((v, i) => (lists.getCell(`A${i + 1}`).value = v));
  statuses.forEach((v, i) => (lists.getCell(`B${i + 1}`).value = v));
  categoryPairs.forEach((p, i) => {
    lists.getCell(`D${i + 1}`).value = p.header;
    lists.getCell(`E${i + 1}`).value = p.category;
  });
  subTriples.forEach((t, i) => {
    lists.getCell(`G${i + 1}`).value = t.key;
    lists.getCell(`H${i + 1}`).value = t.sub;
  });

  const range = (col) => `${col}2:${col}${MAX_BULK_ROWS + 1}`;
  const headerCol = columnLetter(sheet, "headerName");
  const categoryCol = columnLetter(sheet, "categoryName");
  const pickFromList = (formula, error) => ({
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid value",
    error,
  });

  if (headers.length > 0) {
    sheet.dataValidations.add(
      range(headerCol),
      pickFromList(`Lists!$A$1:$A$${headers.length}`, "Pick a Main Group from the list."),
    );
  }
  if (categoryPairs.length > 0) {
    const n = categoryPairs.length;
    const parent = `$${headerCol}2`;
    sheet.dataValidations.add(
      range(categoryCol),
      pickFromList(
        `OFFSET(Lists!$E$1,MATCH(${parent},Lists!$D$1:$D$${n},0)-1,0,COUNTIF(Lists!$D$1:$D$${n},${parent}),1)`,
        "Pick the Main Group first, then a Category from the list.",
      ),
    );
  }
  if (subTriples.length > 0) {
    const n = subTriples.length;
    const key = `$${headerCol}2&"${PATH_SEPARATOR}"&$${categoryCol}2`;
    sheet.dataValidations.add(
      range(columnLetter(sheet, "subcategoryName")),
      pickFromList(
        `OFFSET(Lists!$H$1,MATCH(${key},Lists!$G$1:$G$${n},0)-1,0,COUNTIF(Lists!$G$1:$G$${n},${key}),1)`,
        "Pick the Main Group and Category first, then a Sub-Category from the list.",
      ),
    );
  }
  sheet.dataValidations.add(
    range(columnLetter(sheet, "status")),
    pickFromList(`Lists!$B$1:$B$${statuses.length}`, "Use active or inactive."),
  );
}

function addSampleRows(sheet, categoryPaths) {
  const first = categoryPaths[0];
  const second = categoryPaths.find((p) => first && p.header !== first.header) || categoryPaths[1] || first;
  const samples = [
    {
      name: `${SAMPLE_PREFIX} ${first?.subcategory || "Example"} Product (2 variants)`,
      description: "Example description shown to customers.",
      brand: "Sample Brand",
      weight: "1 kg",
      tags: "sample, example",
      headerName: first?.header || "",
      categoryName: first?.category || "",
      subcategoryName: first?.subcategory || "",
      status: "active",
      lowStockAlert: "5",
      variantNames: "Small, Large",
      variantPrices: "200, 900",
      variantSalePrices: "180, 850",
      variantStocks: "50, 20",
      variantSkus: "",
      mainImageUrl: "https://example.com/images/product-main.jpg",
      galleryImageUrls: "https://example.com/images/product-2.jpg, https://example.com/images/product-3.jpg",
    },
    {
      name: `${SAMPLE_PREFIX} ${second?.subcategory || "Example"} Product (3 variants)`,
      description: "Second variant has a sale price; the others don't.",
      brand: "Sample Brand",
      weight: "",
      tags: "sample",
      headerName: second?.header || "",
      categoryName: second?.category || "",
      subcategoryName: second?.subcategory || "",
      status: "inactive",
      lowStockAlert: "3",
      variantNames: "S, M, L",
      variantPrices: "499, 499, 549",
      variantSalePrices: ",449,",
      variantStocks: "10, 25, 15",
      variantSkus: "SAMPLE-S, SAMPLE-M, SAMPLE-L",
    },
  ];
  samples.forEach((sample) => {
    const row = sheet.addRow(sample);
    row.font = { italic: true, color: { argb: "FF64748B" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });
}

/**
 * categoryPaths: [{ header, category, subcategory }] — every valid Main Group > Category > Sub-Category path.
 */
export async function buildTemplateWorkbook(categoryPaths = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Quick Commerce";
  workbook.created = new Date();

  const sheet = addProductsSheet(workbook);

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [
    { header: "Column", key: "column", width: 24 },
    { header: "Required", key: "required", width: 10 },
    { header: "How to fill", key: "help", width: 90 },
  ];
  styleHeaderRow(instructions.getRow(1));
  BULK_COLUMNS.forEach((c) =>
    instructions.addRow({ column: c.header.replace("*", ""), required: c.required ? "Yes" : "No", help: c.help }),
  );
  instructions.addRow({});
  [
    "One row = one product. All variants of a product go in the same row, comma separated.",
    "Variant Names, Variant Prices, Variant Stocks (and Sale Prices / SKUs, if filled) must have the same number of values, in the same order.",
    "Do not use thousand separators inside numbers (write 1500, not 1,500) — commas separate variants.",
    "Pick the Main Group first, then the Category dropdown shows only its categories, then the Sub-Category dropdown shows only that category's sub-categories. If you change the Main Group or Category later, re-pick the columns to its right.",
    `Rows whose Product Name starts with ${SAMPLE_PREFIX} are examples and are never imported — overwrite them or leave them as they are.`,
    `Maximum ${MAX_BULK_ROWS} products per file. Empty rows are skipped.`,
    "Image URLs must be direct, publicly reachable image links (Google Drive/Dropbox share pages will not work).",
    "Rows with errors are skipped and reported row-wise after upload; download the error report, fix the rows, and upload it again.",
  ].forEach((tip) => instructions.addRow({ column: "Note", help: tip }));
  instructions.getColumn("help").alignment = { wrapText: true, vertical: "top" };

  addSampleRows(sheet, categoryPaths);

  const categories = workbook.addWorksheet("Categories", { views: [{ state: "frozen", ySplit: 1 }] });
  categories.columns = [
    { header: "Main Group", key: "header", width: 26 },
    { header: "Category", key: "category", width: 26 },
    { header: "Sub-Category", key: "subcategory", width: 26 },
  ];
  styleHeaderRow(categories.getRow(1));
  categoryPaths.forEach((p) => categories.addRow(p));

  addHierarchyDropdowns(workbook, sheet, categoryPaths);

  workbook.views = [{ activeTab: 0 }];
  return workbook;
}

/**
 * Parses an uploaded workbook. Throws Error with a user-facing message for
 * file-level problems; returns [{ rowNumber, data: {key: string} }] otherwise.
 * Unknown columns (e.g. "Row Errors" from an error report) are ignored, so an
 * error report can be fixed and uploaded again as-is.
 */
export async function parseProductsWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error("The file could not be read. Please upload a valid .xlsx Excel file (use the template).");
  }

  const sheet = workbook.getWorksheet(PRODUCTS_SHEET) || workbook.worksheets[0];
  if (!sheet) throw new Error("The Excel file has no sheets.");

  const columnKeyByIndex = new Map();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = HEADER_LOOKUP.get(normalizeHeader(cellToString(cell.value)));
    if (key) columnKeyByIndex.set(colNumber, key);
  });

  const foundKeys = new Set(columnKeyByIndex.values());
  const missing = BULK_COLUMNS.filter((c) => c.required && !foundKeys.has(c.key)).map((c) => c.header.replace("*", ""));
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}. Please use the downloaded template.`);
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    let hasValue = false;
    columnKeyByIndex.forEach((key, colNumber) => {
      const value = cellToString(row.getCell(colNumber).value);
      data[key] = value;
      if (value) hasValue = true;
    });
    const isSample = String(data.name || "").toUpperCase().startsWith(SAMPLE_PREFIX);
    if (hasValue && !isSample) rows.push({ rowNumber, data });
  });

  if (rows.length === 0) {
    throw new Error(`The file has no product rows. Fill in the Products sheet below the header row (rows starting with ${SAMPLE_PREFIX} are examples and are ignored).`);
  }
  if (rows.length > MAX_BULK_ROWS) {
    throw new Error(`The file has ${rows.length} product rows; the maximum is ${MAX_BULK_ROWS} per upload. Split it into smaller files.`);
  }
  return rows;
}

export async function buildErrorReportWorkbook(failedRows = []) {
  const workbook = new ExcelJS.Workbook();
  const sheet = addProductsSheet(workbook, [
    { header: ERROR_COLUMN_HEADER, key: "__errors", width: 60 },
    { header: ORIGINAL_ROW_HEADER, key: "__row", width: 12 },
  ]);
  const errorColumn = BULK_COLUMNS.length + 1;
  sheet.getCell(1, errorColumn).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };

  failedRows.forEach((r) => {
    const row = sheet.addRow({
      ...(r.rawData || {}),
      __errors: (r.errorMessages || []).join("\n"),
      __row: r.rowNumber,
    });
    const cell = row.getCell(errorColumn);
    cell.font = { color: { argb: "FFDC2626" } };
    cell.alignment = { wrapText: true, vertical: "top" };
  });
  return workbook;
}
