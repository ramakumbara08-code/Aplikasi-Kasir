const SPREADSHEET_ID_PROP = "KASIR_SPREADSHEET_ID";
const ROOT_FOLDER_ID_PROP = "KASIR_ROOT_FOLDER_ID";
const INVOICE_FOLDER_ID_PROP = "KASIR_INVOICE_FOLDER_ID";
const LOGO_FOLDER_ID_PROP = "KASIR_LOGO_FOLDER_ID";
const DATA_CENTER_API_URL_PROP = "KASIR_DATA_CENTER_API_URL";
const COMPANY_ID_PROP = "KASIR_COMPANY_ID";
const COMPANY_SLUG_PROP = "KASIR_COMPANY_SLUG";
const COMPANY_REGISTERED_AT_PROP = "KASIR_COMPANY_REGISTERED_AT";
const LICENSE_CACHE_KEY = "KASIR_LICENSE_CACHE";
const SHEET_SCHEMA_CACHE_PREFIX = "KASIR_SCHEMA_OK_";
const DRIVE_FOLDER_CACHE_KEY = "KASIR_DRIVE_FOLDERS_OK";
const TOKEN_DAYS = 7;
const DEFAULT_TENANT_ID = "tenant-demo";

const APP = {
  defaultTimezone: "Asia/Makassar",
  tokenTtlHours: TOKEN_DAYS * 24,
  invoiceFolderName: "Invoices",
  logoFolderName: "Logos",
  dataCenterApiUrl: "https://script.google.com/macros/s/AKfycbxso_3C7_ZuSCbGQbzhMisVys7goyOK5qgjxLFB7wiCFvtlYTX96EX9zSlEcDcXitd8hg/exec",
  licenseCacheSeconds: 1800,
  schemaCacheSeconds: 21600,
  driveFolderCacheSeconds: 21600,
  maxUploadBase64Length: 8 * 1024 * 1024
};

const SHEET_HEADERS = {
  tenants: ["id", "code", "slug", "storeName", "companyName", "ownerName", "ownerEmail", "storePhone", "storeAddress", "companyEmail", "invoicePrefix", "logoUrl", "logoFileId", "logoSize", "logoOffsetX", "plan", "status", "subscriptionEnd", "cashierLimit", "transactionLimit", "storageLimitMb", "spreadsheetId", "spreadsheetUrl", "webUrl", "gasUrl", "active", "notes", "createdAt", "updatedAt"],
  users: ["id", "tenantId", "name", "username", "email", "role", "password", "active", "createdAt", "createdBy", "updatedAt"],
  tokens: ["id", "token", "userId", "email", "username", "name", "role", "tenantId", "companyId", "companySlug", "companyName", "companyApiUrl", "expiresAt", "createdAt"],
  customers: ["id", "tenantId", "isWalkin", "name", "phone", "address", "notes", "createdAt", "updatedAt"],
  categories: ["id", "tenantId", "name", "flow", "behavior", "parentId", "updatedAt"],
  products: ["id", "tenantId", "sku", "name", "categoryId", "subcategoryId", "price", "cost", "hppOutputQty", "hppTotalCost", "hppItems", "stock", "active", "updatedAt"],
  transactions: ["id", "tenantId", "date", "customerId", "customerSnapshot", "cashierName", "paymentMethod", "paymentStatus", "returnStatus", "returnedAt", "returnNote", "notes", "items", "subtotal", "discount", "total", "pdfUrl", "createdAt", "updatedAt"],
  expenses: ["id", "tenantId", "date", "name", "flow", "behavior", "categoryId", "subcategoryId", "unitPrice", "qty", "amount", "notes", "createdAt", "updatedAt"],
  activityLogs: ["id", "at", "actorId", "actorName", "actorUsername", "actorRole", "tenantId", "action", "target", "detail", "metadata"],
  settings: ["settingKey", "settingValue", "updatedAt"]
};

const HEADER_LABELS = {
  id: "ID",
  code: "Kode Tenant",
  slug: "Slug Link Kasir",
  storeName: "Nama Toko",
  companyName: "Nama Perusahaan",
  ownerName: "Nama Owner",
  ownerEmail: "Email Owner",
  storePhone: "Kontak Toko",
  storeAddress: "Alamat Toko",
  companyEmail: "Email Perusahaan",
  invoicePrefix: "Prefix Invoice",
  logoUrl: "URL Logo",
  logoFileId: "ID File Logo",
  logoSize: "Ukuran Logo",
  logoOffsetX: "Geser Logo Horizontal",
  plan: "Paket",
  status: "Status",
  subscriptionEnd: "Akhir Langganan",
  cashierLimit: "Limit Kasir",
  transactionLimit: "Limit Transaksi",
  storageLimitMb: "Limit Storage MB",
  spreadsheetId: "ID Spreadsheet",
  spreadsheetUrl: "URL Spreadsheet",
  webUrl: "URL Web Frontend",
  gasUrl: "URL Web App GAS",
  active: "Aktif",
  notes: "Catatan",
  tenantId: "ID Tenant",
  name: "Nama",
  username: "Username",
  email: "Email",
  role: "Role",
  password: "Password",
  companyId: "ID Perusahaan Data Center",
  companySlug: "Slug Data Center",
  companyApiUrl: "URL Web App GAS Perusahaan",
  createdAt: "Dibuat Pada",
  createdBy: "Dibuat Oleh",
  updatedAt: "Diupdate Pada",
  token: "Token",
  userId: "ID User",
  expiresAt: "Kedaluwarsa Pada",
  isWalkin: "Pelanggan Umum",
  phone: "Kontak WA",
  address: "Alamat",
  flow: "Arus",
  behavior: "Sifat",
  parentId: "ID Induk",
  sku: "SKU",
  categoryId: "ID Kategori",
  subcategoryId: "ID Subkategori",
  price: "Harga Jual",
  cost: "HPP/Modal",
  hppOutputQty: "Jumlah Jadi HPP",
  hppTotalCost: "Total Biaya HPP",
  hppItems: "Rincian HPP",
  stock: "Stok",
  date: "Tanggal",
  customerId: "ID Pelanggan",
  customerSnapshot: "Snapshot Pelanggan",
  cashierName: "Nama Kasir",
  paymentMethod: "Metode Pembayaran",
  paymentStatus: "Status Pembayaran",
  returnStatus: "Status Return",
  returnedAt: "Return Pada",
  returnNote: "Catatan Return",
  items: "Item",
  subtotal: "Subtotal",
  discount: "Diskon",
  total: "Total",
  pdfUrl: "URL PDF",
  unitPrice: "Harga Satuan",
  qty: "Qty",
  amount: "Nominal",
  at: "Waktu",
  actorId: "ID Pelaku",
  actorName: "Nama Pelaku",
  actorUsername: "Username Pelaku",
  actorRole: "Role Pelaku",
  action: "Aksi",
  target: "Target",
  detail: "Detail",
  metadata: "Metadata",
  settingKey: "Kunci Setting",
  settingValue: "Nilai Setting"
};

const HEADER_ALIASES = {
  namaToko: "storeName",
  namaPerusahaan: "companyName",
  noWa: "storePhone",
  kontak: "storePhone",
  alamat: "storeAddress",
  logo: "logoUrl",
  ukuranLogo: "logoSize",
  geserLogo: "logoOffsetX",
  passwordHash: "password",
  kategori: "categoryId",
  subkategori: "subcategoryId",
  hargaModal: "cost",
  hpp: "cost",
  jumlahJadiHpp: "hppOutputQty",
  totalBiayaHpp: "hppTotalCost",
  rincianHpp: "hppItems",
  strukturHpp: "hppItems",
  hargaSatuan: "unitPrice",
  hargaPerUnit: "unitPrice",
  quantity: "qty",
  kuantitas: "qty",
  jumlah: "qty",
  kontakWa: "phone",
  pelanggan: "customerId",
  kasir: "cashierName",
  metodeBayar: "paymentMethod",
  statusBayar: "paymentStatus",
  urlPdf: "pdfUrl",
  setting: "settingKey",
  nilai: "settingValue"
};

