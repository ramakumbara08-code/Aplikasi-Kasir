(function () {
  window.KASIR_DEMO_STATE = function createKasirDemoState() {
    const tenantId = "tenant-demo";
    const now = new Date();
    const iso = (daysAgo) => {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString();
    };

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
      { id: "sub-utility", tenantId, name: "Listrik dan Internet", flow: "expense", behavior: "fixed", parentId: "cat-fixed-expense" },
      { id: "sub-cogs", tenantId, name: "Bahan Baku", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" },
      { id: "sub-packaging", tenantId, name: "Kemasan", flow: "expense", behavior: "variable", parentId: "cat-variable-expense" },
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
      { id: "cust-walkin", tenantId, isWalkin: true, name: "Pelanggan Umum", phone: "", address: "", notes: "Transaksi tanpa data pelanggan.", createdAt: iso(60), updatedAt: iso(10) },
      { id: "cust-maya", tenantId, name: "Maya Lestari", phone: "081234567890", address: "Jl. Mawar 18, Makassar", notes: "Suka promo paket minuman.", createdAt: iso(45), updatedAt: iso(2) },
      { id: "cust-andi", tenantId, name: "Andi Saputra", phone: "082198765432", address: "Jl. Veteran Utara 9", notes: "Sering beli untuk kantor.", createdAt: iso(30), updatedAt: iso(8) },
      { id: "cust-riska", tenantId, name: "Riska Putri", phone: "0812000001", address: "Jl. Boulevard Panakkukang", notes: "Follow up broadcast promo akhir pekan.", createdAt: iso(12), updatedAt: iso(1) }
    ];

    const productById = Object.fromEntries(products.map((product) => [product.id, product]));
    const customerById = Object.fromEntries(customers.map((customer) => [customer.id, customer]));
    const line = (productId, qty) => {
      const product = productById[productId];
      return {
        productId,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        qty,
        price: product.price,
        cost: product.cost,
        total: qty * product.price
      };
    };
    const transaction = (id, daysAgo, customerId, items, paymentMethod, cashierName, paymentStatus, returnStatus, notes) => {
      const customer = customerById[customerId] || customerById["cust-walkin"];
      const subtotal = items.reduce((total, item) => total + item.total, 0);
      return {
        id,
        tenantId,
        date: iso(daysAgo),
        customerId: customer.id,
        customerSnapshot: { name: customer.name, phone: customer.phone, address: customer.address },
        cashierName,
        paymentMethod,
        paymentStatus: paymentStatus || "paid",
        returnStatus: returnStatus || "none",
        returnedAt: returnStatus === "returned" ? iso(daysAgo - 1) : "",
        returnNote: returnStatus === "returned" ? "Return marketplace demo" : "",
        notes: notes || "",
        items,
        subtotal,
        discount: 0,
        total: subtotal,
        pdfUrl: "",
        createdAt: iso(daysAgo),
        updatedAt: iso(daysAgo)
      };
    };

    return {
      version: 2,
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
          notes: "Tenant demo berasal dari demo.js.",
          createdAt: iso(60),
          updatedAt: iso(1)
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
        { id: "usr-platform", name: "Platform Admin", username: "admin", email: "admin@kasir.local", role: "platform", password: "admin123", active: true, createdAt: iso(60) },
        { id: "usr-owner", tenantId, name: "Owner", username: "owner", email: "owner@kasir.local", role: "owner", password: "owner123", active: true, createdAt: iso(60) },
        { id: "usr-cashier", tenantId, name: "Karyawan", username: "kasir", email: "kasir@kasir.local", role: "cashier", password: "kasir123", active: true, createdAt: iso(60) }
      ],
      categories,
      products,
      customers,
      transactions: [
        transaction("INV-1001", 12, "cust-maya", [line("prd-kopi-susu", 2), line("prd-roti", 1)], "QRIS", "Rina"),
        transaction("INV-1002", 8, "cust-andi", [line("prd-ricebox", 4), line("prd-matcha", 3)], "Transfer", "Budi"),
        transaction("INV-1003", 3, "cust-maya", [line("prd-tumbler", 1), line("prd-kopi-susu", 1)], "Tunai", "Rina"),
        transaction("INV-1004", 2, "cust-riska", [line("prd-matcha", 2), line("prd-roti", 2)], "Shopee", "Rina", "pending", "none", "Pembayaran tunda marketplace."),
        transaction("INV-1005", 1, "cust-andi", [line("prd-ricebox", 1)], "TikTok Shop", "Budi", "returned", "returned", "Retur demo.")
      ],
      expenses: [
        { id: "exp-001", tenantId, date: iso(10), name: "Sewa kios bulanan", flow: "expense", behavior: "fixed", categoryId: "cat-fixed-expense", subcategoryId: "sub-rent", amount: 2500000, notes: "Bulan berjalan", createdAt: iso(10), updatedAt: iso(10) },
        { id: "exp-002", tenantId, date: iso(5), name: "Belanja bahan baku", flow: "expense", behavior: "variable", categoryId: "cat-variable-expense", subcategoryId: "sub-cogs", amount: 740000, notes: "Kopi, susu, gula aren", createdAt: iso(5), updatedAt: iso(5) },
        { id: "exp-003", tenantId, date: iso(2), name: "Kemasan takeaway", flow: "expense", behavior: "variable", categoryId: "cat-variable-expense", subcategoryId: "sub-packaging", amount: 260000, notes: "", createdAt: iso(2), updatedAt: iso(2) },
        { id: "exp-004", tenantId, date: iso(1), name: "Iklan promo marketplace", flow: "expense", behavior: "variable", categoryId: "cat-variable-expense", subcategoryId: "sub-marketing", amount: 150000, notes: "Boost Shopee dan TikTok Shop", createdAt: iso(1), updatedAt: iso(1) }
      ],
      activityLogs: [
        { id: "log-demo-1", at: iso(1), actorId: "usr-owner", actorName: "Owner", actorUsername: "owner", actorRole: "owner", tenantId, action: "login", target: "owner", detail: "Login demo dari demo.js", metadata: {} },
        { id: "log-demo-2", at: iso(1), actorId: "usr-cashier", actorName: "Karyawan", actorUsername: "kasir", actorRole: "cashier", tenantId, action: "saveTransaction", target: "INV-1004", detail: "Input penjualan marketplace tunda", metadata: { paymentMethod: "Shopee" } },
        { id: "log-demo-3", at: iso(0), actorId: "usr-owner", actorName: "Owner", actorUsername: "owner", actorRole: "owner", tenantId, action: "markReturn", target: "INV-1005", detail: "Return transaksi TikTok Shop", metadata: { paymentMethod: "TikTok Shop" } }
      ],
      session: null
    };
  };
})();
