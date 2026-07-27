# Perfect Arbiter

Satranç kural motoru ve hakemi — kanıt temelli, hızlı hükümler. Tek dosyalık bir web uygulaması (`index.html`) olarak çalışır; çekirdek kilit-tespit algoritması sayfa içindeki `src-lock` bloğunda tutulur ve motor üretici tarafından aynen gömülür.

Felsefe: **hakem, bot değil.** Amaç en iyi hamleyi bulmak değil, kurallara göre kesin ve doğru hüküm vermektir. **Soundness kutsaldır**: verilen her kesin hüküm (mat, kilit, kazanç) %100 doğru olmalıdır. Belirsizlikte daima güvenli tarafa düşülür.

---

## 1. Uygulama yapısı

Beş bölümlü arayüz:

- **Tanıtım** — Soundness ilkesi ve bölümlerin ne işe yaradığı.
- **Kilitli Pozisyon** — Bir pozisyonun mutlak berabere (kilit) olup olmadığını kanıtlar. Üç sonuç: **MUTLAK KİLİT** (kesin berabere), **KİLİT DEĞİL** (değerlendirildi, kırıcı var), **KAPSAM DIŞI** (algoritmanın ön-koşulları sağlanmıyor).
- **Bayrak Düşmesi** — Bir tarafın süresi bittiğinde, karşı tarafın mat edecek materyali olup olmadığına göre *kazanç / berabere* hükmü. Panelde iki hakemlik yaklaşımı seçilebilir: **FIDE** (helper mate — saf geometri, arama yok) ve **USCF** (forced mate — hafif taşlarda arama). Butona basınca sonuç anında çıkar (animasyon yok), süre `ms` olarak gösterilir, fark yaratan kareler vurgulanır.
- **Motor Deneme** — Motorun tüm kurallarıyla iki kişilik oyun; mat, pat, ölü materyal, 50/75 hamle, 3/5 tekrar, kilit tespiti sıralı olarak kontrol edilir. Kural seti FIDE / USCF / karma preset'lerinden seçilir ya da **özel** olarak elle kurulur. Ayrıca bayrak düşürme ve terk butonlarıyla bu hükümler doğrudan denenebilir.
- **Motor Üretici** — Hakem motorunu esnek seçeneklerle veya üç hazır preset'le (FIDE / USCF / karma) yapılandırıp tek dosya olarak indirme. Kod sergilenmez, yalnızca indirilir.

### Kaynak blokları

Uygulama tek bir `index.html`; mantık altı `<script>` bloğuna ayrılmıştır. İlk dördü **paylaşılan çekirdektir** ve üretilen motora birebir kopyalanır:

| Blok | İçerik | İndirilen motora girer mi |
|---|---|---|
| `src-engine` | `PA` — 0x88 tahta, Zobrist, hamle üretimi, `legalMoves`, `perft`, forced-mate araması, `material`, FEN g/ç | evet |
| `src-flag` | `makeFlagClassifier(PA)` — evrensel katman + üç bayrak sınıflandırıcısı | evet |
| `src-arbiter` | `makeArbiter(PA, CFG, LOCK, describe)` — tek kural uygulama hattı: `flagFall`, `resign`, `adjudicate` | evet |
| `src-lock` | `makeLockDetector(PA)` — K1–K5 kilit tespiti | yalnız seçiliyse |
| *(üretici)* | `buildEngineSource(cfg)` — blokları okuyup `.js` üretir | hayır |
| `src-i18n` | `I18N` — TR/EN sözlük, `t`, `applyStatic`, `trReason` | hayır (yalnız arayüz) |

**Hüküm hattı tek yerdedir.** Sayfa ve indirilen motor aynı `makeArbiter`'ı çalıştırır; aralarındaki tek fark yapılandırma (`CFG`) ve metnin nasıl basıldığıdır. Hükümler prozayla değil **kod + veri** olarak döner (`flag.*`, `adj.*`); sayfa bunları i18n sözlüğüyle, indirilen motor `src-arbiter` içindeki gömülü İngilizce tabloyla yazıya döker. Böylece bir hükmün sayfada ve indirilen motorda farklı çıkması yapısal olarak imkânsızdır.

---

## 2. Bayrak düşmesi hakemliği

