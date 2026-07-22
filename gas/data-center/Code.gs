/**
 * Kasir SaaS - DATA CENTER GAS
 *
 * Tempel file ini ke Apps Script yang terikat ke Spreadsheet Data Center.
 * Deploy sebagai Web App. Endpoint ini ringan:
 * - lookup slug toko/perusahaan
 * - cek status aktif/nonaktif
 * - mengembalikan URL Web App GAS perusahaan
 *
 * Semua operasi kasir, login, pelanggan, produk, transaksi, invoice, dan
 * laporan berjalan di GAS perusahaan masing-masing.
 */

const APP = {
  dataCenterSpreadsheetId: "",
  defaultFrontendBaseUrl: "",
  defaultStatus: "nonaktif"
};

const DATA_CENTER_SHEETS = {
  Companies: [
    "companyId",
    "companySlug",
    "companyName",
    "storeName",
    "logoUrl",
    "address",
    "companySpreadsheetId",
    "companySpreadsheetUrl",
    "companyApiUrl",
    "frontendUrl",
    "status",
    "ownerName",
    "ownerEmail",
    "storePhone",
    "companyEmail",
    "notes",
    "createdAt",
    "updatedAt"
  ]
};

const HEADER_LABELS = {
  companyId: "ID Perusahaan",
  companySlug: "Slug Link Kasir",
  companyName: "Nama Perusahaan",
  storeName: "Nama Toko",
  logoUrl: "URL Logo",
  address: "Alamat",
  companySpreadsheetId: "ID Spreadsheet Perusahaan",
  companySpreadsheetUrl: "URL Spreadsheet Perusahaan",
  companyApiUrl: "URL Web App GAS Perusahaan",
  frontendUrl: "URL Web Frontend",
  status: "Status",
  ownerName: "Nama Owner",
  ownerEmail: "Email Owner",
  storePhone: "Kontak Toko",
  companyEmail: "Email Perusahaan",
  notes: "Catatan",
  createdAt: "Dibuat Pada",
  updatedAt: "Diupdate Pada"
};

const HEADER_ALIASES = {
  id: "companyId",
  companyID: "companyId",
  idPerusahaan: "companyId",
  slug: "companySlug",
  companySlugLink: "companySlug",
  linkSlug: "companySlug",
  slugLink: "companySlug",
  namaPerusahaan: "companyName",
  namaToko: "storeName",
  toko: "storeName",
  alamat: "address",
  spreadsheetId: "companySpreadsheetId",
  spreadsheetID: "companySpreadsheetId",
  idSpreadsheetCompany: "companySpreadsheetId",
  companySheetId: "companySpreadsheetId",
  spreadsheetUrl: "companySpreadsheetUrl",
  spreadsheetURL: "companySpreadsheetUrl",
  webUrl: "frontendUrl",
  websiteUrl: "frontendUrl",
  frontendURL: "frontendUrl",
  gasUrl: "companyApiUrl",
  gasURL: "companyApiUrl",
  webAppUrl: "companyApiUrl",
  webAppURL: "companyApiUrl",
  companyGasUrl: "companyApiUrl",
  companyApiURL: "companyApiUrl",
  urlGasCompany: "companyApiUrl",
  urlWebAppGasCompany: "companyApiUrl",
  aktivasi: "status",
  active: "status",
  licenseStatus: "status"
};

const OBSOLETE_COMPANY_HEADERS = [
  "Paket",
  "Limit Kasir",
  "Limit Transaksi",
  "Akhir Langganan",
  "plan",
  "cashierLimit",
  "transactionLimit",
  "subscriptionEnd"
];

function doGet(e) {
  try {
    ensureDataCenter_();
    const params = e && e.parameter ? e.parameter : {};
    const slug = text_(params.company || params.companySlug || params.slug);
    const companyId = text_(params.companyId || params.id);

    if (slug || companyId) {
      return json_(getCompanyConfig_({
        companySlug: slug,
        companyId: companyId
      }));
    }

    return json_(ok_({
      message: "Kasir SaaS Data Center aktif",
      spreadsheetId: dataCenter_().getId(),
      companies: companies_().length,
      serverTime: nowIso_()
    }));
  } catch (err) {
    return json_(fail_(errorMessage_(err)));
  }
}

