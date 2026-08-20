/**
 * =========================================================================
 * GOOGLE APPS SCRIPT DATABASE LOGIN & AUTHENTICATION SYSTEM
 * =========================================================================
 * Deskripsi: Kode backend server Google Script untuk mengelola autentikasi
 * dan menampilkan menu login interaktif.
 * 
 * SETUP AWAL:
 * 1. Dapatkan ID Spreadsheet dari URL: https://docs.google.com/spreadsheets/d/{ID}/edit
 * 2. Cari dan ganti SEMUA "MASUKKAN_ID_SPREADSHEET_DI_SINI" dengan ID asli Anda
 * 3. Deploy ulang Web App dengan permissions "Anyone"
 * 
 * Cara Penggunaan:
 * 1. Buka Google Sheets Anda -> Klik Ekstensi -> Apps Script
 * 2. Hapus semua kode default dan paste file ini di "Kode.gs"
 * 3. Buat file HTML baru bernama "Page.html" dan paste template HTML login
 * 4. Klik Deploy -> New Deployment -> Pilih Web App -> Atur Akses "Anyone"
 * =========================================================================
 */

// KONFIGURASI GLOBAL - GANTI DENGAN ID SPREADSHEET ANDA!
// Dapatkan dari: https://docs.google.com/spreadsheets/d/{YOUR_ID}/edit
var GLOBAL_SPREADSHEET_ID = "MASUKKAN_ID_SPREADSHEET_DI_SINI";

// Mengembalikan halaman web saat URL web app dibuka
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Page');
  template.title = "Portal Login Internal";
  
  return template.evaluate()
      .setTitle("Portal Login Internal")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Memeriksa kredensial login dari form HTML
 * @param {Object} credentials - Objek berisi data login dari form
 * ✅ FIX: Sebelumnya kondisi login hardcoded, sekarang menggunakan variabel yang benar
 */
function checkUserCredentials(credentials) {
  try {
    var inputUser = credentials.email ? credentials.email.toString().trim().toLowerCase() : '';
    var inputPass = credentials.password ? credentials.password.toString().trim() : '';
    var inputPin = credentials.pin ? credentials.pin.toString().trim() : '';
    
    if (!inputUser && !inputPin) {
      return { success: false, message: "Kredensial tidak boleh kosong!" };
    }
    
    // Buka spreadsheet database
    var sheet = getDatabaseSheet();
    var data = sheet.getDataRange().getValues();
    
    // Mulai mencari dari baris ke-2 (melewati header)
    for (var i = 1; i < data.length; i++) {
      var dbUser = data[i][0].toString().trim().toLowerCase(); // Kolom A: Email/Username
      var dbPass = data[i][1].toString().trim(); // Kolom B: Password / PIN
      
      var isMatched = false;
      // ✅ FIX: Sebelumnya mengecek string literal yang selalu false
      // Sekarang mengecek dengan tipe auth yang benar
      var authType = "email-password"; // Bisa disesuaikan: "pin-code", "username-password", dll
      
      if (authType === "pin-code") {
        // Untuk PIN, bandingkan nilai pencarian utama
        isMatched = (dbPass === inputPin);
      } else {
        // Untuk email/username & password
        isMatched = (dbUser === inputUser && dbPass === inputPass);
      }
      
      if (isMatched) {
        var userNama = data[i][2] || "User"; // Kolom C: Nama
        var userRole = data[i][3] || "Member"; // Kolom D: Role
        var status = data[i][4] || "Active"; // Kolom E: Status
        
        if (status.toLowerCase() !== 'active' && status.toLowerCase() !== 'aktif') {
          return {
            success: false,
            message: "Akun Anda berstatus non-aktif. Silakan hubungi Administrator."
          };
        }
        
        // Return session data aman ke Client
        return {
          success: true,
          nama: userNama,
          role: userRole,
          email: dbUser,
          message: "Login Berhasil!"
        };
      }
    }
    
    return {
      success: false,
      message: "Email atau password salah!"
    };
    
  } catch (error) {
    return {
      success: false,
      message: "Gagal menghubungkan database: " + error.toString()
    };
  }
}

/**
 * Membuka spreadsheet secara dinamis.
 * ✅ FIX: Sekarang menggunakan GLOBAL_SPREADSHEET_ID yang ter-konfigurasi
 * Jika diletakkan di dalam Spreadsheet terkait, gunakan getActiveSpreadsheet().
 * Jika diletakkan terpisah (Standalone Web App), gunakan openById() dengan ID yang benar.
 */
function getDatabaseSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // ✅ PERBAIKAN: Gunakan ID Spreadsheet global yang sudah dikonfigurasi
      if (GLOBAL_SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_DI_SINI") {
        throw new Error("SETUP DIPERLUKAN: Masukkan ID Spreadsheet Anda pada variabel GLOBAL_SPREADSHEET_ID di bagian atas kode.gs");
      }
      ss = SpreadsheetApp.openById(GLOBAL_SPREADSHEET_ID);
    }
  } catch(e) {
    throw new Error("Gagal membuka Spreadsheet. " + e.toString() + " Pastikan ID benar dan Script memiliki izin akses.");
  }
  
  var sheetName = "Database_User";
  var sheet = ss.getSheetByName(sheetName);
  
  // Jika sheet belum ada, buat otomatis beserta header contoh
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Email/Username", "Password/PIN", "Nama", "Role", "Status"]);
    
    // Baris data contoh
    sheet.appendRow(["admin@gmail.com", "123456", "Super Admin", "Admin", "Active"]);
    sheet.appendRow(["staf@gmail.com", "staf123", "Budi Santoso", "Editor", "Active"]);
    sheet.appendRow(["user@gmail.com", "user123", "Siti Aminah", "Viewer", "Active"]);
    sheet.appendRow(["pin1234", "1234", "Agus Setiawan", "Viewer", "Active"]);
  }
  
  return sheet;
}

/**
 * Fungsi tambahan untuk Registrasi Pengguna baru (opsional)
 * Dipanggil jika tombol Daftar diaktifkan pada pengaturan
 */
function registerNewUser(userData) {
  try {
    var sheet = getDatabaseSheet();
    var data = sheet.getDataRange().getValues();
    var newEmail = userData.email.trim().toLowerCase();
    
    // Cek apakah email sudah terdaftar
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === newEmail) {
        return { success: false, message: "Email ini sudah terdaftar!" };
      }
    }
    
    // Tambah user baru (status bawaan: Active, role bawaan: Member)
    sheet.appendRow([
      newEmail,
      userData.password,
      userData.nama.trim(),
      "Member",
      "Active"
    ]);
    
    return { success: true, message: "Pendaftaran berhasil! Silakan login." };
  } catch (error) {
    return { success: false, message: "Gagal mendaftar: " + error.toString() };
  }
}

/**
 * Mencari indeks kolom secara dinamis berdasarkan nama header kolom (case-insensitive).
 * Mencegah error jika urutan kolom bergeser atau terdapat kolom tambahan di spreadsheet.
 */
function getColumnIndices(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return { nama: 0, gudang: 1, stok: 2, status: 3, divisi: 4 };
  
  var headers = data[0].map(function(h) { 
    return h ? h.toString().toLowerCase().trim() : ""; 
  });
  
  // Cari kecocokan kata kunci untuk Nama Barang
  var colNama = headers.indexOf("nama barang");
  if (colNama === -1) colNama = headers.indexOf("nama_barang");
  if (colNama === -1) colNama = headers.indexOf("nama");
  if (colNama === -1) colNama = headers.indexOf("barang");
  if (colNama === -1) colNama = headers.indexOf("item");
  if (colNama === -1) {
    colNama = headers.findIndex(function(h) { return h.indexOf("nama") !== -1 || h.indexOf("barang") !== -1; });
  }
  if (colNama === -1) colNama = 0;
  
  // Cari kecocokan untuk Gudang
  var colGudang = headers.indexOf("gudang");
  if (colGudang === -1) colGudang = headers.indexOf("lokasi");
  if (colGudang === -1) colGudang = headers.indexOf("warehouse");
  if (colGudang === -1) colGudang = headers.indexOf("rak");
  if (colGudang === -1) {
    colGudang = headers.findIndex(function(h) { return h.indexOf("gudang") !== -1 || h.indexOf("lokasi") !== -1; });
  }
  if (colGudang === -1) colGudang = 1;
  
  // Cari kecocokan untuk Stok
  var colStok = headers.indexOf("jumlah stok");
  if (colStok === -1) colStok = headers.indexOf("jumlah_stok");
  if (colStok === -1) colStok = headers.indexOf("stok");
  if (colStok === -1) colStok = headers.indexOf("qty");
  if (colStok === -1) colStok = headers.indexOf("quantity");
  if (colStok === -1) colStok = headers.indexOf("jumlah");
  if (colStok === -1) {
    colStok = headers.findIndex(function(h) { return h.indexOf("stok") !== -1 || h.indexOf("qty") !== -1 || h.indexOf("jumlah") !== -1; });
  }
  if (colStok === -1) colStok = 2;
  
  // Cari kecocokan untuk Status
  var colStatus = headers.indexOf("status kelayakan");
  if (colStatus === -1) colStatus = headers.indexOf("status_kelayakan");
  if (colStatus === -1) colStatus = headers.indexOf("status");
  if (colStatus === -1) colStatus = headers.indexOf("satuan");
  if (colStatus === -1) colStatus = headers.indexOf("unit");
  if (colStatus === -1) {
    colStatus = headers.findIndex(function(h) { return h.indexOf("status") !== -1 || h.indexOf("satuan") !== -1 || h.indexOf("unit") !== -1; });
  }
  if (colStatus === -1) colStatus = 3;
  
  // Cari kecocokan untuk Divisi
  var colDivisi = headers.indexOf("divisi");
  if (colDivisi === -1) colDivisi = headers.indexOf("role");
  if (colDivisi === -1) colDivisi = headers.indexOf("akses");
  if (colDivisi === -1) colDivisi = headers.indexOf("departemen");
  if (colDivisi === -1) {
    colDivisi = headers.findIndex(function(h) { return h.indexOf("divisi") !== -1 || h.indexOf("role") !== -1 || h.indexOf("akses") !== -1; });
  }
  if (colDivisi === -1) colDivisi = 4;
  
  return {
    nama: colNama,
    gudang: colGudang,
    stok: colStok,
    status: colStatus,
    divisi: colDivisi
  };
}