Bir tarafın bayrağı düştüğünde soru: karşı tarafın (süresi bitmeyen = *kazanan aday*) mat edebilecek materyali var mı? Süresi biten taraf *kaybeden aday*. Üç kural seti üç farklı ölçüt kullanır. Üçü de **Motor Deneme**'de (preset ya da özel yapılandırma) ve **Motor Üretici**'de seçilebilir; Bayrak Düşmesi paneli hızlı karşılaştırma için yalnız FIDE ve USCF'yi sunar.

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

### c) Karma

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

- Taş sayısı **8–30** arası, iki uç **dahil**. Üst sınır vezirsiz tam kadrodur: `2 şah + 16 piyon + (2 kale + 2 at + 2 fil)×2 = 30`.
- Her tarafta **tam 1 şah**.
- **Vezir yok** — algoritmanın çekirdek varsayımı (vezir varsa duvar arkasından uzun menzilli kırıcı hep mümkün olur).
- Her tarafta **en az 3 piyon** (piyon-duvarı için gerekli minimum).
- **Terfi tutarlılığı** (her iki taraf): başlangıç kadrosunu (2 kale, 2 at, 2 fil) aşan her taş bir terfiden gelmiş olmalıdır ve her terfi bir piyona mal olur. Eksik piyon sayısı `8−P` bütçedir: `extra = max(0,R−2) + max(0,N−2) + max(0,B−2) + max(0,Q−1) ≤ 8−P`. Karma fazlalıklar (örn. 1 fazla kale + 1 fazla at) birikimli olarak tek bütçeye vurur.

**Kale kapsam dışı değildir.** Kale duvar boyunca kayabildiği için eskiden K1'de eleniyordu; artık K2'nin hareketsizlik şartına tabidir — hareket edebilen bir kale zaten kilidi anında kırar, edemiyorsa pozisyon değerlendirilmeye devam eder. Bu, kapsamı daraltmadan genişletir.

Sağlanmıyorsa → **KAPSAM DIŞI** (arayüzde). Bu bir materyal ön-koşuludur; pozisyon değerlendirilemez.

### Kontrol 2 — At/kale hareketsizliği + fil erken-kırıcısı

**At ve kale (`knightOrRookHasMove`):** İki taraf için, herhangi bir atın **veya kalenin** locked-legalite'de bir hamlesi (boş kareye gitme veya rakip taş alma) varsa → kilit değil. At piyon duvarının üstünden sıçrar, kale duvar boyunca kayar; gerçek bir kilitte ikisi de kendi taşlarına tamamen gömülü olmalıdır. Ölçüt saf geometridir: hamle edince şahın açıkta kalıp kalmayacağı sorulmaz, yalnızca "gidebileceği bir kare var mı, yoksa hepsi kendi taşlarıyla mı kapalı" sorulur.

**Fil erken-kırıcısı (`bishopEarlyBreak`):** Fil yalnız kendi renginde gezer/alır ve kendi piyonunu alamaz. Eşik piyonu = **her iki renkten piyon bulunan** her sütundaki en ileri beyaz ve en ileri siyah piyon (birikmede dış piyon). Kural:

- Bir fil ETKİSİZDİR (kilit olabilir) eğer: filin renginde kendi eşik piyonu varsa (dokunamaz) **veya** rakip eşik piyonları filden farklı renkteyse (erişemez).
- Kilit KIRILIR eğer: **rakip** eşik piyonu fille **aynı** renk (alabilir) **ve** fil hareketli.

Yani: kendi piyonuyla aynı renk kilidi **korur**; rakip piyonuyla aynı renk kilidi **kırar**.

Not — bu bir yaklaşıklıktır: eşik maskeleri sütun bazında değil tahta genelinde toplanır ve filin hedefe gerçekten *ulaşıp ulaşamadığı* sorulmaz, yalnız "hareketli mi" sorulur. Erken-kırıcı yalnız "kilit değil" diyebildiği için soundness etkilenmez; bedeli olası completeness kaybıdır.

### Kontrol 3 — Piyon tuğlası + geometrik budama