function doPost(e) {
  try {
    ensureDataCenter_();
    const body = parseBody_(e);
    const action = text_(body.action);

    switch (action) {
      case "ping":
        return json_(ok_({ message: "Data Center aktif", serverTime: nowIso_() }));
      case "getCompanyConfig":
      case "getCompanyProfile":
      case "getPublicCompanyProfile":
      case "resolveCompany":
        return json_(getCompanyConfig_(body));
      case "createOrUpdateCompany":
      case "upsertCompany":
      case "saveCompany":
      case "registerCompany":
        return json_(upsertCompanyFromApi_(body));
      case "registerCompanyFromGas":
      case "registerCompanyRuntime":
        return json_(registerCompanyFromGas_(body));
      case "activateCompany":
        return json_(setCompanyStatusFromApi_(body, "aktif"));
      case "deactivateCompany":
        return json_(setCompanyStatusFromApi_(body, "nonaktif"));
      default:
        return json_(fail_("Action Data Center tidak dikenal: " + action));
    }
  } catch (err) {
    return json_(fail_(errorMessage_(err)));
  }
}

function setupDataCenter() {
  ensureDataCenter_();
  return "Data Center siap: " + dataCenter_().getUrl();
}

function testResolveFirstCompany() {
  ensureDataCenter_();
  const first = companies_()[0];
  if (!first) return "Belum ada data perusahaan di sheet Companies";
  const result = getCompanyConfig_({ companySlug: first.companySlug });
  return JSON.stringify(result, null, 2);
}

function getCompanyConfig_(payload) {
  const company = ensureCompanyIdentity_(resolveCompany_(payload));
  if (!company) return fail_("Perusahaan tidak ditemukan di Data Center");
  if (!isActive_(company.status)) return fail_("Perusahaan belum aktif");
  if (!text_(company.companyApiUrl)) return fail_("URL Web App GAS Perusahaan belum diisi di Data Center");
  return ok_(publicCompany_(company));
}

function ensureCompanyIdentity_(company) {
  if (!company) return null;
  const patch = {};
  if (!text_(company.companyId)) {
    const base = slug_(company.companySlug || company.storeName || company.companyName || Utilities.getUuid()) || Utilities.getUuid();
    patch.companyId = "cmp-" + base.replace(/[^a-z0-9]/g, "").slice(0, 18);
  }
  if (!text_(company.companySlug)) {
    patch.companySlug = slug_(company.storeName || company.companyName || patch.companyId);
  }
  if (!Object.keys(patch).length) return company;
  patch.updatedAt = nowIso_();
  return update_("Companies", company._rowNumber, patch);
}

function upsertCompanyFromApi_(payload) {
  assertAdminKey_(payload);
  const company = payload.company || payload;
  return ok_(strip_(upsertCompany_(company)));
}

function registerCompanyFromGas_(payload) {
  const company = payload.company || payload;
  const existing = resolveCompany_(company) ||
    companyByApiUrl_(company.companyApiUrl || company.gasUrl || company.webAppUrl) ||
    companyBySpreadsheetId_(company.companySpreadsheetId || company.spreadsheetId);
  const data = Object.assign({}, company, {
    companyId: existing && existing.companyId ? existing.companyId : company.companyId,
    companySlug: existing && existing.companySlug ? existing.companySlug : company.companySlug,
    status: existing ? existing.status : APP.defaultStatus
  });
  return ok_(strip_(upsertCompany_(data)));
}

function setCompanyStatusFromApi_(payload, status) {
  assertAdminKey_(payload);
  const company = resolveCompany_(payload);
  if (!company) return fail_("Perusahaan tidak ditemukan di Data Center");
  const updated = update_("Companies", company._rowNumber, {
    status: status,
    updatedAt: nowIso_()
  });
  return ok_(strip_(updated));
}

