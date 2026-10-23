# ReelHeist Örnek Site Paket Deposu (`reelheist-sites`)

Bu klasör, ReelHeist eklentisinin **Site Depoları** bölümüne eklenebilen örnek bir imzalı site paket deposudur. İçerisinde iki site paketi yer alır:

- [`packs/dizipal.json`](packs/dizipal.json) — Dizipal (`dizipal*.com`) başlık/sezon/bölüm ayrıştırma, oynatıcı tetikleme ve DevTools koruma kuralları
- [`packs/hdfilmcehennemi.json`](packs/hdfilmcehennemi.json) — HDFilmCehennemi (`hdfilmcehennemi.nl`, `.com`, `.mobi` vb.) film/dizi ayrıştırma, `data-src` oynatıcı tetikleme ve DevTools koruma kuralları

## Klasör Yapısı

```text
reelheist-sites/
├── repo.json                     # Depo üstverisi ve Ed25519 açık anahtarı (publicKey)
├── index.json                    # Paket dizini ve SHA-256 özetleri (otomatik üretilir)
├── repo-private.pem              # Ed25519 özel imzalama anahtarı (GİZLİ — git'e eklenmez!)
├── .gitignore                    # repo-private.pem dosyasını dışlar
├── packs/
│   ├── dizipal.json              # Dizipal site paketi
│   ├── dizipal.json.sig          # Ed25519 imzası (otomatik üretilir)
│   ├── hdfilmcehennemi.json      # HDFilmCehennemi site paketi
│   └── hdfilmcehennemi.json.sig  # Ed25519 imzası (otomatik üretilir)
└── test/
    └── packs.test.mjs            # Paket doğrulama ve ayrıştırma testleri
```

## Paketleri Güncelleme ve İmzalama

`packs/*.json` içinde bir değişiklik yaptıktan veya yeni bir site ekledikten sonra dizini ve imzaları yeniden üretmek için proje kök dizininden:

```powershell
node tools/pack-sign.js build reelheist-sites
```

Testleri çalıştırmak için:

```powershell
node --test reelheist-sites/test/packs.test.mjs
```

## Eklentiye Ekleme

ReelHeist eklentisinde **Ayarlar → Site Depoları** bölümüne aşağıdaki adresi yapıştırıp **Ekle** düğmesine basın ve parmak izini onaylayın:

```text
https://raw.githubusercontent.com/ergulburak/reelheist-sites/main
```

## Depoyu Yayınlama veya Yerelde Kullanma

1. **GitHub / Web Üzerinde Yayınlama:**
   `repo-private.pem` **hariç** (`repo.json`, `index.json`, `packs/*.json`, `packs/*.json.sig`) dosyalarını ayrı bir GitHub deposuna veya GitHub Pages'e yükleyin. Eklentide **Ayarlar → Site Depoları** bölümüne deponun HTTPS kök adresini (ör. `https://kullanici.github.io/reelheist-sites`) yapıştırıp parmak izini onaylayın.
2. **Yerelde Test Etme (`127.0.0.1`):**
   ```powershell
   node -e "const http=require('http'),fs=require('fs'),path=require('path'),root=path.resolve('reelheist-sites');http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Access-Control-Allow-Origin':'*'});fs.createReadStream(f).pipe(res);}else{res.writeHead(404);res.end();}}).listen(8787,'127.0.0.1',()=>console.log('Site deposu hazir: http://127.0.0.1:8787'));"
   ```
   Ardından eklentide **Ayarlar → Site Depoları** kısmına `http://127.0.0.1:8787` adresini ekleyebilirsiniz.
