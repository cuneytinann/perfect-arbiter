# Perfect Arbiter

Satranç kural motoru ve hakemi — kanıt temelli, hızlı hükümler. Tek dosyalık bir web uygulaması (`index.html`) olarak çalışır; çekirdek kilit-tespit algoritması ayrı bir modülde (`lockcore.js`) tutulur.

Felsefe: **hakem, bot değil.** Amaç en iyi hamleyi bulmak değil, kurallara göre kesin ve doğru hüküm vermektir. **Soundness kutsaldır**: verilen her kesin hüküm (mat, kilit, kazanç) %100 doğru olmalıdır. Belirsizlikte daima güvenli tarafa düşülür.

---

## 1. Uygulama yapısı

Dört bölümlü arayüz:

- **Bayrak Düşmesi** — Bir tarafın süresi bittiğinde, karşı tarafın mat edecek materyali olup olmadığına göre *kazanç / berabere* hükmü. **İki hakemlik yaklaşımı** seçilebilir: **FIDE** (helper mate — saf geometri, arama yok) ve **USCF** (forced mate — hafif taşlarda arama). Butona basınca sonuç anında çıkar (animasyon yok), süre `ms` olarak gösterilir, fark yaratan kareler vurgulanır.
- **Kilitli Pozisyon** — Bir pozisyonun mutlak berabere (kilit) olup olmadığını kanıtlar. Üç sonuç: **MUTLAK KİLİT** (kesin berabere), **KİLİT DEĞİL** (değerlendirildi, kırıcı var), **KAPSAM DIŞI** (algoritmanın ön-koşulları sağlanmıyor).
- **Serbest Oyun** — Motorun tüm kurallarıyla iki kişilik oyun; mat, pat, ölü materyal, 50/75 hamle, 3/5 tekrar, kilit tespiti sıralı olarak kontrol edilir.
- **Motor Üretici** — Hakem motorunu esnek seçeneklerle veya üç hazır preset'le (FIDE / USCF / karma) yapılandırıp tek dosya olarak indirme. Kod sergilenmez, yalnızca indirilir.

---

## 2. Bayrak düşmesi hakemliği

Bir tarafın bayrağı düştüğünde soru: karşı tarafın (süresi bitmeyen = *kazanan aday*) mat edebilecek materyali var mı? Süresi biten taraf *kaybeden aday*. Üç kural seti üç farklı ölçüt kullanır — arayüzde ikisi (FIDE, USCF), motor üreticide üçü de (karma dahil) seçilebilir.

Tüm yaklaşımlar ortak bir **evrensel katman**la başlar (`makeFlagClassifier` içinde, `src-flag` bloğu — hem arayüz hem üretilen motor bu tek kaynağı kullanır). Evrensel katman önce mutlak berabereleri, hızlı kazanç hunisini ve geometrik kesin beraberleri ayıklar; kesin karar veremediği "belirsiz sınıfları" (tek at / tek renk fil / iki at) yaklaşıma göre çözer.

**Evrensel katman (üç yaklaşımda ortak):**