function upsertCompany_(data) {
  const companyId = text_(data.companyId || data.id || data["ID Perusahaan"] || Utilities.getUuid());
  const companySlug = slug_(data.companySlug || data.slug || data["Slug Link Kasir"] || companyId);
  if (!companyId) throw new Error("ID Perusahaan wajib diisi");
  if (!companySlug) throw new Error("Slug Link Kasir wajib diisi");

  const now = nowIso_();
  const existing = companyById_(companyId) ||
    companyBySlug_(companySlug) ||
    companyByApiUrl_(data.companyApiUrl || data.webAppUrl || data.gasUrl || data.companyGasUrl || data["URL Web App GAS Perusahaan"]) ||
    companyBySpreadsheetId_(data.companySpreadsheetId || data.spreadsheetId || data["ID Spreadsheet Perusahaan"]);
  const patch = {
    companyId: companyId,
    companySlug: companySlug,
    companyName: text_(data.companyName || data.name || data["Nama Perusahaan"] || existing && existing.companyName),
    storeName: text_(data.storeName || data.toko || data["Nama Toko"] || existing && existing.storeName),
    logoUrl: text_(data.logoUrl || data["URL Logo"] || existing && existing.logoUrl),
    address: text_(data.address || data.alamat || data["Alamat"] || existing && existing.address),
    companySpreadsheetId: text_(data.companySpreadsheetId || data.spreadsheetId || data["ID Spreadsheet Perusahaan"] || existing && existing.companySpreadsheetId),
    companySpreadsheetUrl: text_(data.companySpreadsheetUrl || data.spreadsheetUrl || data["URL Spreadsheet Perusahaan"] || existing && existing.companySpreadsheetUrl),
    companyApiUrl: text_(data.companyApiUrl || data.webAppUrl || data.gasUrl || data.companyGasUrl || data["URL Web App GAS Perusahaan"] || existing && existing.companyApiUrl),
    frontendUrl: text_(data.frontendUrl || data.webUrl || data.websiteUrl || data["URL Web Frontend"] || existing && existing.frontendUrl || APP.defaultFrontendBaseUrl),
    status: text_(data.status || data["Status"] || existing && existing.status || APP.defaultStatus),
    ownerName: text_(data.ownerName || data["Nama Owner"] || existing && existing.ownerName),
    ownerEmail: text_(data.ownerEmail || data["Email Owner"] || existing && existing.ownerEmail),
    storePhone: text_(data.storePhone || data["Kontak Toko"] || existing && existing.storePhone),
    companyEmail: text_(data.companyEmail || data["Email Perusahaan"] || existing && existing.companyEmail),
    notes: text_(data.notes || data.catatan || data["Catatan"] || existing && existing.notes),
    updatedAt: now
  };

  if (existing) return update_("Companies", existing._rowNumber, patch);

  patch.createdAt = now;
  return append_("Companies", patch);
}

function resolveCompany_(payload) {
  if (payload.companyId || payload.id) return companyById_(payload.companyId || payload.id);
  if (payload.companySlug || payload.slug || payload.company) {
    return companyBySlug_(payload.companySlug || payload.slug || payload.company);
  }
  return null;
}

function companyById_(companyId) {
  const wanted = text_(companyId);
  if (!wanted) return null;
  return first_(companies_(), function(row) {
    return text_(row.companyId) === wanted;
  });
}

function companyBySlug_(companySlug) {
  const wanted = slug_(companySlug);
  if (!wanted) return null;
  return first_(companies_(), function(row) {
    return slug_(row.companySlug) === wanted;
  });
}

function companyByApiUrl_(apiUrl) {
  const wanted = normalizeWebAppUrl_(apiUrl);
  if (!wanted) return null;
  return first_(companies_(), function(row) {
    return normalizeWebAppUrl_(row.companyApiUrl) === wanted;
  });
}

function companyBySpreadsheetId_(spreadsheetId) {
  const wanted = text_(spreadsheetId);
  if (!wanted) return null;
  return first_(companies_(), function(row) {
    return text_(row.companySpreadsheetId) === wanted;
  });
}

function publicCompany_(company) {
  const safe = strip_(company);
  safe.gasUrl = safe.companyApiUrl;
  safe.webUrl = safe.frontendUrl;
  safe.slug = safe.companySlug;
  delete safe.companySpreadsheetId;
  delete safe.companySpreadsheetUrl;
  delete safe._rowNumber;
  return safe;
}

function companies_() {
  return rows_("Companies");
}

function ensureDataCenter_() {
  Object.keys(DATA_CENTER_SHEETS).forEach(function(name) {
    ensureSheet_(dataCenter_(), name, DATA_CENTER_SHEETS[name]);
  });
}