const SETTING_KEYS = {
  companyName: "Nama Perusahaan",
  storeName: "Nama Toko",
  logoUrl: "URL Logo",
  logoFileId: "ID File Logo",
  logoSize: "Ukuran Logo",
  logoOffsetX: "Geser Logo Horizontal",
  storePhone: "Kontak Toko",
  storeAddress: "Alamat Toko",
  companyEmail: "Email Perusahaan",
  invoicePrefix: "Prefix Invoice",
  invoiceFolderId: "ID Folder Invoice",
  logoFolderId: "ID Folder Logo",
  timezone: "Zona Waktu"
};

function configureSpreadsheet(spreadsheetId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(SPREADSHEET_ID_PROP, String(spreadsheetId || "").trim());
  return json_({ message: "Konfigurasi Spreadsheet disimpan", spreadsheetId: spreadsheetId || "" });
}

function configureDataCenterUrl(url) {
  const cleanUrl = String(url || "").trim();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(DATA_CENTER_API_URL_PROP, cleanUrl);
  props.deleteProperty(COMPANY_REGISTERED_AT_PROP);
  const result = setup_();
  return json_({
    message: cleanUrl ? "URL Data Center disimpan dan header spreadsheet dicek" : "URL Data Center dikosongkan",
    dataCenterApiUrl: cleanUrl,
    setup: result
  });
}

function setup() {
  return json_(setup_());
}

function setup_() {
  ensureSpreadsheet_();
  ensureSheets_();
  return {
    message: "Setup sheet dan header selesai. Data toko, akun, produk, pelanggan, dan transaksi diisi oleh admin.",
    spreadsheetId: spreadsheetId_(),
    spreadsheetUrl: spreadsheet_().getUrl(),
    sheets: Object.keys(SHEET_HEADERS)
  };
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Kasir SaaS")
    .addItem("Setup / Perbaiki Sheet", "setupCompanySpreadsheet")
    .addItem("Isi URL Data Center", "inputDataCenterUrl")
    .addItem("Daftarkan ke Data Center", "registerCompanyToDataCenter")
    .addItem("Buat / Perbaiki Folder Drive", "createCompanyFolders")
    .addToUi();
}

function setupCompanySpreadsheet() {
  const result = setup_();
  return "Sheet dan header perusahaan siap: " + spreadsheet_().getUrl() + ". Data diisi manual oleh admin.";
}

function inputDataCenterUrl() {
  const ui = SpreadsheetApp.getUi();
  const current = dataCenterApiUrl_();
  const response = ui.prompt(
    "URL Web App GAS Data Center",
    "https://script.google.com/macros/s/AKfycbw82CNKwOGDWKh3LbHWDi4kP5HHOiz2l0E8vA_kn1TJvzUCly6pZXPEYGiaRlMPZPdwYQ/exec" + (current ? "\nSaat ini: " + current : ""),
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return "Dibatalkan";
  const url = response.getResponseText().trim();
  if (!url) return "URL Data Center kosong";
  const props = PropertiesService.getScriptProperties();
  props.setProperty(DATA_CENTER_API_URL_PROP, url);
  props.deleteProperty(COMPANY_REGISTERED_AT_PROP);
  const result = setup_();
  return "URL Data Center disimpan. " + result.message;
}

function registerCompanyToDataCenter() {
  ensureSpreadsheet_();
  ensureSheets_();
  return JSON.stringify(tryRegisterCompanyToDataCenter_(true), null, 2);
}

function createCompanyFolders() {
  ensureDriveFolders_(true);
  return "Folder siap. Invoice: " + folderId_(INVOICE_FOLDER_ID_PROP) + " Logo: " + folderId_(LOGO_FOLDER_ID_PROP);
}

function ensureRuntimeForAction_(action) {
  ensureSpreadsheet_();
  const sheetMap = {
    ping: [],
    login: ["tenants", "users", "tokens"],
    loginOwner: ["tenants", "users", "tokens"],
    loginCashier: ["tenants", "users", "tokens"],
    bootstrap: ["tenants", "users", "categories", "products", "customers", "transactions", "expenses", "activityLogs", "settings"],
    getCompanyConfig: ["tenants", "settings"],
    getCompanyProfile: ["tenants", "settings"],
    createCompanyFolders: [],
    saveTenant: ["tenants"],
    saveActivityLog: ["activityLogs"],
    saveTransaction: ["transactions", "products"],
    markReturn: ["transactions", "products"],
    createInvoicePdf: ["transactions"],
    uploadLogo: ["tenants", "settings"],
    saveUser: ["users"],
    saveCustomer: ["customers"],
    saveCategory: ["categories"],
    saveProduct: ["products"],
    saveExpense: ["expenses"],
    deleteUser: ["users"],
    deleteCustomer: ["customers"],
    deleteCategory: ["categories"],
    deleteProduct: ["products"],
    deleteExpense: ["expenses"]
  };
  const collections = Object.prototype.hasOwnProperty.call(sheetMap, action) ? sheetMap[action] : Object.keys(SHEET_HEADERS);
  collections.forEach((collection) => sheet_(collection));
}

function doGet(e) {
  const action = e.parameter.action || "health";
  if (action === "health") {
      return json_({
      message: "Kasir GAS aktif",
      storage: "Google Spreadsheet",
      configured: Boolean(spreadsheetId_()),
      spreadsheetId: spreadsheetId_(),
      time: new Date().toISOString()
    });
  }
  return json_(fail_("Action tidak tersedia"));
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const action = text_(body.action);
    ensureRuntimeForAction_(action);

    if (action === "ping") return json_({ message: "Company API aktif", serverTime: new Date().toISOString() });
    if (action === "loginOwner") return json_(login_(Object.assign({}, body, { role: "owner" })));
    if (action === "loginCashier") return json_(login_(Object.assign({}, body, { role: "cashier" })));
    if (action === "login") return json_(login_(body));

    const user = requireAuth_(body.token);
    const tenant = getById_("tenants", user.tenantId || DEFAULT_TENANT_ID);
    assertCompanyLicense_(tenant, contextFromUser_(user), true);
    if (action === "bootstrap") return json_(bootstrap_(user));
    if (action === "getCompanyConfig" || action === "getCompanyProfile") return json_(getCompanyProfile_(user));
    if (action === "createCompanyFolders") return json_({ message: createCompanyFolders() });

    if (action === "saveTenant") {
      requireRole_(user, ["platform", "owner"]);
      return json_(saveTenant_(body.tenant, user));
    }

    if (action === "saveActivityLog") {
      requireRole_(user, ["platform", "owner", "cashier"]);
      return json_(saveActivityLog_(body.log));
    }

    if (action === "saveTransaction") {
      requireRole_(user, ["owner", "cashier"]);
      return json_(saveTransaction_(body.transaction));
    }

    if (action === "markReturn") {
      requireRole_(user, ["owner", "cashier"]);
      return json_(markReturn_(body));
    }

    if (action === "createInvoicePdf") {
      requireRole_(user, ["owner", "cashier"]);
      return json_(createInvoicePdf_(body.transaction, body.settings || {}));
    }

    requireRole_(user, ["platform", "owner"]);
    if (action === "uploadLogo") return json_(uploadLogo_(body, user));
    if (action === "saveUser") return json_(saveUser_(body.user));
    if (action === "saveCustomer") return json_(saveCustomer_(body.customer));
    if (action === "saveCategory") return json_(saveCategory_(body.category));
    if (action === "saveProduct") return json_(saveProduct_(body.product));
    if (action === "saveExpense") return json_(saveExpense_(body.expense));
    if (action === "deleteUser") return json_(deleteUser_(body.id, user));
    if (action === "deleteCustomer") return json_(deleteRecord_("customers", body.id));
    if (action === "deleteCategory") return json_(deleteRecord_("categories", body.id));
    if (action === "deleteProduct") return json_(deleteRecord_("products", body.id));
    if (action === "deleteExpense") return json_(deleteRecord_("expenses", body.id));

    return json_(fail_("Action tidak dikenal: " + action));
  } catch (error) {
    return json_(fail_(error.message || String(error)));
  }
}

