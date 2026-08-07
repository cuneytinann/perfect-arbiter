# Perfect Arbiter

**[Live app →](https://cuneytinann.github.io/perfect-arbiter/)** · [Türkçe ↓](#perfect-arbiter-türkçe)

A chess rule engine and arbiter — evidence-based, fast rulings. Runs as a single-file web app.

**An arbiter, not a bot.** The goal is not to find the best move but to deliver correct, final rulings under the rules. Soundness comes first: every definite ruling — mate, lock, win — must be right, and every ambiguity falls to the safe side.

It covers three things engines usually leave to interpretation:

- **FIDE 5.2.2 / USCF 14D4 dead positions**, including locked positions where mating material is on the board but the geometry makes mate impossible.
- **Flag-fall adjudication** under FIDE (helper mate), USCF (forced mate) and a hybrid rule set.
- **A configurable arbiter** you can download as a standalone `.js` file.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or:

```bash
git clone https://github.com/cuneytinann/perfect-arbiter.git
cd perfect-arbiter
python3 -m http.server 8000   # then open http://localhost:8000
```

## Use the generated engine

The Engine Generator produces a standalone `.js` file with an `Arbiter()` API:

```js
const arbiter = Arbiter();
arbiter.adjudicate(fen, { repCount, prevFen });  // full position ruling
arbiter.flagFall(fen, whiteLostOnTime);          // flag-fall ruling
arbiter.isLocked(fen);                           // lock detection
```

## Documentation

Everything — the algorithm, the three checks, the verification numbers, the FIDE/USCF differences, the architecture and the generator — is documented in the app's **Introduction** section:

**https://cuneytinann.github.io/perfect-arbiter/**

The page is bilingual and follows your browser language.

## Contributing

The claim worth attacking is soundness. Inside the scope, if a position reached from the starting array by legal moves is called LOCKED and the call is wrong, that is a counter-example — open an issue with the FEN.

## License

MIT

---

<a id="perfect-arbiter-türkçe"></a>

# Perfect Arbiter (Türkçe)

**[Canlı uygulama →](https://cuneytinann.github.io/perfect-arbiter/)**

Satranç kural motoru ve hakemi — kanıt temelli, hızlı hükümler. Tek dosyalık bir web uygulaması olarak çalışır.

**Hakem, bot değil.** Amaç en iyi hamleyi bulmak değil, kurallara göre kesin ve doğru hüküm vermektir. Soundness önce gelir: verilen her kesin hüküm — mat, kilit, kazanç — doğru olmalıdır ve her belirsizlikte güvenli tarafa düşülür.

Motorların genelde yoruma bıraktığı üç konuyu kapsar:

- **FIDE 5.2.2 / USCF 14D4 ölü pozisyonlar** — mat edecek materyal tahtada olduğu hâlde geometrinin matı imkânsız kıldığı kilitli pozisyonlar dahil.
- **Bayrak düşmesi hakemliği** — FIDE (helper mate), USCF (forced mate) ve karma kural setiyle.
- **Yapılandırılabilir hakem** — bağımsız bir `.js` dosyası olarak indirilebilir.

## Çalıştırma

Derleme adımı ve bağımlılık yok. `index.html` dosyasını tarayıcıda açın ya da:

```bash
git clone https://github.com/cuneytinann/perfect-arbiter.git
cd perfect-arbiter
python3 -m http.server 8000   # sonra http://localhost:8000
```

## Üretilen motoru kullanma

Motor Üretici, `Arbiter()` API'si sunan bağımsız bir `.js` dosyası çıkarır:

```js
const arbiter = Arbiter();
arbiter.adjudicate(fen, { repCount, prevFen });  // tam pozisyon hükmü
arbiter.flagFall(fen, whiteLostOnTime);          // bayrak düşmesi hükmü
arbiter.isLocked(fen);                           // kilit tespiti
```

## Belgeler

Her şey — algoritma, üç kontrol, doğrulama rakamları, FIDE/USCF farkları, mimari ve üretici — uygulamanın **Tanıtım** bölümünde anlatılıyor:

**https://cuneytinann.github.io/perfect-arbiter/**

Sayfa iki dilli, tarayıcı diline göre açılıyor.

## Katkı

Saldırmaya değer iddia soundness'tır. Kapsam içinde, başlangıç diziliminden kurallı hamlelerle ulaşılan bir pozisyona algoritma KİLİT derken yanılıyorsa bu bir karşı örnektir — FEN ile issue açın.

## Lisans

MIT