**Tuğla (yön-duyarlı):** aynı sütunda siyah piyon üstte (satır `r`), hemen altında beyaz piyon (satır `r+1`). İkisi de karşı karşıya kilitli — beyaz yukarı, siyah aşağı ilerleyemez. **Kavuşma satırı** = `r + 0.5`. Bu, tarafa bağlı olmayan tek bir temas çizgisidir; arkada biriken piyonlar onu değiştirmez.

Budamalar (`check3`, yalnız "kilit değil" yönünde):

- Tuğla sayısı **< 3** → yetersiz (KAPSAM DIŞI).
- **Tam 3 tuğla** → sütunlar `{a,d,g}`, `{b,d,g}`, `{b,e,g}` veya `{b,e,h}` desenlerinden biri olmalı (yoksa duvar tahtayı bölemez, örn. `a,c,e` → g,h tarafı açık). **Ve** üç kavuşma satırı eşit olmalı.
- **≥ 4 tuğla** → bitişik sütunda (`|Δc|=1`) ve eşit kavuşmada (`Δr=0`) iki tuğla varsa çapraz alım açılır → kilit değil.

### En passant

Motorun ep karesi, K4'ün kök düğümüne geçirilir. Orada piyon çapraz-alım taraması ep alımını (sütun-değiştiren geri-dönülemez hamle) doğal olarak yakalar. Ep hakkı yalnız sırası olan taraftadır ve yalnızca kök düğümde geçerlidir (bir hamle sonrası düşer). Ayrı bir ep bloğuna gerek yoktur — akışın içindedir.

Bunun bir sonucu var: ep hakkı varken pozisyon **kilit sayılamaz**, hak düştüğü anda kilide dönüşebilir. Hakkın düşmesi geri-alınabilir bir hamleyle olduğu için taramayı `halfmove` kuralı tetiklemez; bu yüzden §5'teki `ep` tetikleyicisi vardır.

### Kontrol 4 — Simülasyon: iç içe yayılım

En pahalı ve en güçlü kontrol. İki katmanlı yayılım (`mainSpread` + `subSpreadBreaks`):

**Ana yayılım:** Bir "ana taş" (piyon, fil veya şah), çok-adımlı geri-alınabilir hamlelerle (boş kareye kayma) tahtada gezer. Ana taş 3 kez değişir (P, B, K), her biri iki taraf için → 6 ana yayılım. **Her durakta**, `anyBreakerFull` diğer taş türlerinin bir kırıcı açıp açmadığını kontrol eder.

**Düğümlenme (her düğümde):** Ana taş her durakta, `anyKnightOrRookMobile` iki tarafın atlarını ve kalelerini yeniden yoklar. Taşlar gezerken gömülü bir at veya kale serbest kalıyorsa kilit **anında** kırılır. Bu, K2'nin kök düğümdeki statik testinin dinamik karşılığıdır.

**Kırıcı = geri-dönülemez hamle**, ama her taş türü için farklı tanımlanır:

- **Piyon:** terfi **veya** çapraz (sütun-değiştiren) alım **veya** en passant → kırıcı. Düz ilerleme kırıcı değil, sadece yeni düğüm açar.
- **Fil:** taş alımı (karşı şah hariç) **veya** şah-çek-mat (`bishopCheckIsMate` ile motora doğrulatılır) → kırıcı. Boş kareye kayma kırıcı değil.
- **At / kale:** ana taş olmazlar (kilit adayında zaten hareketsizdirler) ve `pieceMoves` üzerinden sorgulanırlar; katkıları yalnızca düğümlenme testidir.
- **Şah:** kendisi kırıcı üretmez; sadece gezerek başka taşların önünü açar. Ana taş şahken karşı şah silinir (iki şah bitişemez) ve şah karşı piyon tehdidine takılır.

Her düğümde tüm türler kontrol edildiği için, bir tarafın taşının hareketiyle diğer tarafın (ör. filinin) kırıcı yolunun açılması da yakalanır — bu, iki taşlı helper-mate senaryolarını kapsar (bir fil şahı sıkıştırır, diğer fil mat eder).

**Fil-void budaması (`bishopsFullyVoid`):** İki tarafın da tüm filleri kendi renginde hiçbir rakip taşa sahip değilse (hiçbir alım yapamaz) **ve** tüm piyonlar hareketsizse, ana dal 1 (P) ve 2 (B) gereksizdir → atlanır, yalnız ana dal 3 (K) çalışır (şah gezerken bir taş açılabilir → güvenlik). Gereksiz fil taramasını eler; completeness ve soundness korunur.