function login_(body) {
  const login = String(body.email || body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const requestedRole = body.role === "cashier" ? "cashier" : body.role === "owner" ? "owner" : "";
  const context = contextFromPayload_(body);
  const user = findUserByLogin_(login);

  if (!user || user.active === false) throw new Error("Akun tidak ditemukan");
  if (["owner", "cashier"].indexOf(user.role) === -1) throw new Error("Role tidak tersedia di halaman login perusahaan");
  if (requestedRole && user.role !== requestedRole) throw new Error("Role login tidak sesuai");
  if (String(user.password || user.passwordHash || "") !== password) throw new Error("Password tidak cocok");
  const completedUser = ensureLoginUserIds_(user);
  const tenant = getById_("tenants", completedUser.tenantId || DEFAULT_TENANT_ID);
  if (tenant && (tenant.active === false || ["suspended", "expired"].indexOf(tenant.status) !== -1)) {
    throw new Error("Akun perusahaan tidak aktif");
  }
  const verifiedCompany = assertCompanyLicense_(tenant, context, true);

  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const company = verifiedCompany || context || {};
  append_("tokens", token, {
    id: token,
    token,
    userId: completedUser.id,
    email: completedUser.email,
    username: completedUser.username || "",
    name: completedUser.name,
    role: completedUser.role,
    tenantId: completedUser.tenantId || "",
    companyId: company.companyId || "",
    companySlug: company.companySlug || "",
    companyName: company.companyName || "",
    companyApiUrl: company.companyApiUrl || "",
    expiresAt,
    createdAt: new Date().toISOString()
  });

  return {
    token,
    user: {
      id: completedUser.id,
      name: completedUser.name,
      email: completedUser.email,
      username: completedUser.username || "",
      role: completedUser.role,
      tenantId: completedUser.tenantId || ""
    },
    company
  };
}

function bootstrap_(user) {
  if (user.role === "platform") {
    return {
      user,
      tenants: readList_("tenants"),
      users: readList_("users").map(publicUser_),
      categories: readList_("categories"),
      products: readList_("products"),
      customers: readList_("customers"),
      transactions: readList_("transactions"),
      expenses: readList_("expenses"),
      activityLogs: readList_("activityLogs")
    };
  }
  const tenantId = user.tenantId || DEFAULT_TENANT_ID;
  const tenantRows = readList_("tenants").filter((tenant) => tenant.id === tenantId);
  const base = {
    user,
    tenants: tenantRows.length ? tenantRows : [fallbackTenant_(user)],
    categories: readListByTenant_("categories", tenantId),
    products: readListByTenant_("products", tenantId),
    customers: readListByTenant_("customers", tenantId)
  };
  if (user.role === "owner") {
    base.users = readListByTenant_("users", tenantId).map(publicUser_);
    base.transactions = readListByTenant_("transactions", tenantId);
    base.expenses = readListByTenant_("expenses", tenantId);
    base.activityLogs = readListByTenant_("activityLogs", tenantId);
  }
  return base;
}

function saveUser_(user) {
  if (!user || !user.username) throw new Error("Username wajib diisi");
  const username = normalizeUsername_(user.username);
  const previousUsername = normalizeUsername_(user.previousUsername || user.originalUsername || "");
  const previousEmail = lower_(user.previousEmail || user.originalEmail || "");
  const existingById = user.id ? getById_("users", user.id) : null;
  const existingByPrevious = existingById ? null : (
    previousUsername ? findUserByLogin_(previousUsername) :
    previousEmail ? findUserByLogin_(previousEmail) :
    null
  );
  const target = existingById || existingByPrevious;
  const existingByUsername = findUserByLogin_(username);
  if (existingByUsername) {
    const sameById = target && target.id && existingByUsername.id && String(target.id) === String(existingByUsername.id);
    const sameByRow = target && target._rowNumber && existingByUsername._rowNumber && target._rowNumber === existingByUsername._rowNumber;
    if (!sameById && !sameByRow) throw new Error("Username sudah dipakai");
  }
  if (!target && !user.password) throw new Error("Password wajib untuk akun baru");

  const now = new Date().toISOString();
  const row = {
    id: user.id || (target && target.id) || autoId_("usr"),
    name: user.name || username,
    username,
    email: user.email || `${username}@kasir.local`,
    role: user.role === "platform" ? "platform" : user.role === "owner" ? "owner" : "cashier",
    tenantId: user.role === "platform" ? "" : (user.tenantId || (target && target.tenantId) || DEFAULT_TENANT_ID),
    password: user.password ? String(user.password) : ((target && (target.password || target.passwordHash)) || ""),
    active: user.active !== false,
    createdAt: user.createdAt || (target && target.createdAt) || now,
    createdBy: user.createdBy || (target && target.createdBy) || "",
    updatedAt: now
  };
  if (target && target._rowNumber && !findRowNumber_(sheet_("users"), row.id)) {
    patchRow_("users", target._rowNumber, row);
  } else {
    put_("users", row.id, row);
  }
  return { user: publicUser_(row) };
}

function saveTenant_(tenant, actor) {
  if (!tenant || !tenant.storeName) throw new Error("Nama toko wajib diisi");
  if (actor && actor.role === "owner") {
    const actorTenantId = actor.tenantId || DEFAULT_TENANT_ID;
    if (tenant.id && tenant.id !== actorTenantId) throw new Error("Owner hanya bisa mengubah perusahaannya sendiri");
    tenant.id = actorTenantId;
  }
  const now = new Date().toISOString();
  const row = {
    id: tenant.id || Utilities.getUuid(),
    code: normalizeUsername_(tenant.code || tenant.storeName),
    slug: normalizeUsername_(tenant.slug || tenant.code || tenant.storeName),
    storeName: tenant.storeName || "",
    companyName: tenant.companyName || tenant.storeName || "",
    ownerName: tenant.ownerName || "",
    ownerEmail: tenant.ownerEmail || "",
    storePhone: tenant.storePhone || "",
    storeAddress: tenant.storeAddress || "",
    companyEmail: tenant.companyEmail || "",
    invoicePrefix: tenant.invoicePrefix || "INV",
    logoUrl: tenant.logoUrl || "",
    logoSize: Math.max(28, Math.min(180, Number(tenant.logoSize) || 54)),
    logoOffsetX: Math.max(-120, Math.min(120, Number(tenant.logoOffsetX) || 0)),
    plan: tenant.plan || "Starter",
    status: tenant.status || "trial",
    subscriptionEnd: tenant.subscriptionEnd || "",
    cashierLimit: Number(tenant.cashierLimit) || 1,
    transactionLimit: Number(tenant.transactionLimit) || 0,
    storageLimitMb: Number(tenant.storageLimitMb) || 100,
    spreadsheetId: tenant.spreadsheetId || spreadsheetId_(),
    spreadsheetUrl: tenant.spreadsheetUrl || spreadsheet_().getUrl(),
    webUrl: tenant.webUrl || "",
    gasUrl: tenant.gasUrl || "",
    active: tenant.active !== false,
    notes: tenant.notes || "",
    createdAt: tenant.createdAt || now,
    updatedAt: now
  };
  put_("tenants", row.id, row);
  return { tenant: row };
}

function saveActivityLog_(log) {
  if (!log) throw new Error("Log kosong");
  const row = {
    id: log.id || Utilities.getUuid(),
    at: log.at || new Date().toISOString(),
    actorId: log.actorId || "",
    actorName: log.actorName || "",
    actorUsername: log.actorUsername || "",
    actorRole: log.actorRole || "",
    tenantId: log.tenantId || DEFAULT_TENANT_ID,
    action: log.action || "",
    target: log.target || "",
    detail: log.detail || "",
    metadata: log.metadata || {}
  };
  put_("activityLogs", row.id, row);
  return { logId: row.id };
}

function deleteRecord_(collection, id) {
  if (!id) throw new Error("ID kosong");
  remove_(collection, id);
  return { deletedId: id, collection };
}

function deleteUser_(id, actor) {
  if (!id) throw new Error("ID user kosong");
  if (id === actor.id) throw new Error("Tidak bisa menghapus akun sendiri");
  const target = getById_("users", id);
  if (!target) throw new Error("Akun tidak ditemukan");
  if (target.role === "owner") throw new Error("Akun owner tidak boleh dihapus");
  remove_("users", id);
  return { deletedId: id, collection: "users" };
}

function saveCustomer_(customer) {
  const now = new Date().toISOString();
  const row = {
    id: customer.id || Utilities.getUuid(),
    tenantId: customer.tenantId || DEFAULT_TENANT_ID,
    isWalkin: customer.isWalkin === true,
    name: customer.name || "",
    phone: customer.phone || "",
    address: customer.address || "",
    notes: customer.notes || "",
    createdAt: customer.createdAt || now,
    updatedAt: now
  };
  put_("customers", row.id, row);
  return { customerId: row.id };
}

function saveCategory_(category) {
  const row = {
    id: category.id || Utilities.getUuid(),
    tenantId: category.tenantId || DEFAULT_TENANT_ID,
    name: category.name || "",
    flow: category.flow || "income",
    behavior: category.behavior || "variable",
    parentId: category.parentId || "",
    updatedAt: new Date().toISOString()
  };
  put_("categories", row.id, row);
  return { categoryId: row.id };
}

function saveProduct_(product) {
  const row = {
    id: product.id || Utilities.getUuid(),
    tenantId: product.tenantId || DEFAULT_TENANT_ID,
    sku: product.sku || "",
    name: product.name || "",
    categoryId: product.categoryId || "",
    subcategoryId: product.subcategoryId || "",
    price: Number(product.price) || 0,
    cost: Number(product.cost) || 0,
    hppOutputQty: Number(product.hppOutputQty) || 0,
    hppTotalCost: Number(product.hppTotalCost) || 0,
    hppItems: Array.isArray(product.hppItems) ? product.hppItems : [],
    stock: Number(product.stock) || 0,
    active: product.active !== false,
    updatedAt: new Date().toISOString()
  };
  put_("products", row.id, row);
  return { productId: row.id };
}

function saveExpense_(expense) {
  const row = {
    id: expense.id || Utilities.getUuid(),
    tenantId: expense.tenantId || DEFAULT_TENANT_ID,
    date: expense.date || new Date().toISOString(),
    name: expense.name || "",
    flow: "expense",
    behavior: expense.behavior || "variable",
    categoryId: expense.categoryId || "",
    subcategoryId: expense.subcategoryId || "",
    unitPrice: Number(expense.unitPrice) || Number(expense.amount) || 0,
    qty: Math.max(1, Number(expense.qty) || 1),
    amount: Number(expense.amount) || ((Number(expense.unitPrice) || 0) * Math.max(1, Number(expense.qty) || 1)),
    notes: expense.notes || "",
    createdAt: expense.createdAt || new Date().toISOString()
  };
  put_("expenses", row.id, row);
  return { expenseId: row.id };
}

function saveTransaction_(transaction) {
  if (!transaction || !transaction.id) throw new Error("Transaksi tidak valid");
  ensureDriveFolders_();
  const row = normalizeTransaction_(transaction);
  const existing = getById_("transactions", row.id);
  if (existing && existing.pdfUrl && !row.pdfUrl) row.pdfUrl = existing.pdfUrl;
  put_("transactions", row.id, row);

  if (!existing && row.returnStatus !== "returned") {
    adjustStock_(row.items || [], -1);
  }

  return { transactionId: row.id, pdfUrl: row.pdfUrl || "" };
}

function markReturn_(body) {
  const transactionId = body.transactionId || (body.transaction && body.transaction.id);
  if (!transactionId) throw new Error("ID transaksi kosong");

  const existing = getById_("transactions", transactionId);
  const base = body.transaction ? normalizeTransaction_(body.transaction) : existing;
  if (!base) throw new Error("Transaksi tidak ditemukan");

  if (!existing || existing.returnStatus !== "returned") {
    adjustStock_(base.items || [], 1);
  }

  base.returnStatus = "returned";
  base.paymentStatus = "returned";
  base.returnedAt = body.returnedAt || new Date().toISOString();
  base.returnNote = body.returnNote || base.returnNote || "";
  put_("transactions", base.id, base);

  return { transactionId: base.id, returnStatus: base.returnStatus };
}

function createInvoicePdf_(transaction, settings) {
  const saved = normalizeTransaction_(transaction);
  const existing = getById_("transactions", saved.id);
  if (existing && existing.pdfUrl) {
    return { transactionId: saved.id, pdfUrl: existing.pdfUrl };
  }
  const html = invoiceHtml_(saved, settings || {});
  const blob = Utilities.newBlob(html, "text/html", `${saved.id}.html`).getAs(MimeType.PDF);
  ensureDriveFolders_();
  const folder = DriveApp.getFolderById(folderId_(INVOICE_FOLDER_ID_PROP));
  const file = folder.createFile(blob).setName(`${saved.id}.pdf`);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  saved.pdfUrl = file.getUrl();
  put_("transactions", saved.id, saved);
  return { transactionId: saved.id, pdfUrl: saved.pdfUrl };
}

function normalizeTransaction_(transaction) {
  const customer = transaction.customerSnapshot || {};
  const items = (transaction.items || []).map((item) => ({
    productId: item.productId || "",
    sku: item.sku || "",
    name: item.name || "",
    categoryId: item.categoryId || "",
    subcategoryId: item.subcategoryId || "",
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    cost: Number(item.cost) || 0,
    total: Number(item.total) || (Number(item.qty) || 0) * (Number(item.price) || 0)
  }));
  const subtotal = Number(transaction.subtotal) || items.reduce((total, item) => total + item.total, 0);
  const paymentMethod = transaction.paymentMethod || "";
  return {
    id: transaction.id,
    tenantId: transaction.tenantId || DEFAULT_TENANT_ID,
    date: transaction.date || new Date().toISOString(),
    customerId: transaction.customerId || "",
    customerSnapshot: {
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || ""
    },
    cashierName: transaction.cashierName || "",
    paymentMethod,
    paymentStatus: transaction.paymentStatus || (isDeferredPayment_(paymentMethod) ? "pending" : "paid"),
    returnStatus: transaction.returnStatus || "none",
    returnedAt: transaction.returnedAt || "",
    returnNote: transaction.returnNote || "",
    notes: transaction.notes || "",
    items,
    subtotal,
    discount: Number(transaction.discount) || 0,
    total: Number(transaction.total) || subtotal,
    pdfUrl: transaction.pdfUrl || "",
    createdAt: transaction.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function adjustStock_(items, direction) {
  (items || []).forEach((item) => {
    if (!item.productId) return;
    const product = getById_("products", item.productId);
    if (!product) return;
    product.stock = Math.max(0, (Number(product.stock) || 0) + direction * (Number(item.qty) || 0));
    product.updatedAt = new Date().toISOString();
    put_("products", product.id, product);
  });
}

function invoiceHtml_(transaction, settings) {
  const storeName = settings.storeName || "Toko Contoh";
  const companyName = settings.companyName || storeName;
  const storePhone = settings.storePhone || "";
  const storeAddress = settings.storeAddress || "";
  const companyEmail = settings.companyEmail || "";
  const logoUrl = settings.logoUrl || "";
  const logoSize = Math.max(28, Math.min(180, Number(settings.logoSize) || 54));
  const logoOffsetX = Math.max(-120, Math.min(120, Number(settings.logoOffsetX) || 0));
  const customer = transaction.customerSnapshot || {};
  const status = transaction.returnStatus === "returned"
    ? "Return"
    : transaction.paymentStatus === "pending" ? "Pembayaran tunda" : "Lunas";
  const itemRows = (transaction.items || []).map((item) => `
    <tr>
      <td>${html_(item.name || "")}<br><span>${html_(item.sku || "")}</span></td>
      <td>${Number(item.qty) || 0}</td>
      <td>${formatMoney_(item.price)}</td>
      <td>${formatMoney_(item.total)}</td>
    </tr>
  `).join("");
  const effectiveTotal = transaction.returnStatus === "returned" ? 0 : transaction.total;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 10mm; }
          body { color: #111827; font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p { margin: 5px 0; }
          table { border-collapse: collapse; margin-top: 12px; width: 100%; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 5px; text-align: left; }
          th { color: #6b7280; font-size: 10px; text-transform: uppercase; }
          span, .muted { color: #6b7280; }
          .head, .meta, .total { display: flex; justify-content: space-between; gap: 16px; }
          .brand { align-items: flex-start; display: flex; gap: 12px; }
          .brand-logo { height: ${logoSize}px; object-fit: contain; transform: translateX(${logoOffsetX}px); width: ${logoSize}px; }
          .brand-fallback { align-items: center; background: #e4f4ff; border-radius: 8px; color: #126fd6; display: flex; font-weight: bold; height: ${logoSize}px; justify-content: center; transform: translateX(${logoOffsetX}px); width: ${logoSize}px; }
          .badge { background: #d9efeb; border-radius: 20px; color: #134e4a; display: inline-block; font-weight: bold; padding: 4px 8px; }
          .total { align-items: center; background: #134e4a; color: #fff; margin-left: auto; margin-top: 12px; padding: 10px; width: 240px; }
          .total strong { font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="head">
          <div class="brand">
            ${logoUrl ? `<img class="brand-logo" src="${html_(logoUrl)}" alt="${html_(companyName)}">` : `<div class="brand-fallback">${html_(String(companyName).slice(0, 2).toUpperCase())}</div>`}
            <div>
              <h1>${html_(companyName)}</h1>
              <p class="muted">${html_(storeAddress)}<br>${html_(storePhone)}${companyEmail ? `<br>${html_(companyEmail)}` : ""}</p>
            </div>
          </div>
          <div>
            <strong>INVOICE</strong><br>
            ${html_(transaction.id)}<br>
            ${html_(transaction.date || "")}<br>
            <span class="badge">${html_(status)}</span>
          </div>
        </div>
        <div class="meta">
          <p><strong>Tagihan untuk</strong><br>${html_(customer.name || "-")}<br>${html_(customer.phone || "")}<br>${html_(customer.address || "")}</p>
          <p><strong>Pembayaran</strong><br>${html_(transaction.paymentMethod || "-")}<br>Kasir: ${html_(transaction.cashierName || "-")}</p>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="total"><span>Total</span><strong>${formatMoney_(effectiveTotal)}</strong></div>
        <p class="muted">${html_(transaction.notes || transaction.returnNote || "")}</p>
      </body>
    </html>
  `;
}

function requireAuth_(token) {
  if (!token) throw new Error("Token kosong");
  const row = getById_("tokens", token);
  if (!row) throw new Error("Token tidak valid");
  if (new Date(row.expiresAt).getTime() < Date.now()) throw new Error("Token kedaluwarsa");
  return {
    id: row.userId,
    email: row.email,
    username: row.username || "",
    name: row.name,
    role: row.role,
    tenantId: row.tenantId || "",
    companyId: row.companyId || "",
    companySlug: row.companySlug || "",
    companyName: row.companyName || "",
    companyApiUrl: row.companyApiUrl || ""
  };
}

function requireRole_(user, roles) {
  if (roles.indexOf(user.role) === -1) throw new Error("Akses ditolak");
}

function isDeferredPayment_(paymentMethod) {
  return ["Shopee", "TikTok Shop"].indexOf(paymentMethod) !== -1;
}

function normalizeUsername_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function contextFromPayload_(payload) {
  return {
    companyId: text_(payload && (payload.companyId || payload.id)),
    companySlug: normalizeUsername_(payload && (payload.companySlug || payload.slug || payload.company)),
    companyName: text_(payload && payload.companyName),
    storeName: text_(payload && payload.storeName),
    logoUrl: text_(payload && payload.logoUrl),
    companyApiUrl: text_(payload && (payload.companyApiUrl || payload.gasUrl || payload.webAppUrl))
  };
}

function contextFromUser_(user) {
  return {
    companyId: text_(user && user.companyId),
    companySlug: normalizeUsername_(user && user.companySlug),
    companyName: text_(user && user.companyName),
    companyApiUrl: text_(user && user.companyApiUrl)
  };
}

function resolvedCompanyContext_(context) {
  const fallback = context || {};
  const cached = latestCompanyContext_(fallback);
  return {
    companyId: text_(cached.companyId || fallback.companyId),
    companySlug: normalizeUsername_(cached.companySlug || fallback.companySlug),
    companyName: text_(cached.companyName || fallback.companyName || cached.storeName || fallback.storeName),
    storeName: text_(cached.storeName || fallback.storeName || cached.companyName || fallback.companyName),
    logoUrl: text_(cached.logoUrl || fallback.logoUrl),
    companyApiUrl: text_(cached.companyApiUrl || fallback.companyApiUrl || cached.gasUrl)
  };
}

function latestCompanyContext_(context) {
  const url = dataCenterApiUrl_();
  if (!url || (!text_(context && context.companyId) && !text_(context && context.companySlug))) return context || {};
  const cache = CacheService.getScriptCache();
  const cacheKey = `${LICENSE_CACHE_KEY}:company:${text_(context.companyId)}:${normalizeUsername_(context.companySlug)}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {}
  }
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "text/plain;charset=utf-8",
    payload: JSON.stringify({
      action: "resolveCompany",
      companyId: text_(context.companyId),
      companySlug: normalizeUsername_(context.companySlug)
    }),
    muteHttpExceptions: true,
    followRedirects: true
  });
  const data = JSON.parse(response.getContentText() || "{}");
  const company = parseApiEnvelope_(data);
  cache.put(cacheKey, JSON.stringify(company || {}), Math.max(15, Number(APP.licenseCacheSeconds) || 60));
  return company || context || {};
}

function assertCompanyLicense_(tenant, context, useCache) {
  if (tenant) {
    if (tenant.active === false) throw new Error("Perusahaan tidak aktif");
    const localStatus = lower_(tenant.status);
    if (["nonaktif", "inactive", "suspended", "expired"].indexOf(localStatus) !== -1) {
      throw new Error("Perusahaan tidak aktif");
    }
  }
  return assertCompanyActivation_(context, useCache !== false);
}

function assertCompanyActivation_(context, useCache) {
  const url = dataCenterApiUrl_();
  if (!url) return;
  const companyId = text_(context && context.companyId);
  const slug = normalizeUsername_(context && context.companySlug);
  if (!companyId && !slug) {
    throw new Error("Identitas perusahaan dari Data Center wajib dikirim");
  }
  const cache = CacheService.getScriptCache();
  const cacheKey = `${LICENSE_CACHE_KEY}:${companyId}:${slug}`;
  if (useCache && cache.get(cacheKey)) {
    return null;
  }

  let company;
  try {
    company = latestCompanyContext_({ companyId, companySlug: slug });
  } catch (error) {
    throw new Error("Aktivasi perusahaan tidak dapat diverifikasi. Coba lagi sebentar.");
  }
  if (companyId && text_(company.companyId) !== companyId) {
    throw new Error("Data aktivasi perusahaan tidak sesuai dengan Data Center.");
  }
  if (slug && normalizeUsername_(company.companySlug || company.slug) !== slug) {
    throw new Error("Slug aktivasi perusahaan tidak sesuai dengan Data Center.");
  }
  assertRegisteredCompanyMatches_(company);
  cache.put(cacheKey, "1", Math.max(15, Number(APP.licenseCacheSeconds) || 60));
  return company;
}

function parseApiEnvelope_(data) {
  if (data && data.success === false) throw new Error(data.error || "Request Data Center gagal");
  if (data && data.ok === false) throw new Error(data.error || "Request Data Center gagal");
  if (data && Object.prototype.hasOwnProperty.call(data, "data")) return data.data || {};
  if (data && data.company) return data.company;
  return data || {};
}

function dataCenterApiUrl_() {
  return PropertiesService.getScriptProperties().getProperty(DATA_CENTER_API_URL_PROP) || APP.dataCenterApiUrl || "";
}

function tryRegisterCompanyToDataCenter_(force) {
  try {
    return registerCompanyToDataCenter_(force);
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      message: errorMessage_(error)
    };
  }
}

function registerCompanyToDataCenter_(force) {
  const url = dataCenterApiUrl_();
  if (!url) {
    return {
      ok: true,
      skipped: true,
      message: "URL Data Center belum diisi"
    };
  }

  const ownUrl = ownWebAppUrl_();
  if (!ownUrl) {
    return {
      ok: true,
      skipped: true,
      message: "Deploy GAS perusahaan sebagai Web App dulu, lalu jalankan setup lagi agar URL /exec bisa didaftarkan"
    };
  }

  const props = PropertiesService.getScriptProperties();
  const lastRegistered = props.getProperty(COMPANY_REGISTERED_AT_PROP);
  const registrationCacheMs = Math.max(21600, Number(APP.licenseCacheSeconds) || 60) * 1000;
  if (!force && lastRegistered && Date.now() - Number(lastRegistered) < registrationCacheMs) {
    return {
      ok: true,
      skipped: true,
      message: "Registrasi Data Center masih fresh",
      companyId: companyId_(),
      companySlug: props.getProperty(COMPANY_SLUG_PROP) || ""
    };
  }

  const tenant = readList_("tenants")[0] || {};
  const companyId = companyId_();
  const companySlug = companySlug_(tenant);
  syncTenantRegistration_(tenant, companyId, companySlug, ownUrl);

  const payload = {
    action: "registerCompanyFromGas",
    company: {
      companyId,
      companySlug,
      companyName: tenant.companyName || tenant.storeName || spreadsheet_().getName(),
      storeName: tenant.storeName || tenant.companyName || spreadsheet_().getName(),
      ownerName: tenant.ownerName || "",
      ownerEmail: tenant.ownerEmail || "",
      storePhone: tenant.storePhone || "",
      companyEmail: tenant.companyEmail || "",
      address: tenant.storeAddress || "",
      logoUrl: tenant.logoUrl || "",
      companySpreadsheetId: spreadsheetId_(),
      companySpreadsheetUrl: spreadsheet_().getUrl(),
      companyApiUrl: ownUrl,
      status: "nonaktif",
      notes: "Registrasi otomatis dari GAS perusahaan"
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "text/plain;charset=utf-8",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: true
  });
  const data = JSON.parse(response.getContentText() || "{}");
  if (response.getResponseCode() >= 400 || data.success === false || data.ok === false) {
    throw new Error(data.error || "Registrasi ke Data Center gagal");
  }
  const registered = parseApiEnvelope_(data);
  props.setProperty(COMPANY_REGISTERED_AT_PROP, String(Date.now()));
  CacheService.getScriptCache().remove(`${LICENSE_CACHE_KEY}:${companyId}:${companySlug}`);
  return {
    ok: true,
    message: "Perusahaan terdaftar di Data Center. Aktifkan statusnya dari dashboard pusat.",
    companyId,
    companySlug,
    companyApiUrl: ownUrl,
    dataCenterResponse: registered
  };
}

function companyId_() {
  const props = PropertiesService.getScriptProperties();
  let companyId = props.getProperty(COMPANY_ID_PROP);
  if (!companyId) {
    companyId = "cmp-" + Utilities.getUuid();
    props.setProperty(COMPANY_ID_PROP, companyId);
  }
  return companyId;
}

function companySlug_(tenant) {
  const props = PropertiesService.getScriptProperties();
  let slug = props.getProperty(COMPANY_SLUG_PROP);
  if (slug) return slug;
  const companyId = companyId_();
  const raw = normalizeUsername_(
    tenant && tenant.slug && tenant.slug !== "demo" ? tenant.slug :
      tenant && tenant.code && tenant.code !== "demo" ? tenant.code :
        tenant && (tenant.storeName || tenant.companyName) ? (tenant.storeName || tenant.companyName) :
          spreadsheet_().getName()
  );
  slug = `${raw || "toko"}-${companyId.replace(/[^a-z0-9]/g, "").slice(-6)}`;
  props.setProperty(COMPANY_SLUG_PROP, slug);
  return slug;
}

function syncTenantRegistration_(tenant, companyId, companySlug, ownUrl) {
  if (!tenant || !tenant.id) return;
  tenant.code = tenant.code && tenant.code !== "demo" ? tenant.code : companySlug;
  tenant.slug = companySlug;
  tenant.spreadsheetId = spreadsheetId_();
  tenant.spreadsheetUrl = spreadsheet_().getUrl();
  tenant.gasUrl = ownUrl;
  tenant.updatedAt = new Date().toISOString();
  put_("tenants", tenant.id, tenant);
}

function ownWebAppUrl_() {
  try {
    return String(ScriptApp.getService().getUrl() || "").trim();
  } catch (error) {
    return "";
  }
}

function assertRegisteredCompanyMatches_(company) {
  const ownUrl = ownWebAppUrl_();
  const registeredUrl = String(company?.companyApiUrl || company?.gasUrl || "").trim();
  if (!ownUrl || !registeredUrl || isGoogleUserContentUrl_(registeredUrl)) return;
  if (!sameWebAppUrl_(registeredUrl, ownUrl)) {
    throw new Error("URL GAS perusahaan tidak sesuai dengan Data Center. Hubungi admin pusat.");
  }
}

function sameWebAppUrl_(left, right) {
  const leftId = deploymentIdFromUrl_(left);
  const rightId = deploymentIdFromUrl_(right);
  if (leftId && rightId) return leftId === rightId;
  return normalizeWebAppUrl_(left) === normalizeWebAppUrl_(right);
}

function deploymentIdFromUrl_(url) {
  const match = String(url || "").match(/\/macros\/s\/([^/?#]+)/);
  return match ? match[1] : "";
}

function normalizeWebAppUrl_(url) {
  return String(url || "").trim().replace(/^http:\/\//, "https://").replace(/\/+$/, "");
}

function isGoogleUserContentUrl_(url) {
  return normalizeWebAppUrl_(url).indexOf("https://script.googleusercontent.com/macros/echo") === 0;
}

function findUserByLogin_(login) {
  const normalized = String(login || "").trim().toLowerCase();
  const sheet = sheet_("users");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = sheetHeaders_(sheet);
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    if (!row.some((cell) => cell !== "")) continue;
    const user = rowToObject_(headers, row);
    if (String(user.email || "").toLowerCase() === normalized ||
      String(user.username || "").toLowerCase() === normalized) {
      user._rowNumber = index + 1;
      return user;
    }
  }
  return null;
}

function ensureLoginUserIds_(user) {
  const patch = {};
  if (!text_(user.id)) patch.id = autoId_("usr");
  if (!text_(user.tenantId) && user.role !== "platform") patch.tenantId = defaultTenantId_();
  if (!text_(user.name)) patch.name = user.username || user.email || patch.id || "";
  if (!text_(user.email) && text_(user.username)) patch.email = `${normalizeUsername_(user.username)}@kasir.local`;
  if (!Object.keys(patch).length) return user;
  if (user._rowNumber) patchRow_("users", user._rowNumber, patch);
  return Object.assign({}, user, patch);
}

function defaultTenantId_() {
  const tenant = readList_("tenants")[0] || {};
  return text_(tenant.id) || DEFAULT_TENANT_ID;
}

function autoId_(prefix) {
  return `${prefix}-${Utilities.getUuid().replace(/-/g, "").slice(0, 12)}`;
}

function publicUser_(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username || "",
    email: user.email || "",
    role: user.role || "cashier",
    tenantId: user.tenantId || "",
    active: user.active !== false,
    createdAt: user.createdAt || "",
    createdBy: user.createdBy || "",
    updatedAt: user.updatedAt || ""
  };
}

function getCompanyProfile_(user) {
  const tenant = getById_("tenants", user.tenantId || DEFAULT_TENANT_ID) || fallbackTenant_(user);
  return {
    company: publicTenant_(tenant),
    settings: settingsMap_(),
    folders: {
      invoiceFolderId: folderId_(INVOICE_FOLDER_ID_PROP),
      logoFolderId: folderId_(LOGO_FOLDER_ID_PROP)
    }
  };
}

function fallbackTenant_(user) {
  const company = resolvedCompanyContext_(contextFromUser_(user));
  const name = company.storeName || company.companyName || spreadsheet_().getName();
  return {
    id: user.tenantId || DEFAULT_TENANT_ID,
    code: company.companySlug || "",
    slug: company.companySlug || "",
    storeName: name,
    companyName: company.companyName || name,
    ownerName: "",
    ownerEmail: "",
    storePhone: "",
    storeAddress: "",
    companyEmail: "",
    invoicePrefix: "INV",
    logoUrl: company.logoUrl || "",
    logoSize: 54,
    logoOffsetX: 0,
    status: "aktif",
    active: true,
    spreadsheetId: spreadsheetId_(),
    spreadsheetUrl: spreadsheet_().getUrl(),
    gasUrl: company.companyApiUrl || ownWebAppUrl_(),
    webUrl: ""
  };
}

function publicTenant_(tenant) {
  return {
    id: tenant.id || DEFAULT_TENANT_ID,
    code: tenant.code || "",
    slug: tenant.slug || "",
    storeName: tenant.storeName || "",
    companyName: tenant.companyName || tenant.storeName || "",
    ownerName: tenant.ownerName || "",
    ownerEmail: tenant.ownerEmail || "",
    storePhone: tenant.storePhone || "",
    storeAddress: tenant.storeAddress || "",
    companyEmail: tenant.companyEmail || "",
    invoicePrefix: tenant.invoicePrefix || "INV",
    logoUrl: tenant.logoUrl || "",
    logoSize: tenant.logoSize || 54,
    logoOffsetX: tenant.logoOffsetX || 0,
    plan: tenant.plan || "Starter",
    status: tenant.status || "aktif",
    subscriptionEnd: tenant.subscriptionEnd || "",
    cashierLimit: tenant.cashierLimit || 1,
    transactionLimit: tenant.transactionLimit || 0,
    storageLimitMb: tenant.storageLimitMb || 100,
    spreadsheetId: tenant.spreadsheetId || "",
    spreadsheetUrl: tenant.spreadsheetUrl || "",
    webUrl: tenant.webUrl || "",
    gasUrl: tenant.gasUrl || ""
  };
}

function uploadLogo_(body, user) {
  requireRole_(user, ["owner"]);
  const dataUrl = String(body.logoData || body.logoBase64 || "");
  if (!dataUrl) throw new Error("Data logo kosong");
  if (dataUrl.length > APP.maxUploadBase64Length) throw new Error("Ukuran logo terlalu besar");
  ensureDriveFolders_();
  const tenant = getById_("tenants", user.tenantId || DEFAULT_TENANT_ID) || {};
  const folder = DriveApp.getFolderById(folderId_(LOGO_FOLDER_ID_PROP));
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/png";
  const base64 = match ? match[2] : dataUrl;
  const extension = mimeType.indexOf("svg") !== -1 ? "svg" : mimeType.indexOf("jpeg") !== -1 ? "jpg" : "png";
  const fileName = `logo-${tenant.slug || tenant.code || tenant.id || "toko"}-${Date.now()}.${extension}`;
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const logoUrl = file.getUrl();
  tenant.logoUrl = logoUrl;
  tenant.logoFileId = file.getId();
  tenant.updatedAt = new Date().toISOString();
  put_("tenants", tenant.id || DEFAULT_TENANT_ID, tenant);
  upsertSetting_(SETTING_KEYS.logoUrl, logoUrl);
  upsertSetting_(SETTING_KEYS.logoFileId, file.getId());
  return { logoUrl, logoFileId: file.getId() };
}

function readList_(collection) {
  const sheet = sheet_(collection);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = sheetHeaders_(sheet);
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => rowToObject_(headers, row));
}

function readListByTenant_(collection, tenantId) {
  return readList_(collection).filter((row) => (row.tenantId || DEFAULT_TENANT_ID) === tenantId);
}

function getById_(collection, id) {
  if (!id) return null;
  return readList_(collection).find((row) => String(row.id || row.token || "") === String(id)) || null;
}

function put_(collection, id, value) {
  const sheet = sheet_(collection);
  const headers = headers_(collection);
  const key = String(id || value.id || value.token || "");
  if (!key) throw new Error(`ID kosong untuk ${collection}`);
  if (!value.id) value.id = key;
  const rowNumber = findRowNumber_(sheet, key);
  const row = headers.map((header) => cellValue_(value[header]));
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return value;
}

function append_(collection, id, value) {
  const sheet = sheet_(collection);
  const headers = headers_(collection);
  const key = String(id || value.id || value.token || "");
  if (!key) throw new Error(`ID kosong untuk ${collection}`);
  if (!value.id) value.id = key;
  sheet.appendRow(headers.map((header) => cellValue_(value[header])));
  return value;
}

function patchRow_(collection, rowNumber, patch) {
  const sheet = sheet_(collection);
  const headers = sheetHeaders_(sheet);
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const next = headers.map((header, index) => patch[header] !== undefined ? cellValue_(patch[header]) : current[index]);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([next]);
  const object = rowToObject_(headers, next);
  object._rowNumber = rowNumber;
  return object;
}

function remove_(collection, id) {
  const rowNumber = findRowNumber_(sheet_(collection), id);
  if (rowNumber) sheet_(collection).deleteRow(rowNumber);
  return null;
}

function findBy_(collection, key, value) {
  return readList_(collection).find((row) => String(row[key]).toLowerCase() === String(value).toLowerCase());
}

function settingsMap_() {
  return readList_("settings").reduce((map, row) => {
    map[row.settingKey] = row.settingValue;
    return map;
  }, {});
}

function upsertSetting_(settingKey, settingValue) {
  const now = new Date().toISOString();
  put_("settings", settingKey, { settingKey, settingValue, updatedAt: now });
}

function ensureDefaultSettings_() {
  const tenant = readList_("tenants")[0] || {};
  const defaults = {};
  defaults[SETTING_KEYS.companyName] = tenant.companyName || "Toko Contoh";
  defaults[SETTING_KEYS.storeName] = tenant.storeName || "Toko Contoh";
  defaults[SETTING_KEYS.logoUrl] = tenant.logoUrl || "";
  defaults[SETTING_KEYS.logoSize] = tenant.logoSize || 54;
  defaults[SETTING_KEYS.logoOffsetX] = tenant.logoOffsetX || 0;
  defaults[SETTING_KEYS.storePhone] = tenant.storePhone || "6281230004567";
  defaults[SETTING_KEYS.storeAddress] = tenant.storeAddress || "Jl. Usaha No. 10, Makassar";
  defaults[SETTING_KEYS.companyEmail] = tenant.companyEmail || "halo@tokocontoh.id";
  defaults[SETTING_KEYS.invoicePrefix] = tenant.invoicePrefix || "INV";
  defaults[SETTING_KEYS.invoiceFolderId] = folderId_(INVOICE_FOLDER_ID_PROP);
  defaults[SETTING_KEYS.logoFolderId] = folderId_(LOGO_FOLDER_ID_PROP);
  defaults[SETTING_KEYS.timezone] = APP.defaultTimezone;
  const existing = settingsMap_();
  Object.keys(defaults).forEach((key) => {
    if (existing[key] === undefined || existing[key] === "") upsertSetting_(key, defaults[key]);
  });
}

function spreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROP) || "";
}

function spreadsheet_() {
  const id = spreadsheetId_();
  if (!id) return ensureSpreadsheet_();
  return SpreadsheetApp.openById(id);
}

function ensureSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(SPREADSHEET_ID_PROP);
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty(SPREADSHEET_ID_PROP, active.getId());
    return active;
  }
  const file = SpreadsheetApp.create("Kasir SaaS - Data Perusahaan");
  props.setProperty(SPREADSHEET_ID_PROP, file.getId());
  return file;
}

function ensureSheets_() {
  Object.keys(SHEET_HEADERS).forEach((collection) => sheet_(collection, true));
}

function headers_(collection) {
  if (!SHEET_HEADERS[collection]) throw new Error(`Sheet ${collection} tidak dikenal`);
  return SHEET_HEADERS[collection];
}

function sheet_(collection, force) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(collection);
  const cache = CacheService.getScriptCache();
  const cacheKey = `${SHEET_SCHEMA_CACHE_PREFIX}${collection}`;
  if (!force && sheet && cache.get(cacheKey)) return sheet;
  if (!sheet) sheet = ss.insertSheet(collection);
  const headers = headers_(collection);
  const current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn() || headers.length)).getValues()[0];
  if (!current.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers.map(displayHeader_)]);
    sheet.setFrozenRows(1);
    cache.put(cacheKey, "1", Math.max(60, Number(APP.schemaCacheSeconds) || 21600));
    return sheet;
  }
  const normalized = current.map((header) => header ? displayHeader_(canonicalHeader_(header)) : "");
  sheet.getRange(1, 1, 1, normalized.length).setValues([normalized]);
  const fields = current.map(canonicalHeader_);
  const missing = headers.filter((header) => fields.indexOf(header) === -1);
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing.map(displayHeader_)]);
  }
  sheet.setFrozenRows(1);
  cache.put(cacheKey, "1", Math.max(60, Number(APP.schemaCacheSeconds) || 21600));
  return sheet;
}

