/* ═══════════════════════════════════════════════════════════════════════
   KİLİTLİ POZİSYON TESPİTİ — ÇEKİRDEK (locked-legalite tabanlı)

   Bir pozisyonun MUTLAK KİLİT olup olmadığını kanıtlar: helper iki taraf bile
   hiçbir geri-dönülemez hamle (alım / piyon sürme-terfi) VE hiçbir mat açamıyorsa
   → kesin berabere (FIDE 75-hamle/5-tekrar tavanı gereği).

   %100 SOUND: "KİLİT" dediğinde kesin doğru. "kilit değil" = kanıtlayamadım.
   Her belirsizlikte "kilit değil" tarafına düşülür (yanlış-negatif güvenli).

   LOCKED-LEGALİTE: kendi geometrik hareket üreticimiz. Bir taşın hamlesi =
   geometrinin izin verdiği + hedefte KENDİ taşı yok. Şah güvenliği (pin/açığa
   çıkan şah/sıra geçerliliği) yok sayılır. Gevşetmeler soundness-güvenli yönde.

   BEŞ KONTROL (sırayla; ilki eşleşince "kilit değil" döner):
   K1: 8 ≤ taş ≤ 30, tam 1+1 şah, vezir yok, her taraf ≥3 piyon, terfi-tutarlı.
   K2: piyon tuğlası (yön-duyarlı) + geometrik budama:
       <3 tuğla yetersiz; tam 3 tuğla → sütun deseni {a,d,g|b,d,g|b,e,g|b,e,h}
       + kavuşma eşitliği; ≥4 tuğla → bitişik+eşit-kavuşma çifti çapraz alım.
   K3: at/kale locked-legalite'de hareketsiz (iki taraf) + fil erken-kırıcısı
       (rakip eşik piyonu fille aynı renk + fil hareketli → kırıcı).
   K4: üç ana düğüm (piyon/fil/şah) × iki taraf, (b) tipi iç içe dallanma,
       her düğümde tüm kırıcılar (at/kale + piyon + fil alt-yayılım) + ep + mat.
       Fil-void budaması: filler etkisiz + piyonlar sabitse ana dal P,B atlanır.
   K5: şahın nihai soundness garantisi — figürler silinip yalnız piyon duvarı
       kalınca şah karşı şaha ulaşabiliyorsa kilit değildir.
   Sıra: her kontrol önce SIRASI OLAN tarafta, sonra rakipte aranır.
   ═══════════════════════════════════════════════════════════════════════ */