### Kontrol 5 — Şahın nihai soundness garantisi

Tahtadaki tüm piyonlar hariç tüm taşlar (her iki tarafın şahı, fili, atı) silinir; yalnız piyon duvarı kalır. Test edilen şah, karşı piyon tehdidine ve dolu karelere takılarak gezip **karşı şahın orijinal karesine** ulaşabiliyor mu? Ulaşabiliyorsa → kilit değil. Önce sırası olan taraf, sonra rakip.

Şaha maksimum serbestlik verilir (yalnız piyon duvarı engel). En iyi ihtimalde bile karşıya geçemiyorsa gerçek oyunda da geçemez → yalnız ek bir gereklilik koşuludur, yanlış-pozitif üretmez. K4'ün şah dalının kaçırabileceği "figür-tıkalı gizli kapı" durumlarını yakalayan bir güvenlik katmanıdır.

---

## 5. Motorda kilit kontrolünün zamanlaması

Kilit tespiti pahalıdır (özellikle çok-fil pozisyonlarında). Bu yüzden hakem akışında **en sona** ve **hamle sayacı mantığıyla** çağrılır:

Beraberlik kontrolleri ucuzdan pahalıya sıralanır: `mat/pat → ölü materyal → 75/50 hamle → 5/3 tekrar → kilit`. Kilit yalnız diğer hiçbir beraberlik tetiklenmediyse hesaplanır.

### Tetikleyici katmanı (`lockTrigger`)

Kilidin *ne zaman* taranacağına ayrı bir dış katman karar verir: `lockTrigger(fen, prevFen)` → `'halfmove' | 'ep' | null`. Kural hattının içine gömülü bir `if` değil, bağımsız olarak çağrılabilen ve dışa açılan bir işlevdir. Kilit ancak pozisyonun geleceğinin geri-dönülemez biçimde daraldığı bir anda **oluşabilir**; katman bu anları tanır:

