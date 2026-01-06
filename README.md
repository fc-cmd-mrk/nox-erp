# 🏢 NOX ERP

Kurumsal Kaynak Planlama Sistemi - Digital ürün satışı, cari takibi, kar-zarar analizi ve nakit akışı yönetimi.

## ✨ Özellikler

- 🏢 **Çoklu Şirket Desteği** - Farklı ülkelerde şirketler (Türkiye, Dubai, Kıbrıs, Estonya)
- 👥 **Cari Yönetimi** - Müşteri ve tedarikçi takibi, çoklu para birimi hesapları
- 📦 **Ürün Yönetimi** - Model kodlu ürünler, tedarikçi bazlı maliyet takibi
- 💰 **Ödeme Takibi** - PayTR, GPay, Havale, Kripto (USDT) desteği
- 📊 **Kar-Zarar Analizi** - Ürün bazlı kar/zarar raporları
- 💳 **Hesap Yönetimi** - Kasa, banka, kripto cüzdan takibi
- 👤 **Yetki Matrisi** - Rol bazlı erişim kontrolü
- 📥 **Import/Export** - CSV, Excel, XML desteği
- 📝 **Audit Log** - Tüm hareketlerin kaydı

## 🚀 Hızlı Başlangıç

### Otomatik Başlatma (Önerilen)

1. `start.command` dosyasına çift tıklayın
2. Otomatik olarak:
   - Kullanılan portlar temizlenir
   - Backend ve frontend başlatılır
   - Tarayıcı açılır

### Manuel Başlatma

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Demo Kullanıcılar

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| admin | admin123 | Süper Admin |
| muhasebe | muhasebe123 | Muhasebe |
| satis | satis123 | Satış |
| viewer | viewer123 | Görüntüleyici |

## 📁 Proje Yapısı

```
nox-erp/
├── backend/
│   ├── app/
│   │   ├── models/      # Veritabanı modelleri
│   │   ├── routers/     # API endpoints
│   │   ├── schemas/     # Pydantic şemaları
│   │   ├── auth.py      # Kimlik doğrulama
│   │   ├── config.py    # Yapılandırma
│   │   ├── database.py  # Veritabanı bağlantısı
│   │   └── main.py      # Ana uygulama
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # React bileşenleri
│   │   ├── pages/       # Sayfa bileşenleri
│   │   ├── services/    # API servisleri
│   │   └── store/       # Zustand store
│   └── package.json
├── data/                # CSV dosyaları
├── start.command        # macOS başlatma scripti
└── README.md
```

## 🛠 Teknolojiler

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM
- **SQLite** - Veritabanı (production için PostgreSQL önerilir)
- **JWT** - Kimlik doğrulama
- **Pandas** - Veri işleme

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **Recharts** - Grafikler

## 📊 API Endpoints

API dokümantasyonu: `http://localhost:8000/docs`

### Ana Modüller
- `/api/auth` - Kimlik doğrulama
- `/api/users` - Kullanıcı yönetimi
- `/api/companies` - Şirket yönetimi
- `/api/contacts` - Cari yönetimi
- `/api/products` - Ürün yönetimi
- `/api/transactions` - İşlem yönetimi
- `/api/payments` - Ödeme yönetimi
- `/api/accounts` - Hesap yönetimi
- `/api/reports` - Raporlar
- `/api/data` - Import/Export

## 🔄 Veri Import

CSV dosyalarınızı import edebilirsiniz:

1. Ayarlar sayfasına gidin
2. Import tipini seçin (Cariler, Ürünler, İşlemler, Ödemeler)
3. CSV/Excel/XML dosyası yükleyin

### Desteklenen Formatlar
- `stok.csv` - Satış işlemleri
- `odeme.csv` - Ödemeler
- Özel CSV formatları

## 🌍 Para Birimleri

- TRY (₺) - Türk Lirası
- USD ($) - Amerikan Doları
- EUR (€) - Euro
- GBP (£) - İngiliz Sterlini
- USDT (₮) - Tether

## 🏢 Şirketler

| Kod | Ad | Ülke |
|-----|-----|------|
| AG | Agetekno | 🇹🇷 Türkiye |
| DI | Dijiplus | 🇹🇷 Türkiye |
| PA | Pasific | 🇦🇪 Dubai |
| KE | Keybyte | 🇦🇪 Dubai |
| WE | Webzon | 🇨🇾 Kıbrıs |
| NO | Noxbyte | 🇨🇾 Kıbrıs |
| BB | BBVOID | 🇨🇾 Kıbrıs |
| AGN | Agenzon | 🇨🇾 Kıbrıs |
| PB | Paybyte | 🇪🇪 Estonya |
| B2C | B2C Müşteri | 🇹🇷 Türkiye |
| B2B | B2B Müşteri | 🇹🇷 Türkiye |

## 📝 Lisans

MIT License

---

**NOX ERP** © 2024