function makeLockDetector(PA) {
  const FILES = 'abcdefgh';

  function emptyBoard(){ const b=[]; for(let r=0;r<8;r++) b.push(['','','','','','','','']); return b; }
  function cloneBoard(b){ return b.map(row=>row.slice()); }
  function inB(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
  function isWhite(p){ return p && p===p.toUpperCase(); }
  function isBlack(p){ return p && p===p.toLowerCase(); }
  function sameSide(p,white){ return p && (isWhite(p)===white); }

  function fenToBoard(fen){
    const b=emptyBoard();
    const rows=fen.split(/\s+/)[0].split('/');
    if(rows.length!==8) return null;
    for(let r=0;r<8;r++){ let c=0;
      for(const ch of rows[r]){ if(/\d/.test(ch)) c+=+ch; else { if(c>7) return null; b[r][c]=ch; c++; } }
      if(c!==8) return null;
    }
    return b;
  }
  function boardToPlacement(b){
    const rows=[];
    for(let r=0;r<8;r++){ let e=0,s='';
      for(let c=0;c<8;c++){ if(!b[r][c]) e++; else { if(e){s+=e;e=0;} s+=b[r][c]; } }
      if(e)s+=e; rows.push(s);
    }
    return rows.join('/');
  }
  function boardToFen(b,white,ep){
    let epStr='-'; if(ep) epStr=FILES[ep.c]+(8-ep.r);
    return boardToPlacement(b)+' '+(white?'w':'b')+' - '+epStr+' 0 1';
  }

  const KNIGHT_D=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_D=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BISHOP_D=[[-1,-1],[-1,1],[1,-1],[1,1]];
  const ROOK_D=[[-1,0],[1,0],[0,-1],[0,1]];
  const QUEEN_D=BISHOP_D.concat(ROOK_D);

  function slideMoves(b,r,c,dirs,white){
    const out=[];
    for(const [dr,dc] of dirs){ let nr=r+dr,nc=c+dc;
      while(inB(nr,nc)){ const t=b[nr][nc];
        if(!t){ out.push({r:nr,c:nc,capture:false}); }
        else { if(isWhite(t)!==white) out.push({r:nr,c:nc,capture:true}); break; }
        nr+=dr; nc+=dc;
      }
    }
    return out;
  }
  function pawnMoves(b,r,c,white,ep){
    const out=[];
    const dir=white?-1:1, startRow=white?6:1, promoRow=white?0:7;
    const fr=r+dir;
    if(inB(fr,c) && !b[fr][c]){
      out.push({r:fr,c,capture:false,promo:fr===promoRow});
      const fr2=r+2*dir;
      if(r===startRow && inB(fr2,c) && !b[fr2][c]) out.push({r:fr2,c,capture:false});
    }
    for(const dc of [-1,1]){ const nr=r+dir,nc=c+dc;
      if(!inB(nr,nc)) continue;
      const t=b[nr][nc];
      if(t && isWhite(t)!==white) out.push({r:nr,c:nc,capture:true,promo:nr===promoRow});
      else if(ep && ep.r===nr && ep.c===nc) out.push({r:nr,c:nc,capture:true,ep:true});
    }
    return out;
  }
  function pieceMoves(b,r,c,ep){
    const p=b[r][c]; if(!p) return [];
    const white=isWhite(p), t=p.toUpperCase();
    switch(t){
      case 'P': return pawnMoves(b,r,c,white,ep);
      case 'N': return KNIGHT_D.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>inB(nr,nc)&&!sameSide(b[nr][nc],white)).map(([nr,nc])=>({r:nr,c:nc,capture:!!b[nr][nc]}));
      case 'K': return KING_D.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>inB(nr,nc)&&!sameSide(b[nr][nc],white)).map(([nr,nc])=>({r:nr,c:nc,capture:!!b[nr][nc]}));
      case 'B': return slideMoves(b,r,c,BISHOP_D,white);
      case 'R': return slideMoves(b,r,c,ROOK_D,white);
      case 'Q': return slideMoves(b,r,c,QUEEN_D,white);
    }
    return [];
  }
  function attackedByLL(b,r,c,byWhite){
    for(const [dr,dc] of KNIGHT_D){ const nr=r+dr,nc=c+dc; if(inB(nr,nc)){const t=b[nr][nc]; if(t&&t.toUpperCase()==='N'&&isWhite(t)===byWhite) return true;} }
    for(const [dr,dc] of KING_D){ const nr=r+dr,nc=c+dc; if(inB(nr,nc)){const t=b[nr][nc]; if(t&&t.toUpperCase()==='K'&&isWhite(t)===byWhite) return true;} }
    const pr=byWhite?r+1:r-1;
    for(const dc of [-1,1]){ const nc=c+dc; if(inB(pr,nc)){const t=b[pr][nc]; if(t&&t.toUpperCase()==='P'&&isWhite(t)===byWhite) return true;} }
    for(const [dr,dc] of BISHOP_D){ let nr=r+dr,nc=c+dc; while(inB(nr,nc)){const t=b[nr][nc]; if(t){ if(isWhite(t)===byWhite&&(t.toUpperCase()==='B'||t.toUpperCase()==='Q')) return true; break;} nr+=dr;nc+=dc;} }
    for(const [dr,dc] of ROOK_D){ let nr=r+dr,nc=c+dc; while(inB(nr,nc)){const t=b[nr][nc]; if(t){ if(isWhite(t)===byWhite&&(t.toUpperCase()==='R'||t.toUpperCase()==='Q')) return true; break;} nr+=dr;nc+=dc;} }
    return false;
  }
  function findKing(b,white){ const k=white?'K':'k'; for(let r=0;r<8;r++)for(let c=0;c<8;c++) if(b[r][c]===k) return {r,c}; return null; }

  function countMaterial(b){
    const W={P:0,R:0,N:0,B:0,Q:0,K:0},B={P:0,R:0,N:0,B:0,Q:0,K:0};
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const ch=b[r][c]; if(!ch) continue; const up=ch.toUpperCase(); (ch===up?W:B)[up]++; }
    return {W,B,total:W.P+W.R+W.N+W.B+W.Q+W.K+B.P+B.R+B.N+B.B+B.Q+B.K};
  }
  function promotionConsistent(c){
    if(c.P>8) return false;
    const extra=Math.max(0,c.R-2)+Math.max(0,c.N-2)+Math.max(0,c.B-2)+Math.max(0,c.Q-1);
    return extra<=(8-c.P);
  }
  function check1(b){
    const m=countMaterial(b);
    if(m.total<8||m.total>30) return {ok:false,why:'taş sayısı '+m.total+' (8–30 dışı)'};
    if(m.W.K!==1||m.B.K!==1) return {ok:false,why:'her tarafta tam 1 şah olmalı'};
    if(m.W.Q>0||m.B.Q>0) return {ok:false,why:'vezir bulunamaz'};
    if(m.W.P<3||m.B.P<3) return {ok:false,why:'her taraf en az 3 piyon'};
    if(!promotionConsistent(m.W)) return {ok:false,why:'beyaz materyal terfi-tutarsız'};
    if(!promotionConsistent(m.B)) return {ok:false,why:'siyah materyal terfi-tutarsız'};
    return {ok:true};
  }
  // KONTROL 2 — Piyon tuğlası + geometrik budama.
  //
  //   Tuğla (yön-duyarlı): aynı sütunda siyah 'p' üstte (satır r), hemen altında
  //   beyaz 'P' (satır r+1). İkisi de karşı karşıya kilitli — beyaz yukarı, siyah
  //   aşağı ilerleyemez. Kavuşma satırı = r + 0.5 (r ile temsil edilir).
  //
  //   Budamalar (yalnız "kilit değil" yönünde erken karar → soundness-güvenli,
  //   pahalı K4'e girmeden eler):
  //     • bricks < 3                → yetersiz.
  //     • bricks == 3               → sütunlar {a,d,g}|{b,d,g}|{b,e,g}|{b,e,h}
  //                                   desenlerinden biri DEĞİLSE elenir (aksi halde
  //                                   duvar tahtayı bölemez, ör. a,c,e → g,h boşluk).
  //                                   Ayrıca üç kavuşma (r) eşit değilse elenir.
  //     • bricks >= 4 (çoklu tuğla) → bitişik sütunda (|Δc|=1) ve eşit kavuşmada
  //                                   (Δr=0) iki tuğla varsa çapraz alım açılır
  //                                   (P@(r+1,c) ile p@(r,c±1) çapraz komşu) → elenir.
  function check2(b){
    const bricks = [];                       // {c, r}  (r = siyahın satırı; kavuşma r+0.5)
    for(let c=0;c<8;c++) for(let r=0;r<7;r++)
      if(b[r][c]==='p' && b[r+1][c]==='P') bricks.push({c, r});
    const n = bricks.length;

    if(n < 3) return {ok:false, bricks:n, why:'3 tuğla yok (bulunan: '+n+')'};

    if(n === 3){
      // Sütun deseni dört olası dizilimden biri mi? (0=a … 7=h)
      const cols = bricks.map(x=>x.c).sort((a,b)=>a-b);
      const key = cols.join(',');
      const OK3 = new Set(['0,3,6','1,3,6','1,4,6','1,4,7']); // a,d,g | b,d,g | b,e,g | b,e,h
      if(!OK3.has(key))
        return {ok:false, bricks:n, why:'3 tuğla geçersiz sütun deseni ('+cols.map(c=>FILES[c]).join(',')+') — duvar tahtayı bölemez'};
      // Kavuşma eşitliği: üç tuğla aynı r+0.5 hizasında olmalı.
      const r0 = bricks[0].r;
      if(!bricks.every(x=>x.r===r0))
        return {ok:false, bricks:n, why:'3 tuğla kavuşma hizası farklı (r+0.5 eşit değil)'};
      return {ok:true, bricks:n};
    }

    // n >= 4: çoklu tuğla — bitişik sütun + eşit kavuşma → çapraz alım → kilit değil.
    for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
      if(Math.abs(bricks[i].c-bricks[j].c)===1 && bricks[i].r===bricks[j].r)
        return {ok:false, bricks:n, why:'yan yana aynı hizada tuğla ('+FILES[bricks[i].c]+'/'+FILES[bricks[j].c]+' kavuşma '+(bricks[i].r+0.5)+') — çapraz alım'};
    }
    return {ok:true, bricks:n};
  }
  function knightRookHasMove(b,white){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const p=b[r][c];
      if(!p||isWhite(p)!==white) continue;
      const t=p.toUpperCase();
      if(t==='N'||t==='R'){ if(pieceMoves(b,r,c,null).length>0) return true; }
    }
    return false;
  }

  // KONTROL 3 — FİL ERKEN-KIRICISI (geometrik budama).
  //
  //   Eşik piyonları = tuğla oluşturan piyonlar (bitişik p/P çiftleri).
  //   Fil yalnız KENDİ renginde gezer/alır ve KENDİ piyonunu alamaz.
  //
  //   Bir fil ETKİSİZDİR (kilit olma ihtimali sürer → arama devam) eğer:
  //     • filin renginde KENDİ eşik piyonu varsa (o piyona dokunamaz), VEYA
  //     • RAKİP eşik piyonları filden FARKLI renkteyse (o piyonlara asla erişemez).
  //
  //   Kilit KIRILIR (kilit değil) eğer bunun TERSİ olursa, yani:
  //     • RAKİP eşik piyonu fille AYNI renkte (fil onu alabilir), VE
  //     • o filin locked-legalite geometrik hamlesi > 0 (fil hareketli).
  //
  //   Yalnız "kilit değil" yönünde erken karar → soundness-güvenli. Nadir "renk
  //   uyuşur ama fil yol tıkalı" durumları K4 tam taraması yakalar.
  function bishopEarlyBreak(b){
    // Eşik piyonları: HER SÜTUNDA tuğla varsa (hem siyah hem beyaz piyon mevcut),
    // o sütunun EN İLERİ beyazı (r en küçük) ve EN İLERİ siyahı (r en büyük).
    // Birikme olsa bile fil yalnız bu dış piyonları görür. Maskeler: bit0=light,1=dark.
    let whitePawnMask = 0, blackPawnMask = 0;
    for(let c=0;c<8;c++){
      let mostAdvBlack = -1, mostAdvWhite = 8;
      let hasBlack = false, hasWhite = false;
      for(let r=0;r<8;r++){
        if(b[r][c]==='p'){ hasBlack = true; if(r > mostAdvBlack) mostAdvBlack = r; }  // siyah ileri = büyük r
        else if(b[r][c]==='P'){ hasWhite = true; if(r < mostAdvWhite) mostAdvWhite = r; } // beyaz ileri = küçük r
      }
      if(hasBlack && hasWhite){                        // sütunda tuğla (karşı karşıya piyon) var
        blackPawnMask |= (1 << ((mostAdvBlack + c) & 1));
        whitePawnMask |= (1 << ((mostAdvWhite + c) & 1));
      }
    }
    if((whitePawnMask | blackPawnMask) === 0) return null;  // eşik piyonu yok

    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p !== 'B' && p !== 'b') continue;
      const bishopColorBit = 1 << ((r + c) & 1);
      const oppMask = (p === 'B') ? blackPawnMask : whitePawnMask;  // RAKİP eşik piyonları
      if(!(oppMask & bishopColorBit)) continue;        // rakip eşik piyonu filin renginde değil → etkisiz
      if(pieceMoves(b, r, c, null).length > 0)         // fil hareketli mi
        return { r, c, white: (p === 'B') };
    }
    return null;
  }

  // FİL-VOID BUDAMASI (K4 hızlandırma).
  //   Koşul: (a) İKİ tarafın da TÜM filleri, kendi renginde HİÇBİR rakip taşa (piyon,
  //   fil, at, kale) sahip değil → alacak hiçbir şey yok → hiçbir alım-kırıcısı üretemez
  //   VE (b) İKİ tarafın da TÜM piyonları locked-legalite'de hareketsiz (0 hamle).
  //   Sağlanırsa K4 ana dal 1 (P) ve 2 (B) atlanır; ana dal 3 (K) yine çalışır.
  //   Yalnız gereksiz tekrarı eler; completeness ve soundness korunur.
  //
  //   NOT: Filin renginde rakip taş yoksa fil hiçbir alım yapamaz; mat da veremez
  //   (fil şaha ancak kendi renginden bir kareden şah çeker, ama karşı şah da o an
  //   fil-renginde değilse zaten şah yok; şah dalı K bu ince durumu yine sınar).
  function bishopsFullyVoid(b){
    // (a) Her fil için: filin renginde rakip taş var mı? Varsa void değil.
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p !== 'B' && p !== 'b') continue;
      const bishopColor = (r + c) & 1;
      const bishopWhite = (p === 'B');
      // filin renginde herhangi bir rakip taş (piyon dahil) ara
      for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++){
        if(((rr + cc) & 1) !== bishopColor) continue;   // sadece fil rengindeki kareler
        const q = b[rr][cc];
        if(!q) continue;
        const qWhite = (q === q.toUpperCase());
        if(qWhite !== bishopWhite) return false;          // fil renginde rakip taş → void değil
      }
    }
    // (b) Her piyon (iki taraf) locked-legalite'de hareketsiz mi?
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p !== 'P' && p !== 'p') continue;
      if(pieceMoves(b, r, c, null).length > 0) return false;
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────
  // KİLİT-KIRICI TESTLERİ (locked-legalite tabanlı, belirli board üstünde)
  // ─────────────────────────────────────────────────────────────────────

  // At/kale HERHANGI bir tarafta hareketli mi?
  function anyKnightRookMobile(b) {
    return knightRookHasMove(b, true) || knightRookHasMove(b, false);
  }

  // (r,c) karesi byWhite PİYONU tarafından tehdit ediliyor mu?
  function pawnAttacksSquare(b, r, c, byWhite) {
    const pr = byWhite ? r+1 : r-1;
    for (const dc of [-1,1]) { const nc=c+dc; if(inB(pr,nc)){ const t=b[pr][nc]; if(t&&t.toUpperCase()==='P'&&isWhite(t)===byWhite) return true; } }
    return false;
  }

  // Fil şah çekiyor: gerçek satranç kurallarıyla mat mı? (algoritma↔gerçek köprü)
  //
  // Fil (fr,fc)'den karşı şahın karesine (tr,tc) "capture" hamlesi üretilmiştir —
  // bu gerçekte şahı ALMAK değil, ŞAH ÇEKMEKTİR (fil şaha bakıyor). Doğru test:
  // fil kaynağında (fr,fc) DURURKEN, karşı taraf sıradayken şah çekiliyor mu ve
  // hiç yasal hamlesi yok mu (= mat)? Fili şahın karesine koymayız (o şahı silerdi
  // ve geçersiz pozisyon üretirdi).
  //
  // Belirsizlik (pozisyon motorca geçersiz) → true (kilit değil = kilidi kırar).
  function bishopCheckIsMate(b, fr, fc, tr, tc, white) {
    // Şah ana düğüm simülasyonunda karşı şah SİLİNMİŞ olabilir. Şahsız bir board'da
    // "mat" kavramı yoktur; bu bir locked-legalite artefaktıdır, gerçek mat değil.
    // (Fil şah-çekme-mat kırıcısı zaten FİL ana düğümde, şahlar yerindeyken doğru
    //  taranır.) Şahsızsa bu dal kırıcı değildir.
    if (!findKing(b, true) || !findKing(b, false)) return false;
    // Fil zaten (fr,fc)'de ve karşı şaha bakıyor. Sırayı karşı tarafa ver.
    const fen = boardToFen(b, !white, null);
    const p = PA.createPosition();
    const r = p.loadFen(fen);
    if (!r.ok) return true;                   // geçersiz → belirsizlik → kilidi kırar
    if (!p.inCheck()) return false;           // aslında şah çekmiyormuş → mat değil
    return p.legalMoves().length === 0;       // gerçek mat mı?
  }

  const MAX_NODES = 200000;   // ana ve alt yayılım için güvenlik tavanı

  // ── ALT-YAYILIM: bir taş türü (P veya B), verilen board'da, DİĞER taşlar sabit
  //    iken, çok-adımlı locked-legalite hareketiyle bir KİLİT-KIRICI açabiliyor mu?
  //    (Bu, (b) tipi dallanmanın "iç dal"ıdır — piyon terfiye ilerleyebilir,
  //     fil gezip taş yiyebilir.)
  //
  //    kind: 'P' | 'B',  moverWhite: hangi renk bu taşı oynatıyor
  //    Döner: true = kırıcı açıldı.
  function subSpreadBreaks(board0, kind, moverWhite, epRoot) {
    const seen = new Set();
    const key = (b)=>boardToPlacement(b);
    // Stack: [board, epSq]. Ep hakkı YALNIZ kök düğümde geçerlidir (bir hamle sonrası
    // kaybolur), o yüzden yalnız kök board'a epRoot bağlanır; türetilenlere null.
    let stack = [[cloneBoard(board0), epRoot||null]];
    seen.add(key(board0));
    let nodes = 0;

    while (stack.length) {
      if (++nodes > MAX_NODES) return true;   // tavan → belirsizlik → kırıcı say
      const [b, epSq] = stack.pop();

      // Bu board'da bu taş türünün bir KIRICI hamlesi var mı? + at/kale legalitesi?
      if (anyKnightRookMobile(b)) return true;

      for (let r=0;r<8;r++) for (let c=0;c<8;c++){
        const p=b[r][c];
        if(!p || p.toUpperCase()!==kind || isWhite(p)!==moverWhite) continue;
        const moves = (kind==='P') ? pawnMoves(b,r,c,moverWhite,epSq) : slideMoves(b,r,c,BISHOP_D,moverWhite);
        for (const mv of moves) {
          if (kind==='P') {
            if (mv.promo) return true;                       // terfi → kırıcı
            if (mv.ep) return true;                          // en passant (sütun-değiştiren alım) → kırıcı
            if (mv.capture && mv.c!==c) return true;         // çapraz alım → kırıcı
            // düz ilerleme (geri-alınabilir): yeni node (ep hakkı düşer → null)
            if (!mv.capture) {
              const nb=cloneBoard(b); nb[mv.r][mv.c]=nb[r][c]; nb[r][c]='';
              const nk=key(nb); if(!seen.has(nk)){seen.add(nk); stack.push([nb,null]);}
            }
          } else { // fil
            if (mv.capture) {
              const target=b[mv.r][mv.c];
              const oppKing = moverWhite ? 'k' : 'K';
              if (target!==oppKing) return true;             // taş yer → kırıcı
              if (bishopCheckIsMate(b,r,c,mv.r,mv.c,moverWhite)) return true; // şah çek+mat
              // karşı şaha değme ama mat değil → o hamleye gidilmez (önemsiz)
            } else {
              // boş kareye kayma (geri-alınabilir): yeni node
              const nb=cloneBoard(b); nb[mv.r][mv.c]=nb[r][c]; nb[r][c]='';
              const nk=key(nb); if(!seen.has(nk)){seen.add(nk); stack.push([nb,null]);}
            }
          }
        }
      }
    }
    return false;
  }

  // ── Bir board'da, verilen (ana taş dışı) İKİ taş türü için alt-yayılım kırıcı arar.
  //    otherKinds: ['P','B'] gibi — ana taş hangisiyse o hariç.
  function otherPiecesBreak(b, otherKinds) {
    for (const kind of otherKinds) {
      // her iki renk için (piyon/fil iki tarafta da olabilir)
      if (subSpreadBreaks(b, kind, true))  return true;
      if (subSpreadBreaks(b, kind, false)) return true;
    }
    return false;
  }

  // ── ANA YAYILIM: ana taş çok-adımlı yayılır; HER node'da diğer iki taşın
  //    alt-yayılımı (otherPiecesBreak) çağrılır.
  //
  //    moverKind: 'P' | 'B' | 'K'.  Şah ana düğümse karşı şah SİLİNİR ve şah
  //    karşı PİYON tehdidine takılır (fil/şah tehdidi yok sayılır).
  //    Şah alımla da ilerler (kırıcı değil); alımda ziyaret sıfırlanır.
  //    Piyon/fil ana düğümde sadece geri-alınabilir hamlelerle gezer (kırıcı
  //    hamleler zaten alt-yayılım/boardHasBreaker'da yakalanır).
  function mainSpread(board0, moverKind, moverWhite, epSq, epWhite) {
    let b0 = cloneBoard(board0);
    if (moverKind === 'K') {
      const ok = findKing(b0, !moverWhite);
      if (ok) b0[ok.r][ok.c] = '';
    }
    const otherKinds = moverKind==='K' ? ['P','B'] : moverKind==='P' ? ['B'] : ['P'];
    // NOT: ana taş ne olursa olsun, HER node'da anyBreakerFull(b) çağrılır (ana-taş
    // hariç türler + o türün diğer örnekleri + at/kale). Ep hakkı yalnız KÖK düğümde
    // geçerli (bir hamle sonrası düşer), o yüzden ep yalnız stack'teki kök board'a bağlanır.

    const seen = new Set();
    const key = (b)=>boardToPlacement(b);
    let stack = [[b0, epSq||null]];         // [board, epSq]; kök ep taşır, türetilenler null
    seen.add(key(b0));
    let nodes = 0;

    while (stack.length) {
      if (++nodes > MAX_NODES) return true;
      const [b, ep] = stack.pop();

      // HER node'da: tüm kilit-kırıcılar. Ep yalnız kök düğümde (ep!=null) devrede.
      if (anyBreakerFull(b, ep, epWhite)) return true;

      // Ana taşı bir adım gezdir
      if (moverKind === 'K') {
        const k = findKing(b, moverWhite);
        if (!k) continue;
        for (const [dr,dc] of KING_D) {
          const nr=k.r+dr, nc=k.c+dc;
          if(!inB(nr,nc)) continue;
          if(sameSide(b[nr][nc],moverWhite)) continue;
          if(pawnAttacksSquare(b,nr,nc,!moverWhite)) continue;   // karşı piyon tehdidi
          const cap = !!b[nr][nc];
          const nb=cloneBoard(b); nb[nr][nc]=nb[k.r][k.c]; nb[k.r][k.c]='';
          if (cap) { seen.clear(); const nk=key(nb); seen.add(nk); stack=[[nb,null]]; break; }
          else { const nk=key(nb); if(!seen.has(nk)){seen.add(nk); stack.push([nb,null]);} }
        }
      } else {
        const kind = moverKind;
        for (let r=0;r<8;r++) for (let c=0;c<8;c++){
          const p=b[r][c];
          if(!p || p.toUpperCase()!==kind || isWhite(p)!==moverWhite) continue;
          const moves = (kind==='P') ? pawnMoves(b,r,c,moverWhite,null) : slideMoves(b,r,c,BISHOP_D,moverWhite);
          for (const mv of moves) {
            if (mv.capture || mv.promo) continue;   // kırıcılar anyBreakerFull'da
            const nb=cloneBoard(b); nb[mv.r][mv.c]=nb[r][c]; nb[r][c]='';
            const nk=key(nb); if(!seen.has(nk)){seen.add(nk); stack.push([nb,null]);}
          }
        }
      }
    }
    return false;
  }

  // ── Bir board'da TÜM kilit-kırıcılar var mı? (at/kale + piyon + fil alt-yayılım)
  //    Bu, her ana-node'da çağrılır. Piyon ve fil çok-adımlı alt-yayılımla aranır.
  function anyBreakerFull(b, epSq, epWhite) {
    if (anyKnightRookMobile(b)) return true;
    // Ep hakkı yalnız SIRASI OLAN tarafındır → yalnız o tarafın piyon taramasına geçir.
    if (subSpreadBreaks(b, 'P', true,  epWhite===true  ? epSq : null)) return true;
    if (subSpreadBreaks(b, 'P', false, epWhite===false ? epSq : null)) return true;
    if (subSpreadBreaks(b, 'B', true))  return true;
    if (subSpreadBreaks(b, 'B', false)) return true;
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────
  // KONTROL 5 — ŞAHIN NİHAİ SOUNDNESS GARANTİSİ
  //
  //   Tahtadaki TÜM PİYONLAR hariç TÜM TAŞLAR silinir: her iki tarafın da
  //   şah/fil/at/kalesi kaldırılır; her iki tarafın PİYONLARI (duvar) durur.
  //   Geriye yalnızca piyonlar + sanal olarak konumlandırılan hareket eden şah
  //   kalır. Test edilen şah:
  //     • karşı piyonların TEHDİT ettiği karelere giremez (duvar),
  //     • KENDİ piyonlarının bulunduğu karelere giremez (kendi duvarı),
  //     • karşı piyonların bulunduğu karelere de giremez (dolu),
  //   ve KARŞI ŞAHIN (orijinal) karesine ulaşabiliyor mu?  Ulaşabiliyorsa
  //   → kilit DEĞİL. Sırayla iki şah için de bakılır.
  //
  //   Soundness: şaha karşı-figür engeli olmadan (yalnız piyon duvarları) hareket
  //   serbestliği verilir; en iyi ihtimalde bile karşıya geçemiyorsa gerçek oyunda
  //   da geçemez → yalnız ek bir GEREKLİLİK koşuludur (yanlış-pozitif üretmez).
  //
  //   Döner: true = karşı şahın karesine ulaştı (KIRICI). false = ulaşamadı.
  function kingReachesOpponent(board0, moverWhite) {
    const myK = findKing(board0, moverWhite);
    const opK = findKing(board0, !moverWhite);
    if (!myK || !opK) return true;            // belirsizlik → güvenli tarafa (kırıcı)
    const target = opK.r + ',' + opK.c;

    // TÜM piyonları bırak (iki taraf da), figürleri sil.
    const b = emptyBoard();
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const ch = board0[r][c];
      if (ch === 'P' || ch === 'p') b[r][c] = ch;   // yalnız piyonlar durur
    }

    // BFS: şah myK'dan başlar; boş + iki-taraf-piyon-tehditsiz + dolu-olmayan
    // karelere yayılır. Hedef karşı şahın karesi.
    const seen = new Set();
    let frontier = [[myK.r, myK.c]];
    seen.add(myK.r + ',' + myK.c);
    let nodes = 0;

    while (frontier.length) {
      const next = [];
      for (const [r,c] of frontier) {
        if (++nodes > MAX_NODES) return true;   // tavan → belirsizlik → kırıcı
        for (const [dr,dc] of KING_D) {
          const nr=r+dr, nc=c+dc;
          if (!inB(nr,nc)) continue;
          const kk = nr + ',' + nc;
          if (seen.has(kk)) continue;
          if (kk === target) return true;        // karşı şahın karesine ulaştı → kırıcı
          if (b[nr][nc]) continue;               // dolu (herhangi bir piyon) → giremez
          // karşı piyon tehdidi (duvar):
          if (pawnAttacksSquare(b, nr, nc, !moverWhite)) continue;
          seen.add(kk);
          next.push([nr,nc]);
        }
      }
      frontier = next;
    }
    return false;                                // karşıya hiç ulaşamadı → kilit lehine
  }

  // ─────────────────────────────────────────────────────────────────────
  // TAM KİLİT TESPİTİ
  // ─────────────────────────────────────────────────────────────────────
  function isLocked(fen) {
    const p = PA.createPosition();
    const r = p.loadFen(fen);
    if (!r.ok) return { locked:false, reason:'Geçersiz FEN: '+(r.error||'') };
    const b = fenToBoard(p.getFen());
    if (!b) return { locked:false, reason:'tahta ayrıştırılamadı' };

    const k1 = check1(b);
    if (!k1.ok) return { locked:false, reason:'K1 — '+k1.why };
    const k2 = check2(b);
    if (!k2.ok) return { locked:false, reason:'K2 — '+k2.why };

    // Sıra düzeni: ilk hamleyi SIRASI OLAN taraf yapar; kırıcı önce onda aranır,
    // sonra rakipte. (Kilit sonucu sıradan bağımsızdır ama doğru sıra + doğru
    // gerekçe için: sideToMove önce.) side[0]=sıradaki, side[1]=rakip.
    const stm = p.turnWhite();
    const sides = [stm, !stm];
    const nm = (w)=> w ? 'beyaz' : 'siyah';

    // K3: at/kale hareketsiz (iki taraf) + fil erken-kırıcısı
    for (const w of sides)
      if (knightRookHasMove(b, w)) return { locked:false, reason:'K3 — '+nm(w)+' at/kale hareketli' };
    const bEB = bishopEarlyBreak(b);
    if (bEB) return { locked:false, reason:'K3 — '+nm(bEB.white)+' fil ('+FILES[bEB.c]+(8-bEB.r)+') eşik piyonuyla aynı renkte ve hareketli' };

    // En passant: motorun ep karesi (p.ep) K4 KÖK düğümüne geçirilir; orada piyon
    // çapraz-alım taraması ep alımını (mv.ep) kırıcı olarak yakalar. Ep hakkı yalnız
    // sırası olan taraftadır (epWhite). Ayrı ep bloğuna gerek yok — doğal akışta.
    const epSq = (p.ep !== -1) ? { r: (p.ep >> 4), c: (p.ep & 7) } : null;
    const epWhite = stm;

    // K4: üç ana düğüm × iki taraf (sıradaki önce). Fil-void ise ana dal 1 (P) ve
    // 2 (B) atlanır, yalnız ana dal 3 (K) çalışır (gereksiz fil boyamasını eler).
    const nodes = bishopsFullyVoid(b) ? ['K'] : ['P','B','K'];
    for (const kind of nodes)
      for (const w of sides)
        if (mainSpread(b, kind, w, epSq, epWhite)) return { locked:false, reason:'K4 — '+nm(w)+' '+kind+' ana düğümünde kilit-kırıcı' };
    // K5: şahın nihai soundness garantisi — sıradaki taraf önce, sonra rakip.
    for (const w of sides)
      if (kingReachesOpponent(b, w)) return { locked:false, reason:'K5 — '+nm(w)+' şah karşı şaha ulaşabiliyor' };

    return { locked:true, reason:'K1–K5 geçti — MUTLAK KİLİT' };
  }

  return {
    emptyBoard,cloneBoard,inB,isWhite,isBlack,sameSide,
    fenToBoard,boardToPlacement,boardToFen,
    pieceMoves,pawnMoves,slideMoves,attackedByLL,findKing,
    countMaterial,promotionConsistent,check1,check2,knightRookHasMove,bishopEarlyBreak,bishopsFullyVoid,
    anyKnightRookMobile,pawnAttacksSquare,bishopCheckIsMate,
    subSpreadBreaks,otherPiecesBreak,anyBreakerFull,mainSpread,kingReachesOpponent,isLocked,
    KNIGHT_D,KING_D,BISHOP_D,ROOK_D,QUEEN_D,FILES,
  };
}

if (typeof module !== 'undefined') module.exports = { makeLockDetector };