- **`halfmove`** — son hamle bir taş alımı veya piyon sürmesiydi (`halfmove` 0'a düştü), yani duvar yapısının kendisi değişti.
- **`ep`** — bir en passant hakkı **düştü**. Hak varken kendisi bir kilit-kırıcıydı (K4 kök düğümde ep alımını görür), dolayısıyla pozisyon kilit sayılamazdı. Hakkın düşmesine yol açan hamle ise geri-alınabilirdir, yani `halfmove` **0 değildir** — tek başına `halfmove` kuralı böyle bir kilidi sonsuza dek kaçırırdı.

Bu anların dışında pozisyon, zaten taranmış bir pozisyonun yeniden dizilişidir; tarama atlanır. Bir tetikleyiciyi kaçırmak completeness'a mal olur, **asla soundness'a değil**: taranmamış bir kilit yalnızca "kilit değil" diye raporlanır.

`prevFen` son hamleden **önceki** pozisyondur; verilmezse yalnız `halfmove` kuralı çalışabilir. Bu, gereksiz taramayı büyük ölçüde eler (ölçümde ~500× hızlanma).

Somut örnek: `4k3/4p3/3p4/1p1P3p/1P2P2P/8/8/1K6 b - - 0 1` pozisyonunda siyah `e7-e5` oynar; ep karesi `e6` açılır ve `dxe6 e.p.` kilidi kırdığı için hüküm "devam"dır. Beyaz `Kb1-a1` gibi geri-alınabilir bir hamle yapınca ep hakkı düşer ve pozisyon mutlak kilide dönüşür — `halfmove` 1 olduğu için eski kapı bunu hiç taramazdı, `ep` tetikleyicisi yakalar.

---

## 6. Yapılandırılabilir motor üretici

"Motor Üretici" bölümü, hakem motorunu bağımsız bir `.js` dosyası olarak üretir. Esnek seçenekler elle karıştırılabilir ya da üç hazır preset tek tıkla uygulanabilir.

### Seçenekler

- **İddia alt sınırı — 50 hamle / 3 tekrar:** açık/kapalı. Oyuncu iddia ederse berabere (otomatik bitmez). Kapatılırsa iddiayla bitmez — ör. K+R vs K+Q gibi uzun sonlarda kazanan matı bulana dek oynamak zorunda kalır.
- **Otomatik bitme üst sınırı — 75 hamle / 5 tekrar:** açık/kapalı. FIDE'nin zorunlu tavanı; iddiaya gerek kalmadan otomatik berabere.
- **Resign bayrak düşmesi sayılır / sayılmaz:** açıksa (FIDE 5.1.2 / karma) terk eden, rakip mat kuramıyorsa berabere; kapalıysa (USCF) terk doğrudan kayıp. (Motor Deneme'deki terk butonları ve üretilen motorun `resign()` API'si aynı bayrağı okur.)
- **Bayrak düşmesi mat ölçütü — FIDE / USCF / Karma:** `src-flag`'teki **üç sınıflandırıcının üçü de** doğrudan seçilebilir; seçim `ARBITER_CONFIG.flag` alanına olduğu gibi yazılır. FIDE aramasızdır; USCF ve karma seçildiğinde **derinlik** (1–10) girilir.
- **Kilitli pozisyon taraması:** var/yok. Seçilince motora dahil edilir.

> Bu seçenek eskiden ikili bir *helper / forced* anahtarıydı ve `forced` her iki durumda da karma sınıflandırıcıya bağlanıyordu — yani USCF preset'i seçilip indirilen motor aslında karma kuralla hükmediyordu. Artık `flag` birincil alandır, `mate` yalnız türetilmiş bir etikettir.

**Kısıt:** İddia veya otomatik bitmeden en az biri seçili olmalıdır (aksi halde indirme kilitlenir).

### Üç hazır preset

| | İddia 50/3 | Otomatik 75/5 | Resign = bayrak | Bayrak sınıflandırıcısı (`flag`) | Kilit |
|---|---|---|---|---|---|
| **FIDE** | açık | **açık** | evet | `fide` — helper mate, aramasız | var |
| **USCF** | açık | **kapalı** | hayır | `uscf` — forced mate | var |
| **Karma** | **kapalı** | açık | evet | `ours` — forced mate + tek-sütun piyon kuralı | var |

Bu tablo kodda tek bir yerde (`RULESETS`) yaşar ve hem Motor Üretici preset'lerini hem Motor Deneme federasyonlarını hem de üretilen her motoru besler; üç yerde ayrıklaşması mümkün değildir. Pratik sonuçları:

- **FIDE** — 50 hamle / 3 tekrarda taraf *iddia edebilir*; 75 hamle / 5 tekrarda iddiaya gerek kalmadan **otomatik berabere**.
- **USCF** — 50 hamle / 3 tekrarda iddia edilebilir, ama **otomatik tavan yoktur**: iddia gelmezse oyun 75/5'i geçse bile sürer.
- **Karma** — **iddia yoktur** (50/3'te oyun sürer); yalnız 75 hamle / 5 tekrarda otomatik berabere.

Presetlerden bağımsız özel yapılandırmalar da üretilebilir. Motor Deneme'nin "özel" seçeneği aynı seçenek kümesini sunar, dolayısıyla orada kurulan her kural seti birebir indirilebilir bir motora karşılık gelir. Özel'e geçildiğinde kontroller o an aktif olan kural setinden doldurulur.

### Üretilen motor API'si

Üretilen motor `Arbiter()` API'si sunar:

- `adjudicate(fen, repCount)` — tam pozisyon hükmü (`{ over, result, reason }`).
- `adjudicate(fen, { repCount, prevFen })` — aynısı, ama `prevFen` verildiğinde **ep tetikleyicisi** de çalışır. Sayı biçimi geriye dönük uyumlu kalır; o biçimde yalnız `halfmove` tetikleyicisi devrededir.
- `lockTrigger(fen, prevFen)` — kilit taramasının gerekip gerekmediği (`'halfmove' | 'ep' | null`).
- `flagFall(fen, whiteLostOnTime)` — bayrak düşmesi (`{ result, reason }`).
- `resign(fen, whiteResigns)` — terk hükmü (resignIsFlag'e göre).
- `isLocked(fen)` — kilit seçiliyse (`{ locked, reason }`).

Kod sayfada sergilenmez, yalnızca indirilir. Gömülü çekirdek — `PA` motoru, `makeFlagClassifier`, `makeArbiter` ve seçiliyse `makeLockDetector` — sayfadakiyle birebir aynıdır: `buildEngineSource` bu blokların metnini `src-engine`, `src-flag`, `src-arbiter`, `src-lock` script etiketlerinden okuyup dosyaya yapıştırır, üretilen tek şey `ARBITER_CONFIG` ve ince `Arbiter()` sarmalayıcısıdır. Kural hattı **üretilmez**, yalnızca yapılandırmaya bağlanır.

---

## 7. `src-lock` genel yapısı

`makeLockDetector(PA)` bir fabrika fonksiyonudur; motor nesnesini (`PA`) alır ve kilit-tespit API'sini döndürür. Kaynak sayfadaki `src-lock` bloğudur; motor üretici bu bloğu olduğu gibi okuyup ürettiği `.js` dosyasına gömer, yani sayfa ile indirilen motor birebir aynı kodu çalıştırır. Başlıca bileşenler:

- **Yardımcılar:** `fenToBoard`, `boardToFen`, `boardToPlacement` (tahta temsil dönüşümleri).
- **Locked-legalite üreteçleri:** `slideMoves`, `pawnMoves`, `pieceMoves` (ep destekli; P/N/B/R/K üretir — vezir K1'de elendiği için dalı yoktur). Yön sabitleri: `KNIGHT_D`, `KING_D`, `BISHOP_D`, `ROOK_D`.
- **Kontroller:** `check1`, `knightOrRookHasMove`, `anyKnightOrRookMobile` (düğümlenme), `bishopEarlyBreak`, `check3`, `bishopsFullyVoid`, `mainSpread`, `subSpreadBreaks`, `anyBreakerFull`, `kingReachesOpponent`.
- **Mat doğrulaması:** `bishopCheckIsMate` (fil şah-mat kırıcısı için gerçek motora danışır).
- **Giriş noktası:** `isLocked(fen)` → `{ locked, reason }`.

`MAX_NODES = 200000` yayılım güvenlik tavanıdır; aşılırsa belirsizlik sayılıp "kilit değil" tarafına düşülür (soundness korunur).

---

## 8. Notlar ve sınırlar

- Kilit tespiti piyon-yapılı (duvar temelli) kilitlere odaklıdır; vezir içeren ve 30 taştan kalabalık pozisyonlar kapsam dışıdır (K1). Kale kapsam içindedir: hareketsizse değerlendirilir, hareketliyse K2'de kilidi kırar.
- Fil erken-kırıcısı ve fil-void budaması, çok-fil pozisyonlarındaki taramayı hızlandırır ama bazı ağır pozisyonlar (çok sayıda hareketli fil) yine de görece yavaş kalabilir; bu, soundness'tan ödün vermeden yapılan bilinçli bir denge.
- Bayrak düşmesi mat ölçütünün üç sınıflandırıcısı da (FIDE helper, USCF forced, karma forced) tamamdır ve Motor Deneme'de de Motor Üretici'de de seçilebilir.
- Bayrak sınıflandırıcısı (`makeFlagClassifier`, `src-flag`) ve hüküm hattı (`makeArbiter`, `src-arbiter`) hem arayüz hem üretilen motor tarafından ortak kaynak olarak kullanılır; böylece iki yerde tutarlılık garanti edilir.
- Terk hükmü `resign()` API'si ve `resignIsFlag` yapılandırmasıyla çalışır; Motor Deneme'deki terk butonları da aynı yolu kullanır.
- Dil katmanı (`src-i18n`) yalnız **görüntüleme anında** devreye girer. Çekirdek — özellikle `isLocked` — gerekçelerini Türkçe döndürmeye devam eder; sınıflandırma bu Türkçe metin üzerinden yapılır, çeviri `trReason` ile en son uygulanır. Dil değiştirmek bir hükmü **yeniden hesaplamaz**, yalnız yeniden çizer (kilit taraması pahalı olduğu için bu önemlidir).
- `src-lock` C++/Java'ya taşınmaya uygundur; o durumda tahta temsili bitboard'a çevrilerek (`boardToPlacement` string anahtarları yerine sayısal anahtarlar) önemli hız kazancı elde edilebilir.