function sheetHeaders_(sheet) {
  if (sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(canonicalHeader_);
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

function findRowNumber_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const key = String(id || "");
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === key) return index + 2;
  }
  return 0;
}

function rowToObject_(headers, row) {
  return headers.reduce((object, header, index) => {
    object[header] = parseCell_(row[index]);
    return object;
  }, {});
}

function parseCell_(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (value === true || value === false) return value;
  const text = String(value);
  if (text === "true") return true;
  if (text === "false") return false;
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }
  return value;
}

function cellValue_(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]") return JSON.stringify(value);
  return value;
}

function folderId_(propName) {
  return PropertiesService.getScriptProperties().getProperty(propName) || "";
}

function ensureDriveFolders_(force) {
  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  if (!force && props.getProperty(ROOT_FOLDER_ID_PROP) && props.getProperty(INVOICE_FOLDER_ID_PROP) && props.getProperty(LOGO_FOLDER_ID_PROP) && cache.get(DRIVE_FOLDER_CACHE_KEY)) {
    return;
  }
  let rootId = props.getProperty(ROOT_FOLDER_ID_PROP);
  let root = rootId ? folderByIdOrNull_(rootId) : null;
  if (!root) {
    const parent = spreadsheetParentFolder_();
    const name = `Kasir SaaS - ${spreadsheet_().getName()}`;
    const existing = parent.getFoldersByName(name);
    root = existing.hasNext() ? existing.next() : parent.createFolder(name);
    props.setProperty(ROOT_FOLDER_ID_PROP, root.getId());
  }
  const invoiceFolder = ensureChildFolder_(root, INVOICE_FOLDER_ID_PROP, APP.invoiceFolderName);
  const logoFolder = ensureChildFolder_(root, LOGO_FOLDER_ID_PROP, APP.logoFolderName);
  invoiceFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  logoFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  cache.put(DRIVE_FOLDER_CACHE_KEY, "1", Math.max(60, Number(APP.driveFolderCacheSeconds) || 21600));
}

function spreadsheetParentFolder_() {
  try {
    const file = DriveApp.getFileById(spreadsheet_().getId());
    const parents = file.getParents();
    if (parents.hasNext()) return parents.next();
  } catch (error) {}
  return DriveApp.getRootFolder();
}

function ensureChildFolder_(root, propName, name) {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(propName);
  const existingFolder = existingId ? folderByIdOrNull_(existingId) : null;
  if (existingFolder) return existingFolder;
  const folders = root.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(name);
  props.setProperty(propName, folder.getId());
  return folder;
}

function folderByIdOrNull_(folderId) {
  try {
    return folderId ? DriveApp.getFolderById(folderId) : null;
  } catch (error) {
    return null;
  }
}

function formatMoney_(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function html_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function text_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function errorMessage_(error) {
  return error && error.message ? error.message : String(error);
}

function lower_(value) {
  return text_(value).toLowerCase();
}

function json_(payload) {
  const body = payload && Object.prototype.hasOwnProperty.call(payload, "success") ? payload : ok_(payload);
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return { success: true, data: data === undefined ? {} : data };
}

function fail_(message) {
  return { success: false, error: message || "Terjadi kesalahan" };
}