- **Rakip çıplak kral** → berabere (loser'ın taşına bakılmaz).
- **Hızlı kazanç hunisi** — rakipte Q / R / P / (at+fil) / (zıt renk fil çifti) varsa → süresi biten kaybeder.
- **Geometrik kesin berabereler** — rakipte yalnızca tek-renk fil ve loser'da yalnız Q/R varsa berabere; rakipte yalnızca tek at ve loser'da yalnız Q varsa berabere.
- **Fil-rengi kuralı:** sahadaki *tüm* filler (iki taraf birlikte) tek renk karede ise mat imkânı değişmez (ölü-pozisyon mantığıyla aynı); zıt renk fil belirince açılır.

**Belirsiz sınıflar** (tek at / tek renk fil / iki at) burada `undecided` kalır; kararı seçilen yaklaşım verir:

### a) FIDE — helper mate, saf geometri, ARAMA YOK

Bayrak düştüğünde (süre bitimi *veya resign*), rakip **sen bilerek kaybetmeye çalışsan bile** (helper mate) seni matlayabiliyorsa kazanç, hiçbir şekilde matlayamıyorsa berabere. Gri bölge yoktur — her şey materyal geometrisiyle kesin. Belirsiz sınıflara ancak loser'ın "yardımcı" materyali varken düşülür ve hepsi helper mate ile kazançtır. (Örn. K+R vs K+N'de süresi biten K+R kaybeder — Friedel vakası; FIDE'de helper mate mümkündür.)

FIDE'nin 2023 değişikliği (5.1.2): resign de artık bayrak düşmesi gibi, rakip mat kuramıyorsa berabere sayılır.

### b) USCF — forced mate, hafif taşlarda ARAMA

Ölçüt "zorla mat mümkün mü" (helper değil). Resign bayrak düşmesi *sayılmaz* (terk doğrudan kayıp). Belirsiz sınıflar:

- **İki at + loser'da piyon var** → doğrudan kazanç (arama yok; piyon, iki atın Troitzky matını mümkün kılar).
- **İki at + loser'da piyon yok** → forced-mate araması.
- **Tek at** → forced-mate araması (ayarlı derinlikte bulunamazsa berabere).
- **Tek renk fil** → forced-mate araması (bulunamazsa berabere).

(K+R vs K+N'de USCF berabere verir — forced mate yoktur; FIDE'den ayrıldığı nokta budur.)

### c) Karma (yalnız motor üreticide)

USCF'ye yakın ama iki at + piyon durumunda **piyon geometrisi** şartı: iki at + loser'da yalnızca piyon(lar) ve hepsi **tek sütunda** ise doğrudan kazanç; aksi halde (piyonsuz / farklı sütun / başka taş) arama. Resign bayrak düşmesi *sayılır*.

**Arama derinliği** ayarlanabilir (yalnız forced mate kullanan yaklaşımlar için; FIDE aramasızdır). Bu, kilit tespitinden **tamamen bağımsızdır** — bayrak-düşmesi mat arayıcısının modu ya da derinliği kilit sonucunu etkilemez.

---

## 3. Kilitli pozisyon tespiti — genel bakış

**Kilit (mutlak berabere):** helper iki taraf bile (yani taraflar işbirliği yapsa dahi) hiçbir geri-dönülemez hamle (taş alımı, piyon sürme/terfi) ve hiçbir mat açamıyorsa, pozisyon sonsuza dek berabere sürer. FIDE'nin 75-hamle / 5-tekrar tavanı gereği kesin beraberedir. Bu, FIDE 5.2.2 (dead position) ve USCF 14D4 ("no legal moves leading to checkmate") maddelerinin kanıtlanabilir bir alt kümesidir — materyal yeterli olsa bile konum mat'a kapalıysa berabere.

**Soundness güvencesi:** `isLocked` "KİLİT" dediğinde bu %100 doğrudur. "kilit değil" ise "bu yöntemle kanıtlayamadım" demektir — pozisyon kurallarca yine de berabere olabilir. Her belirsizlikte "kilit değil" tarafına düşülür. Yani hatalar yalnızca **yanlış-negatif** (kilidi kaçırma) yönünde olabilir; asla **yanlış-pozitif** (kilit olmayana kilit deme) olmaz.

**Locked-legalite:** Tespit, motorun tam legal hamle üretecini değil, kendi geometrik hareket üretecini (`pieceMoves`, `slideMoves`, `pawnMoves`) kullanır. Bir taşın hamlesi = geometrinin izin verdiği kareye gitmek + hedefte kendi taşı olmaması. Şah güvenliği (pin, açığa çıkan şah, sıra geçerliliği) yok sayılır. Bu gevşetmeler soundness-güvenli yöndedir: en fazla bir kilidi kaçırırlar, asla uydurma kilit üretmezler.

**Bağımsızlık:** Kilit tespiti kendi başına yeter — dışarıdaki forced/helper mat arayıcısına, bayrak-düşmesi ayarlarına veya başka hiçbir yapılandırmaya bağlı değildir. İçindeki mat kontrolü (`bishopCheckIsMate`) yalnızca motorun sabit kural ilkellerini (`inCheck`, `legalMoves`) kullanır — bunlar bir arama değil, matın tanımıdır.

---

## 4. Beş kontrol

`isLocked` beş kontrolü sırayla uygular. Herhangi biri bir kilit-kırıcı bulursa hemen "kilit değil" döner. Her kontrol, ucuzdan pahalıya sıralanmıştır ve önce **sırası olan tarafta**, sonra rakipte aranır.

### Kontrol 1 — Materyal budaması

Pozisyonun kilit olabilecek materyal sınıfında olup olmadığı (`check1`):

- Taş sayısı **8–30** arası (alt: yetersiz materyal; üst: standart oyunda üretilemez).
- Her tarafta **tam 1 şah**.
- **Vezir yok** — algoritmanın çekirdek varsayımı (vezir varsa duvar arkasından uzun menzilli kırıcı hep mümkün olur).
- Her tarafta **en az 3 piyon** (piyon-duvarı için gerekli minimum).
- **Terfi tutarlılığı** (her iki taraf): fazladan ağır taşların toplamı, feda edilebilecek piyon bütçesini aşmamalı. `extra = max(0,R−2) + max(0,N−2) + max(0,B−2) + max(0,Q−1) ≤ 8−P`. Karma fazlalıklar (örn. 2 fazla kale + 1 fazla fil) birikimli olarak tek bütçeye vurur.

Sağlanmıyorsa → **KAPSAM DIŞI** (arayüzde). Bu bir materyal ön-koşuludur; pozisyon değerlendirilemez.

### Kontrol 2 — Piyon tuğlası + geometrik budama

**Tuğla (yön-duyarlı):** aynı sütunda siyah piyon üstte (satır `r`), hemen altında beyaz piyon (satır `r+1`). İkisi de karşı karşıya kilitli — beyaz yukarı, siyah aşağı ilerleyemez. **Kavuşma satırı** = `r + 0.5`. Bu, tarafa bağlı olmayan tek bir temas çizgisidir; arkada biriken piyonlar onu değiştirmez.

Budamalar (`check2`, yalnız "kilit değil" yönünde):

- Tuğla sayısı **< 3** → yetersiz (KAPSAM DIŞI).
- **Tam 3 tuğla** → sütunlar `{a,d,g}`, `{b,d,g}`, `{b,e,g}` veya `{b,e,h}` desenlerinden biri olmalı (yoksa duvar tahtayı bölemez, örn. `a,c,e` → g,h tarafı açık). **Ve** üç kavuşma satırı eşit olmalı.
- **≥ 4 tuğla** → bitişik sütunda (`|Δc|=1`) ve eşit kavuşmada (`Δr=0`) iki tuğla varsa çapraz alım açılır → kilit değil.

### Kontrol 3 — At/kale hareketsizliği + fil erken-kırıcısı

**At/kale (`knightRookHasMove`):** İki taraf için, herhangi bir at veya kalenin locked-legalite'de bir hamlesi (boş kareye gitme veya rakip taş alma) varsa → kilit değil. Bu taşlar piyon duvarının üstünden (at sıçrar) veya boyunca (kale kayar) oynayabildiği için, gerçek kilitte tümü kendi taşlarına gömülü olmalıdır. Saf geometri; şah güvenliğine bakılmaz.

**Fil erken-kırıcısı (`bishopEarlyBreak`):** Fil yalnız kendi renginde gezer/alır ve kendi piyonunu alamaz. Eşik piyonu = her sütunda en ileri beyaz/siyah piyon (birikmede dış piyon). Kural:

- Bir fil ETKİSİZDİR (kilit olabilir) eğer: filin renginde kendi eşik piyonu varsa (dokunamaz) **veya** rakip eşik piyonları filden farklı renkteyse (erişemez).
- Kilit KIRILIR eğer: **rakip** eşik piyonu fille **aynı** renk (alabilir) **ve** fil hareketli.

Yani: kendi piyonuyla aynı renk kilidi **korur**; rakip piyonuyla aynı renk kilidi **kırar**.

### En passant

Motorun ep karesi, K4'ün kök düğümüne geçirilir. Orada piyon çapraz-alım taraması ep alımını (sütun-değiştiren geri-dönülemez hamle) doğal olarak yakalar. Ep hakkı yalnız sırası olan taraftadır ve yalnızca kök düğümde geçerlidir (bir hamle sonrası düşer). Ayrı bir ep bloğuna gerek yoktur — akışın içindedir.

### Kontrol 4 — Simülasyon: iç içe yayılım

En pahalı ve en güçlü kontrol. İki katmanlı yayılım (`mainSpread` + `subSpreadBreaks`):

**Ana yayılım:** Bir "ana taş" (piyon, fil veya şah), çok-adımlı geri-alınabilir hamlelerle (boş kareye kayma) tahtada gezer. Ana taş 3 kez değişir (P, B, K), her biri iki taraf için → 6 ana yayılım. **Her durakta**, `anyBreakerFull` diğer taş türlerinin bir kırıcı açıp açmadığını kontrol eder.

**Kırıcı = geri-dönülemez hamle**, ama her taş türü için farklı tanımlanır:

- **Piyon:** terfi **veya** çapraz (sütun-değiştiren) alım **veya** en passant → kırıcı. Düz ilerleme kırıcı değil, sadece yeni düğüm açar.
- **Fil:** taş alımı (karşı şah hariç) **veya** şah-çek-mat (`bishopCheckIsMate` ile motora doğrulatılır) → kırıcı. Boş kareye kayma kırıcı değil.
- **Şah:** kendisi kırıcı üretmez; sadece gezerek başka taşların önünü açar. Ana taş şahken karşı şah silinir (iki şah bitişemez) ve şah karşı piyon tehdidine takılır.

Her düğümde tüm türler kontrol edildiği için, bir tarafın taşının hareketiyle diğer tarafın (ör. filinin) kırıcı yolunun açılması da yakalanır — bu, iki taşlı helper-mate senaryolarını kapsar (bir fil şahı sıkıştırır, diğer fil mat eder).

**Fil-void budaması (`bishopsFullyVoid`):** İki tarafın da tüm filleri kendi renginde hiçbir rakip taşa sahip değilse (hiçbir alım yapamaz) **ve** tüm piyonlar hareketsizse, ana dal 1 (P) ve 2 (B) gereksizdir → atlanır, yalnız ana dal 3 (K) çalışır (şah gezerken bir taş açılabilir → güvenlik). Gereksiz fil taramasını eler; completeness ve soundness korunur.

### Kontrol 5 — Şahın nihai soundness garantisi

Tahtadaki tüm piyonlar hariç tüm taşlar (her iki tarafın şah/fil/at/kalesi) silinir; yalnız piyon duvarı kalır. Test edilen şah, karşı piyon tehdidine ve dolu karelere takılarak gezip **karşı şahın orijinal karesine** ulaşabiliyor mu? Ulaşabiliyorsa → kilit değil. Önce sırası olan taraf, sonra rakip.

Şaha maksimum serbestlik verilir (yalnız piyon duvarı engel). En iyi ihtimalde bile karşıya geçemiyorsa gerçek oyunda da geçemez → yalnız ek bir gereklilik koşuludur, yanlış-pozitif üretmez. K4'ün şah dalının kaçırabileceği "figür-tıkalı gizli kapı" durumlarını yakalayan bir güvenlik katmanıdır.

---

## 5. Motorda kilit kontrolünün zamanlaması

Kilit tespiti pahalıdır (özellikle çok-fil pozisyonlarında). Bu yüzden hakem akışında **en sona** ve **hamle sayacı mantığıyla** çağrılır:

Beraberlik kontrolleri ucuzdan pahalıya sıralanır: `mat/pat → ölü materyal → 75/50 hamle → 5/3 tekrar → kilit`. Kilit yalnız diğer hiçbir beraberlik tetiklenmediyse hesaplanır.

Ayrıca kilit yalnız **halfmove sayacı 0 iken** (yani son hamle bir taş alımı veya piyon sürmesiydi) kontrol edilir. Çünkü kilit ancak geri-dönülemez bir hamleden hemen sonra oluşabilir; geri-alınabilir hamleler duvar yapısını değiştirmez. Kilit bir kez oluşunca kalıcıdır ve oluştuğu anda (halfmove 0) yakalanır. Bu, gereksiz taramayı büyük ölçüde eler (ölçümde ~500× hızlanma).

---

## 6. Yapılandırılabilir motor üretici

"Motor Üretici" bölümü, hakem motorunu bağımsız bir `.js` dosyası olarak üretir. Esnek seçenekler elle karıştırılabilir ya da üç hazır preset tek tıkla uygulanabilir.

### Seçenekler

- **İddia alt sınırı — 50 hamle / 3 tekrar:** açık/kapalı. Oyuncu iddia ederse berabere (otomatik bitmez). Kapatılırsa iddiayla bitmez — ör. K+R vs K+Q gibi uzun sonlarda kazanan matı bulana dek oynamak zorunda kalır.
- **Otomatik bitme üst sınırı — 75 hamle / 5 tekrar:** açık/kapalı. FIDE'nin zorunlu tavanı; iddiaya gerek kalmadan otomatik berabere.
- **Resign bayrak düşmesi sayılır / sayılmaz:** açıksa (FIDE 5.1.2 / karma) terk eden, rakip mat kuramıyorsa berabere; kapalıysa (USCF) terk doğrudan kayıp. (Arayüzde terk butonu henüz yok; bu bayrak üretilen motorun `resign()` API davranışını belirler.)
- **Bayrak düşmesi mat ölçütü — Helper / Forced:** Helper (FIDE — saf geometri, arama yok) veya Forced (USCF / karma — hafif taşlarda arama). Forced seçiliyse **derinlik** (1–10) girilir.
- **Kilitli pozisyon taraması:** var/yok. Seçilince motora dahil edilir.

**Kısıt:** İddia veya otomatik bitmeden en az biri seçili olmalıdır (aksi halde indirme kilitlenir).

### Üç hazır preset

| | İddia 50/3 | Otomatik 75/5 | Resign = bayrak | Mat ölçütü | Kilit |
|---|---|---|---|---|---|
| **FIDE** | açık | açık | evet | helper | var |
| **USCF** | açık | kapalı | hayır | forced | var |
| **Karma** | kapalı | açık | evet | forced | var |

Presetlerden bağımsız özel yapılandırmalar da üretilebilir.

### Üretilen motor API'si

Üretilen motor `Arbiter()` API'si sunar:

- `adjudicate(fen, repCount)` — tam pozisyon hükmü (`{ over, result, reason }`).
- `flagFall(fen, whiteLostOnTime)` — bayrak düşmesi (`{ result, reason }`).
- `resign(fen, whiteResigns)` — terk hükmü (resignIsFlag'e göre).
- `isLocked(fen)` — kilit seçiliyse (`{ locked, reason }`).

Kod sayfada sergilenmez, yalnızca indirilir. Gömülü çekirdek — `PA` motoru, `makeFlagClassifier` (bayrak sınıflandırıcısı) ve seçiliyse `makeLockDetector` — sayfadakiyle birebir aynıdır (`src-engine`, `src-flag`, `src-lock` bloklarından okunur).

---

## 7. `lockcore.js` genel yapısı

`makeLockDetector(PA)` bir fabrika fonksiyonudur; motor nesnesini (`PA`) alır ve kilit-tespit API'sini döndürür. Sayfadaki `src-lock` bloğuyla birebir aynı kaynaktır; ayrı modül olarak da (`module.exports = { makeLockDetector }`) kullanılabilir. Başlıca bileşenler:

- **Yardımcılar:** `fenToBoard`, `boardToFen`, `boardToPlacement` (tahta temsil dönüşümleri).
- **Locked-legalite üreteçleri:** `slideMoves`, `pawnMoves`, `pieceMoves` (ep destekli).
- **Kontroller:** `check1`, `check2`, `knightRookHasMove`, `bishopEarlyBreak`, `bishopsFullyVoid`, `mainSpread`, `subSpreadBreaks`, `anyBreakerFull`, `kingReachesOpponent`.
- **Mat doğrulaması:** `bishopCheckIsMate` (fil şah-mat kırıcısı için gerçek motora danışır).
- **Giriş noktası:** `isLocked(fen)` → `{ locked, reason }`.

`MAX_NODES = 200000` yayılım güvenlik tavanıdır; aşılırsa belirsizlik sayılıp "kilit değil" tarafına düşülür (soundness korunur).

---

## 8. Notlar ve sınırlar

- Kilit tespiti şu anda piyon-yapılı (duvar temelli) kilitlere odaklıdır; vezirli pozisyonlar kapsam dışıdır (K1).
- Fil erken-kırıcısı ve fil-void budaması, çok-fil pozisyonlarındaki taramayı hızlandırır ama bazı ağır pozisyonlar (çok sayıda hareketli fil) yine de görece yavaş kalabilir; bu, soundness'tan ödün vermeden yapılan bilinçli bir denge.
- Bayrak düşmesi mat ölçütü olarak **helper mate** (FIDE — saf geometri) ve **forced mate** (USCF / karma — arama) yaklaşımlarının ikisi de tamamdır ve motor üreticide seçilebilir.
- Bayrak sınıflandırıcısı (`makeFlagClassifier`, `src-flag`) hem arayüz hem üretilen motor tarafından ortak kaynak olarak kullanılır; böylece iki yerde tutarlılık garanti edilir.
- Resign (terk) hükmü için `resign()` API'si ve `resignIsFlag` yapılandırması hazırdır; arayüzde terk butonu henüz yoktur (açık kapı bırakılmıştır).
- `lockcore.js` C++/Java'ya taşınmaya uygundur; o durumda tahta temsili bitboard'a çevrilerek (`boardToPlacement` string anahtarları yerine sayısal anahtarlar) önemli hız kazancı elde edilebilir.