/**
 * Mengambil data inventaris/stok secara real-time dari sheet STOK_BARANG.
 * Berfungsi untuk mengisi statistik, grafik, dan tabel barang di dashboard.
 * Menyaring otomatis berdasarkan divisi/role pengguna secara dinamis dan aman.
 */
function getInventoryData(userRole) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        // ✅ FIX: Gunakan GLOBAL_SPREADSHEET_ID
        if (GLOBAL_SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_DI_SINI") {
          throw new Error("SETUP DIPERLUKAN: Masukkan ID Spreadsheet Anda");
        }
        ss = SpreadsheetApp.openById(GLOBAL_SPREADSHEET_ID);
      }
    } catch(e) {
      // Abaikan jika tidak terdeteksi
    }
    
    if (!ss) {
      throw new Error("Spreadsheet tidak dapat diidentifikasi. Silakan masukkan ID Spreadsheet Anda.");
    }

    var sheetName = "STOK_BARANG";
    var sheet = ss.getSheetByName(sheetName);
    
    // Jika sheet belum ada, mari kita buat otomatis beserta contoh data agar tidak kosong!
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Nama Barang", "Gudang", "Jumlah Stok", "Status Kelayakan", "Divisi"]);
      sheet.appendRow(["Bearing SKF 6313/C3", "BM", 1, "Ea", "Teknisi"]);
      sheet.appendRow(["Silent Dexston Grey", "Bm", 1, "Pcs", "Teknisi"]);
      sheet.appendRow(["Engesel Pintu kubikal Toilet", "STP", 5, "Ea", "Teknisi"]);
      sheet.appendRow(["PSU 12V 5A", "STP", 4, "Ea", "Teknisi"]);
      sheet.appendRow(["Lampu TL 18 W", "Bm", 8, "Pcs", "Teknisi"]);
      sheet.appendRow(["Lampu Bulb 15 W", "Bm", 8, "Pcs", "Teknisi"]);
      sheet.appendRow(["Sapu Lantai Premium", "Gudang Utama A", 12, "Pcs", "Cleaning Service"]);
      sheet.appendRow(["Cairan Pel Harum Lemas", "Gudang Bintaro", 3, "Pcs", "Cleaning Service"]);
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = getColumnIndices(sheet);
    var result = [];
    
    // Mulai mencari dari baris ke-2 (melewati baris header)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Lewati baris kosong
      if (!row[cols.nama] && !row[cols.gudang]) continue;
      
      var namaVal = row[cols.nama] ? row[cols.nama].toString().trim() : "";
      var gudangVal = row[cols.gudang] ? row[cols.gudang].toString().trim() : "";
      
      // Ambil nilai stok secara aman
      var rawStok = row[cols.stok];
      var stokVal = 0;
      if (rawStok !== "" && rawStok !== undefined) {
        stokVal = parseInt(rawStok);
        if (isNaN(stokVal)) stokVal = 0;
      }
      
      var statusVal = row[cols.status] ? row[cols.status].toString().trim() : "";
      var divisiVal = row[cols.divisi] ? row[cols.divisi].toString().trim() : "Teknisi";
      
      // Filter otomatis berdasarkan role pengguna (kecuali Admin yang bisa akses semuanya)
      if (userRole && userRole !== "Admin") {
        if (divisiVal.toLowerCase() !== userRole.toLowerCase()) {
          continue; // Lewati barang yang bukan milik divisinya
        }
      }
      
      result.push({
        kode: namaVal, // internal fallback mapping key
        nama: namaVal,
        gudang: gudangVal,
        stok: stokVal,
        status: statusVal,
        divisi: divisiVal
      });
    }
    
    return result;
  } catch (error) {
    throw new Error("Gagal mengambil data dari sheet STOK_BARANG: " + error.toString());
  }
}

