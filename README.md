# ReelHeist Örnek Site Paket Deposu (`reelheist-sites`)

Bu klasör, ReelHeist eklentisinin **Site Depoları** bölümüne eklenebilen örnek bir imzalı site paket deposudur. İçerisinde üç site paketi yer alır:

- [`packs/dizipal.json`](packs/dizipal.json) — Dizipal (`dizipal*.com`) başlık/sezon/bölüm ayrıştırma, oynatıcı tetikleme ve DevTools koruma kuralları
- [`packs/hdfilmcehennemi.json`](packs/hdfilmcehennemi.json) — HDFilmCehennemi (`hdfilmcehennemi.nl`, `.com`, `.mobi` vb.) film/dizi ayrıştırma, `data-src` oynatıcı tetikleme ve DevTools koruma kuralları
- [`packs/tranimeizle.json`](packs/tranimeizle.json) — TR Anime İzle (`tranimeizle.live`, `.io`, `.net` vb.) anime/bölüm ayrıştırma, kaynak listesinden oynatıcı tetikleme ve DevTools koruma kuralları. Site notları için aşağıya bakın.

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
│   ├── hdfilmcehennemi.json.sig  # Ed25519 imzası (otomatik üretilir)
│   ├── tranimeizle.json          # TR Anime İzle site paketi
│   └── tranimeizle.json.sig      # Ed25519 imzası (otomatik üretilir)
└── test/
    └── packs.test.mjs            # Paket doğrulama ve ayrıştırma testleri
```

## Site Notları

### TR Anime İzle (`tranimeizle`)

- **Adres yapısı:** Dizi sayfası `/anime/<ad>-izle` (ör. `/anime/Ranma-2024-izle-1`), bölüm sayfası `/<ad>-<n>-bolum-izle` (ör. `/ranma-2024-1-bolum-izle`). İlk sezonun adreslerinde sezon numarası yoktur; paket bu bölümleri 1. sezon sayar. Sonraki sezonlar ayrı dizi sayfalarıdır (`/anime/Ranma-2024-2-sezon-izle-1`) ve bölüm adresleri `-2-sezon-` parçası taşır.
- **Bölüm listesi dizi sayfasındadır.** Bölüm sayfasında yalnızca "Sonraki Bölüm" bağlantısı bulunur. Sezon indirme ve "Diziyi takip et" için eklenti menüsünü **dizi sayfasında** (`/anime/...`) açın. Eklenti, bölüm listesi olan dizi sayfasında sezon kutusunu da gösterir (0.4.1 sonrasındaki sürümler).
- **Bot kontrolü:** Site, dizi ve bölüm sayfalarını ilk ziyarette `/api/CaptchaChallenge/...` adresine yönlendirir ve bir resim seçme testi (IconCaptcha) ister. Test, oturum çerezi (`.AitrWeb.Session`, tarayıcı kapanınca silinir) ile geçilir. ReelHeist bu testi **çözmez**; testi tarayıcıda kendiniz bir kez çözün. Eklentinin çözücü penceresi aynı tarayıcı profilini kullandığı için sezon indirme ve takip denetimi çözülmüş oturumla çalışır. Tarayıcıyı yeniden başlattıktan sonra siteyi bir kez açıp testi tekrar geçin; aksi halde takip denetimi bölüm listesi bulamaz ve kart "boş" hatası gösterir, bir sonraki denetimde kendini toparlar.
- **Yetişkin içerik uyarısı:** Bazı dizi sayfaları "Sayfaya devam et / Sayfadan çık" pencereli bir yaş onayı gösterir. Onay, `age_verified` çerezine 365 gün yazılır. Paket bu onayı **otomatik vermez**; pencereyi kendiniz bir kez onaylayın. Pencere açıkken sayfa yine de bölüm listesini içerir, takip ve sezon bulma bundan etkilenmez.
- **Oynatıcı:** Bölüm sayfası kaynak listesini (`#sourceList`) sayfa yüklendikten sonra çeker; oynatıcı ancak bir kaynağa tıklanınca gelir. Paket, hiçbir kaynak seçili değilken listenin ilk kaynağına tıklar ve JWPlayer'ın oynat düğmesine basar. Sitenin kendi oynatıcısı (`AitrVip`) HLS (`.m3u8`) akışı verir.
- **Gizli tuzak bağlantı:** Dizi sayfasında `/icerik-denetim-...-1-bolum-izle` gibi gizli bir bot tuzağı bağlantısı bulunur. Paketin dizi anahtarı eşleşmesi bu bağlantıyı bölüm listesine almaz; eklenti bu adrese gitmez.

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
