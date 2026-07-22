(() => {
  const STORAGE_KEY_BASE = "kasir-gas-state-v1";
  const CENTER_STORAGE_KEY = "kasir-center-api-url";
  const COMPANY_CACHE_PREFIX = "kasir-company-cache-v1";
  const COMPANY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const FILTER_RENDER_DELAY_MS = 900;
  const PRODUCT_RESULT_LIMIT = 120;
  const CUSTOMER_RESULT_LIMIT = 150;
  let centerApiUrl = initialCenterApiUrl();
  let centerStatusMessage = "";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const pendingInvoicePdfs = new Map();
  let filterTimer = null;
  let lightFilterFrame = null;

  const navItems = [
    { id: "platform", label: "SaaS Admin", icon: "tenant", roles: ["platform"], title: "Dashboard SaaS", subtitle: "Kelola data toko, link frontend, URL GAS perusahaan, spreadsheet, dan status aktivasi." },
    { id: "summary", label: "Beranda", icon: "home", roles: ["owner"], title: "Beranda", subtitle: "Pantau kas, bank, performa bisnis, dan shortcut fitur utama." },
    { id: "pos", label: "Penjualan", icon: "sales", roles: ["owner", "cashier"], title: "Input Penjualan", subtitle: "Produk, pelanggan, pembayaran, dan invoice dalam satu alur." },
    { id: "reports", label: "Laporan", icon: "reports", roles: ["owner"], title: "Laporan Akuntansi", subtitle: "Laba rugi, HPP, aset sederhana, dan export untuk kebutuhan usaha." },
    { id: "customers", label: "Kontak", icon: "customers", roles: ["owner"], title: "CRM Pelanggan", subtitle: "Data kontak, alamat, catatan, dan histori belanja per pelanggan." },
    { id: "expenses", label: "Biaya", icon: "expenses", roles: ["owner"], title: "Biaya", subtitle: "Catat biaya tetap dan tidak tetap dengan kategori akuntansi dasar." },
    { id: "categories", label: "Produk", icon: "products", roles: ["owner"], title: "Produk & Kategori", subtitle: "Atur akun pemasukan, pengeluaran, subkategori, dan produk kasir." },
    { id: "invoices", label: "Invoice", icon: "invoices", roles: ["owner"], title: "Invoice", subtitle: "Buka, cetak PDF, dan kirim invoice ke pelanggan via WA." },
    { id: "team", label: "Akun", icon: "team", roles: ["owner"], title: "Akun & Log Aktivitas", subtitle: "Buat akun kasir dan lihat jejak setiap tindakan agar tanggung jawab jelas." },
    { id: "settings", label: "Pengaturan", icon: "settings", roles: ["owner"], title: "Pengaturan", subtitle: "Profil toko dikelola tanpa perlu mengurus GAS atau Spreadsheet." }
  ];

  const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });

  function daysAgo(count) {
    const date = new Date();
    date.setDate(date.getDate() - count);
    return date;
  }

  function toDateInput(date) {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Koneksi terlalu lama. Coba lagi sebentar.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function unwrapApiResult(data, fallbackMessage = "Request gagal") {
    if (data && data.success === false) throw new Error(data.error || fallbackMessage);
    if (data && data.ok === false) throw new Error(data.error || fallbackMessage);
    if (data && Object.prototype.hasOwnProperty.call(data, "data")) return data.data || {};
    if (data && data.company) return data.company;
    return data || {};
  }

  function initialCenterApiUrl() {
    const params = new URLSearchParams(location.search || "");
    const queryUrl = String(params.get("center") || params.get("centerUrl") || params.get("dataCenter") || "").trim();
    if (queryUrl) {
      try {
        localStorage.setItem(CENTER_STORAGE_KEY, queryUrl);
      } catch (error) {}
      return queryUrl;
    }
    const configured = String(
      window.KASIR_CONFIG?.dataCenterApiUrl ||
      window.KASIR_CONFIG?.apiBaseUrl ||
      window.KASIR_CENTER_API_URL ||
      ""
    ).trim();
    if (configured) return configured;
    try {
      return String(localStorage.getItem(CENTER_STORAGE_KEY) || "").trim();
    } catch (error) {
      return "";
    }
  }

  function hasTenantSlug() {
    return Boolean(appSlug()) && !isDemoSlug();
  }

  function centerApiUrl_() {
    return centerApiUrl;
  }

  function appSlug() {
    const params = new URLSearchParams(location.search || "");
    const querySlug = params.get("slug") || params.get("tenant") || "";
    if (querySlug) return normalizeUsername(querySlug);
    const parts = String(location.pathname || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (!last || last === "index.html") return "";
    return normalizeUsername(last.replace(/\.html$/, ""));
  }

  function isDemoSlug() {
    return appSlug() === "demo";
  }

  function externalDemoState() {
    if (!isDemoSlug() || !window.KASIR_DEMO_STATE) return null;
    const source = typeof window.KASIR_DEMO_STATE === "function" ? window.KASIR_DEMO_STATE() : window.KASIR_DEMO_STATE;
    try {
      return JSON.parse(JSON.stringify(source));
    } catch (error) {
      return source;
    }
  }

  function storageKey() {
    return `${STORAGE_KEY_BASE}:${appSlug() || "local"}`;
  }

  function createDefaultState() {
    const demo = externalDemoState();
    if (demo) return demo;

    const tenantId = "tenant-demo";
    const categories = [
      { id: "cat-sales", tenantId, name: "Penjualan Produk", flow: "income", behavior: "variable", parentId: "" },
      { id: "cat-service", tenantId, name: "Pendapatan Jasa", flow: "income", behavior: "variable", parentId: "" },
      { id: "cat-other-income", tenantId, name: "Pemasukan Lain", flow: "income", behavior: "variable", parentId: "" },
      { id: "sub-drinks", tenantId, name: "Minuman", flow: "income", behavior: "variable", parentId: "cat-sales" },
      { id: "sub-food", tenantId, name: "Makanan", flow: "income", behavior: "variable", parentId: "cat-sales" },
      { id: "sub-merch", tenantId, name: "Barang Retail", flow: "income", behavior: "variable", parentId: "cat-sales" },
      { id: "cat-fixed-expense", tenantId, name: "Biaya Tetap", flow: "expense", behavior: "fixed", parentId: "" },
      { id: "cat-variable-expense", tenantId, name: "Biaya Tidak Tetap", flow: "expense", behavior: "variable", parentId: "" },
      { id: "sub-rent", tenantId, name: "Sewa", flow: "expense", behavior: "fixed", parentId: "cat-fixed-expense" },
      { id: "sub-salary", tenantId, name: "Gaji", flow: "expense", behavior: "fixed", parentId: "cat-fixed-expense" },
      { id: "sub-utility", tenantId, name: "Listrik & Internet", flow: "expense", behavior: "fixed", parentId: "cat-fixed-expense" },
      { id: "sub-cogs", tenantId, name: "Bahan Baku", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" },
      { id: "sub-packaging", tenantId, name: "Kemasan", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" },
      { id: "sub-delivery", tenantId, name: "Transport", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" },
      { id: "sub-marketing", tenantId, name: "Promosi", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" }
    ];

    const products = [
      { id: "prd-kopi-susu", tenantId, sku: "KS-001", name: "Kopi Susu Aren", categoryId: "cat-sales", subcategoryId: "sub-drinks", price: 18000, cost: 9000, stock: 80, active: true },
      { id: "prd-matcha", tenantId, sku: "MT-001", name: "Matcha Latte", categoryId: "cat-sales", subcategoryId: "sub-drinks", price: 22000, cost: 11000, stock: 46, active: true },
      { id: "prd-roti", tenantId, sku: "RT-001", name: "Roti Panggang", categoryId: "cat-sales", subcategoryId: "sub-food", price: 16000, cost: 7500, stock: 42, active: true },
      { id: "prd-ricebox", tenantId, sku: "RB-001", name: "Rice Box Ayam", categoryId: "cat-sales", subcategoryId: "sub-food", price: 28000, cost: 16000, stock: 35, active: true },
      { id: "prd-tumbler", tenantId, sku: "TM-001", name: "Tumbler Toko", categoryId: "cat-sales", subcategoryId: "sub-merch", price: 65000, cost: 38000, stock: 18, active: true }
    ];

    const customers = [
      { id: "cust-walkin", tenantId, isWalkin: true, name: "Pelanggan Umum", phone: "", address: "", notes: "Transaksi tanpa data pelanggan.", createdAt: daysAgo(60).toISOString() },
      { id: "cust-maya", tenantId, name: "Maya Lestari", phone: "081234567890", address: "Jl. Mawar 18, Makassar", notes: "Suka promo paket minuman.", createdAt: daysAgo(45).toISOString() },
      { id: "cust-andi", tenantId, name: "Andi Saputra", phone: "082198765432", address: "Jl. Veteran Utara 9", notes: "Sering beli untuk kantor.", createdAt: daysAgo(30).toISOString() }
    ];

    const transactions = [
      makeSeedTransaction("INV-1001", daysAgo(12), customers[1], [
        { product: products[0], qty: 2 },
        { product: products[2], qty: 1 }
      ], "QRIS", "Rina"),
      makeSeedTransaction("INV-1002", daysAgo(8), customers[2], [
        { product: products[3], qty: 4 },
        { product: products[1], qty: 3 }
      ], "Transfer", "Budi"),
      makeSeedTransaction("INV-1003", daysAgo(3), customers[1], [
        { product: products[4], qty: 1 },
        { product: products[0], qty: 1 }
      ], "Tunai", "Rina")
    ];

    return {
      version: 1,
      platformSettings: {
        appName: "Kasir SaaS",
        apiUrl: "",
        supportWa: "6281230004567"
      },
      tenants: [
        {
          id: tenantId,
          code: "demo",
          slug: "demo",
          storeName: "Toko Contoh",
          companyName: "Toko Contoh",
          ownerName: "Owner",
          ownerEmail: "owner@kasir.local",
          storePhone: "6281230004567",
          storeAddress: "Jl. Usaha No. 10, Makassar",
          companyEmail: "halo@tokocontoh.id",
          invoicePrefix: "INV",
          logoUrl: "",
          logoSize: 54,
          logoOffsetX: 0,
          plan: "",
          status: "active",
          subscriptionEnd: "",
          cashierLimit: 0,
          transactionLimit: 0,
          storageLimitMb: 100,
          spreadsheetId: "",
          spreadsheetUrl: "",
          webUrl: "",
          gasUrl: "",
          active: true,
          notes: "Tenant demo bawaan.",
          createdAt: daysAgo(60).toISOString()
        }
      ],
      settings: {
        apiUrl: "",
        storeName: "Toko Contoh",
        companyName: "Toko Contoh",
        storePhone: "6281230004567",
        storeAddress: "Jl. Usaha No. 10, Makassar",
        companyEmail: "halo@tokocontoh.id",
        invoicePrefix: "INV",
        logoUrl: "",
        logoSize: 54,
        logoOffsetX: 0
      },
      users: [
        { id: "usr-platform", name: "Platform Admin", username: "admin", email: "admin@kasir.local", role: "platform", password: "admin123", active: true, createdAt: daysAgo(60).toISOString() },
        { id: "usr-owner", tenantId, name: "Owner", username: "owner", email: "owner@kasir.local", role: "owner", password: "owner123", active: true, createdAt: daysAgo(60).toISOString() },
        { id: "usr-cashier", tenantId, name: "Karyawan", username: "kasir", email: "kasir@kasir.local", role: "cashier", password: "kasir123", active: true, createdAt: daysAgo(60).toISOString() }
      ],
      categories,
      products,
      customers,
      transactions,
      expenses: [
        { id: "exp-001", tenantId, date: daysAgo(10).toISOString(), name: "Sewa kios bulanan", flow: "expense", behavior: "fixed", categoryId: "cat-fixed-expense", subcategoryId: "sub-rent", amount: 2500000, notes: "Juli" },
        { id: "exp-002", tenantId, date: daysAgo(5).toISOString(), name: "Belanja bahan baku", flow: "expense", behavior: "variable", categoryId: "cat-variable-expense", subcategoryId: "sub-cogs", amount: 740000, notes: "Kopi, susu, gula aren" },
        { id: "exp-003", tenantId, date: daysAgo(2).toISOString(), name: "Kemasan takeaway", flow: "expense", behavior: "variable", categoryId: "cat-variable-expense", subcategoryId: "sub-packaging", amount: 260000, notes: "" }
      ],
      activityLogs: [],
      session: null
    };
  }

  function makeSeedTransaction(id, date, customer, lines, paymentMethod, cashierName) {
    const items = lines.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      qty,
      price: product.price,
      cost: product.cost,
      total: product.price * qty
    }));
    const subtotal = sum(items, "total");
    return {
      id,
      tenantId: customer.tenantId || "tenant-demo",
      date: date.toISOString(),
      customerId: customer.id,
      customerSnapshot: { name: customer.name, phone: customer.phone, address: customer.address },
      cashierName,
      paymentMethod,
      paymentStatus: isDeferredPayment(paymentMethod) ? "pending" : "paid",
      returnStatus: "none",
      returnedAt: "",
      returnNote: "",
      notes: "",
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      pdfUrl: "",
      synced: false
    };
  }

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
  }

  function normalizeUser(user) {
    const username = normalizeUsername(user.username || (user.email || "").split("@")[0] || user.name);
    const role = ["platform", "owner", "cashier"].includes(user.role) ? user.role : "cashier";
    return {
      ...user,
      username,
      email: user.email || `${username || user.id}@kasir.local`,
      role,
      tenantId: role === "platform" ? "" : (user.tenantId || "tenant-demo"),
      active: user.active !== false,
      createdAt: user.createdAt || nowIso()
    };
  }

  function userLoginMatches(user, login) {
    const normalizedLogin = String(login || "").trim().toLowerCase();
    return [user.email, user.username].some((value) => String(value || "").toLowerCase() === normalizedLogin);
  }

  function actorName(log) {
    return log.actorName || "Sistem";
  }

  function actionLabel(action) {
    const labels = {
      login: "Login",
      logout: "Logout",
      create_transaction: "Membuat transaksi",
      create_customer: "Menambah pelanggan",
      create_expense: "Mencatat pengeluaran",
      create_category: "Menambah kategori",
      create_product: "Menambah item",
      update_settings: "Mengubah pengaturan",
      create_invoice_pdf: "Membuat PDF invoice",
      mark_return: "Return transaksi",
      settle_payment: "Melunasi pembayaran tunda",
      create_user: "Membuat akun kasir",
      update_user: "Mengubah akun kasir",
      reset_password: "Reset password kasir",
      delete_user: "Menghapus akun kasir",
      toggle_user: "Mengubah status akun",
      update_customer: "Mengubah pelanggan",
      delete_customer: "Menghapus pelanggan",
      update_expense: "Mengubah pengeluaran",
      delete_expense: "Menghapus pengeluaran",
      update_category: "Mengubah kategori",
      delete_category: "Menghapus kategori",
      update_product: "Mengubah item",
      delete_product: "Menghapus item",
      create_tenant: "Membuat tenant",
      update_tenant: "Mengubah tenant",
      update_platform_settings: "Mengubah pengaturan SaaS"
    };
    return labels[action] || action;
  }

  function promptText(label, currentValue = "", required = false) {
    const value = window.prompt(label, currentValue ?? "");
    if (value === null) return null;
    const trimmed = String(value).trim();
    if (required && !trimmed) {
      toast(`${label} wajib diisi.`);
      return null;
    }
    return trimmed;
  }

  function promptNumber(label, currentValue = 0) {
    const value = window.prompt(label, String(currentValue ?? 0));
    if (value === null) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      toast("Nominal/angka tidak valid.");
      return null;
    }
    return number;
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function reportData(from, to) {
    const transactions = tenantTransactions()
      .filter((transaction) => inDateRange(transaction.date, from, to))
      .filter((transaction) => transaction.returnStatus !== "returned");
    const returned = tenantTransactions()
      .filter((transaction) => inDateRange(transaction.date, from, to))
      .filter((transaction) => transaction.returnStatus === "returned");
    const expenses = tenantExpenses().filter((expense) => inDateRange(expense.date, from, to));
    const paidSales = sum(transactions.filter((transaction) => transaction.paymentStatus !== "pending"), "total");
    const pendingSales = sum(transactions.filter((transaction) => transaction.paymentStatus === "pending"), "total");
    const grossSales = paidSales + pendingSales;
    const returnTotal = sum(returned, "total");
    const netSales = grossSales;
    const cogs = sum(transactions, (transaction) => sum(transaction.items || [], (item) => (Number(item.cost) || 0) * (Number(item.qty) || 0)));
    const grossProfit = netSales - cogs;
    const operatingExpenses = sum(expenses, "amount");
    const netProfit = grossProfit - operatingExpenses;
    const inventoryAsset = sum(tenantProducts(), (product) => (Number(product.stock) || 0) * (Number(product.cost) || 0));
    const cashAsset = Math.max(0, paidSales - operatingExpenses);
    const receivableAsset = pendingSales;
    return {
      transactions,
      returned,
      expenses,
      paidSales,
      pendingSales,
      grossSales,
      returnTotal,
      netSales,
      cogs,
      grossProfit,
      operatingExpenses,
      netProfit,
      inventoryAsset,
      cashAsset,
      receivableAsset,
      totalAssets: cashAsset + receivableAsset + inventoryAsset
    };
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function rowsToCsv(rows) {
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function rowsToExcelHtml(title, rows) {
    return `
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <table border="1">
            <caption>${esc(title)}</caption>
            ${rows.map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}
          </table>
        </body>
      </html>
    `;
  }

  function reportRows(data) {
    return [
      ["Bagian", "Akun", "Nominal", "Catatan Pemula"],
      ["Laba Rugi", "Penjualan lunas", data.paidSales, "Uang sudah diterima"],
      ["Laba Rugi", "Penjualan tunda", data.pendingSales, "Shopee/TikTok belum cair"],
      ["Laba Rugi", "Retur", data.returnTotal, "Tidak dihitung sebagai pendapatan"],
      ["Laba Rugi", "Penjualan bersih", data.netSales, "Penjualan valid setelah retur dikeluarkan"],
      ["Laba Rugi", "HPP", data.cogs, "Modal barang yang terjual"],
      ["Laba Rugi", "Laba kotor", data.grossProfit, "Penjualan bersih - HPP"],
      ["Laba Rugi", "Beban operasional", data.operatingExpenses, "Pengeluaran periode ini"],
      ["Laba Rugi", "Laba bersih", data.netProfit, "Laba kotor - beban"],
      ["Aset", "Kas/bank estimasi", data.cashAsset, "Penjualan lunas - pengeluaran"],
      ["Aset", "Piutang marketplace", data.receivableAsset, "Pembayaran tunda belum cair"],
      ["Aset", "Persediaan", data.inventoryAsset, "Stok x harga modal"],
      ["Aset", "Total aset sederhana", data.totalAssets, "Kas + piutang + persediaan"]
    ];
  }

  function customerRows() {
    return [
      ["Nama", "Kontak WA", "Alamat", "Keterangan", "Total Belanja", "Jumlah Transaksi"],
      ...tenantCustomers().map((customer) => {
        const history = tenantTransactions().filter((transaction) => transaction.customerId === customer.id);
        return [
          customer.name || "",
          normalizeWa(customer.phone || ""),
          customer.address || "",
          customer.notes || "",
          sum(history, effectiveTransactionTotal),
          history.length
        ];
      })
    ];
  }

  function exportReport(format) {
    const data = reportData(ui.reportFrom, ui.reportTo);
    const rows = reportRows(data);
    const suffix = `${ui.reportFrom}_sd_${ui.reportTo}`;
    if (format === "csv") {
      downloadFile(`laporan-akuntansi-${suffix}.csv`, rowsToCsv(rows), "text/csv;charset=utf-8");
      return;
    }
    if (format === "excel") {
      downloadFile(`laporan-akuntansi-${suffix}.xls`, rowsToExcelHtml("Laporan Akuntansi", rows), "application/vnd.ms-excel;charset=utf-8");
      return;
    }
    printHtml("Laporan Akuntansi", renderReportPrintHtml(data));
  }

  function exportCustomers(format) {
    const rows = customerRows();
    if (format === "csv") {
      downloadFile("data-pelanggan-broadcast.csv", rowsToCsv(rows), "text/csv;charset=utf-8");
      return;
    }
    downloadFile("data-pelanggan-broadcast.xls", rowsToExcelHtml("Data Pelanggan Broadcast", rows), "application/vnd.ms-excel;charset=utf-8");
  }

  function printHtml(title, html) {
    const win = window.open("", "_blank", "width=960,height=720");
    if (!win) {
      toast("Popup diblokir. Izinkan popup untuk export PDF.");
      return;
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;color:#111827}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}.total{font-weight:bold;background:#f3f4f6}@media print{@page{size:A4;margin:12mm}}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function renderReportPrintHtml(data) {
    const rows = reportRows(data);
    const profile = storeProfile();
    return `
      <h1>${esc(profile.storeName)} - Laporan Akuntansi</h1>
      <p>Periode ${esc(ui.reportFrom)} sampai ${esc(ui.reportTo)}</p>
      <table>
        <thead><tr>${rows[0].map((cell) => `<th>${esc(cell)}</th>`).join("")}</tr></thead>
        <tbody>${rows.slice(1).map((row) => `<tr class="${String(row[1]).includes("Laba bersih") || String(row[1]).includes("Total aset") ? "total" : ""}">${row.map((cell, index) => `<td>${index === 2 ? money(cell) : esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    `;
  }

  function loadState() {
    const base = createDefaultState();
    if (isDemoSlug()) return base;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()));
      if (!saved || typeof saved !== "object") return base;
      return {
        ...base,
        ...saved,
        platformSettings: { ...base.platformSettings, ...(saved.platformSettings || {}), apiUrl: saved.platformSettings?.apiUrl || saved.settings?.apiUrl || "" },
        tenants: Array.isArray(saved.tenants) && saved.tenants.length ? saved.tenants.map(normalizeTenant) : base.tenants,
        settings: { ...base.settings, ...(saved.settings || {}) },
        users: Array.isArray(saved.users) ? saved.users.map(normalizeUser) : base.users,
        categories: Array.isArray(saved.categories) ? saved.categories : base.categories,
        products: Array.isArray(saved.products) ? saved.products : base.products,
        customers: Array.isArray(saved.customers) ? saved.customers : base.customers,
        transactions: Array.isArray(saved.transactions) ? saved.transactions : base.transactions,
        expenses: Array.isArray(saved.expenses) ? saved.expenses : base.expenses,
        activityLogs: Array.isArray(saved.activityLogs) ? saved.activityLogs : base.activityLogs
      };
    } catch (error) {
      return base;
    }
  }

  let state = loadState();
  let ui = null;

  function migrateSaasState() {
    const base = createDefaultState();
    state.platformSettings = {
      ...base.platformSettings,
      ...(state.platformSettings || {}),
      apiUrl: state.platformSettings?.apiUrl || state.settings?.apiUrl || ""
    };
    state.tenants = Array.isArray(state.tenants) && state.tenants.length ? state.tenants.map(normalizeTenant) : base.tenants;
    const tenantId = defaultTenantId();
    ["categories", "products", "customers", "transactions", "expenses", "activityLogs"].forEach((collection) => {
      state[collection] = Array.isArray(state[collection]) ? state[collection].map((record) => ({
        ...record,
        tenantId: record.tenantId || tenantId
      })) : [];
    });
    state.customers = state.customers.map((customer) => ({
      ...customer,
      isWalkin: Boolean(customer.isWalkin || customer.id === "cust-walkin" || String(customer.id || "").endsWith("-cust-walkin"))
    }));
    state.users = Array.isArray(state.users) ? state.users.map((user) => normalizeUser({
      ...user,
      tenantId: user.role === "platform" ? "" : (user.tenantId || tenantId)
    })) : base.users;
    if (!state.users.some((user) => user.role === "platform")) {
      state.users.unshift(base.users.find((user) => user.role === "platform"));
    }
    state.tenants.forEach((tenant) => ensureTenantStarterData(tenant.id));
    if (state.settings) state.settings.apiUrl = "";
  }

  migrateSaasState();
  const defaultFrom = toDateInput(daysAgo(30));
  const defaultTo = toDateInput(new Date());
  ui = {
    tab: (location.hash || "#pos").replace("#", "") || "pos",
    cart: [],
    posSearch: "",
    posCategory: "all",
    posCustomerId: tenantCustomers()[0]?.id || "",
    posCustomerQuery: "",
    lastTransactionId: "",
    summaryFrom: defaultFrom,
    summaryTo: defaultTo,
    summaryCategory: "all",
    summaryCustomer: "all",
    reportFrom: defaultFrom,
    reportTo: defaultTo,
    customerSearch: "",
    selectedCustomerId: tenantCustomers()[1]?.id || tenantCustomers()[0]?.id || "",
    selectedExpenseId: tenantExpenses()[0]?.id || "",
    selectedCategoryId: tenantCategories()[0]?.id || "",
    selectedProductId: tenantProducts()[0]?.id || "",
    selectedUserId: tenantUsers().find((user) => user.role === "cashier")?.id || "",
    platformTenantId: state.tenants[0]?.id || "",
    editingTenantId: "",
    editingCustomerId: "",
    editingExpenseId: "",
    editingCategoryId: "",
    editingProductId: "",
    editingUserId: "",
    customerFrom: defaultFrom,
    customerTo: defaultTo,
    invoiceFrom: defaultFrom,
    invoiceTo: defaultTo,
    logSearch: "",
    logActor: "all",
    invoiceId: "",
    navOpen: false,
    loginRole: "owner",
    loginEmail: "",
    loginPassword: "",
    loginLoading: false,
    centerResolving: false,
    invoiceWaLoadingId: ""
  };

  function saveState() {
    if (isDemoSlug()) return;
    localStorage.setItem(storageKey(), JSON.stringify(state));
  }

  function sum(items, keyOrGetter) {
    return items.reduce((total, item) => {
      const value = typeof keyOrGetter === "function" ? keyOrGetter(item) : item[keyOrGetter];
      return total + (Number(value) || 0);
    }, 0);
  }

  function money(value) {
    return rupiah.format(Number(value) || 0);
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function selectedAttr(value, selectedValue) {
    return String(value ?? "") === String(selectedValue ?? "") ? "selected" : "";
  }

  function clearEditMode(scope = "all") {
    if (scope === "all" || scope === "customer") ui.editingCustomerId = "";
    if (scope === "all" || scope === "expense") ui.editingExpenseId = "";
    if (scope === "all" || scope === "category") ui.editingCategoryId = "";
    if (scope === "all" || scope === "product") ui.editingProductId = "";
    if (scope === "all" || scope === "user") ui.editingUserId = "";
    if (scope === "all" || scope === "tenant") ui.editingTenantId = "";
  }

  function normalizeTenant(tenant) {
    const code = normalizeUsername(tenant.code || tenant.storeName || tenant.id || "toko");
    return {
      id: tenant.id || id("tenant"),
      companyId: tenant.companyId || tenant.id || "",
      companySlug: normalizeUsername(tenant.companySlug || tenant.slug || tenant.code || code),
      companyApiUrl: tenant.companyApiUrl || tenant.gasUrl || "",
      code,
      slug: normalizeUsername(tenant.slug || tenant.code || code),
      storeName: tenant.storeName || "Toko Baru",
      companyName: tenant.companyName || tenant.storeName || "Toko Baru",
      ownerName: tenant.ownerName || "Owner",
      ownerEmail: tenant.ownerEmail || "",
      storePhone: tenant.storePhone || "",
      storeAddress: tenant.storeAddress || "",
      companyEmail: tenant.companyEmail || "",
      invoicePrefix: tenant.invoicePrefix || "INV",
      logoUrl: normalizeCompanyLogoUrl(tenant.logoUrl || ""),
      logoSize: Math.max(28, Math.min(180, Number(tenant.logoSize) || 54)),
      logoOffsetX: Math.max(-120, Math.min(120, Number(tenant.logoOffsetX) || 0)),
      plan: tenant.plan || "",
      status: tenant.status || "active",
      subscriptionEnd: tenant.subscriptionEnd || "",
      cashierLimit: Number(tenant.cashierLimit) || 0,
      transactionLimit: Number(tenant.transactionLimit) || 0,
      storageLimitMb: Number(tenant.storageLimitMb) || 100,
      spreadsheetId: tenant.spreadsheetId || "",
      spreadsheetUrl: tenant.spreadsheetUrl || "",
      webUrl: tenant.webUrl || "",
      gasUrl: tenant.gasUrl || "",
      active: tenant.active !== false,
      notes: tenant.notes || "",
      createdAt: tenant.createdAt || nowIso(),
      updatedAt: tenant.updatedAt || tenant.createdAt || nowIso()
    };
  }

  function defaultTenantId() {
    return state.tenants?.[0]?.id || "tenant-demo";
  }

  function tenantById(tenantId) {
    return (state.tenants || []).find((tenant) => tenant.id === tenantId);
  }

  function currentTenantId() {
    if (state.session?.role === "platform") return ui?.platformTenantId || state.session?.tenantId || defaultTenantId();
    return state.session?.tenantId || defaultTenantId();
  }

  function currentTenant() {
    return tenantById(currentTenantId()) || state.tenants?.[0] || normalizeTenant({});
  }

  function recordTenantId(record) {
    return record?.tenantId || defaultTenantId();
  }

  function belongsToTenant(record, tenantId = currentTenantId()) {
    return recordTenantId(record) === tenantId;
  }

  function tenantRecords(collection, tenantId = currentTenantId()) {
    return (state[collection] || []).filter((record) => belongsToTenant(record, tenantId));
  }

  function tenantCategories(tenantId = currentTenantId()) {
    return tenantRecords("categories", tenantId);
  }

  function tenantProducts(tenantId = currentTenantId()) {
    return tenantRecords("products", tenantId);
  }

  function tenantCustomers(tenantId = currentTenantId()) {
    return tenantRecords("customers", tenantId);
  }

  function tenantTransactions(tenantId = currentTenantId()) {
    return tenantRecords("transactions", tenantId);
  }

  function tenantExpenses(tenantId = currentTenantId()) {
    return tenantRecords("expenses", tenantId);
  }

  function tenantLogs(tenantId = currentTenantId()) {
    return tenantRecords("activityLogs", tenantId);
  }

  function tenantUsers(tenantId = currentTenantId()) {
    return (state.users || [])
      .map(normalizeUser)
      .filter((user) => user.role !== "platform" && user.tenantId === tenantId);
  }

  function storeProfile(tenantId = currentTenantId()) {
    const tenant = tenantById(tenantId) || {};
    return {
      storeName: tenant.storeName || state.settings.storeName || "Toko",
      companyName: tenant.companyName || state.settings.companyName || tenant.storeName || state.settings.storeName || "Toko",
      storePhone: tenant.storePhone || state.settings.storePhone || "",
      storeAddress: tenant.storeAddress || state.settings.storeAddress || "",
      companyEmail: tenant.companyEmail || state.settings.companyEmail || "",
      invoicePrefix: tenant.invoicePrefix || state.settings.invoicePrefix || "INV",
      logoUrl: normalizeCompanyLogoUrl(tenant.logoUrl || state.settings.logoUrl || ""),
      logoSize: Math.max(28, Math.min(180, Number(tenant.logoSize || state.settings.logoSize) || 54)),
      logoOffsetX: Math.max(-120, Math.min(120, Number(tenant.logoOffsetX || state.settings.logoOffsetX) || 0))
    };
  }

  function backendUrl() {
    if (isDemoSlug()) return "";
    const tenant = tenantById(defaultTenantId()) || {};
    const company = state.platformSettings?.company || {};
    return tenant.gasUrl || company.companyApiUrl || company.gasUrl || company.companyGasUrl || state.platformSettings?.apiUrl || state.settings?.apiUrl || "";
  }

  function companyCacheKey(slug = appSlug()) {
    return `${COMPANY_CACHE_PREFIX}:${normalizeUsername(slug || "local")}`;
  }

  function readCachedCompanyConfig(slug = appSlug()) {
    if (!slug || isDemoSlug()) return null;
    try {
      const cached = JSON.parse(localStorage.getItem(companyCacheKey(slug)) || "null");
      if (!cached || !cached.company) return null;
      if (Date.now() - Number(cached.savedAt || 0) > COMPANY_CACHE_TTL_MS) return null;
      if (cached.centerApiUrl && centerApiUrl_() && cached.centerApiUrl !== centerApiUrl_()) return null;
      return cached.company;
    } catch (error) {
      return null;
    }
  }

  function writeCachedCompanyConfig(company, slug = appSlug()) {
    if (!slug || isDemoSlug() || !company) return;
    try {
      localStorage.setItem(companyCacheKey(slug), JSON.stringify({
        centerApiUrl: centerApiUrl_(),
        savedAt: Date.now(),
        company
      }));
    } catch (error) {}
  }

  function applyCompanyConfig(company, slug = appSlug()) {
    const apiUrl = company.companyApiUrl || company.gasUrl || company.companyGasUrl || "";
    const tenant = normalizeTenant({
      ...currentTenant(),
      id: company.tenantId || defaultTenantId(),
      companyId: company.companyId || company.id || "",
      companySlug: company.companySlug || company.slug || slug,
      companyApiUrl: apiUrl,
      code: company.companySlug || company.slug || slug,
      slug: company.companySlug || company.slug || slug,
      storeName: company.storeName || company.companyName || "Toko",
      companyName: company.companyName || company.storeName || "Toko",
      storePhone: company.storePhone || "",
      storeAddress: company.storeAddress || company.address || "",
      companyEmail: company.companyEmail || "",
      logoUrl: company.logoUrl || "",
      spreadsheetId: company.companySpreadsheetId || company.spreadsheetId || "",
      spreadsheetUrl: company.companySpreadsheetUrl || company.spreadsheetUrl || "",
      webUrl: company.frontendUrl || company.webUrl || "",
      gasUrl: apiUrl,
      status: company.status || "aktif",
      active: !["nonaktif", "inactive", "suspended", "expired"].includes(String(company.status || "").toLowerCase())
    });
    state.tenants = [tenant];
    state.platformSettings = {
      ...state.platformSettings,
      apiUrl: tenant.gasUrl || "",
      company: {
        ...company,
        companySlug: company.companySlug || company.slug || slug,
        companyApiUrl: apiUrl
      }
    };
    state.settings = {
      ...state.settings,
      storeName: tenant.storeName,
      companyName: tenant.companyName,
      storePhone: tenant.storePhone,
      storeAddress: tenant.storeAddress,
      companyEmail: tenant.companyEmail,
      logoUrl: tenant.logoUrl
    };
    centerStatusMessage = tenant.gasUrl ? "Koneksi server aktif" : "URL GAS perusahaan belum ada di Data Center";
    return tenant;
  }

  function applyCachedCompanyConfig() {
    const cached = readCachedCompanyConfig();
    if (!cached) return false;
    applyCompanyConfig(cached);
    return Boolean(backendUrl());
  }

  async function resolveCompanyFromCenter() {
    const slug = appSlug();
    centerStatusMessage = "";
    const centerUrl = centerApiUrl_();
    if (!slug || isDemoSlug()) return;
    if (!centerUrl) {
      centerStatusMessage = "URL Data Center belum disetel";
      return;
    }
    try {
      if (ui) {
        ui.centerResolving = true;
        centerStatusMessage = "Menghubungkan Data Center...";
      }
      const response = await fetchWithTimeout(centerUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "resolveCompany", companySlug: slug })
      }, 10000);
      const data = await response.json();
      if (!response.ok) throw new Error("Data perusahaan tidak ditemukan");
      const company = unwrapApiResult(data, "Data perusahaan tidak ditemukan");
      applyCompanyConfig(company, slug);
      writeCachedCompanyConfig(company, slug);
      saveState();
    } catch (error) {
      centerStatusMessage = error.message || "Data perusahaan belum ditemukan di Data Center";
      if (!backendUrl()) toast(centerStatusMessage);
    } finally {
      if (ui) ui.centerResolving = false;
    }
  }

  function appBrandName() {
    return state.session?.role === "platform" ? (state.platformSettings?.appName || "Kasir SaaS") : storeProfile().companyName;
  }

  function brandProfile() {
    const tenant = tenantById(defaultTenantId()) || state.tenants?.[0] || {};
    return storeProfile(tenant.id || defaultTenantId());
  }

  function brandInitials(name) {
    const words = String(name || "KS").trim().split(/\s+/).filter(Boolean);
    return (words[0]?.[0] || "K").toUpperCase() + (words[1]?.[0] || "S").toUpperCase();
  }

  function normalizeCompanyLogoUrl(value) {
    const logoUrl = String(value || "").trim();
    return logoUrl === "public/icon.svg" ? "" : logoUrl;
  }

  function brandLogo(profile = storeProfile(), className = "") {
    const name = profile.companyName || profile.storeName || "Kasir SaaS";
    const size = Math.max(28, Math.min(180, Number(profile.logoSize) || 54));
    const offset = Math.max(-120, Math.min(120, Number(profile.logoOffsetX) || 0));
    const style = `--logo-size:${size}px; --logo-offset:${offset}px;`;
    if (profile.logoUrl) {
      return `<span class="brand-logo ${className}" style="${style}" aria-label="${esc(name)}"><img src="${esc(profile.logoUrl)}" alt="${esc(name)}"></span>`;
    }
    return `<span class="brand-logo ${className}" style="${style}" aria-label="${esc(name)}">${esc(brandInitials(name))}</span>`;
  }

  function appIcon(name, className = "") {
    const icons = {
      home: `<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M10 20v-5h4v5"/>`,
      sales: `<path d="M7 8h13l-1.3 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L6 4H3"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>`,
      expenses: `<path d="M4.5 8.5h13.8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"/><path d="M6 8.5 15.5 5l1.2 3.5"/><path d="M15.5 13.5h4"/><circle cx="16.5" cy="13.5" r="1"/>`,
      products: `<path d="m12 3 8 4.2v9.2L12 21l-8-4.6V7.2L12 3Z"/><path d="m4.5 7.5 7.5 4.2 7.5-4.2"/><path d="M12 11.7V21"/>`,
      reports: `<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3.8 19.5h16.4"/><path d="m5 9 4-3 4 4 5-5"/>`,
      bank: `<path d="M4 10h16"/><path d="m5 9 7-5 7 5"/><path d="M6 10v7"/><path d="M10 10v7"/><path d="M14 10v7"/><path d="M18 10v7"/><path d="M4 18.5h16"/>`,
      assets: `<path d="M5 20V7l7-3 7 3v13"/><path d="M9 20v-5h6v5"/><path d="M8 10h1"/><path d="M12 10h1"/><path d="M16 10h1"/>`,
      customers: `<circle cx="9" cy="8" r="3"/><path d="M3.8 19a5.3 5.3 0 0 1 10.4 0"/><circle cx="17" cy="9.5" r="2.2"/><path d="M14.8 18.5a4.3 4.3 0 0 1 5.4 0"/>`,
      invoices: `<path d="M7 3.8h8l3 3V20H7V3.8Z"/><path d="M15 4v4h4"/><path d="M9.5 11h5"/><path d="M9.5 14h5"/><path d="M9.5 17h3"/>`,
      cash: `<path d="M4 7h16v10H4V7Z"/><circle cx="12" cy="12" r="2.4"/><path d="M7 10v4"/><path d="M17 10v4"/>`,
      receivable: `<path d="M4 7.5h16v10H4v-10Z"/><path d="M4 10.5h16"/><path d="M7 14.5h4"/><path d="M15.5 14.5h1.5"/>`,
      giro: `<circle cx="12" cy="12" r="7"/><path d="M8.5 12.5h5.4a2 2 0 1 0 0-4H11a2.5 2.5 0 0 0-2.5 2.5v2a2.5 2.5 0 0 0 2.5 2.5h4.5"/>`,
      tenant: `<path d="M5 9h14l-1-4H6L5 9Z"/><path d="M6 9v10h12V9"/><path d="M9 19v-5h6v5"/><path d="M8 12h2"/><path d="M14 12h2"/>`,
      plan: `<path d="M5 7h14"/><path d="M7 11h10"/><path d="M9 15h6"/><rect x="4" y="4" width="16" height="16" rx="3"/>`,
      limit: `<path d="M5 17a7 7 0 1 1 14 0"/><path d="m12 12 4-4"/><path d="M12 17h.01"/>`,
      backend: `<path d="M8 18h9.2a4 4 0 0 0 .4-8 5.8 5.8 0 0 0-11.1 1.8A3.2 3.2 0 0 0 8 18Z"/><path d="M9 14h6"/>`,
      team: `<circle cx="8.5" cy="8" r="3"/><path d="M3.5 19a5 5 0 0 1 9.8-1.3"/><path d="m15 15.5 2 2 4-5"/>`,
      settings: `<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.2 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L13.8 2h-3.6l-.4 3.1a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.4 3.1h3.6l.4-3.1a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z"/>`
    };
    const shape = icons[name] || icons.home;
    return `<span class="app-icon ${className}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${shape}</svg></span>`;
  }


  function isWalkinCustomer(customer) {
    return customer?.isWalkin || customer?.id === "cust-walkin" || String(customer?.id || "").endsWith("-cust-walkin");
  }

  function activeCashierCount(tenantId = currentTenantId()) {
    return tenantUsers(tenantId).filter((user) => user.role === "cashier" && user.active !== false).length;
  }

  function tenantUsage(tenantId) {
    const tenant = tenantById(tenantId) || {};
    const transactions = tenantTransactions(tenantId);
    const users = tenantUsers(tenantId);
    const activeCashiers = users.filter((user) => user.role === "cashier" && user.active !== false).length;
    return {
      activeCashiers,
      cashierLimit: Number(tenant.cashierLimit) || 0,
      transactions: transactions.length,
      transactionLimit: Number(tenant.transactionLimit) || 0,
      sales: sum(transactions.filter((transaction) => transaction.returnStatus !== "returned"), "total"),
      customers: tenantCustomers(tenantId).length,
      products: tenantProducts(tenantId).length
    };
  }

  function tenantStatus(tenant) {
    if (!tenant) return { label: "Tidak ada", className: "expense" };
    const status = String(tenant.status || "").toLowerCase();
    if (status === "active" || status === "aktif") return { label: "Aktif", className: "income" };
    if (tenant.status === "trial") return { label: "Trial", className: "pending" };
    if (status === "suspended" || status === "nonaktif" || status === "inactive") return { label: "Nonaktif", className: "expense" };
    if (status === "expired") return { label: "Expired", className: "expense" };
    return { label: tenant.status || "-", className: "pending" };
  }

  function tenantCanLogin(tenant) {
    const status = String(tenant?.status || "").toLowerCase();
    return Boolean(tenant) && tenant.active !== false && !["suspended", "expired", "nonaktif", "inactive"].includes(status);
  }

  function baseTenantCategories(tenantId) {
    const baseCategories = createDefaultState().categories.filter((category) => category.tenantId === "tenant-demo");
    const idMap = new Map(baseCategories.map((category) => [category.id, `${tenantId}-${category.id}`]));
    return baseCategories.map((category) => ({
      ...category,
      id: idMap.get(category.id),
      tenantId,
      parentId: category.parentId ? idMap.get(category.parentId) : ""
    }));
  }

  function ensureTenantStarterData(tenantId) {
    if (!tenantCategories(tenantId).length) {
      state.categories.push(...baseTenantCategories(tenantId));
    }
    if (!tenantCustomers(tenantId).some(isWalkinCustomer)) {
      state.customers.unshift({
        id: `${tenantId}-cust-walkin`,
        tenantId,
        isWalkin: true,
        name: "Pelanggan Umum",
        phone: "",
        address: "",
        notes: "Transaksi tanpa data pelanggan.",
        createdAt: nowIso()
      });
    }
  }

  function resetTenantSelections() {
    const customers = tenantCustomers();
    ui.posCustomerId = customers[0]?.id || "";
    ui.posCustomerQuery = "";
    ui.selectedCustomerId = customers[1]?.id || customers[0]?.id || "";
    ui.selectedExpenseId = tenantExpenses()[0]?.id || "";
    ui.selectedCategoryId = tenantCategories()[0]?.id || "";
    ui.selectedProductId = tenantProducts()[0]?.id || "";
    ui.selectedUserId = tenantUsers().find((user) => user.role === "cashier")?.id || "";
    ui.summaryCustomer = "all";
    ui.cart = [];
    clearEditMode();
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function shortDate(value) {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(value));
  }

  function id(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function currentUser() {
    return state.session;
  }

  function isOwner() {
    return state.session?.role === "owner";
  }

  function categoryById(categoryId) {
    return tenantCategories().find((category) => category.id === categoryId);
  }

  function customerById(customerId) {
    return tenantCustomers().find((customer) => customer.id === customerId);
  }

  function productById(productId) {
    return tenantProducts().find((product) => product.id === productId);
  }

  function categoryLabel(categoryId) {
    const category = categoryById(categoryId);
    if (!category) return "-";
    const parent = category.parentId ? categoryById(category.parentId) : null;
    return parent ? `${parent.name} / ${category.name}` : category.name;
  }

  function inDateRange(value, from, to) {
    const date = toDateInput(new Date(value));
    return (!from || date >= from) && (!to || date <= to);
  }

  function normalizeWa(phone) {
    let digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
    if (digits.startsWith("8")) digits = `62${digits}`;
    return digits;
  }

  function waLink(phone, text) {
    const digits = normalizeWa(phone);
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  function isDeferredPayment(paymentMethod) {
    return ["Shopee", "TikTok Shop"].includes(paymentMethod);
  }

  function transactionStatus(transaction) {
    if (transaction.returnStatus === "returned") return { label: "Return", className: "expense" };
    if ((transaction.paymentStatus || "paid") === "pending") return { label: "Tunda", className: "pending" };
    return { label: "Lunas", className: "income" };
  }

  function effectiveTransactionTotal(transaction) {
    return transaction.returnStatus === "returned" ? 0 : Number(transaction.total) || 0;
  }

  function customerSearchResults(query) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    const customers = tenantCustomers().filter((customer) => {
      return `${customer.name} ${customer.phone}`.toLowerCase().includes(normalized);
    });
    return customers.slice(0, 8);
  }

  function filteredPosProducts() {
    const query = ui.posSearch.trim().toLowerCase();
    return tenantProducts()
      .filter((product) => product.active)
      .filter((product) => {
        const matchText = !query || `${product.name} ${product.sku}`.toLowerCase().includes(query);
        const matchCategory = ui.posCategory === "all" || itemMatchesCategory(product, ui.posCategory);
        return matchText && matchCategory;
      });
  }

  function renderPosProducts(products = filteredPosProducts()) {
    const visible = products.slice(0, PRODUCT_RESULT_LIMIT);
    const hiddenCount = Math.max(0, products.length - visible.length);
    return `${visible.map(renderProductCard).join("") || `<div class="empty-state">Produk tidak ditemukan.</div>`}
      ${hiddenCount ? `<div class="empty-state">Menampilkan ${visible.length} dari ${products.length} item. Perjelas kata pencarian untuk hasil lebih spesifik.</div>` : ""}`;
  }

  function renderPosCustomerResults() {
    const customerResults = customerSearchResults(ui.posCustomerQuery);
    const canShowCustomerResults = ui.posCustomerQuery.trim().length >= 2;
    return `${customerResults.map((customer) => `
      <button type="button" class="${customer.id === ui.posCustomerId ? "active" : ""}" data-pos-customer="${esc(customer.id)}">
        <strong>${esc(customer.name)}</strong>
        <span>${esc(customer.phone || "Tanpa WA")}</span>
      </button>
    `).join("") || `<span class="muted small">${canShowCustomerResults ? "Tidak ada pelanggan cocok." : "Ketik minimal 2 huruf atau angka WA untuk mencari pelanggan."}</span>`}
      <button type="button" class="${ui.posCustomerId === "new" ? "active" : ""}" data-pos-customer="new">
        <strong>+ Pelanggan baru</strong>
        <span>Buat dari transaksi ini</span>
      </button>`;
  }

  function filteredCrmCustomers() {
    const query = ui.customerSearch.trim().toLowerCase();
    return tenantCustomers().filter((customer) => {
      if (!query) return true;
      return `${customer.name} ${customer.phone} ${customer.address} ${customer.notes}`.toLowerCase().includes(query);
    });
  }

  function renderCustomerList(customers = filteredCrmCustomers()) {
    const visible = customers.slice(0, CUSTOMER_RESULT_LIMIT);
    const hiddenCount = Math.max(0, customers.length - visible.length);
    return `${visible.map((customer) => `
      <button type="button" class="customer-row ${customer.id === ui.selectedCustomerId ? "active" : ""}" data-select-customer="${esc(customer.id)}">
        <strong>${esc(customer.name)}</strong>
        <span class="muted small">${esc(customer.phone || "Tanpa WA")}</span>
        <span class="muted small">${esc(customer.address || "Tanpa alamat")}</span>
      </button>
    `).join("") || `<div class="empty-state">Pelanggan tidak ditemukan.</div>`}
      ${hiddenCount ? `<div class="empty-state">Menampilkan ${visible.length} dari ${customers.length} pelanggan. Perjelas kata pencarian untuk hasil lebih spesifik.</div>` : ""}`;
  }

  function filteredTeamLogs() {
    return tenantLogs()
      .slice()
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .filter((log) => ui.logActor === "all" || log.actorId === ui.logActor)
      .filter((log) => {
        const query = ui.logSearch.trim().toLowerCase();
        if (!query) return true;
        return `${actorName(log)} ${log.actorRole || ""} ${actionLabel(log.action)} ${log.target || ""} ${log.detail || ""}`.toLowerCase().includes(query);
      })
      .slice(0, 120);
  }

  function renderLogResults(logs = filteredTeamLogs()) {
    if (!logs.length) return `<div class="empty-state">Belum ada log yang cocok.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>
            ${logs.map((log) => `
              <tr>
                <td>${formatDate(log.at)}</td>
                <td><strong>${esc(actorName(log))}</strong><br><span class="muted small">${esc(log.actorRole === "owner" ? "Owner" : "Kasir")}</span></td>
                <td>${esc(actionLabel(log.action))}</td>
                <td>${esc(log.target || "-")}</td>
                <td>${esc(log.detail || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function render() {
    if (!state.session) {
      renderLogin();
      return;
    }
    const allowed = navItems.filter((item) => item.roles.includes(state.session.role));
    if (!allowed.some((item) => item.id === ui.tab)) ui.tab = allowed[0].id;
    if (location.hash !== `#${ui.tab}`) history.replaceState(null, "", `#${ui.tab}`);
    renderShell(allowed);
  }

  function inputSnapshot(target = document.activeElement) {
    if (!target || !app.contains(target) || !target.dataset?.filter) return null;
    const canSelect = typeof target.selectionStart === "number";
    return {
      filter: target.dataset.filter,
      value: target.value,
      selectionStart: canSelect ? target.selectionStart : null,
      selectionEnd: canSelect ? target.selectionEnd : null
    };
  }

  function restoreInputSnapshot(snapshot) {
    if (!snapshot) return;
    const target = Array.from(app.querySelectorAll("[data-filter]")).find((field) => field.dataset.filter === snapshot.filter);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.value = snapshot.value;
    if (snapshot.selectionStart !== null && typeof target.setSelectionRange === "function") {
      target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
  }

  function renderContent(snapshot = inputSnapshot()) {
    if (!state.session) {
      render();
      return;
    }
    const content = app.querySelector(".content");
    if (!content) {
      render();
      return;
    }
    content.innerHTML = renderActiveTab();
    restoreInputSnapshot(snapshot);
  }

  function scheduleFilterRender(target) {
    const snapshot = inputSnapshot(target);
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      filterTimer = null;
      renderContent(snapshot);
    }, FILTER_RENDER_DELAY_MS);
  }

  function refreshLightFilter(filter) {
    if (filter === "posSearch") {
      const products = filteredPosProducts();
      const productsEl = app.querySelector("[data-pos-products]");
      const countEl = app.querySelector("[data-pos-product-count]");
      if (!productsEl) return false;
      productsEl.innerHTML = renderPosProducts(products);
      if (countEl) countEl.textContent = `${products.length} item`;
      return true;
    }
    if (filter === "posCustomerQuery") {
      const resultsEl = app.querySelector("[data-pos-customer-results]");
      if (!resultsEl) return false;
      resultsEl.innerHTML = renderPosCustomerResults();
      return true;
    }
    if (filter === "customerSearch") {
      const customers = filteredCrmCustomers();
      const listEl = app.querySelector("[data-customer-list]");
      const countEl = app.querySelector("[data-customer-count]");
      if (!listEl) return false;
      listEl.innerHTML = renderCustomerList(customers);
      if (countEl) countEl.textContent = String(customers.length);
      return true;
    }
    if (filter === "logSearch") {
      const logs = filteredTeamLogs();
      const resultsEl = app.querySelector("[data-log-results]");
      const countEl = app.querySelector("[data-log-count]");
      if (!resultsEl) return false;
      resultsEl.innerHTML = renderLogResults(logs);
      if (countEl) countEl.textContent = `${logs.length} terbaru`;
      return true;
    }
    return false;
  }

  function scheduleLightFilterRender(filter) {
    if (!["posSearch", "posCustomerQuery", "customerSearch", "logSearch"].includes(filter)) return false;
    if (lightFilterFrame) cancelAnimationFrame(lightFilterFrame);
    lightFilterFrame = requestAnimationFrame(() => {
      lightFilterFrame = null;
      refreshLightFilter(filter);
    });
    return true;
  }

  function loginStatusInfo() {
    const demoMode = isDemoSlug();
    const saasRequired = hasTenantSlug();
    const online = Boolean(backendUrl());
    const isResolving = Boolean(ui.centerResolving);
    const text = online
      ? "Koneksi server aktif"
      : demoMode
        ? "Mode demo aktif"
        : saasRequired
          ? (centerStatusMessage || (isResolving ? "Menghubungkan Data Center..." : "Menunggu koneksi Data Center"))
          : "Demo lokal siap";
    return { text, online: online || demoMode };
  }

  function updateLoginStatus() {
    const status = app.querySelector(".login-status");
    if (!status) return false;
    const info = loginStatusInfo();
    status.textContent = info.text;
    status.classList.toggle("online", info.online);
    updateLoginLoading(ui.loginLoading);
    return true;
  }

  function renderLogin() {
    const profile = brandProfile();
    const role = ui.loginRole === "cashier" ? "cashier" : "owner";
    const demoMode = isDemoSlug();
    const saasRequired = hasTenantSlug();
    const isLoading = Boolean(ui.loginLoading);
    const isResolving = Boolean(ui.centerResolving);
    const loginStatus = loginStatusInfo();
    const defaultUser = state.users.map(normalizeUser).find((user) => user.role === role && user.active !== false);
    const loginEmail = ui.loginEmail || (saasRequired ? "" : defaultUser?.email || "");
    const loginPassword = ui.loginPassword || (saasRequired ? "" : defaultUser?.password || "");
    const roleLabel = role === "owner" ? "Owner" : "Karyawan";
    app.innerHTML = `
      <main class="login-page">
        <section class="login-panel">
          <div class="login-status ${loginStatus.online ? "online" : ""}">
            ${esc(loginStatus.text)}
          </div>
          <div class="login-brand">
            <div class="login-brand-center">
              ${brandLogo(profile, "login-logo")}
              <h1>${esc(profile.companyName || profile.storeName || "Kasir SaaS")}</h1>
              <p>Kelola Keuangan dan Pelanggan dalam satu genggaman</p>
            </div>
            <span class="login-credit">By Zent_Id</span>
          </div>
          <form class="login-form" id="login-form">
            <div>
              <h2>Masuk Sebagai</h2>
              <div class="role-switch">
                <button type="button" class="role-choice ${role === "owner" ? "active" : ""}" data-login-role="owner" ${isLoading ? "disabled" : ""}>Owner</button>
                <button type="button" class="role-choice ${role === "cashier" ? "active" : ""}" data-login-role="cashier" ${isLoading ? "disabled" : ""}>Karyawan</button>
              </div>
            </div>
            <input type="hidden" name="role" value="${esc(role)}">
            <label>ID ${esc(roleLabel)}
              <input name="email" autocomplete="username" value="${esc(loginEmail)}" placeholder="Masukkan ID Anda" required>
            </label>
            <label>Password
              <input name="password" type="password" autocomplete="current-password" value="${esc(loginPassword)}" placeholder="Masukkan password" required>
            </label>
            <button class="btn-primary login-submit ${isLoading ? "is-loading" : ""}" type="submit" ${isLoading || (saasRequired && isResolving && !backendUrl()) ? "disabled" : ""}>
              ${isLoading ? `<span class="button-spinner" aria-hidden="true"></span> Memproses...` : saasRequired && isResolving ? "Menghubungkan..." : "Masuk Sistem"}
            </button>
            ${demoMode ? `<p class="demo-note">Mode demo: semua perubahan bisa dicoba, lalu kembali ke data awal saat halaman di-refresh.</p>` : ""}
            <p class="muted small">${saasRequired ? "Akun awal GAS: owner@kasir.local / owner123 atau kasir@kasir.local / kasir123." : "Akun demo: owner@kasir.local / owner123 atau kasir@kasir.local / kasir123."}</p>
          </form>
        </section>
      </main>
    `;
  }

  function updateLoginLoading(isLoading) {
    ui.loginLoading = Boolean(isLoading);
    const form = app.querySelector("#login-form");
    if (!form) return;
    const submit = form.querySelector(".login-submit");
    const saasRequired = hasTenantSlug();
    const isResolving = Boolean(ui.centerResolving);
    if (submit) {
      submit.disabled = ui.loginLoading || (saasRequired && isResolving && !backendUrl());
      submit.classList.toggle("is-loading", ui.loginLoading);
      submit.innerHTML = ui.loginLoading
        ? `<span class="button-spinner" aria-hidden="true"></span> Memproses...`
        : saasRequired && isResolving
          ? "Menghubungkan..."
          : "Masuk Sistem";
    }
    form.querySelectorAll("[data-login-role]").forEach((button) => {
      button.disabled = ui.loginLoading;
    });
  }

  function renderShell(allowedNav) {
    const current = navItems.find((item) => item.id === ui.tab) || allowedNav[0];
    const profile = state.session.role === "platform" ? { companyName: state.platformSettings?.appName || "Kasir SaaS", logoUrl: "public/icon.svg", logoSize: 42, logoOffsetX: 0 } : storeProfile();
    app.innerHTML = `
      <div class="app-shell ${ui.navOpen ? "nav-open" : ""}">
        <aside class="sidebar">
          <div class="brand-mark">
            ${brandLogo(profile, "sidebar-logo")}
            <span class="brand-copy">
              <strong>${esc(appBrandName())}</strong>
              <span>${state.session.role === "platform" ? "Platform SaaS" : "Kasir SaaS"}</span>
            </span>
          </div>
          <nav class="nav" aria-label="Menu utama">
            ${allowedNav.map((item) => `
              <button type="button" class="${item.id === ui.tab ? "active" : ""}" data-tab="${item.id}">
                ${appIcon(item.icon, "nav-icon")}
                ${esc(item.label)}
              </button>
            `).join("")}
          </nav>
          <div class="sidebar-footer">
            <span class="role-pill">${state.session.role === "platform" ? "Platform" : state.session.role === "owner" ? "Owner" : "Karyawan"}: ${esc(state.session.name)}</span>
            <button type="button" class="btn-soft" data-logout>Keluar</button>
          </div>
        </aside>
        <button type="button" class="nav-backdrop" data-toggle-nav aria-label="Tutup menu"></button>
        <main class="main">
          <header class="topbar">
            <button type="button" class="hamburger top-menu" data-toggle-nav aria-label="Menu"><span></span><span></span><span></span></button>
            <div>
              <h2>${esc(current.title)}</h2>
              <p class="muted">${esc(current.subtitle)}</p>
            </div>
            <div class="actions">
              <span class="tag">${backendUrl() ? "SaaS online" : "Demo lokal"}</span>
              <button type="button" class="btn-soft" data-logout>Keluar</button>
            </div>
          </header>
          <section class="content">
            ${renderActiveTab()}
          </section>
        </main>
      </div>
      ${ui.invoiceId ? renderInvoiceModal(ui.invoiceId) : ""}
    `;
  }

  function renderActiveTab() {
    switch (ui.tab) {
      case "platform": return renderPlatformDashboard();
      case "summary": return renderSummary();
      case "reports": return renderReports();
      case "customers": return renderCustomers();
      case "expenses": return renderExpenses();
      case "categories": return renderCategories();
      case "invoices": return renderInvoices();
      case "team": return renderTeam();
      case "settings": return renderSettings();
      default: return renderPos();
    }
  }

  function quickModules() {
    const role = state.session?.role;
    if (role === "platform") {
      return [
        { tab: "platform", label: "Tenant", icon: "tenant", tone: "peach" },
        { tab: "platform", label: "Aktivasi", icon: "settings", tone: "lime" },
        { tab: "platform", label: "Backend", icon: "backend", tone: "gold" }
      ];
    }
    const all = [
      { tab: "pos", label: "Penjualan", icon: "sales", tone: "peach" },
      { tab: "expenses", label: "Biaya", icon: "expenses", tone: "lime", ownerOnly: true },
      { tab: "categories", label: "Produk", icon: "products", tone: "gold", ownerOnly: true },
      { tab: "reports", label: "Laporan", icon: "reports", tone: "rose", ownerOnly: true },
      { tab: "summary", label: "Kas & Bank", icon: "bank", tone: "violet", ownerOnly: true },
      { tab: "reports", label: "Aset", icon: "assets", tone: "mint", ownerOnly: true },
      { tab: "customers", label: "Kontak", icon: "customers", tone: "sand", ownerOnly: true },
      { tab: "invoices", label: "Invoice", icon: "invoices", tone: "sky", ownerOnly: true }
    ];
    return all.filter((item) => role === "owner" || !item.ownerOnly);
  }

  function renderDashboardHero(metrics = {}) {
    const profile = storeProfile();
    return `
      <section class="dashboard-hero">
        <div class="hero-top">
          <button type="button" class="hamburger" data-toggle-nav aria-label="Menu"><span></span><span></span><span></span></button>
          <strong>${esc(profile.companyName || profile.storeName)}</strong>
          <span class="bell" aria-hidden="true"></span>
        </div>
        <div class="hero-copy">
          <h1>Hi ${esc(state.session?.name || "Owner")}!</h1>
          <p>Yuk mudahkan keuangan bisnis dengan dashboard kasir yang rapi.</p>
        </div>
      </section>
      <section class="module-card">
        ${quickModules().map((item) => `
          <button type="button" class="module-tile" data-tab="${esc(item.tab)}">
            ${appIcon(item.icon, `module-icon ${item.tone}`)}
            <span>${esc(item.label)}</span>
          </button>
        `).join("")}
      </section>
      ${metrics.cash !== undefined ? `
        <section class="dashboard-section">
          <h3>Kas & Bank</h3>
          <div class="bank-grid">
            <article class="bank-card">${appIcon("cash", "module-icon peach")}<div><strong>Kas</strong><small>${money(metrics.cash)}</small></div></article>
            <article class="bank-card">${appIcon("receivable", "module-icon sky")}<div><strong>Rekening Bank</strong><small>${money(metrics.receivable || 0)}</small></div></article>
            <article class="bank-card">${appIcon("giro", "module-icon lime")}<div><strong>Giro</strong><small>${money(metrics.inventory || 0)}</small></div></article>
          </div>
        </section>
      ` : ""}
    `;
  }

  function renderPlatformDashboard() {
    const tenants = (state.tenants || []).slice().sort((a, b) => a.storeName.localeCompare(b.storeName));
    const selectedTenant = tenantById(ui.platformTenantId) || tenants[0];
    if (selectedTenant && selectedTenant.id !== ui.platformTenantId) ui.platformTenantId = selectedTenant.id;
    const activeTenants = tenants.filter((tenant) => ["active", "aktif"].includes(String(tenant.status || "").toLowerCase()));
    const totalCashiers = tenants.reduce((total, tenant) => total + activeCashierCount(tenant.id), 0);
    const totalSales = tenants.reduce((total, tenant) => total + tenantUsage(tenant.id).sales, 0);
    const selectedUsage = selectedTenant ? tenantUsage(selectedTenant.id) : null;
    return `
      <div class="grid">
        <section class="grid four">
          <article class="metric sales"><span>Toko aktif</span><strong>${activeTenants.length}</strong><small>${tenants.length} total tenant</small></article>
          <article class="metric avg"><span>Kasir aktif</span><strong>${totalCashiers}</strong><small>Akumulasi semua toko</small></article>
          <article class="metric net"><span>Omzet tenant</span><strong>${money(totalSales)}</strong><small>Data transaksi tersimpan</small></article>
          <article class="metric expense"><span>Backend</span><strong style="font-size:1rem;">${backendUrl() ? "Online" : "Demo lokal"}</strong><small>Customer tidak melihat GAS/Spreadsheet</small></article>
        </section>
        <section class="grid two">
          <div class="panel">
            <div class="panel-header"><h3>Tambah toko SaaS</h3></div>
            <form id="tenant-form" class="form-grid">
              <label>Nama toko <input name="storeName" required placeholder="Contoh: Kopi Andalan"></label>
              <label>Nama perusahaan <input name="companyName" placeholder="Nama legal/brand perusahaan"></label>
              <label>Kode tenant <input name="code" required placeholder="kopi-andalan"></label>
              <label>Nama owner <input name="ownerName" required placeholder="Nama pemilik"></label>
              <label>Email owner <input name="ownerEmail" required inputmode="email" placeholder="owner@email.com"></label>
              <label>Username owner <input name="ownerUsername" required autocomplete="off" placeholder="owner-kopi"></label>
              <label>Password owner <input name="ownerPassword" required type="password" autocomplete="new-password" minlength="6" placeholder="Minimal 6 karakter"></label>
              <label>Kontak toko <input name="storePhone" inputmode="tel"></label>
              <label>Email perusahaan <input name="companyEmail" inputmode="email"></label>
              <label class="full">Alamat toko <input name="storeAddress"></label>
              <label class="full">URL logo perusahaan <input name="logoUrl" placeholder="https://.../logo-perusahaan.png"></label>
              <label>Status
                <select name="status">
                  <option value="active">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </label>
              <label class="full">Catatan <textarea name="notes"></textarea></label>
              <button type="submit" class="btn-primary">Buat Toko</button>
            </form>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Backend pusat</h3></div>
            <form id="platform-settings-form" class="form-grid">
              <label>Nama aplikasi <input name="appName" value="${esc(state.platformSettings?.appName || "Kasir SaaS")}" required></label>
              <label>WA support <input name="supportWa" value="${esc(state.platformSettings?.supportWa || "")}" inputmode="tel"></label>
              <label class="full">URL backend pusat
                <input name="apiUrl" value="${esc(state.platformSettings?.apiUrl || "")}" inputmode="url" placeholder="Hanya Anda yang mengisi URL GAS/API pusat">
              </label>
              <button type="submit" class="btn-primary">Simpan Backend Pusat</button>
            </form>
            <div class="detail-box">
              <p class="muted">Owner toko hanya mengatur profil toko. URL GAS/Spreadsheet/API pusat hanya tampil di dashboard SaaS ini.</p>
            </div>
          </div>
        </section>
        <section class="grid two">
          <div class="panel">
            <div class="panel-header"><h3>Daftar toko</h3><span class="tag">${tenants.length} tenant</span></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Toko</th><th>Status</th><th>Akun kasir</th><th>Transaksi</th><th>Detail</th></tr></thead>
                <tbody>
                  ${tenants.map((tenant) => {
                    const usage = tenantUsage(tenant.id);
                    const status = tenantStatus(tenant);
                    return `
                      <tr>
                        <td><strong>${esc(tenant.storeName)}</strong><br><span class="muted small">${esc(tenant.code)} / ${esc(tenant.ownerEmail || "-")}</span></td>
                        <td><span class="tag ${status.className}">${status.label}</span></td>
                        <td>${usage.activeCashiers}</td>
                        <td>${usage.transactions}</td>
                        <td><button type="button" class="${tenant.id === ui.platformTenantId ? "btn-primary" : "btn-soft"}" data-select-tenant="${esc(tenant.id)}">Pilih</button></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header">
              <h3>${selectedTenant ? esc(selectedTenant.storeName) : "Detail toko"}</h3>
              ${selectedTenant && ui.editingTenantId !== selectedTenant.id ? `<button type="button" class="btn-soft" data-edit-tenant="${esc(selectedTenant.id)}">Edit Tenant</button>` : selectedTenant ? `<button type="button" class="btn-soft" data-cancel-edit="tenant">Batal Edit</button>` : ""}
            </div>
            ${selectedTenant && ui.editingTenantId === selectedTenant.id ? renderTenantEditForm(selectedTenant) : selectedTenant ? `
              <div class="grid three">
                <article class="metric sales"><span>Owner</span><strong style="font-size:1rem;">${esc(selectedTenant.ownerName || "-")}</strong><small>${esc(selectedTenant.ownerEmail || "-")}</small></article>
                <article class="metric avg"><span>Kasir aktif</span><strong>${selectedUsage.activeCashiers}</strong><small>Akun kasir yang bisa login</small></article>
                <article class="metric net"><span>Transaksi</span><strong>${selectedUsage.transactions}</strong><small>${money(selectedUsage.sales)} omzet tercatat</small></article>
              </div>
              <div class="detail-box">
                <p><strong>Alamat:</strong> ${esc(selectedTenant.storeAddress || "-")}</p>
                <p><strong>Kontak:</strong> ${esc(selectedTenant.storePhone || "-")} ${selectedTenant.companyEmail ? `/ ${esc(selectedTenant.companyEmail)}` : ""}</p>
                <p><strong>Catatan:</strong> ${esc(selectedTenant.notes || "-")}</p>
              </div>
            ` : `<div class="empty-state">Pilih toko untuk melihat detail.</div>`}
          </div>
        </section>
      </div>
    `;
  }

  function renderTenantEditForm(tenant) {
    return `
      <form id="tenant-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(tenant.id)}">
        <label>Nama toko <input name="storeName" value="${esc(tenant.storeName)}" required></label>
        <label>Nama perusahaan <input name="companyName" value="${esc(tenant.companyName || tenant.storeName)}" required></label>
        <label>Kode tenant <input name="code" value="${esc(tenant.code)}" required></label>
        <label>Nama owner <input name="ownerName" value="${esc(tenant.ownerName || "")}" required></label>
        <label>Email owner <input name="ownerEmail" value="${esc(tenant.ownerEmail || "")}" required inputmode="email"></label>
        <label>Kontak toko <input name="storePhone" value="${esc(tenant.storePhone || "")}" inputmode="tel"></label>
        <label>Email perusahaan <input name="companyEmail" value="${esc(tenant.companyEmail || "")}" inputmode="email"></label>
        <label class="full">Alamat toko <input name="storeAddress" value="${esc(tenant.storeAddress || "")}"></label>
        <label class="full">URL logo perusahaan <input name="logoUrl" value="${esc(tenant.logoUrl || "")}"></label>
        <label>Prefix invoice <input name="invoicePrefix" value="${esc(tenant.invoicePrefix || "INV")}" required></label>
        <label>Ukuran logo <input name="logoSize" type="number" min="28" max="180" value="${Number(tenant.logoSize) || 54}"></label>
        <label>Geser logo <input name="logoOffsetX" type="number" min="-120" max="120" value="${Number(tenant.logoOffsetX) || 0}"></label>
        <label>Status
          <select name="status">
            ${["active", "nonaktif"].map((status) => `<option value="${status}" ${selectedAttr(tenant.status, status)}>${status === "active" ? "Aktif" : "Nonaktif"}</option>`).join("")}
          </select>
        </label>
        <label class="full">Catatan <textarea name="notes">${esc(tenant.notes || "")}</textarea></label>
        <button type="submit" class="btn-primary">Simpan Tenant</button>
        <button type="button" class="btn-soft" data-cancel-edit="tenant">Batal</button>
      </form>
    `;
  }

  function renderPos() {
    const filteredProducts = filteredPosProducts();
    const cartTotal = sum(ui.cart, (line) => line.qty * line.price);
    const lastTx = tenantTransactions().find((transaction) => transaction.id === ui.lastTransactionId);
    const selectedCustomer = customerById(ui.posCustomerId);
    return `
      <div class="grid two">
        <section class="panel">
          <div class="panel-header">
            <h3>Produk</h3>
            <span class="tag" data-pos-product-count>${filteredProducts.length} item</span>
          </div>
          <div class="filters" style="grid-template-columns: minmax(180px, 1fr) minmax(160px, .8fr); margin-bottom: 14px;">
            <label>Cari item
              <input data-filter="posSearch" value="${esc(ui.posSearch)}" placeholder="Nama atau SKU">
            </label>
            <label>Kategori
              <select data-filter="posCategory">
                <option value="all">Semua kategori</option>
                ${categoryOptions("income", ui.posCategory)}
              </select>
            </label>
          </div>
          <div class="products" data-pos-products>
            ${renderPosProducts(filteredProducts)}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h3>Keranjang</h3>
            <span class="tag">${ui.cart.length} baris</span>
          </div>
          <div class="cart">
            ${ui.cart.map(renderCartLine).join("") || `<div class="empty-state">Pilih produk untuk mulai transaksi.</div>`}
            <div class="total-box">
              <span>Total</span>
              <strong>${money(cartTotal)}</strong>
            </div>
          </div>
          <form id="checkout-form" class="grid" style="margin-top: 14px;">
            <div class="form-grid">
              <div class="full customer-picker">
                <label>Cari pelanggan
                  <input data-filter="posCustomerQuery" value="${esc(ui.posCustomerQuery)}" placeholder="Ketik nama atau kontak WA">
                </label>
                <div class="selected-customer">
                  <span>${ui.posCustomerId === "new" ? "Pelanggan baru" : esc(selectedCustomer?.name || "Pelanggan belum dipilih")}</span>
                  <small>${ui.posCustomerId === "new" ? "Isi data pelanggan di bawah" : esc(selectedCustomer?.phone || "Tanpa kontak WA")}</small>
                </div>
                <div class="search-results" data-pos-customer-results>
                  ${renderPosCustomerResults()}
                </div>
              </div>
              <label>Pembayaran
                <select name="paymentMethod">
                  <option>Tunai</option>
                  <option>QRIS</option>
                  <option>Transfer</option>
                  <option>Kartu Debit</option>
                  <option>Shopee</option>
                  <option>TikTok Shop</option>
                </select>
                <span class="muted small">Shopee dan TikTok Shop otomatis dicatat sebagai pembayaran tunda.</span>
              </label>
              ${ui.posCustomerId === "new" ? `
                <label>Nama pelanggan
                  <input name="newCustomerName" required placeholder="Nama">
                </label>
                <label>Kontak WA
                  <input name="newCustomerPhone" inputmode="tel" placeholder="08...">
                </label>
                <label class="full">Alamat
                  <input name="newCustomerAddress" placeholder="Alamat pelanggan">
                </label>
              ` : ""}
              <label class="full">Catatan transaksi
                <textarea name="notes" placeholder="Catatan invoice atau follow up"></textarea>
              </label>
            </div>
            <button type="submit" class="btn-primary" ${ui.cart.length ? "" : "disabled"}>Simpan Transaksi</button>
          </form>
          ${lastTx ? `
            <div class="panel" style="margin-top: 14px; background: var(--surface-2);">
              <div class="panel-header">
                <h3>Transaksi terakhir</h3>
                <span class="tag income">${esc(lastTx.id)}</span>
              </div>
              <p class="muted">Total ${money(lastTx.total)} untuk ${esc(lastTx.customerSnapshot.name)}.</p>
              <div class="actions">
                <button type="button" class="btn-dark" data-open-invoice="${esc(lastTx.id)}">Invoice / PDF</button>
                ${transactionActionButtons(lastTx)}
                ${invoiceWaButton(lastTx)}
              </div>
            </div>
          ` : ""}
        </section>
      </div>
    `;
  }

  function renderProductCard(product) {
    return `
      <article class="product-card">
        <div>
          <div class="tag-row">
            <span class="tag">${esc(product.sku || "SKU")}</span>
            <span class="tag income">${esc(categoryLabel(product.subcategoryId || product.categoryId))}</span>
          </div>
          <h4>${esc(product.name)}</h4>
          <p class="muted small">Stok ${Number(product.stock) || 0}</p>
        </div>
        <div class="actions" style="justify-content: space-between;">
          <strong>${money(product.price)}</strong>
          <button type="button" class="btn-primary" data-add-product="${esc(product.id)}">Tambah</button>
        </div>
      </article>
    `;
  }

  function renderCartLine(line) {
    return `
      <div class="cart-line">
        <div>
          <strong>${esc(line.name)}</strong>
          <div class="muted small">${money(line.price)} x ${line.qty}</div>
        </div>
        <div class="qty-controls" aria-label="Jumlah ${esc(line.name)}">
          <button type="button" class="btn-soft icon-only" data-cart-minus="${esc(line.productId)}">-</button>
          <strong>${line.qty}</strong>
          <button type="button" class="btn-soft icon-only" data-cart-plus="${esc(line.productId)}">+</button>
        </div>
        <div class="actions">
          <strong>${money(line.price * line.qty)}</strong>
          <button type="button" class="btn-danger icon-only" data-cart-remove="${esc(line.productId)}">x</button>
        </div>
      </div>
    `;
  }

  function renderSummary() {
    const allTransactions = filteredTransactions(ui.summaryFrom, ui.summaryTo, ui.summaryCustomer)
      .map((transaction) => ({ transaction, amount: transactionCategoryTotal(transaction, ui.summaryCategory) }))
      .filter((row) => row.amount > 0);
    const transactions = allTransactions.filter((row) => row.transaction.returnStatus !== "returned");
    const expenses = tenantExpenses().filter((expense) => inDateRange(expense.date, ui.summaryFrom, ui.summaryTo));
    const paidTransactions = transactions.filter((row) => (row.transaction.paymentStatus || "paid") !== "pending");
    const pendingTransactions = transactions.filter((row) => row.transaction.paymentStatus === "pending");
    const returnedTotal = sum(allTransactions.filter((row) => row.transaction.returnStatus === "returned"), "amount");
    const salesTotal = sum(paidTransactions, "amount");
    const pendingTotal = sum(pendingTransactions, "amount");
    const expenseTotal = sum(expenses, "amount");
    const netTotal = salesTotal - expenseTotal;
    const categoryBars = salesByCategory(transactions.map((row) => row.transaction), ui.summaryCategory);
    const dailyBars = salesByDay(transactions);
    return `
      <div class="grid">
        ${renderDashboardHero({ cash: Math.max(0, salesTotal - expenseTotal), receivable: pendingTotal, inventory: sum(tenantProducts(), (product) => (Number(product.stock) || 0) * (Number(product.cost) || 0)) })}
        <section class="panel">
          <div class="filters">
            <label>Dari
              <input type="date" data-filter="summaryFrom" value="${esc(ui.summaryFrom)}">
            </label>
            <label>Sampai
              <input type="date" data-filter="summaryTo" value="${esc(ui.summaryTo)}">
            </label>
            <label>Kategori item
              <select data-filter="summaryCategory">
                <option value="all">Semua kategori</option>
                ${categoryOptions("income", ui.summaryCategory)}
              </select>
            </label>
            <label>Pelanggan
              <select data-filter="summaryCustomer">
                <option value="all">Semua pelanggan</option>
                ${tenantCustomers().map((customer) => `<option value="${esc(customer.id)}" ${customer.id === ui.summaryCustomer ? "selected" : ""}>${esc(customer.name)}</option>`).join("")}
              </select>
            </label>
          </div>
        </section>
        <section class="grid four">
          <article class="metric sales"><span>Pemasukan diterima</span><strong>${money(salesTotal)}</strong><small>${paidTransactions.length} transaksi lunas</small></article>
          <article class="metric avg"><span>Pembayaran tunda</span><strong>${money(pendingTotal)}</strong><small>${pendingTransactions.length} transaksi Shopee/TikTok</small></article>
          <article class="metric expense"><span>Pengeluaran</span><strong>${money(expenseTotal)}</strong><small>${expenses.length} catatan</small></article>
          <article class="metric net"><span>Laba bersih</span><strong>${money(netTotal)}</strong><small>Penjualan dikurangi biaya</small></article>
          <article class="metric expense"><span>Return</span><strong>${money(returnedTotal)}</strong><small>Tidak dihitung sebagai pemasukan</small></article>
        </section>
        <section class="grid two">
          <div class="panel">
            <div class="panel-header"><h3>Penjualan per kategori</h3></div>
            ${renderBars(categoryBars)}
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Tren harian</h3></div>
            ${renderBars(dailyBars)}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Transaksi terbaru</h3><span class="tag">${transactions.length} transaksi</span></div>
          ${renderTransactionTable(transactions.map((row) => row.transaction).slice(0, 8))}
        </section>
      </div>
    `;
  }

  function renderReports() {
    const data = reportData(ui.reportFrom, ui.reportTo);
    const rows = reportRows(data).slice(1);
    return `
      <div class="grid">
        <section class="panel">
          <div class="filters" style="grid-template-columns: repeat(2, minmax(0, 1fr)) auto auto auto;">
            <label>Dari
              <input type="date" data-filter="reportFrom" value="${esc(ui.reportFrom)}">
            </label>
            <label>Sampai
              <input type="date" data-filter="reportTo" value="${esc(ui.reportTo)}">
            </label>
            <button type="button" class="btn-soft" data-export-report="excel">Export Excel</button>
            <button type="button" class="btn-soft" data-export-report="csv">Export CSV</button>
            <button type="button" class="btn-dark" data-export-report="pdf">Export PDF</button>
          </div>
        </section>
        <section class="grid four">
          <article class="metric sales"><span>Penjualan bersih</span><strong>${money(data.netSales)}</strong><small>Lunas + tunda, retur dikeluarkan</small></article>
          <article class="metric avg"><span>HPP</span><strong>${money(data.cogs)}</strong><small>Modal barang yang terjual</small></article>
          <article class="metric net"><span>Laba bersih</span><strong>${money(data.netProfit)}</strong><small>Laba kotor - pengeluaran</small></article>
          <article class="metric expense"><span>Total aset</span><strong>${money(data.totalAssets)}</strong><small>Kas + piutang + persediaan</small></article>
        </section>
        <section class="grid two">
          <div class="panel">
            <div class="panel-header"><h3>Laba rugi sederhana</h3></div>
            <div class="bar-list">
              ${[
                ["Penjualan lunas", data.paidSales],
                ["Penjualan tunda", data.pendingSales],
                ["HPP", data.cogs],
                ["Laba kotor", data.grossProfit],
                ["Beban operasional", data.operatingExpenses],
                ["Laba bersih", data.netProfit]
              ].map(([label, value]) => `
                <div class="bar-row">
                  <header><span>${esc(label)}</span><strong>${money(value)}</strong></header>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, Math.min(100, Math.abs(value) / Math.max(data.netSales, data.totalAssets, 1) * 100))}%;"></div></div>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Aset sederhana</h3></div>
            <div class="grid">
              <article class="metric sales"><span>Kas/bank estimasi</span><strong>${money(data.cashAsset)}</strong><small>Penjualan lunas - pengeluaran</small></article>
              <article class="metric avg"><span>Piutang marketplace</span><strong>${money(data.receivableAsset)}</strong><small>Shopee/TikTok belum cair</small></article>
              <article class="metric net"><span>Persediaan</span><strong>${money(data.inventoryAsset)}</strong><small>Stok tersedia x harga modal</small></article>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Rincian laporan</h3><span class="tag">Standar sederhana</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Bagian</th><th>Akun</th><th>Nominal</th><th>Catatan pemula</th></tr></thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    <td>${esc(row[0])}</td>
                    <td>${esc(row[1])}</td>
                    <td><strong>${money(row[2])}</strong></td>
                    <td>${esc(row[3])}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function categoryParentOptions(selectedId = "", excludedId = "") {
    return tenantCategories()
      .filter((category) => !category.parentId && category.id !== excludedId)
      .map((category) => `<option value="${esc(category.id)}" ${selectedAttr(category.id, selectedId)}>${esc(category.name)} (${category.flow === "income" ? "Pemasukan" : "Pengeluaran"})</option>`)
      .join("");
  }

  function renderCustomerEditForm(customer) {
    return `
      <form id="customer-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(customer.id)}">
        <label>Nama <input name="name" value="${esc(customer.name)}" required></label>
        <label>Kontak WA <input name="phone" value="${esc(customer.phone || "")}" inputmode="tel"></label>
        <label class="full">Alamat <input name="address" value="${esc(customer.address || "")}"></label>
        <label class="full">Keterangan <textarea name="notes">${esc(customer.notes || "")}</textarea></label>
        <button type="submit" class="btn-primary">Simpan Perubahan</button>
        <button type="button" class="btn-soft" data-cancel-edit="customer">Batal</button>
      </form>
    `;
  }

  function renderExpenseEditForm(expense) {
    const categoryId = expense.categoryId || categoryById(expense.subcategoryId)?.parentId || "cat-variable-expense";
    return `
      <form id="expense-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(expense.id)}">
        <label>Tanggal <input type="date" name="date" value="${toDateInput(new Date(expense.date))}" required></label>
        <label>Jenis biaya
          <select name="behavior" required>
            <option value="fixed" ${selectedAttr(expense.behavior, "fixed")}>Tetap</option>
            <option value="variable" ${selectedAttr(expense.behavior, "variable")}>Tidak tetap</option>
          </select>
        </label>
        <label>Nama pengeluaran <input name="name" value="${esc(expense.name)}" required></label>
        <label>Nominal <input name="amount" type="number" min="0" step="100" value="${Number(expense.amount) || 0}" required></label>
        <label>Kategori
          <select name="categoryId" required>
            ${categoryOptions("expense", categoryId)}
          </select>
        </label>
        <label>Subkategori
          <select name="subcategoryId">
            <option value="">Tanpa subkategori</option>
            ${tenantCategories().filter((category) => category.flow === "expense" && category.parentId).map((category) => `<option value="${esc(category.id)}" ${selectedAttr(category.id, expense.subcategoryId)}>${esc(categoryLabel(category.id))}</option>`).join("")}
          </select>
        </label>
        <label class="full">Catatan <textarea name="notes">${esc(expense.notes || "")}</textarea></label>
        <button type="submit" class="btn-primary">Simpan Perubahan</button>
        <button type="button" class="btn-soft" data-cancel-edit="expense">Batal</button>
      </form>
    `;
  }

  function renderCategoryEditForm(category) {
    return `
      <form id="category-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(category.id)}">
        <label>Nama kategori <input name="name" value="${esc(category.name)}" required></label>
        <label>Arus
          <select name="flow">
            <option value="income" ${selectedAttr(category.flow, "income")}>Pemasukan</option>
            <option value="expense" ${selectedAttr(category.flow, "expense")}>Pengeluaran</option>
          </select>
        </label>
        <label>Sifat
          <select name="behavior">
            <option value="variable" ${selectedAttr(category.behavior, "variable")}>Tidak tetap</option>
            <option value="fixed" ${selectedAttr(category.behavior, "fixed")}>Tetap</option>
          </select>
        </label>
        <label>Induk kategori
          <select name="parentId">
            <option value="" ${selectedAttr(category.parentId || "", "")}>Kategori utama</option>
            ${categoryParentOptions(category.parentId || "", category.id)}
          </select>
        </label>
        <button type="submit" class="btn-primary">Simpan Perubahan</button>
        <button type="button" class="btn-soft" data-cancel-edit="category">Batal</button>
      </form>
    `;
  }

  function renderProductEditForm(product) {
    const categoryId = product.categoryId || categoryById(product.subcategoryId)?.parentId || "cat-sales";
    return `
      <form id="product-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(product.id)}">
        <label>Nama item <input name="name" value="${esc(product.name)}" required></label>
        <label>SKU <input name="sku" value="${esc(product.sku || "")}" placeholder="Kode item"></label>
        <label>Harga jual <input name="price" type="number" min="0" step="100" value="${Number(product.price) || 0}" required></label>
        <label>Harga modal <input name="cost" type="number" min="0" step="100" value="${Number(product.cost) || 0}"></label>
        <label>Stok <input name="stock" type="number" min="0" step="1" value="${Number(product.stock) || 0}"></label>
        <label>Status
          <select name="active">
            <option value="true" ${selectedAttr(product.active === false ? "false" : "true", "true")}>Aktif</option>
            <option value="false" ${selectedAttr(product.active === false ? "false" : "true", "false")}>Nonaktif</option>
          </select>
        </label>
        <label>Kategori
          <select name="categoryId" required>
            ${categoryOptions("income", categoryId)}
          </select>
        </label>
        <label>Subkategori
          <select name="subcategoryId">
            <option value="">Tanpa subkategori</option>
            ${tenantCategories().filter((category) => category.flow === "income" && category.parentId).map((category) => `<option value="${esc(category.id)}" ${selectedAttr(category.id, product.subcategoryId)}>${esc(categoryLabel(category.id))}</option>`).join("")}
          </select>
        </label>
        <button type="submit" class="btn-primary">Simpan Perubahan</button>
        <button type="button" class="btn-soft" data-cancel-edit="product">Batal</button>
      </form>
    `;
  }

  function renderUserEditForm(user) {
    return `
      <form id="user-edit-form" class="form-grid">
        <input type="hidden" name="id" value="${esc(user.id)}">
        <label>Nama <input name="name" value="${esc(user.name)}" required></label>
        <label>Username <input name="username" value="${esc(user.username || "")}" required autocomplete="off"></label>
        <label>Email <input name="email" value="${esc(user.email || "")}" inputmode="email"></label>
        <label>Password baru <input name="password" type="password" autocomplete="new-password" minlength="6" placeholder="Kosongkan jika tidak diganti"></label>
        <label>Role
          <select name="role">
            <option value="cashier" ${selectedAttr(user.role, "cashier")}>Kasir</option>
            <option value="owner" ${selectedAttr(user.role, "owner")}>Owner</option>
          </select>
        </label>
        <label>Status
          <select name="active">
            <option value="true" ${selectedAttr(user.active === false ? "false" : "true", "true")}>Aktif</option>
            <option value="false" ${selectedAttr(user.active === false ? "false" : "true", "false")}>Nonaktif</option>
          </select>
        </label>
        <button type="submit" class="btn-primary">Simpan Perubahan</button>
        <button type="button" class="btn-soft" data-cancel-edit="user">Batal</button>
      </form>
    `;
  }

  function renderCustomers() {
    const customers = filteredCrmCustomers();
    if (!customers.some((customer) => customer.id === ui.selectedCustomerId)) {
      ui.selectedCustomerId = customers[0]?.id || tenantCustomers()[0]?.id || "";
    }
    const selected = customerById(ui.selectedCustomerId);
    const history = selected
      ? tenantTransactions()
        .filter((transaction) => transaction.customerId === selected.id)
        .filter((transaction) => inDateRange(transaction.date, ui.customerFrom, ui.customerTo))
      : [];
    const total = sum(history, effectiveTransactionTotal);
    return `
      <div class="customer-layout">
        <aside class="panel">
          <div class="panel-header">
            <h3>Daftar pelanggan</h3>
            <div class="actions">
              <span class="tag" data-customer-count>${customers.length}</span>
              <button type="button" class="btn-soft" data-export-customers="excel">Excel</button>
              <button type="button" class="btn-soft" data-export-customers="csv">CSV</button>
            </div>
          </div>
          <label style="margin-bottom: 10px;">Cari pelanggan
            <input data-filter="customerSearch" value="${esc(ui.customerSearch)}" placeholder="Nama, WA, alamat">
          </label>
          <div class="customer-list" data-customer-list>
            ${renderCustomerList(customers)}
          </div>
        </aside>
        <section class="grid">
          <div class="panel">
            <div class="panel-header">
              <h3>${selected ? esc(selected.name) : "Pelanggan"}</h3>
              <div class="actions">
                ${selected && ui.editingCustomerId !== selected.id ? `
                  ${customerWaButton(selected, history)}
                  <button type="button" class="btn-soft" data-edit-customer="${esc(selected.id)}">Edit</button>
                  ${isWalkinCustomer(selected) ? "" : `<button type="button" class="btn-danger" data-delete-customer="${esc(selected.id)}">Hapus</button>`}
                ` : selected ? `
                  <button type="button" class="btn-soft" data-cancel-edit="customer">Batal Edit</button>
                ` : ""}
              </div>
            </div>
            ${selected && ui.editingCustomerId === selected.id ? renderCustomerEditForm(selected) : selected ? `
              <div class="grid three">
                <article class="metric sales"><span>Total belanja</span><strong>${money(total)}</strong><small>${history.length} transaksi terfilter</small></article>
                <article class="metric avg"><span>Kontak WA</span><strong style="font-size: 1rem;">${esc(selected.phone || "-")}</strong><small>${esc(selected.address || "-")}</small></article>
                <article class="metric net"><span>Keterangan</span><strong style="font-size: 1rem;">${esc(selected.notes || "-")}</strong><small>Catatan CRM</small></article>
              </div>
            ` : `<div class="empty-state">Pilih pelanggan untuk melihat histori.</div>`}
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Histori transaksi</h3></div>
            <div class="filters" style="grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 12px;">
              <label>Dari <input type="date" data-filter="customerFrom" value="${esc(ui.customerFrom)}"></label>
              <label>Sampai <input type="date" data-filter="customerTo" value="${esc(ui.customerTo)}"></label>
            </div>
            ${renderTransactionTable(history)}
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Tambah pelanggan</h3></div>
            <form id="customer-form" class="form-grid">
              <label>Nama <input name="name" required></label>
              <label>Kontak WA <input name="phone" inputmode="tel"></label>
              <label class="full">Alamat <input name="address"></label>
              <label class="full">Keterangan <textarea name="notes"></textarea></label>
              <button type="submit" class="btn-primary">Simpan Pelanggan</button>
            </form>
          </div>
        </section>
      </div>
    `;
  }

  function renderExpenses() {
    const expenses = tenantExpenses()
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const selectedExpense = tenantExpenses().find((expense) => expense.id === ui.selectedExpenseId) || expenses[0];
    if (selectedExpense && selectedExpense.id !== ui.selectedExpenseId) ui.selectedExpenseId = selectedExpense.id;
    const fixed = sum(expenses.filter((expense) => expense.behavior === "fixed"), "amount");
    const variable = sum(expenses.filter((expense) => expense.behavior === "variable"), "amount");
    return `
      <div class="grid">
        <section class="grid three">
          <article class="metric expense"><span>Total pengeluaran</span><strong>${money(fixed + variable)}</strong><small>${expenses.length} catatan</small></article>
          <article class="metric net"><span>Biaya tetap</span><strong>${money(fixed)}</strong><small>Sewa, gaji, utilitas</small></article>
          <article class="metric avg"><span>Biaya tidak tetap</span><strong>${money(variable)}</strong><small>Bahan, kemasan, transport</small></article>
        </section>
        <section class="grid two">
          <div class="panel">
            <div class="panel-header"><h3>Catat pengeluaran</h3></div>
            <form id="expense-form" class="form-grid">
              <label>Tanggal <input type="date" name="date" value="${toDateInput(new Date())}" required></label>
              <label>Jenis biaya
                <select name="behavior" required>
                  <option value="fixed">Tetap</option>
                  <option value="variable">Tidak tetap</option>
                </select>
              </label>
              <label>Nama pengeluaran <input name="name" required placeholder="Contoh: belanja bahan"></label>
              <label>Nominal <input name="amount" type="number" min="0" step="100" required></label>
              <label>Kategori
                <select name="categoryId" required>
                  ${categoryOptions("expense", "cat-variable-expense")}
                </select>
              </label>
              <label>Subkategori
                <select name="subcategoryId">
                  <option value="">Tanpa subkategori</option>
                  ${tenantCategories().filter((category) => category.flow === "expense" && category.parentId).map((category) => `<option value="${esc(category.id)}">${esc(categoryLabel(category.id))}</option>`).join("")}
                </select>
              </label>
              <label class="full">Catatan <textarea name="notes"></textarea></label>
              <button type="submit" class="btn-primary">Simpan Pengeluaran</button>
            </form>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Daftar pengeluaran</h3><span class="tag">${expenses.length}</span></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Tanggal</th><th>Nama</th><th>Kategori</th><th>Jenis</th><th>Nominal</th><th></th></tr></thead>
                <tbody>
                  ${expenses.map((expense) => `
                    <tr>
                      <td>${formatDate(expense.date)}</td>
                      <td>${esc(expense.name)}<br><span class="muted small">${esc(expense.notes || "")}</span></td>
                      <td>${esc(categoryLabel(expense.subcategoryId || expense.categoryId))}</td>
                      <td><span class="tag expense">${expense.behavior === "fixed" ? "Tetap" : "Tidak tetap"}</span></td>
                      <td>${money(expense.amount)}</td>
                      <td><button type="button" class="${expense.id === ui.selectedExpenseId ? "btn-primary" : "btn-soft"}" data-select-expense="${esc(expense.id)}">Pilih</button></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h3>Detail pengeluaran</h3>
            ${selectedExpense && ui.editingExpenseId !== selectedExpense.id ? `<div class="actions"><button type="button" class="btn-soft" data-edit-expense="${esc(selectedExpense.id)}">Edit</button><button type="button" class="btn-danger" data-delete-expense="${esc(selectedExpense.id)}">Hapus</button></div>` : selectedExpense ? `<button type="button" class="btn-soft" data-cancel-edit="expense">Batal Edit</button>` : ""}
          </div>
          ${selectedExpense && ui.editingExpenseId === selectedExpense.id ? renderExpenseEditForm(selectedExpense) : selectedExpense ? `
            <div class="grid three">
              <article class="metric expense"><span>Nama</span><strong style="font-size:1rem;">${esc(selectedExpense.name)}</strong><small>${formatDate(selectedExpense.date)}</small></article>
              <article class="metric avg"><span>Kategori</span><strong style="font-size:1rem;">${esc(categoryLabel(selectedExpense.subcategoryId || selectedExpense.categoryId))}</strong><small>${selectedExpense.behavior === "fixed" ? "Biaya tetap" : "Biaya tidak tetap"}</small></article>
              <article class="metric net"><span>Nominal</span><strong>${money(selectedExpense.amount)}</strong><small>${esc(selectedExpense.notes || "-")}</small></article>
            </div>
          ` : `<div class="empty-state">Pilih pengeluaran untuk melihat detail.</div>`}
        </section>
      </div>
    `;
  }

  function renderCategories() {
    const topCategories = tenantCategories().filter((category) => !category.parentId);
    const selectedCategory = categoryById(ui.selectedCategoryId) || topCategories[0] || tenantCategories()[0];
    if (selectedCategory && selectedCategory.id !== ui.selectedCategoryId) ui.selectedCategoryId = selectedCategory.id;
    const selectedChildren = selectedCategory ? tenantCategories().filter((sub) => sub.parentId === selectedCategory.id) : [];
    const selectedCategoryProducts = selectedCategory
      ? tenantProducts().filter((product) => product.categoryId === selectedCategory.id || product.subcategoryId === selectedCategory.id)
      : [];
    const selectedCategoryExpenses = selectedCategory
      ? tenantExpenses().filter((expense) => expense.categoryId === selectedCategory.id || expense.subcategoryId === selectedCategory.id)
      : [];
    const selectedProduct = productById(ui.selectedProductId) || tenantProducts()[0];
    if (selectedProduct && selectedProduct.id !== ui.selectedProductId) ui.selectedProductId = selectedProduct.id;
    return `
      <div class="grid two">
        <section class="panel">
          <div class="panel-header"><h3>Kategori akuntansi</h3></div>
          <form id="category-form" class="form-grid">
            <label>Nama kategori <input name="name" required placeholder="Contoh: Paket Bundling"></label>
            <label>Arus
              <select name="flow">
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </label>
            <label>Sifat
              <select name="behavior">
                <option value="variable">Tidak tetap</option>
                <option value="fixed">Tetap</option>
              </select>
            </label>
            <label>Induk kategori
              <select name="parentId">
                <option value="">Kategori utama</option>
                ${topCategories.map((category) => `<option value="${esc(category.id)}">${esc(category.name)} (${category.flow === "income" ? "Pemasukan" : "Pengeluaran"})</option>`).join("")}
              </select>
            </label>
            <button type="submit" class="btn-primary">Tambah Kategori</button>
          </form>
          <div class="grid" style="margin-top: 16px;">
            ${topCategories.map((category) => `
              <div class="panel" style="background: var(--surface-2);">
                <div class="panel-header">
                  <h3>${esc(category.name)}</h3>
                  <div class="actions">
                    <span class="tag ${category.flow === "income" ? "income" : "expense"}">${category.flow === "income" ? "Pemasukan" : "Pengeluaran"} / ${category.behavior === "fixed" ? "Tetap" : "Tidak tetap"}</span>
                    <button type="button" class="${category.id === ui.selectedCategoryId ? "btn-primary" : "btn-soft"}" data-select-category="${esc(category.id)}">Pilih</button>
                  </div>
                </div>
                <div class="tag-row">
                  ${tenantCategories().filter((sub) => sub.parentId === category.id).map((sub) => `
                    <button type="button" class="${sub.id === ui.selectedCategoryId ? "btn-primary" : "btn-soft"}" data-select-category="${esc(sub.id)}">${esc(sub.name)}</button>
                  `).join("") || `<span class="muted small">Belum ada subkategori.</span>`}
                </div>
              </div>
            `).join("")}
          </div>
          <div class="detail-box">
            <div class="panel-header">
              <h3>Detail kategori</h3>
              ${selectedCategory && ui.editingCategoryId !== selectedCategory.id ? `<div class="actions"><button type="button" class="btn-soft" data-edit-category="${esc(selectedCategory.id)}">Edit</button><button type="button" class="btn-danger" data-delete-category="${esc(selectedCategory.id)}">Hapus</button></div>` : selectedCategory ? `<button type="button" class="btn-soft" data-cancel-edit="category">Batal Edit</button>` : ""}
            </div>
            ${selectedCategory && ui.editingCategoryId === selectedCategory.id ? renderCategoryEditForm(selectedCategory) : selectedCategory ? `
              <div class="grid three">
                <article class="metric ${selectedCategory.flow === "income" ? "sales" : "expense"}"><span>Nama</span><strong style="font-size:1rem;">${esc(categoryLabel(selectedCategory.id))}</strong><small>${selectedCategory.flow === "income" ? "Pemasukan" : "Pengeluaran"}</small></article>
                <article class="metric avg"><span>Sifat</span><strong style="font-size:1rem;">${selectedCategory.behavior === "fixed" ? "Tetap" : "Tidak tetap"}</strong><small>${selectedChildren.length} subkategori</small></article>
                <article class="metric net"><span>Dipakai</span><strong style="font-size:1rem;">${selectedCategoryProducts.length} item / ${selectedCategoryExpenses.length} biaya</strong><small>Edit dan hapus dari panel ini</small></article>
              </div>
            ` : `<div class="empty-state">Pilih kategori untuk melihat detail.</div>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Item penjualan</h3></div>
          <form id="product-form" class="form-grid">
            <label>Nama item <input name="name" required></label>
            <label>SKU <input name="sku" placeholder="Kode item"></label>
            <label>Harga jual <input name="price" type="number" min="0" step="100" required></label>
            <label>Harga modal <input name="cost" type="number" min="0" step="100"></label>
            <label>Stok <input name="stock" type="number" min="0" step="1"></label>
            <label>Kategori
              <select name="categoryId" required>
                ${categoryOptions("income", "cat-sales")}
              </select>
            </label>
            <label class="full">Subkategori
              <select name="subcategoryId">
                <option value="">Tanpa subkategori</option>
                ${tenantCategories().filter((category) => category.flow === "income" && category.parentId).map((category) => `<option value="${esc(category.id)}">${esc(categoryLabel(category.id))}</option>`).join("")}
              </select>
            </label>
            <button type="submit" class="btn-primary">Tambah Item</button>
          </form>
          <div class="table-wrap" style="margin-top: 16px;">
            <table>
              <thead><tr><th>Item</th><th>Kategori</th><th>Harga</th><th>Modal</th><th>Stok</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                ${tenantProducts().map((product) => `
                  <tr>
                    <td><strong>${esc(product.name)}</strong><br><span class="muted small">${esc(product.sku || "-")}</span></td>
                    <td>${esc(categoryLabel(product.subcategoryId || product.categoryId))}</td>
                    <td>${money(product.price)}</td>
                    <td>${money(product.cost)}</td>
                    <td>${Number(product.stock) || 0}</td>
                    <td><span class="tag ${product.active === false ? "expense" : "income"}">${product.active === false ? "Nonaktif" : "Aktif"}</span></td>
                    <td><button type="button" class="${product.id === ui.selectedProductId ? "btn-primary" : "btn-soft"}" data-select-product="${esc(product.id)}">Pilih</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="detail-box">
            <div class="panel-header">
              <h3>Detail item</h3>
              ${selectedProduct && ui.editingProductId !== selectedProduct.id ? `<div class="actions"><button type="button" class="btn-soft" data-edit-product="${esc(selectedProduct.id)}">Edit</button><button type="button" class="btn-danger" data-delete-product="${esc(selectedProduct.id)}">Hapus</button></div>` : selectedProduct ? `<button type="button" class="btn-soft" data-cancel-edit="product">Batal Edit</button>` : ""}
            </div>
            ${selectedProduct && ui.editingProductId === selectedProduct.id ? renderProductEditForm(selectedProduct) : selectedProduct ? `
              <div class="grid three">
                <article class="metric sales"><span>Item</span><strong style="font-size:1rem;">${esc(selectedProduct.name)}</strong><small>${esc(selectedProduct.sku || "-")}</small></article>
                <article class="metric avg"><span>Harga dan modal</span><strong style="font-size:1rem;">${money(selectedProduct.price)} / ${money(selectedProduct.cost)}</strong><small>HPP memakai harga modal</small></article>
                <article class="metric net"><span>Stok</span><strong>${Number(selectedProduct.stock) || 0}</strong><small>${selectedProduct.active === false ? "Nonaktif" : esc(categoryLabel(selectedProduct.subcategoryId || selectedProduct.categoryId))}</small></article>
              </div>
            ` : `<div class="empty-state">Pilih item untuk melihat detail.</div>`}
          </div>
        </section>
      </div>
    `;
  }

  function renderInvoices() {
    const transactions = tenantTransactions()
      .filter((transaction) => inDateRange(transaction.date, ui.invoiceFrom, ui.invoiceTo))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return `
      <div class="grid">
        <section class="panel">
          <div class="filters" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
            <label>Dari <input type="date" data-filter="invoiceFrom" value="${esc(ui.invoiceFrom)}"></label>
            <label>Sampai <input type="date" data-filter="invoiceTo" value="${esc(ui.invoiceTo)}"></label>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Daftar invoice</h3><span class="tag">${transactions.length}</span></div>
          ${renderTransactionTable(transactions, true)}
        </section>
      </div>
    `;
  }

  function renderTeam() {
    const users = tenantUsers().sort((a, b) => {
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const selectedUser = users.find((user) => user.id === ui.selectedUserId) ||
      users.find((user) => user.role !== "owner" && user.id !== state.session?.id) ||
      users[0];
    if (selectedUser && selectedUser.id !== ui.selectedUserId) ui.selectedUserId = selectedUser.id;
    const logs = filteredTeamLogs();
    const actorOptions = users
      .map((user) => `<option value="${esc(user.id)}" ${ui.logActor === user.id ? "selected" : ""}>${esc(user.name)} (${esc(user.username)})</option>`)
      .join("");
    return `
      <div class="grid two">
        <section class="panel">
          <div class="panel-header"><h3>Buat akun kasir</h3></div>
          <form id="user-form" class="form-grid">
            <label>Nama kasir <input name="name" required placeholder="Contoh: Riska"></label>
            <label>Username <input name="username" required autocomplete="off" placeholder="riska"></label>
            <label class="full">Password <input name="password" type="password" required autocomplete="new-password" minlength="6" placeholder="Minimal 6 karakter"></label>
            <button type="submit" class="btn-primary">Buat Akun Kasir</button>
          </form>
          <div class="panel" style="background: var(--surface-2); margin-top: 14px;">
            <h3>Catatan akses</h3>
            <p class="muted">Owner dapat membuat akun kasir baru. Kasir hanya bisa masuk ke menu kasir, sedangkan owner tetap melihat seluruh laporan dan log.</p>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Daftar akun</h3><span class="tag">${users.length} akun</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Detail</th></tr></thead>
              <tbody>
                ${users.map((user) => `
                  <tr>
                    <td><strong>${esc(user.name)}</strong><br><span class="muted small">${esc(user.email || "-")}</span></td>
                    <td>${esc(user.username || "-")}</td>
                    <td>${user.role === "owner" ? "Owner" : "Kasir"}</td>
                    <td><span class="tag ${user.active === false ? "expense" : "income"}">${user.active === false ? "Nonaktif" : "Aktif"}</span></td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td><button type="button" class="${user.id === ui.selectedUserId ? "btn-primary" : "btn-soft"}" data-select-user="${esc(user.id)}">Pilih</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="detail-box">
            <div class="panel-header">
              <h3>Detail akun</h3>
              ${selectedUser && selectedUser.role !== "owner" && selectedUser.id !== state.session.id && ui.editingUserId !== selectedUser.id
                ? `<div class="actions">
                    <button type="button" class="btn-soft" data-edit-user="${esc(selectedUser.id)}">Edit</button>
                    <button type="button" class="btn-primary" data-reset-user-password="${esc(selectedUser.id)}">Reset Password</button>
                    <button type="button" class="${selectedUser.active === false ? "btn-primary" : "btn-danger"}" data-toggle-user="${esc(selectedUser.id)}">${selectedUser.active === false ? "Aktifkan" : "Nonaktifkan"}</button>
                    <button type="button" class="btn-danger" data-delete-user="${esc(selectedUser.id)}">Hapus</button>
                  </div>`
                : selectedUser && ui.editingUserId === selectedUser.id ? `<button type="button" class="btn-soft" data-cancel-edit="user">Batal Edit</button>`
                : ""}
            </div>
            ${selectedUser && ui.editingUserId === selectedUser.id ? renderUserEditForm(selectedUser) : selectedUser ? `
              <div class="grid three">
                <article class="metric sales"><span>Nama</span><strong style="font-size:1rem;">${esc(selectedUser.name)}</strong><small>${esc(selectedUser.email || "-")}</small></article>
                <article class="metric avg"><span>Username</span><strong style="font-size:1rem;">${esc(selectedUser.username || "-")}</strong><small>${selectedUser.role === "owner" ? "Owner" : "Kasir"}</small></article>
                <article class="metric ${selectedUser.active === false ? "expense" : "net"}"><span>Status</span><strong style="font-size:1rem;">${selectedUser.active === false ? "Nonaktif" : "Aktif"}</strong><small>${selectedUser.role === "owner" || selectedUser.id === state.session.id ? "Akun ini tidak bisa dihapus dari sini" : "Edit/reset/hapus dari panel ini"}</small></article>
              </div>
            ` : `<div class="empty-state">Pilih akun untuk melihat detail.</div>`}
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top: 14px;">
        <div class="panel-header">
          <h3>Log aktivitas</h3>
          <span class="tag" data-log-count>${logs.length} terbaru</span>
        </div>
        <div class="filters" style="grid-template-columns: minmax(180px, 1fr) minmax(180px, .8fr); margin-bottom: 12px;">
          <label>Cari log
            <input data-filter="logSearch" value="${esc(ui.logSearch)}" placeholder="Cari tindakan, invoice, nama, detail">
          </label>
          <label>Pelaku
            <select data-filter="logActor">
              <option value="all">Semua pelaku</option>
              ${actorOptions}
            </select>
          </label>
        </div>
        <div data-log-results>
          ${renderLogResults(logs)}
        </div>
      </section>
    `;
  }

  function renderSettings() {
    const profile = storeProfile();
    const tenant = currentTenant();
    const usage = tenantUsage(tenant.id);
    const status = tenantStatus(tenant);
    return `
      <section class="panel">
        <div class="panel-header"><h3>Profil toko</h3><span class="tag ${status.className}">${status.label}</span></div>
        <form id="settings-form" class="form-grid">
          <div class="company-preview full">
            ${brandLogo(profile, "settings-logo")}
            <div>
              <strong>${esc(profile.companyName || profile.storeName)}</strong>
              <span class="muted small">Preview logo dan nama perusahaan</span>
            </div>
          </div>
          <label>Nama toko <input name="storeName" value="${esc(profile.storeName)}" required></label>
          <label>Nama perusahaan <input name="companyName" value="${esc(profile.companyName || profile.storeName)}" required></label>
          <label>Kontak perusahaan / WA <input name="storePhone" value="${esc(profile.storePhone)}" inputmode="tel"></label>
          <label>Email perusahaan <input name="companyEmail" value="${esc(profile.companyEmail || "")}" inputmode="email"></label>
          <label>Prefix invoice <input name="invoicePrefix" value="${esc(profile.invoicePrefix)}" required></label>
          <label class="full">Alamat toko <input name="storeAddress" value="${esc(profile.storeAddress)}"></label>
          <label class="full">URL logo perusahaan
            <input name="logoUrl" value="${esc(profile.logoUrl || "")}" placeholder="https://.../logo-perusahaan.png">
          </label>
          <label>Upload logo
            <input type="file" accept="image/*" data-logo-upload>
          </label>
          <label>Ukuran logo
            <input name="logoSize" type="range" min="28" max="180" step="2" value="${Number(profile.logoSize) || 54}">
          </label>
          <label>Geser kiri/kanan
            <input name="logoOffsetX" type="range" min="-120" max="120" step="2" value="${Number(profile.logoOffsetX) || 0}">
          </label>
          <button type="submit" class="btn-primary">Simpan Pengaturan</button>
        </form>
        <div class="detail-box">
          <div class="grid three">
            <article class="metric sales"><span>Status toko</span><strong style="font-size:1rem;">${status.label}</strong><small>Dikelola oleh admin SaaS</small></article>
            <article class="metric avg"><span>Kasir aktif</span><strong>${usage.activeCashiers}</strong><small>Akun kasir yang bisa login</small></article>
            <article class="metric net"><span>Backend</span><strong style="font-size:1rem;">Dikelola pusat</strong><small>Toko tidak perlu mengatur GAS/Spreadsheet</small></article>
          </div>
        </div>
      </section>
    `;
  }

  function renderTransactionTable(transactions, includeActions = false) {
    if (!transactions.length) return `<div class="empty-state">Belum ada transaksi pada filter ini.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Tanggal</th>
              <th>Pelanggan</th>
              <th>Item</th>
              <th>Pembayaran</th>
              <th>Status</th>
              <th>Total</th>
              ${includeActions ? "<th>Aksi</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${transactions.map((transaction) => `
              <tr>
                <td><button type="button" class="btn-soft" data-open-invoice="${esc(transaction.id)}">${esc(transaction.id)}</button></td>
                <td>${formatDate(transaction.date)}<br><span class="muted small">${esc(transaction.cashierName || "-")}</span></td>
                <td>${esc(transaction.customerSnapshot?.name || "-")}<br><span class="muted small">${esc(transaction.customerSnapshot?.phone || "")}</span></td>
                <td>${transaction.items.map((item) => `${esc(item.name)} x ${item.qty}`).join("<br>")}</td>
                <td>${esc(transaction.paymentMethod || "-")}</td>
                <td><span class="tag ${transactionStatus(transaction).className}">${transactionStatus(transaction).label}</span></td>
                <td><strong>${money(effectiveTransactionTotal(transaction))}</strong>${transaction.returnStatus === "returned" ? `<br><span class="muted small">Asal ${money(transaction.total)}</span>` : ""}</td>
                ${includeActions ? `<td><div class="actions"><button type="button" class="btn-dark" data-open-invoice="${esc(transaction.id)}">Buka</button>${transactionActionButtons(transaction)}${invoiceWaButton(transaction)}</div></td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderInvoiceModal(transactionId) {
    const transaction = tenantTransactions().find((item) => item.id === transactionId);
    if (!transaction) return "";
    return `
      <div class="invoice-backdrop" role="dialog" aria-modal="true" aria-label="Invoice ${esc(transaction.id)}">
        <div class="invoice-modal">
          <div class="invoice-toolbar actions">
            <button type="button" class="btn-soft" data-close-invoice>Tutup</button>
            <button type="button" class="btn-dark" data-print-invoice>Cetak / Simpan PDF</button>
            <button type="button" class="btn-primary" data-create-pdf="${esc(transaction.id)}">Buat PDF</button>
            ${transactionActionButtons(transaction)}
            ${invoiceWaButton(transaction)}
          </div>
          ${renderInvoiceSheet(transaction)}
        </div>
      </div>
    `;
  }

  function renderInvoiceSheet(transaction) {
    const profile = storeProfile(transaction.tenantId || currentTenantId());
    return `
      <section class="invoice-sheet">
        <header class="invoice-head">
          <div class="invoice-brand">
            ${brandLogo(profile, "invoice-logo")}
            <div>
            <p class="invoice-title">${esc(profile.companyName || profile.storeName)}</p>
            <p class="muted">${esc(profile.storeAddress || "")}<br>${esc(profile.storePhone || "")}${profile.companyEmail ? `<br>${esc(profile.companyEmail)}` : ""}</p>
            </div>
          </div>
          <div class="invoice-summary">
            <strong>INVOICE</strong>
            <span>${esc(transaction.id)}</span>
            <span>${formatDate(transaction.date)}</span>
            <span class="tag ${transactionStatus(transaction).className}">${transactionStatus(transaction).label}</span>
          </div>
        </header>
        <div class="invoice-meta">
          <div>
            <strong>Tagihan untuk</strong>
            <p>${esc(transaction.customerSnapshot?.name || "-")}<br>${esc(transaction.customerSnapshot?.phone || "")}<br>${esc(transaction.customerSnapshot?.address || "")}</p>
          </div>
          <div>
            <strong>Pembayaran</strong>
            <p>${esc(transaction.paymentMethod || "-")}<br>Kasir: ${esc(transaction.cashierName || "-")}${transaction.returnStatus === "returned" ? `<br>Return: ${formatDate(transaction.returnedAt)}` : ""}</p>
          </div>
        </div>
        <div class="invoice-table-wrap">
          <table class="invoice-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead>
            <tbody>
              ${transaction.items.map((item) => `
                <tr>
                  <td>${esc(item.name)}<br><span class="muted small">${esc(item.sku || "")}</span></td>
                  <td>${item.qty}</td>
                  <td>${money(item.price)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="grid" style="justify-items: end; margin-top: 18px;">
          <div style="min-width: 260px;">
            <div class="total-box">
              <span>${transaction.returnStatus === "returned" ? "Total setelah return" : "Total"}</span>
              <strong>${money(effectiveTransactionTotal(transaction))}</strong>
            </div>
          </div>
        </div>
        ${transaction.notes ? `<p><strong>Catatan:</strong> ${esc(transaction.notes)}</p>` : ""}
        ${transaction.pdfUrl ? `<p class="muted small">PDF: ${esc(transaction.pdfUrl)}</p>` : ""}
      </section>
    `;
  }

  function categoryOptions(flow, selectedId) {
    return tenantCategories()
      .filter((category) => category.flow === flow)
      .map((category) => `<option value="${esc(category.id)}" ${category.id === selectedId ? "selected" : ""}>${esc(categoryLabel(category.id))}</option>`)
      .join("");
  }

  function itemMatchesCategory(item, categoryId) {
    if (categoryId === "all") return true;
    if (item.categoryId === categoryId || item.subcategoryId === categoryId) return true;
    const sub = categoryById(item.subcategoryId);
    return sub?.parentId === categoryId;
  }

  function filteredTransactions(from, to, customerId = "all") {
    return tenantTransactions()
      .filter((transaction) => inDateRange(transaction.date, from, to))
      .filter((transaction) => customerId === "all" || transaction.customerId === customerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function transactionCategoryTotal(transaction, categoryId) {
    if (categoryId === "all") return transaction.total;
    return sum(transaction.items.filter((item) => itemMatchesCategory(item, categoryId)), "total");
  }

  function salesByCategory(transactions, categoryId) {
    const totals = new Map();
    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        if (!itemMatchesCategory(item, categoryId)) return;
        const label = categoryLabel(item.subcategoryId || item.categoryId);
        totals.set(label, (totals.get(label) || 0) + item.total);
      });
    });
    return Array.from(totals, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }

  function salesByDay(rows) {
    const totals = new Map();
    rows.forEach(({ transaction, amount }) => {
      const label = shortDate(transaction.date);
      totals.set(label, (totals.get(label) || 0) + amount);
    });
    return Array.from(totals, ([label, value]) => ({ label, value }));
  }

  function renderBars(rows) {
    if (!rows.length) return `<div class="empty-state">Tidak ada data pada filter ini.</div>`;
    const max = Math.max(...rows.map((row) => row.value), 1);
    return `
      <div class="bar-list">
        ${rows.map((row) => `
          <div class="bar-row">
            <header><span>${esc(row.label)}</span><strong>${money(row.value)}</strong></header>
            <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(4, (row.value / max) * 100)}%;"></div></div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function customerWaButton(customer, history = []) {
    const total = sum(history, "total");
    const text = `Halo ${customer.name}, kami dari ${storeProfile().storeName}. Terima kasih sudah berbelanja. Jika butuh pesanan ulang atau info promo, kami siap bantu. Total histori terfilter: ${money(total)}.`;
    const href = waLink(customer.phone, text);
    if (!href) return `<button type="button" class="btn-soft" disabled>WA kosong</button>`;
    return `<a class="button btn-wa" target="_blank" rel="noopener" href="${esc(href)}">Chat WA</a>`;
  }

  function invoiceWaButton(transaction) {
    const phone = transaction.customerSnapshot?.phone || customerById(transaction.customerId)?.phone || "";
    if (!normalizeWa(phone)) return `<button type="button" class="btn-soft" disabled>WA kosong</button>`;
    const loading = ui.invoiceWaLoadingId === transaction.id;
    return `<button type="button" class="btn-wa ${loading ? "is-loading" : ""}" data-send-invoice-wa="${esc(transaction.id)}" ${loading ? "disabled" : ""}>${loading ? "Menyiapkan..." : transaction.pdfUrl ? "Kirim PDF WA" : "Buat & Kirim WA"}</button>`;
  }

  function transactionActionButtons(transaction) {
    if (transaction.returnStatus === "returned") {
      return `<span class="tag expense">Sudah return</span>`;
    }
    const settleButton = transaction.paymentStatus === "pending"
      ? `<button type="button" class="btn-primary" data-settle-transaction="${esc(transaction.id)}">Lunas</button>`
      : "";
    return `${settleButton}<button type="button" class="btn-danger" data-return-transaction="${esc(transaction.id)}">Return</button>`;
  }

  function invoiceMessage(transaction) {
    const pdfLine = transaction.pdfUrl ? `\nPDF invoice: ${transaction.pdfUrl}` : "";
    return `Halo ${transaction.customerSnapshot?.name || "Pelanggan"}, berikut invoice ${transaction.id} dari ${storeProfile(transaction.tenantId || currentTenantId()).storeName} dengan total ${money(transaction.total)}.${pdfLine}\nTerima kasih.`;
  }

  async function sendInvoiceWa(transactionId) {
    const transaction = tenantTransactions().find((item) => item.id === transactionId);
    if (!transaction) return;
    const phone = transaction.customerSnapshot?.phone || customerById(transaction.customerId)?.phone || "";
    if (!normalizeWa(phone)) {
      toast("Nomor WA pelanggan kosong.");
      return;
    }
    const popup = window.open("about:blank", "_blank");
    ui.invoiceWaLoadingId = transactionId;
    render();
    try {
      if (!transaction.pdfUrl) {
        toast("Membuat PDF invoice...");
        const pdfUrl = await ensureGasPdf(transaction, { silent: true, deferRender: true });
        if (!pdfUrl) throw new Error("PDF invoice belum tersedia");
      }
      const href = waLink(phone, invoiceMessage(transaction));
      if (popup) popup.location.href = href;
      else window.open(href, "_blank", "noopener");
      toast("WhatsApp dibuka dengan link PDF invoice.");
    } catch (error) {
      if (popup) popup.close();
      toast(error.message || "PDF invoice belum berhasil dibuat.");
    } finally {
      ui.invoiceWaLoadingId = "";
      render();
    }
  }

  async function handleLogin(form) {
    if (ui.loginLoading) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const selectedRole = data.role === "cashier" ? "cashier" : "owner";
    ui.loginRole = selectedRole;
    ui.loginEmail = String(data.email || "");
    ui.loginPassword = String(data.password || "");
    ui.loginLoading = true;
    updateLoginLoading(true);
    try {
      const saasRequired = hasTenantSlug();
      if (saasRequired && !backendUrl()) {
        toast(centerStatusMessage || "Data Center belum terhubung. Isi URL Data Center di js/config.js.");
        return;
      }
      const localUser = state.users.map(normalizeUser).find((user) => {
        return user.role === selectedRole && userLoginMatches(user, data.email) && user.password === data.password && user.active !== false;
      });
      if (backendUrl()) {
        try {
          const loginAction = selectedRole === "cashier" ? "loginCashier" : "loginOwner";
          const result = await api(loginAction, { email: data.email, username: data.email, password: data.password, role: selectedRole }, false);
          if (!["owner", "cashier"].includes(result.user.role) || result.user.role !== selectedRole) {
            throw new Error("Role login tidak sesuai");
          }
          if (result.company) {
            state.platformSettings = {
              ...state.platformSettings,
              company: {
                ...(state.platformSettings?.company || {}),
                ...result.company
              }
            };
          }
          state.session = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            username: result.user.username || "",
            role: result.user.role,
            tenantId: result.user.tenantId || localUser?.tenantId || defaultTenantId(),
            token: result.token
          };
          if (!tenantCanLogin(tenantById(state.session.tenantId))) {
            state.session = null;
            toast("Langganan toko tidak aktif. Hubungi admin SaaS.");
            return;
          }
          saveState();
          resetTenantSelections();
          ui.loginLoading = false;
          toast("Login SaaS berhasil.");
          render();
          refreshRemoteDataAfterLogin();
          logActivity("login", "Login berhasil melalui backend SaaS", state.session.username || state.session.email).catch(() => {});
          return;
        } catch (error) {
          if (saasRequired) {
            toast(`Login GAS gagal: ${error.message || "periksa Data Center dan status aktif"}`);
            return;
          }
          if (!localUser) {
            toast("Login backend gagal. Periksa akun atau hubungi admin SaaS.");
            return;
          }
          toast("Backend belum terhubung, masuk mode lokal.");
        }
      }
      if (!localUser) {
        toast("Email atau password tidak cocok.");
        return;
      }
      if (!tenantCanLogin(tenantById(localUser.tenantId))) {
        toast("Langganan toko tidak aktif. Hubungi admin SaaS.");
        return;
      }
      state.session = {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        username: localUser.username,
        role: localUser.role,
        tenantId: localUser.tenantId || "",
        token: ""
      };
      logActivity("login", "Login berhasil mode lokal", state.session.username || state.session.email).catch(() => {});
      saveState();
      resetTenantSelections();
      ui.loginLoading = false;
      render();
    } finally {
      ui.loginLoading = false;
      if (!state.session) updateLoginLoading(false);
    }
  }

  function demoLogin(role) {
    if (!["owner", "cashier"].includes(role)) return;
    const user = state.users.map(normalizeUser).find((item) => item.role === role);
    if (!user) return;
    if (user.role !== "platform" && !tenantCanLogin(tenantById(user.tenantId))) {
      toast("Langganan toko tidak aktif. Hubungi admin SaaS.");
      return;
    }
    state.session = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId || "",
      token: ""
    };
    logActivity("login", "Login demo", state.session.username || state.session.email);
    saveState();
    resetTenantSelections();
    render();
  }

  function addProductToCart(productId) {
    const product = productById(productId);
    if (!product) return;
    const existing = ui.cart.find((line) => line.productId === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      ui.cart.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        price: Number(product.price) || 0,
        cost: Number(product.cost) || 0,
        qty: 1
      });
    }
    render();
  }

  function changeCartQty(productId, delta) {
    const line = ui.cart.find((item) => item.productId === productId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) ui.cart = ui.cart.filter((item) => item.productId !== productId);
    render();
  }

  async function handleCheckout(form) {
    if (!ui.cart.length) return;
    const data = Object.fromEntries(new FormData(form).entries());
    let customerId = ui.posCustomerId;
    let customer = customerById(customerId);
    let createdCustomer = null;
    if (customerId === "new") {
      customer = {
        id: id("cust"),
        tenantId: currentTenantId(),
        name: data.newCustomerName.trim(),
        phone: data.newCustomerPhone.trim(),
        address: data.newCustomerAddress.trim(),
        notes: "Dibuat dari transaksi kasir.",
        createdAt: nowIso()
      };
      state.customers.push(customer);
      createdCustomer = customer;
      customerId = customer.id;
      ui.posCustomerId = customer.id;
      ui.posCustomerQuery = customer.name;
      ui.selectedCustomerId = customer.id;
    }
    if (!customer) {
      customer = tenantCustomers()[0];
      customerId = customer.id;
    }
    const items = ui.cart.map((line) => ({
      productId: line.productId,
      name: line.name,
      sku: line.sku,
      categoryId: line.categoryId,
      subcategoryId: line.subcategoryId,
      qty: line.qty,
      price: line.price,
      cost: line.cost,
      total: line.qty * line.price
    }));
    const subtotal = sum(items, "total");
    const transaction = {
      id: nextInvoiceId(),
      tenantId: currentTenantId(),
      date: nowIso(),
      customerId,
      customerSnapshot: { name: customer.name, phone: customer.phone, address: customer.address },
      cashierName: state.session.name,
      paymentMethod: data.paymentMethod,
      paymentStatus: isDeferredPayment(data.paymentMethod) ? "pending" : "paid",
      returnStatus: "none",
      returnedAt: "",
      returnNote: "",
      notes: data.notes.trim(),
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      pdfUrl: "",
      synced: false
    };
    state.transactions.unshift(transaction);
    items.forEach((item) => {
      const product = productById(item.productId);
      if (product) product.stock = Math.max(0, (Number(product.stock) || 0) - item.qty);
    });
    ui.cart = [];
    ui.lastTransactionId = transaction.id;
    ui.invoiceId = transaction.id;
    saveState();
    render();
    syncSaleAfterRender(transaction, createdCustomer);
  }

  async function syncSaleAfterRender(transaction, createdCustomer) {
    if (createdCustomer) {
      await pushToGas("saveCustomer", { customer: createdCustomer });
      logActivity("create_customer", `Pelanggan ${createdCustomer.name} dibuat dari kasir`, createdCustomer.phone || createdCustomer.id).catch(() => {});
    }
    logActivity("create_transaction", `Total ${money(transaction.total)} via ${transaction.paymentMethod}`, transaction.id, { total: transaction.total, paymentStatus: transaction.paymentStatus }).catch(() => {});
    const remote = await pushToGas("saveTransaction", { transaction });
    if (remote?.transactionId || remote?.pdfUrl) {
      transaction.synced = true;
      transaction.pdfUrl = remote.pdfUrl || transaction.pdfUrl;
      saveState();
      render();
    }
    const phone = transaction.customerSnapshot?.phone || customerById(transaction.customerId)?.phone || "";
    if (normalizeWa(phone) && !transaction.pdfUrl && backendUrl()) {
      ensureGasPdf(transaction, { silent: true, deferRender: true })
        .then((pdfUrl) => {
          if (!pdfUrl) return;
          saveState();
          render();
        })
        .catch(() => {});
    }
  }

  function nextInvoiceId() {
    const prefix = storeProfile().invoicePrefix || "INV";
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const count = tenantTransactions().filter((transaction) => transaction.id.startsWith(`${prefix}-${ymd}`)).length + 1;
    return `${prefix}-${ymd}-${String(count).padStart(4, "0")}`;
  }

  async function handleCustomer(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const customer = {
      id: id("cust"),
      tenantId: currentTenantId(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      notes: data.notes.trim(),
      createdAt: nowIso()
    };
    state.customers.push(customer);
    ui.selectedCustomerId = customer.id;
    saveState();
    form.reset();
    render();
    await pushToGas("saveCustomer", { customer });
    await logActivity("create_customer", `Pelanggan ${customer.name} ditambahkan`, customer.phone || customer.id);
  }

  async function handleCustomerEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const customer = customerById(data.id);
    if (!customer) return;
    Object.assign(customer, {
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      notes: data.notes.trim(),
      updatedAt: nowIso()
    });
    if (ui.posCustomerId === customer.id) ui.posCustomerQuery = customer.name;
    clearEditMode("customer");
    saveState();
    render();
    await pushToGas("saveCustomer", { customer });
    await logActivity("update_customer", `Pelanggan ${customer.name} diperbarui`, customer.phone || customer.id);
  }

  async function handleExpense(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const category = categoryById(data.subcategoryId || data.categoryId);
    const expense = {
      id: id("exp"),
      tenantId: currentTenantId(),
      date: new Date(data.date).toISOString(),
      name: data.name.trim(),
      flow: "expense",
      behavior: data.behavior || category?.behavior || "variable",
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      amount: Number(data.amount) || 0,
      notes: data.notes.trim()
    };
    state.expenses.unshift(expense);
    saveState();
    form.reset();
    render();
    await pushToGas("saveExpense", { expense });
    await logActivity("create_expense", `${expense.name} senilai ${money(expense.amount)}`, categoryLabel(expense.subcategoryId || expense.categoryId));
  }

  async function handleExpenseEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const expense = tenantExpenses().find((item) => item.id === data.id);
    if (!expense) return;
    const category = categoryById(data.subcategoryId || data.categoryId);
    Object.assign(expense, {
      date: new Date(data.date).toISOString(),
      name: data.name.trim(),
      flow: "expense",
      behavior: data.behavior || category?.behavior || "variable",
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      amount: Number(data.amount) || 0,
      notes: data.notes.trim(),
      updatedAt: nowIso()
    });
    clearEditMode("expense");
    saveState();
    render();
    await pushToGas("saveExpense", { expense });
    await logActivity("update_expense", `${expense.name} diperbarui menjadi ${money(expense.amount)}`, categoryLabel(expense.subcategoryId || expense.categoryId));
  }

  async function handleCategory(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const parent = data.parentId ? categoryById(data.parentId) : null;
    const category = {
      id: id("cat"),
      tenantId: currentTenantId(),
      name: data.name.trim(),
      flow: parent?.flow || data.flow,
      behavior: parent?.behavior || data.behavior,
      parentId: data.parentId
    };
    state.categories.push(category);
    saveState();
    form.reset();
    render();
    await pushToGas("saveCategory", { category });
    await logActivity("create_category", `Kategori ${category.name} ditambahkan`, category.flow === "income" ? "Pemasukan" : "Pengeluaran");
  }

  async function handleCategoryEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const category = categoryById(data.id);
    if (!category) return;
    if (data.parentId === category.id) {
      toast("Induk kategori tidak boleh dirinya sendiri.");
      return;
    }
    if (data.parentId && tenantCategories().some((item) => item.parentId === category.id)) {
      toast("Kategori yang sudah punya subkategori harus tetap menjadi kategori utama.");
      return;
    }
    Object.assign(category, {
      name: data.name.trim(),
      flow: data.flow === "expense" ? "expense" : "income",
      behavior: data.behavior === "fixed" ? "fixed" : "variable",
      parentId: data.parentId,
      updatedAt: nowIso()
    });
    if (!category.parentId) {
      tenantCategories()
        .filter((item) => item.parentId === category.id)
        .forEach((item) => {
          item.flow = category.flow;
          item.behavior = category.behavior;
          item.updatedAt = nowIso();
        });
    }
    clearEditMode("category");
    saveState();
    render();
    await pushToGas("saveCategory", { category });
    await logActivity("update_category", `Kategori ${category.name} diperbarui`, category.id);
  }

  async function handleProduct(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const product = {
      id: id("prd"),
      tenantId: currentTenantId(),
      sku: data.sku.trim(),
      name: data.name.trim(),
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      price: Number(data.price) || 0,
      cost: Number(data.cost) || 0,
      stock: Number(data.stock) || 0,
      active: true
    };
    state.products.push(product);
    saveState();
    form.reset();
    render();
    await pushToGas("saveProduct", { product });
    await logActivity("create_product", `Item ${product.name} ditambahkan dengan harga ${money(product.price)}`, product.sku || product.id);
  }

  async function handleProductEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const product = productById(data.id);
    if (!product) return;
    Object.assign(product, {
      sku: data.sku.trim(),
      name: data.name.trim(),
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      price: Number(data.price) || 0,
      cost: Number(data.cost) || 0,
      stock: Number(data.stock) || 0,
      active: data.active !== "false",
      updatedAt: nowIso()
    });
    ui.cart
      .filter((line) => line.productId === product.id)
      .forEach((line) => {
        line.name = product.name;
        line.sku = product.sku;
        line.categoryId = product.categoryId;
        line.subcategoryId = product.subcategoryId;
        line.price = Number(product.price) || 0;
        line.cost = Number(product.cost) || 0;
      });
    clearEditMode("product");
    saveState();
    render();
    await pushToGas("saveProduct", { product });
    await logActivity("update_product", `Item ${product.name} diperbarui`, product.sku || product.id);
  }

  async function handleUser(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const username = normalizeUsername(data.username);
    if (!username) {
      toast("Username hanya boleh huruf, angka, titik, strip, atau underscore.");
      return;
    }
    if (String(data.password || "").length < 6) {
      toast("Password minimal 6 karakter.");
      return;
    }
    if (state.users.map(normalizeUser).some((user) => user.username === username || String(user.email || "").toLowerCase() === `${username}@kasir.local`)) {
      toast("Username sudah dipakai.");
      return;
    }
    const user = normalizeUser({
      id: id("usr"),
      tenantId: currentTenantId(),
      name: data.name.trim(),
      username,
      email: `${username}@kasir.local`,
      role: "cashier",
      password: data.password,
      active: true,
      createdAt: nowIso(),
      createdBy: state.session.id
    });
    state.users.push(user);
    saveState();
    form.reset();
    render();
    await pushToGas("saveUser", { user });
    await logActivity("create_user", `Akun kasir ${user.name} dibuat`, user.username);
    toast("Akun kasir dibuat.");
  }

  async function handleUserEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const user = state.users.find((item) => item.id === data.id);
    if (!user || user.id === state.session.id) return;
    const username = normalizeUsername(data.username);
    if (!username) {
      toast("Username hanya boleh huruf, angka, titik, strip, atau underscore.");
      return;
    }
    const email = data.email.trim() || `${username}@kasir.local`;
    const duplicate = state.users.map(normalizeUser).some((item) => {
      if (item.id === user.id) return false;
      return item.username === username || String(item.email || "").toLowerCase() === email.toLowerCase();
    });
    if (duplicate) {
      toast("Username atau email sudah dipakai.");
      return;
    }
    if (data.password && String(data.password).length < 6) {
      toast("Password minimal 6 karakter.");
      return;
    }
    Object.assign(user, normalizeUser({
      ...user,
      name: data.name.trim(),
      username,
      email,
      role: data.role === "owner" ? "owner" : "cashier",
      active: data.active !== "false",
      password: data.password ? data.password : user.password,
      updatedAt: nowIso()
    }));
    clearEditMode("user");
    saveState();
    render();
    await pushToGas("saveUser", { user });
    await logActivity("update_user", `Akun ${user.name} diperbarui`, user.username || user.email);
  }

  async function handleTenant(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const code = normalizeUsername(data.code);
    const ownerUsername = normalizeUsername(data.ownerUsername);
    const ownerEmail = data.ownerEmail.trim().toLowerCase();
    if (!code || !ownerUsername) {
      toast("Kode tenant dan username owner wajib valid.");
      return;
    }
    if (String(data.ownerPassword || "").length < 6) {
      toast("Password owner minimal 6 karakter.");
      return;
    }
    if (state.tenants.some((tenant) => tenant.code === code)) {
      toast("Kode tenant sudah dipakai.");
      return;
    }
    if (state.users.map(normalizeUser).some((user) => user.username === ownerUsername || String(user.email || "").toLowerCase() === ownerEmail)) {
      toast("Username atau email owner sudah dipakai.");
      return;
    }
    const tenant = normalizeTenant({
      id: id("tenant"),
      code,
      storeName: data.storeName.trim(),
      companyName: data.companyName.trim() || data.storeName.trim(),
      ownerName: data.ownerName.trim(),
      ownerEmail,
      storePhone: data.storePhone.trim(),
      storeAddress: data.storeAddress.trim(),
      companyEmail: data.companyEmail.trim(),
      invoicePrefix: "INV",
      logoUrl: normalizeCompanyLogoUrl(data.logoUrl),
      logoSize: 54,
      logoOffsetX: 0,
      status: data.status,
      storageLimitMb: Number(data.storageLimitMb) || 100,
      notes: data.notes.trim(),
      createdAt: nowIso()
    });
    const owner = normalizeUser({
      id: id("usr"),
      tenantId: tenant.id,
      name: tenant.ownerName,
      username: ownerUsername,
      email: ownerEmail,
      role: "owner",
      password: data.ownerPassword,
      active: true,
      createdAt: nowIso(),
      createdBy: state.session.id
    });
    state.tenants.push(tenant);
    state.users.push(owner);
    ensureTenantStarterData(tenant.id);
    ui.platformTenantId = tenant.id;
    ui.editingTenantId = "";
    saveState();
    form.reset();
    render();
    await pushToGas("saveTenant", { tenant }, true);
    await pushToGas("saveUser", { user: owner }, true);
    await logActivity("create_tenant", `Tenant ${tenant.storeName} dibuat`, tenant.code, { tenantId: tenant.id, status: tenant.status });
    toast("Toko SaaS dan akun owner berhasil dibuat.");
  }

  async function handleTenantEdit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const tenant = tenantById(data.id);
    if (!tenant) return;
    const code = normalizeUsername(data.code);
    if (!code) {
      toast("Kode tenant wajib valid.");
      return;
    }
    if (state.tenants.some((item) => item.id !== tenant.id && item.code === code)) {
      toast("Kode tenant sudah dipakai.");
      return;
    }
    Object.assign(tenant, normalizeTenant({
      ...tenant,
      code,
      storeName: data.storeName.trim(),
      companyName: data.companyName.trim() || data.storeName.trim(),
      ownerName: data.ownerName.trim(),
      ownerEmail: data.ownerEmail.trim().toLowerCase(),
      storePhone: data.storePhone.trim(),
      storeAddress: data.storeAddress.trim(),
      companyEmail: data.companyEmail.trim(),
      invoicePrefix: data.invoicePrefix.trim() || "INV",
      logoUrl: normalizeCompanyLogoUrl(data.logoUrl),
      logoSize: Number(data.logoSize) || 54,
      logoOffsetX: Number(data.logoOffsetX) || 0,
      status: data.status,
      storageLimitMb: Number(data.storageLimitMb) || 100,
      notes: data.notes.trim(),
      updatedAt: nowIso()
    }));
    const owner = state.users.find((user) => user.tenantId === tenant.id && user.role === "owner");
    if (owner) {
      owner.name = tenant.ownerName || owner.name;
      owner.email = tenant.ownerEmail || owner.email;
      owner.updatedAt = nowIso();
    }
    ui.editingTenantId = "";
    saveState();
    render();
    await pushToGas("saveTenant", { tenant }, true);
    if (owner) await pushToGas("saveUser", { user: owner }, true);
    await logActivity("update_tenant", `Tenant ${tenant.storeName} diperbarui`, tenant.code, { tenantId: tenant.id, status: tenant.status });
  }

  async function handlePlatformSettings(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    state.platformSettings = {
      ...state.platformSettings,
      appName: data.appName.trim() || "Kasir SaaS",
      supportWa: data.supportWa.trim(),
      apiUrl: data.apiUrl.trim(),
      updatedAt: nowIso()
    };
    saveState();
    render();
    await logActivity("update_platform_settings", "Pengaturan backend pusat diperbarui", state.platformSettings.appName);
    toast("Pengaturan SaaS disimpan.");
  }

  async function handleSettings(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const tenant = currentTenant();
    state.settings = {
      ...state.settings,
      storeName: data.storeName.trim(),
      companyName: data.companyName.trim(),
      storePhone: data.storePhone.trim(),
      storeAddress: data.storeAddress.trim(),
      companyEmail: data.companyEmail.trim(),
      invoicePrefix: data.invoicePrefix.trim() || "INV",
      logoUrl: normalizeCompanyLogoUrl(data.logoUrl),
      logoSize: Number(data.logoSize) || 54,
      logoOffsetX: Number(data.logoOffsetX) || 0,
      apiUrl: ""
    };
    Object.assign(tenant, {
      storeName: state.settings.storeName,
      companyName: state.settings.companyName,
      storePhone: state.settings.storePhone,
      storeAddress: state.settings.storeAddress,
      companyEmail: state.settings.companyEmail,
      invoicePrefix: state.settings.invoicePrefix,
      logoUrl: state.settings.logoUrl,
      logoSize: state.settings.logoSize,
      logoOffsetX: state.settings.logoOffsetX,
      updatedAt: nowIso()
    });
    saveState();
    toast("Pengaturan disimpan.");
    render();
    await logActivity("update_settings", "Profil toko diperbarui", state.settings.storeName);
  }

  async function editCustomer(customerId) {
    const customer = customerById(customerId);
    if (!customer) return;
    const name = promptText("Nama pelanggan", customer.name, true);
    if (name === null) return;
    const phone = promptText("Kontak WA", customer.phone || "");
    if (phone === null) return;
    const address = promptText("Alamat", customer.address || "");
    if (address === null) return;
    const notes = promptText("Keterangan", customer.notes || "");
    if (notes === null) return;
    Object.assign(customer, { name, phone, address, notes, updatedAt: nowIso() });
    saveState();
    render();
    await pushToGas("saveCustomer", { customer });
    await logActivity("update_customer", `Pelanggan ${name} diperbarui`, phone || customer.id);
  }

  async function deleteCustomer(customerId) {
    const customer = customerById(customerId);
    if (!customer || isWalkinCustomer(customer)) return;
    if (!confirmAction(`Hapus pelanggan ${customer.name}? Riwayat transaksi lama tetap menyimpan snapshot nama pelanggan.`)) return;
    state.customers = state.customers.filter((item) => !(item.id === customerId && belongsToTenant(item)));
    if (ui.selectedCustomerId === customerId) ui.selectedCustomerId = tenantCustomers()[0]?.id || "";
    if (ui.posCustomerId === customerId) ui.posCustomerId = tenantCustomers()[0]?.id || "";
    if (ui.editingCustomerId === customerId) ui.editingCustomerId = "";
    saveState();
    render();
    await pushToGas("deleteCustomer", { id: customerId });
    await logActivity("delete_customer", `Pelanggan ${customer.name} dihapus`, customer.phone || customer.id);
  }

  async function editExpense(expenseId) {
    const expense = tenantExpenses().find((item) => item.id === expenseId);
    if (!expense) return;
    const date = promptText("Tanggal pengeluaran (YYYY-MM-DD)", toDateInput(new Date(expense.date)), true);
    if (date === null) return;
    const name = promptText("Nama pengeluaran", expense.name, true);
    if (name === null) return;
    const amount = promptNumber("Nominal", expense.amount);
    if (amount === null) return;
    const behavior = promptText("Jenis biaya: fixed atau variable", expense.behavior || "variable", true);
    if (behavior === null) return;
    const notes = promptText("Catatan", expense.notes || "");
    if (notes === null) return;
    Object.assign(expense, {
      date: new Date(date).toISOString(),
      name,
      amount,
      behavior: behavior === "fixed" ? "fixed" : "variable",
      notes
    });
    saveState();
    render();
    await pushToGas("saveExpense", { expense });
    await logActivity("update_expense", `${name} diperbarui menjadi ${money(amount)}`, expense.id);
  }

  async function editCategory(categoryId) {
    const category = categoryById(categoryId);
    if (!category) return;
    const name = promptText("Nama kategori", category.name, true);
    if (name === null) return;
    const flow = promptText("Arus: income atau expense", category.flow, true);
    if (flow === null) return;
    const behavior = promptText("Sifat: fixed atau variable", category.behavior, true);
    if (behavior === null) return;
    const parentId = promptText("ID induk kategori (kosongkan untuk kategori utama)", category.parentId || "");
    if (parentId === null) return;
    Object.assign(category, {
      name,
      flow: flow === "expense" ? "expense" : "income",
      behavior: behavior === "fixed" ? "fixed" : "variable",
      parentId,
      updatedAt: nowIso()
    });
    saveState();
    render();
    await pushToGas("saveCategory", { category });
    await logActivity("update_category", `Kategori ${name} diperbarui`, category.id);
  }

  async function deleteCategory(categoryId) {
    const category = categoryById(categoryId);
    if (!category) return;
    const used = tenantCategories().some((item) => item.parentId === categoryId) ||
      tenantProducts().some((product) => product.categoryId === categoryId || product.subcategoryId === categoryId) ||
      tenantExpenses().some((expense) => expense.categoryId === categoryId || expense.subcategoryId === categoryId);
    if (used) {
      toast("Kategori masih dipakai oleh subkategori, item, atau pengeluaran.");
      return;
    }
    if (!confirmAction(`Hapus kategori ${category.name}?`)) return;
    state.categories = state.categories.filter((item) => !(item.id === categoryId && belongsToTenant(item)));
    if (ui.selectedCategoryId === categoryId) ui.selectedCategoryId = tenantCategories()[0]?.id || "";
    if (ui.editingCategoryId === categoryId) ui.editingCategoryId = "";
    saveState();
    render();
    await pushToGas("deleteCategory", { id: categoryId });
    await logActivity("delete_category", `Kategori ${category.name} dihapus`, category.id);
  }

  async function editProduct(productId) {
    const product = productById(productId);
    if (!product) return;
    const name = promptText("Nama item", product.name, true);
    if (name === null) return;
    const sku = promptText("SKU", product.sku || "");
    if (sku === null) return;
    const price = promptNumber("Harga jual", product.price);
    if (price === null) return;
    const cost = promptNumber("Harga modal", product.cost);
    if (cost === null) return;
    const stock = promptNumber("Stok", product.stock);
    if (stock === null) return;
    const categoryId = promptText("ID kategori", product.categoryId || "cat-sales", true);
    if (categoryId === null) return;
    const subcategoryId = promptText("ID subkategori (boleh kosong)", product.subcategoryId || "");
    if (subcategoryId === null) return;
    const active = promptText("Status aktif? yes/no", product.active === false ? "no" : "yes", true);
    if (active === null) return;
    Object.assign(product, {
      name,
      sku,
      price,
      cost,
      stock,
      categoryId,
      subcategoryId,
      active: active.toLowerCase() !== "no",
      updatedAt: nowIso()
    });
    saveState();
    render();
    await pushToGas("saveProduct", { product });
    await logActivity("update_product", `Item ${name} diperbarui`, sku || product.id);
  }

  async function deleteProduct(productId) {
    const product = productById(productId);
    if (!product) return;
    if (!confirmAction(`Hapus item ${product.name}? Riwayat transaksi lama tetap menyimpan snapshot item.`)) return;
    state.products = state.products.filter((item) => !(item.id === productId && belongsToTenant(item)));
    if (ui.selectedProductId === productId) ui.selectedProductId = tenantProducts()[0]?.id || "";
    if (ui.editingProductId === productId) ui.editingProductId = "";
    ui.cart = ui.cart.filter((line) => line.productId !== productId);
    saveState();
    render();
    await pushToGas("deleteProduct", { id: productId });
    await logActivity("delete_product", `Item ${product.name} dihapus`, product.sku || product.id);
  }

  async function editUser(userId) {
    const user = state.users.find((item) => item.id === userId && item.tenantId === currentTenantId());
    if (!user || user.role === "owner" || user.id === state.session.id) return;
    const name = promptText("Nama kasir", user.name, true);
    if (name === null) return;
    const username = normalizeUsername(promptText("Username", user.username, true));
    if (!username) return;
    const duplicate = state.users.map(normalizeUser).some((item) => item.id !== user.id && item.username === username);
    if (duplicate) {
      toast("Username sudah dipakai.");
      return;
    }
    Object.assign(user, { name, username, email: `${username}@kasir.local`, updatedAt: nowIso() });
    saveState();
    render();
    await pushToGas("saveUser", { user });
    await logActivity("update_user", `Akun kasir ${name} diperbarui`, username);
  }

  async function resetUserPassword(userId) {
    const user = state.users.find((item) => item.id === userId && item.tenantId === currentTenantId());
    if (!user || user.role === "owner" || user.id === state.session.id) return;
    const password = promptText(`Password baru untuk ${user.name}`, "", true);
    if (password === null) return;
    if (password.length < 6) {
      toast("Password minimal 6 karakter.");
      return;
    }
    user.password = password;
    user.updatedAt = nowIso();
    saveState();
    render();
    await pushToGas("saveUser", { user });
    await logActivity("reset_password", `Password akun ${user.name} direset`, user.username || user.email);
    toast("Password kasir berhasil direset.");
  }

  async function deleteUser(userId) {
    const user = state.users.find((item) => item.id === userId && item.tenantId === currentTenantId());
    if (!user || user.role === "owner" || user.id === state.session.id) return;
    if (!confirmAction(`Hapus akun kasir ${user.name}?`)) return;
    state.users = state.users.filter((item) => !(item.id === userId && item.tenantId === currentTenantId()));
    if (ui.selectedUserId === userId) ui.selectedUserId = tenantUsers().find((item) => item.role !== "owner" && item.id !== state.session.id)?.id || "";
    if (ui.editingUserId === userId) ui.editingUserId = "";
    saveState();
    render();
    await pushToGas("deleteUser", { id: userId });
    await logActivity("delete_user", `Akun kasir ${user.name} dihapus`, user.username || user.email);
  }

  async function createGasPdf(transactionId) {
    const transaction = tenantTransactions().find((item) => item.id === transactionId);
    if (!transaction) return;
    const pdfUrl = await ensureGasPdf(transaction);
    if (pdfUrl) render();
  }

  async function ensureGasPdf(transaction, options = {}) {
    if (transaction.pdfUrl) return transaction.pdfUrl;
    if (!backendUrl()) {
      if (!options.silent) toast("Backend pusat belum aktif. Hubungi admin SaaS.");
      return "";
    }
    const requestKey = transaction.id;
    if (pendingInvoicePdfs.has(requestKey)) return pendingInvoicePdfs.get(requestKey);
    const request = (async () => {
      try {
        const result = await api("createInvoicePdf", { transaction, settings: storeProfile(transaction.tenantId || currentTenantId()) });
        transaction.pdfUrl = result.pdfUrl || transaction.pdfUrl;
        transaction.synced = true;
        saveState();
        logActivity("create_invoice_pdf", "PDF invoice dibuat di Drive", transaction.id).catch(() => {});
        if (!options.silent) toast("PDF dibuat.");
        if (!options.deferRender) render();
        return transaction.pdfUrl || "";
      } catch (error) {
        if (!options.silent) toast("PDF belum berhasil dibuat.");
        return "";
      } finally {
        pendingInvoicePdfs.delete(requestKey);
      }
    })();
    pendingInvoicePdfs.set(requestKey, request);
    return request;
  }

  function refreshRemoteDataAfterLogin() {
    if (!backendUrl() || !state.session?.token) return;
    loadRemoteData()
      .then(() => {
        saveState();
        resetTenantSelections();
        render();
      })
      .catch(() => {
        toast("Login berhasil. Sinkron data terbaru belum selesai.");
      });
    }

  async function api(action, payload = {}, includeToken = true) {
    const company = state.platformSettings?.company || {};
    const tenant = currentTenant();
    const response = await fetchWithTimeout(backendUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action,
        token: includeToken ? state.session?.token : "",
        companyId: company.companyId || tenant.companyId || "",
        companySlug: company.companySlug || tenant.companySlug || tenant.slug || appSlug(),
        companyName: company.companyName || tenant.companyName || tenant.storeName || "",
        storeName: company.storeName || tenant.storeName || "",
        logoUrl: company.logoUrl || tenant.logoUrl || "",
        companyApiUrl: company.companyApiUrl || tenant.companyApiUrl || tenant.gasUrl || backendUrl(),
        slug: company.companySlug || tenant.companySlug || tenant.slug || appSlug(),
        tenantId: state.session?.tenantId || currentTenantId(),
        ...payload
      })
    }, action.indexOf("login") === 0 ? 20000 : 15000);
    const data = await response.json();
    if (!response.ok) throw new Error("Backend request failed");
    return unwrapApiResult(data, "Backend request failed");
  }

  async function loadRemoteData() {
    const remote = await api("bootstrap");
    const tenantId = state.session?.tenantId || currentTenantId();
    if (Array.isArray(remote.tenants)) state.tenants = remote.tenants.map(normalizeTenant);
    if (Array.isArray(remote.categories)) state.categories = remote.categories.map((item) => ({ ...item, tenantId: item.tenantId || tenantId }));
    if (Array.isArray(remote.products)) state.products = remote.products.map((item) => ({ ...item, tenantId: item.tenantId || tenantId }));
    if (Array.isArray(remote.customers)) state.customers = remote.customers.map((item) => ({ ...item, tenantId: item.tenantId || tenantId }));
    if (Array.isArray(remote.users)) state.users = remote.users.map((item) => normalizeUser({ ...item, tenantId: item.tenantId || tenantId }));
    if (Array.isArray(remote.activityLogs)) state.activityLogs = remote.activityLogs.map((item) => ({ ...item, tenantId: item.tenantId || tenantId })).sort((a, b) => new Date(b.at) - new Date(a.at));
    if (Array.isArray(remote.transactions)) state.transactions = remote.transactions.map((item) => ({ ...item, tenantId: item.tenantId || tenantId })).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (Array.isArray(remote.expenses)) state.expenses = remote.expenses.map((item) => ({ ...item, tenantId: item.tenantId || tenantId })).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!tenantCustomers().some((customer) => customer.id === ui.posCustomerId)) {
      ui.posCustomerId = tenantCustomers()[0]?.id || "";
    }
    if (!tenantCustomers().some((customer) => customer.id === ui.selectedCustomerId)) {
      ui.selectedCustomerId = tenantCustomers()[0]?.id || "";
    }
  }

  async function pushToGas(action, payload, silent = false) {
    if (!backendUrl() || !state.session?.token) return null;
    try {
      return await api(action, payload);
    } catch (error) {
      if (!silent) toast("Tersimpan lokal. Sinkron backend belum berhasil.");
      return null;
    }
  }

  async function logActivity(action, detail = "", target = "", metadata = {}) {
    if (!state.session) return null;
    const log = {
      id: id("log"),
      at: nowIso(),
      actorId: state.session.id,
      actorName: state.session.name,
      actorUsername: state.session.username || "",
      actorRole: state.session.role,
      tenantId: state.session.role === "platform" ? (ui.platformTenantId || "") : currentTenantId(),
      action,
      target,
      detail,
      metadata
    };
    state.activityLogs = [log, ...(state.activityLogs || [])].slice(0, 500);
    saveState();
    await pushToGas("saveActivityLog", { log }, true);
    return log;
  }

  async function markTransactionReturned(transactionId) {
    const transaction = tenantTransactions().find((item) => item.id === transactionId);
    if (!transaction || transaction.returnStatus === "returned") return;
    const note = window.prompt("Catatan return", "Return / retur marketplace") || "";
    transaction.returnStatus = "returned";
    transaction.paymentStatus = "returned";
    transaction.returnedAt = nowIso();
    transaction.returnNote = note;
    transaction.items.forEach((item) => {
      const product = productById(item.productId);
      if (product) product.stock = (Number(product.stock) || 0) + (Number(item.qty) || 0);
    });
    saveState();
    toast("Transaksi ditandai return dan stok dikembalikan.");
    render();
    await pushToGas("markReturn", { transactionId, returnStatus: transaction.returnStatus, returnedAt: transaction.returnedAt, returnNote: note, transaction });
    await logActivity("mark_return", note || "Transaksi ditandai return", transaction.id, { total: transaction.total });
  }

  async function settleTransaction(transactionId) {
    const transaction = tenantTransactions().find((item) => item.id === transactionId);
    if (!transaction || transaction.returnStatus === "returned") return;
    transaction.paymentStatus = "paid";
    transaction.settledAt = nowIso();
    saveState();
    toast("Pembayaran tunda ditandai lunas.");
    render();
    await pushToGas("saveTransaction", { transaction });
    await logActivity("settle_payment", `Pembayaran ${transaction.paymentMethod} ditandai lunas`, transaction.id, { total: transaction.total });
  }

  async function toggleUserStatus(userId) {
    const user = state.users.find((item) => item.id === userId && item.tenantId === currentTenantId());
    if (!user || user.role === "owner" || user.id === state.session.id) return;
    user.active = user.active === false;
    saveState();
    render();
    await pushToGas("saveUser", { user });
    await logActivity("toggle_user", `Akun ${user.name} ${user.active ? "diaktifkan" : "dinonaktifkan"}`, user.username || user.email);
  }

  async function deleteExpense(expenseId) {
    const expense = tenantExpenses().find((item) => item.id === expenseId);
    if (!expense) return;
    if (!confirmAction(`Hapus pengeluaran ${expense.name}?`)) return;
    state.expenses = state.expenses.filter((expense) => !(expense.id === expenseId && belongsToTenant(expense)));
    if (ui.selectedExpenseId === expenseId) ui.selectedExpenseId = tenantExpenses()[0]?.id || "";
    if (ui.editingExpenseId === expenseId) ui.editingExpenseId = "";
    saveState();
    render();
    await pushToGas("deleteExpense", { id: expenseId });
    await logActivity("delete_expense", `Pengeluaran ${expense.name} dihapus`, money(expense.amount));
  }

  function toast(message) {
    toastEl.innerHTML = `<div class="toast">${esc(message)}</div>`;
    clearTimeout(toastEl.timer);
    toastEl.timer = setTimeout(() => {
      toastEl.innerHTML = "";
    }, 3200);
  }

  app.addEventListener("submit", async (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    if (form.id === "login-form") await handleLogin(form);
    if (form.id === "checkout-form") await handleCheckout(form);
    if (form.id === "customer-form") await handleCustomer(form);
    if (form.id === "customer-edit-form") await handleCustomerEdit(form);
    if (form.id === "expense-form") await handleExpense(form);
    if (form.id === "expense-edit-form") await handleExpenseEdit(form);
    if (form.id === "category-form") await handleCategory(form);
    if (form.id === "category-edit-form") await handleCategoryEdit(form);
    if (form.id === "product-form") await handleProduct(form);
    if (form.id === "product-edit-form") await handleProductEdit(form);
    if (form.id === "user-form") await handleUser(form);
    if (form.id === "user-edit-form") await handleUserEdit(form);
    if (form.id === "tenant-form") await handleTenant(form);
    if (form.id === "tenant-edit-form") await handleTenantEdit(form);
    if (form.id === "platform-settings-form") await handlePlatformSettings(form);
    if (form.id === "settings-form") await handleSettings(form);
  });

  app.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.dataset.loginRole) {
      ui.loginRole = target.dataset.loginRole === "cashier" ? "cashier" : "owner";
      render();
      return;
    }
    if (target.dataset.demoRole) demoLogin(target.dataset.demoRole);
    if (target.dataset.toggleNav !== undefined) {
      ui.navOpen = !ui.navOpen;
      render();
    }
    if (target.dataset.tab) {
      ui.tab = target.dataset.tab;
      ui.navOpen = false;
      render();
    }
    if (target.dataset.logout !== undefined) {
      await logActivity("logout", "Keluar dari aplikasi", state.session?.username || state.session?.email || "");
      state.session = null;
      saveState();
      render();
    }
    if (target.dataset.addProduct) addProductToCart(target.dataset.addProduct);
    if (target.dataset.cartPlus) changeCartQty(target.dataset.cartPlus, 1);
    if (target.dataset.cartMinus) changeCartQty(target.dataset.cartMinus, -1);
    if (target.dataset.cartRemove) {
      ui.cart = ui.cart.filter((line) => line.productId !== target.dataset.cartRemove);
      render();
    }
    if (target.dataset.posCustomer) {
      ui.posCustomerId = target.dataset.posCustomer;
      const customer = customerById(ui.posCustomerId);
      ui.posCustomerQuery = customer ? customer.name : "";
      render();
    }
    if (target.dataset.selectCustomer) {
      ui.selectedCustomerId = target.dataset.selectCustomer;
      if (ui.editingCustomerId && ui.editingCustomerId !== ui.selectedCustomerId) ui.editingCustomerId = "";
      render();
    }
    if (target.dataset.selectExpense) {
      ui.selectedExpenseId = target.dataset.selectExpense;
      if (ui.editingExpenseId && ui.editingExpenseId !== ui.selectedExpenseId) ui.editingExpenseId = "";
      render();
    }
    if (target.dataset.selectCategory) {
      ui.selectedCategoryId = target.dataset.selectCategory;
      if (ui.editingCategoryId && ui.editingCategoryId !== ui.selectedCategoryId) ui.editingCategoryId = "";
      render();
    }
    if (target.dataset.selectProduct) {
      ui.selectedProductId = target.dataset.selectProduct;
      if (ui.editingProductId && ui.editingProductId !== ui.selectedProductId) ui.editingProductId = "";
      render();
    }
    if (target.dataset.selectUser) {
      ui.selectedUserId = target.dataset.selectUser;
      if (ui.editingUserId && ui.editingUserId !== ui.selectedUserId) ui.editingUserId = "";
      render();
    }
    if (target.dataset.selectTenant) {
      ui.platformTenantId = target.dataset.selectTenant;
      if (ui.editingTenantId && ui.editingTenantId !== ui.platformTenantId) ui.editingTenantId = "";
      render();
    }
    if (target.dataset.cancelEdit) {
      clearEditMode(target.dataset.cancelEdit);
      render();
    }
    if (target.dataset.exportReport) exportReport(target.dataset.exportReport);
    if (target.dataset.exportCustomers) exportCustomers(target.dataset.exportCustomers);
    if (target.dataset.openInvoice) {
      ui.invoiceId = target.dataset.openInvoice;
      render();
    }
    if (target.dataset.closeInvoice !== undefined) {
      ui.invoiceId = "";
      render();
    }
    if (target.dataset.printInvoice !== undefined) window.print();
    if (target.dataset.createPdf) await createGasPdf(target.dataset.createPdf);
    if (target.dataset.sendInvoiceWa) await sendInvoiceWa(target.dataset.sendInvoiceWa);
    if (target.dataset.editCustomer) {
      clearEditMode();
      ui.editingCustomerId = target.dataset.editCustomer;
      render();
    }
    if (target.dataset.deleteCustomer) await deleteCustomer(target.dataset.deleteCustomer);
    if (target.dataset.editExpense) {
      clearEditMode();
      ui.editingExpenseId = target.dataset.editExpense;
      render();
    }
    if (target.dataset.deleteExpense) await deleteExpense(target.dataset.deleteExpense);
    if (target.dataset.editCategory) {
      clearEditMode();
      ui.editingCategoryId = target.dataset.editCategory;
      render();
    }
    if (target.dataset.deleteCategory) await deleteCategory(target.dataset.deleteCategory);
    if (target.dataset.editProduct) {
      clearEditMode();
      ui.editingProductId = target.dataset.editProduct;
      render();
    }
    if (target.dataset.deleteProduct) await deleteProduct(target.dataset.deleteProduct);
    if (target.dataset.returnTransaction) await markTransactionReturned(target.dataset.returnTransaction);
    if (target.dataset.settleTransaction) await settleTransaction(target.dataset.settleTransaction);
    if (target.dataset.editUser) {
      clearEditMode();
      ui.editingUserId = target.dataset.editUser;
      render();
    }
    if (target.dataset.editTenant) {
      clearEditMode();
      ui.editingTenantId = target.dataset.editTenant;
      render();
    }
    if (target.dataset.resetUserPassword) await resetUserPassword(target.dataset.resetUserPassword);
    if (target.dataset.deleteUser) await deleteUser(target.dataset.deleteUser);
    if (target.dataset.toggleUser) await toggleUserStatus(target.dataset.toggleUser);
  });

  app.addEventListener("change", async (event) => {
    const target = event.target;
    if (target.dataset.logoUpload !== undefined && target.files?.[0]) {
      try {
        const logoUrl = await fileToDataUrl(target.files[0]);
        const tenant = currentTenant();
        tenant.logoUrl = logoUrl;
        state.settings.logoUrl = logoUrl;
        saveState();
        toast("Logo diunggah. Klik Simpan Pengaturan untuk menyimpan ukuran dan posisi.");
        render();
      } catch (error) {
        toast("Logo belum berhasil dibaca.");
      }
      return;
    }
    if (!target.dataset.filter) return;
    ui[target.dataset.filter] = target.value;
    renderContent(inputSnapshot(target));
  });

  app.addEventListener("input", (event) => {
    const target = event.target;
    if (target.closest("#login-form")) {
      if (target.name === "email") ui.loginEmail = target.value;
      if (target.name === "password") ui.loginPassword = target.value;
      return;
    }
    if (!target.dataset.filter || target.tagName === "SELECT" || target.type === "date") return;
    ui[target.dataset.filter] = target.value;
    if (scheduleLightFilterRender(target.dataset.filter)) return;
    scheduleFilterRender(target);
  });

  window.addEventListener("hashchange", () => {
    const tab = (location.hash || "#pos").replace("#", "");
    if (tab && tab !== ui.tab) {
      ui.tab = tab;
      render();
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js?v=20260722-17").then((registration) => {
      registration.update();
    }).catch(() => {});
  }

  async function boot() {
    if (hasTenantSlug() && state.session && !state.session.token) {
      state.session = null;
      saveState();
    }
    const shouldResolveCompany = hasTenantSlug() && !isDemoSlug() && centerApiUrl_();
    if (shouldResolveCompany) {
      const cached = applyCachedCompanyConfig();
      ui.centerResolving = !cached;
      centerStatusMessage = cached ? "Koneksi server aktif" : "Menghubungkan Data Center...";
    }
    render();
    if (shouldResolveCompany) {
      resolveCompanyFromCenter().then(() => {
        if (hasTenantSlug() && (!backendUrl() || !state.session?.token)) {
          state.session = null;
          saveState();
        }
        if (state.session) render();
        else if (!updateLoginStatus()) render();
      });
      return;
    }
    if (hasTenantSlug() && (!backendUrl() || !state.session?.token)) {
      state.session = null;
      saveState();
      render();
    }
  }

  boot();
})();