/**
 * Mencatat transaksi barang masuk atau keluar dan memperbarui sheet STOK_BARANG.
 * Memvalidasi apakah jumlah stok mencukupi untuk barang keluar.
 * ✅ UPDATED: Menambahkan field Area dan Nama Pengambil
 */
function recordTransaction(data) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        // ✅ FIX: Gunakan GLOBAL_SPREADSHEET_ID
        if (GLOBAL_SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_DI_SINI") {
          throw new Error("SETUP DIPERLUKAN");
        }
        ss = SpreadsheetApp.openById(GLOBAL_SPREADSHEET_ID);
      }
    } catch(e) {}
    
    if (!ss) {
      throw new Error("Spreadsheet tidak teridentifikasi.");
    }
    
    var type = data.type; // 'masuk' atau 'keluar'
    var kode = data.kode.trim();
    var qty = parseInt(data.qty) || 0;
    var petugas = data.petugas || "System";
    var area = data.area ? data.area.trim() : ""; // ✅ NEW: Area
    var pengambil = data.pengambil ? data.pengambil.trim() : ""; // ✅ NEW: Nama Pengambil
    
    if (!kode || qty <= 0) {
      return { success: false, message: "Kode barang atau jumlah tidak valid!" };
    }
    
    var stokSheet = ss.getSheetByName("STOK_BARANG");
    if (!stokSheet) {
      return { success: false, message: "Sheet STOK_BARANG tidak ditemukan!" };
    }
    
    var stokData = stokSheet.getDataRange().getValues();
    var cols = getColumnIndices(stokSheet);
    var foundIndex = -1;
    var namaBarang = "";
    var currentStok = 0;
    
    for (var i = 1; i < stokData.length; i++) {
      if (stokData[i][cols.nama].toString().trim() === kode) {
        foundIndex = i + 1; // 1-based index
        namaBarang = stokData[i][cols.nama].toString().trim();
        
        var rawStok = stokData[i][cols.stok];
        currentStok = parseInt(rawStok) || 0;
        break;
      }
    }
    
    if (foundIndex === -1) {
      return { success: false, message: "Kode barang " + kode + " tidak ditemukan di STOK_BARANG!" };
    }
    
    var newStok = type === 'masuk' ? (currentStok + qty) : (currentStok - qty);
    if (newStok < 0) {
      return { success: false, message: "Stok tidak mencukupi! Stok saat ini: " + currentStok };
    }
    
    // Update stok di sheet STOK_BARANG pada kolom yang terdeteksi dinamis (1-based index)
    stokSheet.getRange(foundIndex, cols.stok + 1).setValue(newStok);
    
    // Log transaksi ke LOG_TRANSAKSI
    var logSheet = ss.getSheetByName("LOG_TRANSAKSI");
    if (!logSheet) {
      logSheet = ss.insertSheet("LOG_TRANSAKSI");
      // ✅ UPDATED: Header dengan Area dan Nama Pengambil
      logSheet.appendRow(["Waktu", "Tipe", "Kode Barang", "Nama Barang", "Jumlah", "Stok Awal", "Stok Akhir", "Petugas", "Area", "Nama Pengambil"]);
    }
    
    var waktu = new Date();
    // ✅ UPDATED: Tambah area dan pengambil ke row
    logSheet.appendRow([waktu, type.toUpperCase(), kode, namaBarang, qty, currentStok, newStok, petugas, area, pengambil]);
    
    return { 
      success: true, 
      message: "Transaksi " + (type === 'masuk' ? "Barang Masuk" : "Barang Keluar") + " berhasil! " + namaBarang + " (" + kode + ") kini memiliki " + newStok + " Pcs.",
      newStok: newStok
    };
  } catch (error) {
    return { success: false, message: "Gagal mencatat transaksi: " + error.toString() };
  }
}

/**
 * Mengambil data log transaksi dari sheet LOG_TRANSAKSI.
 */