function dataCenter_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty("DATA_CENTER_SPREADSHEET_ID") || APP.dataCenterSpreadsheetId;
  if (savedId) return SpreadsheetApp.openById(savedId);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty("DATA_CENTER_SPREADSHEET_ID", active.getId());
    return active;
  }

  const created = SpreadsheetApp.create("Kasir SaaS - Data Center");
  props.setProperty("DATA_CENTER_SPREADSHEET_ID", created.getId());
  return created;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  let width = Math.max(sheet.getLastColumn(), headers.length);
  let current = sheet.getLastRow() ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
  if (!current.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers.map(displayHeader_)]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  if (name === "Companies" && removeObsoleteCompanyColumns_(sheet, current)) {
    width = Math.max(sheet.getLastColumn(), headers.length);
    current = sheet.getLastRow() ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
  }

  const fields = current.map(canonicalHeader_);
  const missing = headers.filter(function(header) {
    return fields.indexOf(header) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing.map(displayHeader_)]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function removeObsoleteCompanyColumns_(sheet, currentHeaders) {
  let removed = false;
  for (let index = currentHeaders.length - 1; index >= 0; index -= 1) {
    if (isObsoleteCompanyHeader_(currentHeaders[index])) {
      sheet.deleteColumn(index + 1);
      removed = true;
    }
  }
  return removed;
}

function isObsoleteCompanyHeader_(header) {
  const normalized = lower_(header).replace(/[^a-z0-9]+/g, "");
  return OBSOLETE_COMPANY_HEADERS.some(function(item) {
    return lower_(item).replace(/[^a-z0-9]+/g, "") === normalized;
  });
}

function headers_(sheet) {
  if (sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(canonicalHeader_);
}

function rows_(sheetName) {
  const sheet = ensureSheet_(dataCenter_(), sheetName, DATA_CENTER_SHEETS[sheetName]);
  if (sheet.getLastRow() < 2) return [];
  const heads = headers_(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, heads.length).getValues();
  return values.filter(function(row) {
    return row.some(function(cell) { return cell !== ""; });
  }).map(function(row, index) {
    const obj = { _rowNumber: index + 2 };
    heads.forEach(function(head, cellIndex) {
      obj[head] = parseCell_(row[cellIndex]);
    });
    return obj;
  });
}

function append_(sheetName, obj) {
  const sheet = ensureSheet_(dataCenter_(), sheetName, DATA_CENTER_SHEETS[sheetName]);
  const heads = headers_(sheet);
  sheet.appendRow(heads.map(function(head) {
    return cellValue_(obj[head]);
  }));
  return rows_(sheetName).slice(-1)[0];
}

function update_(sheetName, rowNumber, patch) {
  const sheet = ensureSheet_(dataCenter_(), sheetName, DATA_CENTER_SHEETS[sheetName]);
  const heads = headers_(sheet);
  const current = sheet.getRange(rowNumber, 1, 1, heads.length).getValues()[0];
  const next = heads.map(function(head, index) {
    return patch[head] !== undefined ? cellValue_(patch[head]) : current[index];
  });
  sheet.getRange(rowNumber, 1, 1, heads.length).setValues([next]);
  const obj = { _rowNumber: rowNumber };
  heads.forEach(function(head, index) {
    obj[head] = parseCell_(next[index]);
  });
  return obj;
}

function displayHeader_(field) {
  return HEADER_LABELS[field] || field;
}

function canonicalHeader_(header) {
  const raw = text_(header);
  if (!raw) return "";
  if (HEADER_LABELS[raw]) return raw;
  const alias = aliasHeader_(raw);
  if (alias) return alias;
  const lowerRaw = lower_(raw);
  const fields = Object.keys(HEADER_LABELS);
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (lower_(HEADER_LABELS[field]) === lowerRaw) return field;
  }
  return raw;
}

function aliasHeader_(header) {
  const wanted = lower_(header).replace(/[^a-z0-9]+/g, "");
  const aliases = Object.keys(HEADER_ALIASES);
  for (let i = 0; i < aliases.length; i += 1) {
    const key = aliases[i];
    if (lower_(key).replace(/[^a-z0-9]+/g, "") === wanted) return HEADER_ALIASES[key];
  }
  return "";
}

function assertAdminKey_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty("DATA_CENTER_ADMIN_KEY");
  if (!expected) throw new Error("DATA_CENTER_ADMIN_KEY belum diatur di Script Properties");
  if (text_(payload.adminKey || payload.adminToken || payload.token) !== expected) throw new Error("Admin key Data Center salah");
}

function isActive_(value) {
  const status = lower_(value);
  return status === "active" ||
    status === "aktif" ||
    status === "1" ||
    status === "yes" ||
    status === "ya" ||
    status === "true";
}

function first_(items, predicate) {
  for (let i = 0; i < items.length; i += 1) {
    if (predicate(items[i])) return items[i];
  }
  return null;
}

function parseBody_(e) {
  return e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
}

function ok_(data) {
  return { success: true, data: data === undefined ? {} : data };
}

function fail_(message) {
  return { success: false, error: message || "Terjadi kesalahan" };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function strip_(obj) {
  const copy = {};
  Object.keys(obj || {}).forEach(function(key) {
    if (key.charAt(0) !== "_") copy[key] = obj[key];
  });
  return copy;
}

function text_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function lower_(value) {
  return text_(value).toLowerCase();
}

function normalizeWebAppUrl_(url) {
  return text_(url).replace(/^http:\/\//, "https://").replace(/\/+$/, "");
}

function slug_(value) {
  return lower_(value).replace(/[^a-z0-9._-]/g, "");
}

function number_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nowIso_() {
  return new Date().toISOString();
}

function parseCell_(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function cellValue_(value) {
  if (value === undefined || value === null) return "";
  return value;
}

function errorMessage_(err) {
  return err && err.message ? err.message : String(err);
}