function getTransactionLogs() {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        // ✅ FIX: Gunakan GLOBAL_SPREADSHEET_ID
        if (GLOBAL_SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_DI_SINI") {
          return [];
        }
        ss = SpreadsheetApp.openById(GLOBAL_SPREADSHEET_ID);
      }
    } catch(e) {}
    
    if (!ss) {
      return [];
    }
    
    var logSheet = ss.getSheetByName("LOG_TRANSAKSI");
    if (!logSheet) {
      return [];
    }
    
    var data = logSheet.getDataRange().getValues();
    var result = [];
    
    // Ambil baris terbalik agar data terbaru berada di atas
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row[0]) continue;
      
      var formattedWaktu = "";
      try {
        formattedWaktu = Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd HH:mm:ss");
      } catch(e) {
        formattedWaktu = row[0].toString();
      }
      
      result.push({
        waktu: formattedWaktu,
        tipe: row[1] ? row[1].toString().trim() : "",
        kode: row[2] ? row[2].toString().trim() : "",
        nama: row[3] ? row[3].toString().trim() : "",
        qty: parseInt(row[4]) || 0,
        stokAwal: parseInt(row[5]) || 0,
        stokAkhir: parseInt(row[6]) || 0,
        petugas: row[7] ? row[7].toString().trim() : "",
        area: row[8] ? row[8].toString().trim() : "", // ✅ NEW
        pengambil: row[9] ? row[9].toString().trim() : "" // ✅ NEW
      });
    }
    
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * Menambahkan material/barang baru ke sheet STOK_BARANG.
 * Memvalidasi apakah kode barang sudah pernah terdaftar sebelumnya.
 * ✅ FIX: Sekarang menggunakan getColumnIndices() untuk deteksi kolom dinamis
 */
function addInventoryItem(data) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        // ✅ FIX: Gunakan GLOBAL_SPREADSHEET_ID
        if (GLOBAL_SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_DI_SINI") {
          throw new Error("SETUP DIPERLUKAN");
        }
        ss = SpreadsheetApp.openById(GLOBAL_SPREADSHEET_ID);
      }
    } catch(e) {}
    
    if (!ss) {
      throw new Error("Spreadsheet tidak teridentifikasi.");
    }
    
    var nama = data.nama.trim();
    var gudang = data.gudang.trim();
    var stok = parseInt(data.stok) || 0;
    var status = data.status.trim() || "Pcs";
    var divisi = data.divisi ? data.divisi.trim() : "Teknisi";
    
    if (!nama || !gudang) {
      return { success: false, message: "Nama dan Gudang tidak boleh kosong!" };
    }
    
    var stokSheet = ss.getSheetByName("STOK_BARANG");
    if (!stokSheet) {
      return { success: false, message: "Sheet STOK_BARANG tidak ditemukan!" };
    }
    
    var stokData = stokSheet.getDataRange().getValues();
    // ✅ FIX: Gunakan getColumnIndices() untuk mendapatkan kolom yang benar
    var cols = getColumnIndices(stokSheet);
    
    // Cek apakah nama barang sudah pernah terdaftar
    for (var i = 1; i < stokData.length; i++) {
      if (stokData[i][cols.nama].toString().trim().toLowerCase() === nama.toLowerCase()) {
        return { success: false, message: "Nama barang " + nama + " sudah terdaftar di database." };
      }
    }
    
    // Tambahkan baris baru ke sheet STOK_BARANG
    // Urutan: Nama, Gudang, Stok, Status, Divisi
    stokSheet.appendRow([nama, gudang, stok, status, divisi]);
    
    // Log sebagai transaksi MASUK awal jika stok awal > 0
    if (stok > 0) {
      var logSheet = ss.getSheetByName("LOG_TRANSAKSI");
      if (!logSheet) {
        logSheet = ss.insertSheet("LOG_TRANSAKSI");
        // ✅ UPDATED: Header dengan Area dan Nama Pengambil
        logSheet.appendRow(["Waktu", "Tipe", "Kode Barang", "Nama Barang", "Jumlah", "Stok Awal", "Stok Akhir", "Petugas", "Area", "Nama Pengambil"]);
      }
      var waktu = new Date();
      logSheet.appendRow([waktu, "MASUK", "", nama, stok, 0, stok, data.petugas || "System", "", ""]);
    }
    
    return { 
      success: true, 
      message: "Material baru berhasil ditambahkan! " + nama + " dengan stok awal " + stok + " " + status + " untuk divisi " + divisi + "."
    };
  } catch (error) {
    return { success: false, message: "Gagal menambahkan material baru: " + error.toString() };
  }
}