"""Generates the BarSafe client-guide HyperFrames project.
Every scene shares one stage and one phone at the same place, so screens chain without visible cuts.
Phone UI is drawn at >= 28 px (the phone read floor on a 1080 px wide frame)."""
import os, sys

OUT = sys.argv[1]
COMP = os.path.join(OUT, 'compositions')
os.makedirs(COMP, exist_ok=True)

SHARED_CSS = """
  #root { position: absolute; inset: 0; overflow: hidden; background: #151210; color: #F4ECE0; font-family: 'Outfit', sans-serif; }
  .stage { position: absolute; inset: 0; background: radial-gradient(120% 60% at 80% 0%, rgba(224,163,62,0.16), transparent 60%), #151210; }
  .cap { position: absolute; left: 90px; right: 90px; top: 200px; }
  .step { font-weight: 600; font-size: 30px; letter-spacing: 0.2em; text-transform: uppercase; color: #E0A33E; }
  .title { font-family: 'Playfair Display'; font-weight: 600; font-size: 80px; line-height: 1.04; letter-spacing: -0.01em; margin-top: 16px; color: #F4ECE0; }
  .title .w { display: inline-block; margin-right: 0.22em; }
  .title em { color: #E0A33E; font-style: italic; }
  .phone { position: absolute; left: 300px; top: 480px; width: 480px; height: 880px; border-radius: 66px; background: #0B0907; padding: 13px;
           box-shadow: 0 60px 120px -40px rgba(0,0,0,0.9), inset 0 0 0 2px #2B241D; }
  .screen { position: relative; width: 100%; height: 100%; border-radius: 54px; overflow: hidden; background: #FAF4EA; color: #1A1512; }
  .notch { position: absolute; top: 12px; left: 50%; width: 120px; height: 32px; margin-left: -60px; border-radius: 20px; background: #0B0907; z-index: 5; }
  .app-top { display: flex; justify-content: space-between; align-items: center; padding: 66px 24px 20px; }
  .bar-name { font-family: 'Playfair Display'; font-weight: 700; font-size: 36px; }
  .badge-table { background: #E0A33E; color: #1A1512; font-weight: 700; font-size: 28px; padding: 8px 16px; border-radius: 16px; }
  .item { display: flex; gap: 16px; align-items: center; margin: 0 18px 14px; background: #FFFDF9; border-radius: 26px; padding: 12px;
          box-shadow: 0 10px 24px -16px rgba(26,21,18,0.35); }
  .item img { width: 112px; height: 112px; border-radius: 20px; object-fit: cover; flex-shrink: 0; }
  .item .name { font-weight: 600; font-size: 28px; line-height: 1.15; }
  .item .price { font-family: 'Playfair Display'; font-weight: 700; font-size: 30px; color: #A66A16; margin-top: 6px; }
  .add { position: relative; margin-left: auto; width: 60px; height: 60px; border-radius: 18px; background: rgba(224,163,62,0.2); color: #A66A16;
         font-size: 36px; font-weight: 700; flex-shrink: 0; overflow: hidden; }
  .add .fill { position: absolute; inset: 0; background: #E0A33E; opacity: 0; }
  .add .v { position: absolute; inset: 0; display: grid; place-items: center; }
  .add .q { color: #1A1512; font-size: 30px; opacity: 0; }
  .stack { position: relative; display: block; }
  .stack > span { position: absolute; left: 0; top: 0; opacity: 0; white-space: nowrap; }
  .stack > span:first-child { position: relative; opacity: 1; }
  .label { position: absolute; background: #FFFDF9; color: #1A1512; font-weight: 600; font-size: 32px; padding: 18px 24px; border-radius: 24px;
           box-shadow: 0 30px 60px -24px rgba(0,0,0,0.7); white-space: nowrap; }
  .label .ok { display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: #2B7858; margin-right: 14px; vertical-align: middle; }
"""

GSAP_HELPERS = """
    // Title words: blur(6px) -> 0 and opacity 0 -> 1, 0.067 s apart (no translate)
    function wordsIn(tl, sel, at) {
      tl.fromTo(sel + ' .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.16, ease: 'power4.out', stagger: 0.067 }, at);
    }
    function capOut(tl, sel, at) {
      tl.to(sel, { opacity: 0, filter: 'blur(8px)', duration: 0.2, ease: 'power3.in' }, at);
    }
"""

def words(text):
    out = []
    for w in text.split(' '):
        if w.startswith('*') and w.endswith('*'):
            out.append(f'<span class="w"><em>{w[1:-1]}</em></span>')
        elif w.startswith('*'):
            out.append(f'<span class="w"><em>{w[1:]}')
        elif w.endswith('*'):
            out.append(f'{w[:-1]}</em></span>')
        else:
            out.append(f'<span class="w">{w}</span>')
    return ''.join(out)

def emwords(text):
    """'a b *c d*' -> each word its own span; the starred run is the accent."""
    out, accent = [], False
    for w in text.split(' '):
        start, end = w.startswith('*'), w.endswith('*')
        w = w.strip('*')
        accent = accent or start
        out.append(f'<span class="w">{"<em>" + w + "</em>" if accent else w}</span>')
        if end:
            accent = False
    return ''.join(out)

def caption(prefix, step, title):
    return f"""
    <div class="cap" id="{prefix}-cap">
      <div class="step" id="{prefix}-step">{step}</div>
      <div class="title" id="{prefix}-title">{emwords(title)}</div>
    </div>"""

def scene(cid, css, body, script):
    return f"""<template>
  <style>{SHARED_CSS}{css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920">
    <div class="stage"></div>{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});{GSAP_HELPERS}{script}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""

def add_btn(p, n):
    return (f'<div class="add" id="{p}-a{n}"><span class="fill" id="{p}-a{n}-fill"></span>'
            f'<span class="v" id="{p}-a{n}-plus">+</span><span class="v q" id="{p}-a{n}-q1">1</span><span class="v q" id="{p}-a{n}-q2">2</span></div>')

def menu(p):
    return f"""
          <div class="app-top" id="{p}-top"><span class="bar-name">Le Maquis</span><span class="badge-table" id="{p}-badge">Table 4</span></div>
          <div class="item" id="{p}-i1"><img src="assets/cocktails.webp" alt=""><div><div class="name">Cocktail maison</div><div class="price">3 500 F</div></div>{add_btn(p, 1)}</div>
          <div class="item" id="{p}-i2"><img src="assets/pour.webp" alt=""><div><div class="name">Whisky glace</div><div class="price">4 000 F</div></div>{add_btn(p, 2)}</div>
          <div class="item" id="{p}-i3"><img src="assets/plate.webp" alt=""><div><div class="name">Brochettes</div><div class="price">2 500 F</div></div>{add_btn(p, 3)}</div>"""

scenes = []

# ---------------------------------------------------------------- 1. Hook (frame 0 already says it)
scenes.append(('hook', 4.5, """
  #hook-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  #hook-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,10,8,0.55) 0%, rgba(13,10,8,0.82) 55%, rgba(13,10,8,0.96) 100%); }
  #hook-brand { position: absolute; top: 210px; left: 0; right: 0; display: flex; justify-content: center; }
  .brand-pill { display: flex; align-items: center; gap: 16px; padding: 14px 28px 14px 14px; border-radius: 999px; background: rgba(244,236,224,0.1); border: 1.5px solid rgba(244,236,224,0.18); }
  .brand-mark { width: 58px; height: 58px; border-radius: 16px; background: #E0A33E; display: grid; place-items: center; }
  .brand-word { font-family: 'Playfair Display'; font-weight: 700; font-size: 40px; color: #F4ECE0; }
  .brand-word span { color: #E0A33E; }
  #hook-head { position: absolute; left: 90px; right: 90px; top: 620px; font-family: 'Playfair Display'; font-weight: 600; font-size: 128px; line-height: 1.0; letter-spacing: -0.02em; }
  #hook-head em { color: #E0A33E; font-style: italic; }
  #hook-sub { position: absolute; left: 90px; right: 90px; top: 1110px; font-size: 48px; font-weight: 500; color: rgba(244,236,224,0.88); }
  #hook-sub .w { display: inline-block; margin-right: 0.35em; }
""", """
    <img id="hook-photo" src="assets/hero-bar.webp" alt="">
    <div id="hook-shade"></div>
    <div id="hook-brand"><div class="brand-pill" id="hook-pill"><div class="brand-mark"><svg width="30" height="30" viewBox="0 0 32 32"><path d="M5 7h22l-9 9.6V25h4v2H10v-2h4v-8.4z" fill="#151210"/></svg></div><div class="brand-word">Bar<span>Safe</span></div></div></div>
    <div id="hook-head"><div id="hook-l1">Au bar,</div><div id="hook-l2">commandez</div><div id="hook-l3"><em>sans attendre.</em></div></div>
    <div id="hook-sub"><span class="w">Scannez.</span><span class="w">Commandez.</span><span class="w">Suivez.</span></div>
""", """
    tl.fromTo('#hook-l3', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power4.out' }, 0.25);
    tl.fromTo('#hook-photo', { scale: 1.12 }, { scale: 1.0, duration: 1.4, ease: 'expo.out' }, 0);
    tl.fromTo('#hook-pill', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 0.8);
    tl.fromTo('#hook-sub .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.18, ease: 'power4.out', stagger: 0.32 }, 1.5);
    tl.to(['#hook-head', '#hook-sub', '#hook-brand'], { opacity: 0, filter: 'blur(10px)', duration: 0.22, ease: 'power3.in' }, 4.15);
    tl.to('#hook-photo', { opacity: 0, duration: 0.25, ease: 'power2.in' }, 4.15);
"""))

# ---------------------------------------------------------------- 2. Scan
scenes.append(('scan', 6.0, """
  #scan-tent { position: absolute; left: 290px; top: 560px; width: 500px; border-radius: 42px; background: #FFFDF9; padding: 36px; color: #1A1512;
               box-shadow: 0 60px 120px -40px rgba(0,0,0,0.9); }
  .tent-head { display: flex; justify-content: space-between; align-items: center; }
  .tent-brand { font-family: 'Playfair Display'; font-weight: 700; font-size: 40px; }
  .tent-table { font-size: 30px; font-weight: 700; color: #6B5D4F; }
  .tent-qr { margin-top: 26px; padding: 24px; background: #fff; border-radius: 26px; border: 2px solid rgba(26,21,18,0.08); }
  .tent-qr img { width: 100%; display: block; }
  .tent-cta { margin-top: 24px; text-align: center; font-family: 'Playfair Display'; font-weight: 600; font-size: 40px; }
  #scan-screen { background: #0D0A08; }
  #scan-hint { position: absolute; left: 0; right: 0; top: 92px; text-align: center; color: rgba(244,236,224,0.8); font-size: 28px; }
  #scan-view { position: absolute; left: 57px; top: 180px; width: 340px; height: 340px; }
  #scan-view img { position: absolute; inset: 26px; width: 288px; height: 288px; border-radius: 12px; background: #fff; padding: 16px; }
  .corner { position: absolute; width: 62px; height: 62px; border-color: #E0A33E; border-style: solid; border-width: 0; }
  .c1 { left: 0; top: 0; border-left-width: 7px; border-top-width: 7px; border-top-left-radius: 20px; }
  .c2 { right: 0; top: 0; border-right-width: 7px; border-top-width: 7px; border-top-right-radius: 20px; }
  .c3 { left: 0; bottom: 0; border-left-width: 7px; border-bottom-width: 7px; border-bottom-left-radius: 20px; }
  .c4 { right: 0; bottom: 0; border-right-width: 7px; border-bottom-width: 7px; border-bottom-right-radius: 20px; }
  #scan-line { position: absolute; left: 20px; right: 20px; top: 26px; height: 5px; border-radius: 5px; background: #E0A33E; box-shadow: 0 0 24px 4px rgba(224,163,62,0.7); }
  #scan-found { position: absolute; left: 30px; right: 30px; top: 600px; background: #FFFDF9; color: #1A1512; border-radius: 24px; padding: 22px;
                font-weight: 600; font-size: 30px; text-align: center; }
  #scan-found b { color: #A66A16; }
  #scan-flash { position: absolute; inset: 0; background: #FAF4EA; opacity: 0; }
""", caption('scan', 'Étape 1', 'Scannez le QR code *de votre table.*') + """
    <div id="scan-tent">
      <div class="tent-head"><span class="tent-brand">BarSafe</span><span class="tent-table">Table 4</span></div>
      <div class="tent-qr"><img src="assets/qr-table-4.svg" alt="QR code de la table 4"></div>
      <div class="tent-cta">Scannez pour commander</div>
    </div>
    <div class="phone" id="scan-phone" data-layout-allow-occlusion><div class="screen" id="scan-screen"><div class="notch"></div>
      <div id="scan-hint">Appareil photo</div>
      <div id="scan-view"><img src="assets/qr-table-4.svg" alt=""><span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span><div id="scan-line"></div></div>
      <div id="scan-found">Menu trouvé · <b>Table 4</b></div>
      <div id="scan-flash"></div>
    </div></div>
""", """
    tl.fromTo('#scan-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#scan-title', 0.15);
    tl.fromTo('#scan-tent', { opacity: 0, y: 80, rotation: -2 }, { opacity: 1, y: 0, rotation: -4, duration: 0.8, ease: 'expo.out' }, 0.2);
    // The phone rises over the tent card; the card steps back out of focus
    tl.fromTo('#scan-phone', { y: 1000 }, { y: 0, duration: 0.9, ease: 'expo.out' }, 1.7);
    tl.to('#scan-tent', { x: -190, scale: 0.84, opacity: 0, filter: 'blur(4px)', duration: 0.8, ease: 'power2.inOut' }, 1.75);
    tl.fromTo('#scan-line', { y: 0 }, { y: 282, duration: 0.9, ease: 'power1.inOut' }, 2.7);
    tl.to('#scan-line', { y: 0, duration: 0.6, ease: 'power1.inOut' }, 3.6);
    tl.fromTo('#scan-found', { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 4.2);
    tl.fromTo('#scan-flash', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.in' }, 5.55);
    capOut(tl, '#scan-cap', 5.75);
"""))

# ---------------------------------------------------------------- 3. Menu
scenes.append(('menu', 6.5, """
  #menu-label { left: 806px; top: 560px; }
""", caption('menu', 'Étape 2', 'Le menu s’ouvre, *table déjà indiquée.*') + f"""
    <div class="phone" id="menu-phone"><div class="screen"><div class="notch"></div>{menu('menu')}
    </div></div>
    <div class="label" id="menu-label" data-layout-allow-overlap data-layout-allow-occlusion><span class="ok"></span>Table 4</div>
""", """
    tl.fromTo('#menu-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#menu-title', 0.15);
    // Content builds out of the scan flash
    tl.fromTo('#menu-top', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.1);
    tl.fromTo(['#menu-i1', '#menu-i2', '#menu-i3'], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08 }, 0.35);
    // The table badge: emphasised, then named outside the phone
    tl.to('#menu-badge', { scale: 1.14, duration: 0.25, ease: 'power2.out' }, 1.9);
    tl.to('#menu-badge', { scale: 1, duration: 0.35, ease: 'power2.inOut' }, 2.15);
    tl.fromTo('#menu-label', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, 2.15);
    tl.to('#menu-label', { opacity: 0, duration: 0.2, ease: 'power2.in' }, 5.6);
    capOut(tl, '#menu-cap', 6.2);
"""))

# ---------------------------------------------------------------- 4. Cart
scenes.append(('cart', 6.5, """
  #cart-bar { position: absolute; left: 14px; right: 14px; bottom: 16px; background: #1A1512; color: #F4ECE0; border-radius: 28px; padding: 18px 20px;
              display: flex; justify-content: space-between; align-items: center; }
  #cart-count { font-size: 28px; color: rgba(244,236,224,0.78); width: 200px; height: 34px; }
  #cart-total { font-family: 'Playfair Display'; font-weight: 700; font-size: 36px; width: 240px; height: 44px; margin-top: 2px; }
  #cart-btn { width: 72px; height: 72px; border-radius: 22px; background: #E0A33E; display: grid; place-items: center; }
""", caption('cart', 'Étape 3', 'Ajoutez vos *boissons et plats.*') + f"""
    <div class="phone" id="cart-phone"><div class="screen"><div class="notch"></div>{menu('cart')}
      <div id="cart-bar"><div><div id="cart-count" class="stack"><span id="cart-c1">1 article</span><span id="cart-c2">2 articles</span><span id="cart-c3">3 articles</span></div><div id="cart-total" class="stack"><span id="cart-t1">3 500 FCFA</span><span id="cart-t2">6 000 FCFA</span><span id="cart-t3">9 500 FCFA</span></div></div><div id="cart-btn"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M5 12h12M12 6l6 6-6 6" stroke="#1A1512" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
    </div></div>
""", """
    tl.fromTo('#cart-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#cart-title', 0.15);
    // A tap presses the button, then swaps the visible value (stacked spans, seek-safe)
    function tap(btn, at, hide, show) {
      tl.to(btn, { scale: 0.86, duration: 0.08, ease: 'power2.in' }, at);
      tl.set(btn + '-fill', { opacity: 1 }, at + 0.08);
      tl.set(hide, { opacity: 0 }, at + 0.08);
      tl.set(show, { opacity: 1 }, at + 0.08);
      tl.to(btn, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, at + 0.08);
    }
    function swap(hide, show, at) { tl.set(hide, { opacity: 0 }, at); tl.set(show, { opacity: 1 }, at); }
    tap('#cart-a1', 1.0, '#cart-a1-plus', '#cart-a1-q1');
    tl.fromTo('#cart-bar', { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'expo.out' }, 1.1);
    tap('#cart-a3', 2.6, '#cart-a3-plus', '#cart-a3-q1');
    swap('#cart-c1', '#cart-c2', 2.7); swap('#cart-t1', '#cart-t2', 2.7);
    tap('#cart-a1', 4.0, '#cart-a1-q1', '#cart-a1-q2');
    swap('#cart-c2', '#cart-c3', 4.1); swap('#cart-t2', '#cart-t3', 4.1);
    tl.fromTo('#cart-total', { scale: 1.12 }, { scale: 1, duration: 0.35, ease: 'power3.out', immediateRender: false }, 4.1);
    tl.to('#cart-btn', { scale: 0.9, duration: 0.08 }, 5.9);
    tl.to('#cart-btn', { scale: 1, duration: 0.2, ease: 'power2.out' }, 5.98);
    capOut(tl, '#cart-cap', 6.2);
"""))

# ---------------------------------------------------------------- 5. Checkout
scenes.append(('checkout', 7.0, """
  #co-under { position: absolute; inset: 0; background: linear-gradient(180deg, #E9DFCF, #D9CCB7); }
  #co-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #FFFDF9; border-radius: 36px 36px 0 0; padding: 30px 24px 26px; }
  .co-h { font-family: 'Playfair Display'; font-weight: 700; font-size: 36px; }
  .co-lbl { font-size: 28px; font-weight: 600; color: #5C4F42; margin: 20px 0 10px; }
  #co-name { height: 68px; border-radius: 18px; background: #F5EEE3; border: 2px solid #C98A2E; padding: 0 18px; display: flex; align-items: center; font-size: 32px; font-weight: 600; }
  #co-caret { display: inline-block; width: 3px; height: 34px; background: #A66A16; margin-left: 3px; }
  .co-opt { height: 60px; border-radius: 18px; border: 2px solid rgba(26,21,18,0.14); padding: 0 18px; display: flex; align-items: center; font-size: 28px; font-weight: 600; color: #5C4F42; margin-bottom: 8px; }
  .co-total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 28px; font-weight: 600; }
  .co-total b { font-family: 'Playfair Display'; font-size: 36px; }
  #co-btn { margin-top: 16px; height: 76px; border-radius: 20px; background: #E0A33E; color: #1A1512; display: grid; place-items: center; font-size: 30px; font-weight: 700; }
  #co-burst { position: absolute; left: 50%; bottom: 60px; width: 120px; height: 120px; margin-left: -60px; border-radius: 50%; background: #E0A33E; opacity: 0; }
""", caption('co', 'Étape 4', 'Votre prénom, le paiement, *et validez.*') + """
    <div class="phone" id="co-phone"><div class="screen"><div class="notch"></div>
      <div id="co-under"></div>
      <div id="co-sheet">
        <div class="co-h">Finaliser</div>
        <div class="co-lbl">Votre prénom</div>
        <div id="co-name"><span id="co-l1">K</span><span id="co-l2">o</span><span id="co-l3">s</span><span id="co-l4">s</span><span id="co-l5">i</span><span id="co-caret"></span></div>
        <div class="co-lbl">Paiement</div>
        <div class="co-opt">Espèces</div><div class="co-opt">Carte</div><div class="co-opt" id="co-mm">Mobile Money</div>
        <div class="co-total"><span>Total</span><b>9 500 FCFA</b></div>
        <div id="co-btn">Valider</div>
      </div>
      <div id="co-burst"></div>
    </div></div>
""", """
    tl.fromTo('#co-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#co-title', 0.15);
    tl.fromTo('#co-sheet', { y: 760 }, { y: 0, duration: 0.7, ease: 'expo.out' }, 0.2);
    // Typing "Kossi", one letter per beat
    tl.set(['#co-l1', '#co-l2', '#co-l3', '#co-l4', '#co-l5'], { display: 'none' }, 0);
    ['#co-l1', '#co-l2', '#co-l3', '#co-l4', '#co-l5'].forEach((l, i) => tl.set(l, { display: 'inline' }, 1.2 + i * 0.14));
    tl.set('#co-mm', { borderColor: '#E0A33E', backgroundColor: '#FBEBD0', color: '#7A4D0F' }, 2.6);
    tl.fromTo('#co-mm', { scale: 0.95 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, 2.6);
    tl.set('#co-caret', { opacity: 0 }, 2.6);
    // Validate: press, then the button floods the screen (zoom through the button)
    tl.to('#co-btn', { scale: 0.95, duration: 0.09, ease: 'power2.in' }, 5.5);
    tl.to('#co-btn', { scale: 1, duration: 0.15, ease: 'power2.out' }, 5.59);
    tl.fromTo('#co-burst', { opacity: 1, scale: 0 }, { opacity: 1, scale: 16, duration: 0.6, ease: 'power3.in' }, 5.8);
    capOut(tl, '#co-cap', 6.6);
"""))

# ---------------------------------------------------------------- 6. Tracking (vertical steps, readable)
scenes.append(('track', 7.0, """
  #tr-flood { position: absolute; inset: 0; background: #E0A33E; }
  #tr-card { position: absolute; left: 18px; right: 18px; top: 72px; background: #FFFDF9; border-radius: 30px; padding: 26px 24px; box-shadow: 0 16px 34px -20px rgba(26,21,18,0.4); }
  .tr-k { font-size: 28px; font-weight: 600; color: #8A5A13; }
  .tr-h { font-family: 'Playfair Display'; font-weight: 700; font-size: 40px; margin-top: 4px; }
  .tr-live { display: flex; align-items: center; gap: 10px; font-size: 28px; font-weight: 600; color: #22654A; margin-top: 8px; }
  .tr-live i { width: 14px; height: 14px; border-radius: 50%; background: #22654A; }
  .vsteps { margin-top: 26px; }
  .row { display: flex; align-items: center; gap: 18px; }
  .nd { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; font-size: 28px; font-weight: 700; background: #F1E8DA; color: #6B5D4F; border: 2px solid rgba(26,21,18,0.12); flex-shrink: 0; }
  .row span { font-size: 32px; font-weight: 600; color: #6B5D4F; }
  .vbar { width: 4px; height: 34px; margin-left: 28px; background: rgba(26,21,18,0.12); position: relative; overflow: hidden; border-radius: 4px; }
  .vbar i { position: absolute; inset: 0; background: #E0A33E; transform-origin: center top; }
  .tr-items { margin-top: 22px; border-top: 1.5px solid rgba(26,21,18,0.1); padding-top: 16px; font-size: 28px; color: #4F4337; line-height: 1.55; }
  #tr-staff { left: 170px; top: 1250px; }
""", caption('tr', 'Étape 5', 'Suivez votre commande *en direct.*') + """
    <div class="phone" id="tr-phone"><div class="screen"><div class="notch"></div>
      <div id="tr-card">
        <div class="tr-k">Table 4</div>
        <div class="tr-h">Merci Kossi !</div>
        <div class="tr-live"><i></i>Suivi en direct</div>
        <div class="vsteps">
          <div class="row"><div class="nd" id="tr-d1">1</div><span id="tr-s1">En attente</span></div>
          <div class="vbar"><i id="tr-b1"></i></div>
          <div class="row"><div class="nd" id="tr-d2">2</div><span id="tr-s2">Servie</span></div>
          <div class="vbar"><i id="tr-b2"></i></div>
          <div class="row"><div class="nd" id="tr-d3">3</div><span id="tr-s3">Payée</span></div>
        </div>
        <div class="tr-items">2 Cocktails · 7 000 F<br>1 Brochettes · 2 500 F</div>
      </div>
      <div id="tr-flood"></div>
    </div></div>
    <div class="label" id="tr-staff" data-layout-allow-overlap data-layout-allow-occlusion><span class="ok"></span>Le serveur est prévenu</div>
""", """
    // Continues the button flood of the previous scene, then clears to the status screen
    tl.fromTo('#tr-flood', { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.1);
    tl.fromTo('#tr-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.1);
    wordsIn(tl, '#tr-title', 0.2);
    tl.fromTo('#tr-card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 0.2);
    tl.set(['#tr-b1', '#tr-b2'], { scaleY: 0 }, 0);
    tl.set('#tr-d1', { backgroundColor: '#E0A33E', color: '#1A1512', borderColor: '#E0A33E' }, 0);
    tl.set('#tr-s1', { color: '#1A1512' }, 0);
    tl.fromTo('#tr-staff', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 1.5);
    tl.to('#tr-staff', { opacity: 0, filter: 'blur(6px)', duration: 0.2, ease: 'power2.in' }, 3.7);
    // Served
    tl.to('#tr-b1', { scaleY: 1, duration: 0.5, ease: 'power2.inOut' }, 4.0);
    tl.set('#tr-d2', { backgroundColor: '#E0A33E', color: '#1A1512', borderColor: '#E0A33E' }, 4.5);
    tl.set('#tr-s2', { color: '#1A1512' }, 4.5);
    tl.fromTo('#tr-d2', { scale: 0.8 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, 4.5);
    capOut(tl, '#tr-cap', 6.75);
"""))

# ---------------------------------------------------------------- 7. Call a server
scenes.append(('call', 5.0, """
  .call-wrap { position: absolute; left: 24px; right: 24px; top: 110px; text-align: center; }
  .call-t { font-family: 'Playfair Display'; font-weight: 700; font-size: 40px; }
  .call-s { font-size: 28px; color: #4F4337; margin-top: 10px; line-height: 1.3; }
  #call-btn { margin: 44px auto 0; width: 240px; height: 240px; border-radius: 50%; background: #E0A33E; display: grid; place-items: center;
              box-shadow: 0 24px 50px -20px rgba(166,106,22,0.8); }
  #call-btn svg { width: 100px; height: 100px; }
  .call-b { margin-top: 22px; font-size: 30px; font-weight: 700; }
  #call-toast { position: absolute; left: 20px; right: 20px; top: 620px; background: #1A1512; color: #F4ECE0; border-radius: 24px; padding: 20px 22px; font-size: 28px; font-weight: 600; text-align: center; line-height: 1.3; }
  #call-staff { left: 150px; top: 1250px; }
""", caption('call', 'Besoin d’aide ?', 'Un bouton *appelle un serveur.*') + """
    <div class="phone" id="call-phone"><div class="screen"><div class="notch"></div>
      <div class="call-wrap" id="call-wrap">
        <div class="call-t">Table 4</div>
        <div class="call-s">L’addition, un verre de plus, une question ?</div>
        <div id="call-btn"><svg viewBox="0 0 24 24"><path d="M12 3a1.5 1.5 0 0 1 1.5 1.5v.6A7 7 0 0 1 19 12v4l1.5 2H3.5L5 16v-4a7 7 0 0 1 5.5-6.9v-.6A1.5 1.5 0 0 1 12 3zm-2.5 17h5a2.5 2.5 0 0 1-5 0z" fill="#1A1512"/></svg></div>
        <div class="call-b">Appeler</div>
      </div>
      <div id="call-toast">Serveur appelé,<br>quelqu’un arrive</div>
    </div></div>
    <div class="label" id="call-staff" data-layout-allow-overlap data-layout-allow-occlusion><span class="ok"></span>Table 4 : besoin d’aide</div>
""", """
    tl.fromTo('#call-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#call-title', 0.15);
    tl.fromTo('#call-wrap', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.1);
    tl.to('#call-btn', { scale: 0.9, duration: 0.09, ease: 'power2.in' }, 1.4);
    tl.to('#call-btn', { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 1.49);
    tl.fromTo('#call-toast', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 1.75);
    tl.fromTo('#call-staff', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 2.1);
    tl.to('#call-staff', { opacity: 0, duration: 0.2 }, 4.55);
    capOut(tl, '#call-cap', 4.75);
"""))

# ---------------------------------------------------------------- 8. Pay at the counter
scenes.append(('pay', 6.0, """
  #pay-card { position: absolute; left: 18px; right: 18px; top: 72px; background: #FFFDF9; border-radius: 30px; padding: 26px 24px; box-shadow: 0 16px 34px -20px rgba(26,21,18,0.4); }
  .pay-k { font-size: 28px; font-weight: 600; color: #8A5A13; }
  .pay-total { font-family: 'Playfair Display'; font-weight: 700; font-size: 56px; margin-top: 8px; }
  #pay-badge { display: inline-flex; align-items: center; gap: 10px; margin-top: 16px; padding: 12px 20px; border-radius: 16px; background: #DCEFE5; color: #1D5A41; font-size: 32px; font-weight: 700; }
  #pay-photo { position: absolute; left: 18px; right: 18px; top: 400px; height: 380px; border-radius: 26px; overflow: hidden; }
  #pay-photo img { width: 100%; height: 100%; object-fit: cover; }
  .methods { position: absolute; left: 90px; right: 90px; top: 360px; justify-content: flex-start; display: flex; gap: 16px; }
  .m { padding: 16px 22px; border-radius: 20px; background: rgba(244,236,224,0.08); border: 1.5px solid rgba(244,236,224,0.2); font-size: 32px; font-weight: 600; color: #F4ECE0; white-space: nowrap; }
""", caption('pay', 'Étape 6', 'Réglez *à la caisse.*') + """
    <div class="phone" id="pay-phone"><div class="screen"><div class="notch"></div>
      <div id="pay-card">
        <div class="pay-k">Table 4</div>
        <div class="pay-total">9 500 FCFA</div>
        <div id="pay-badge">✓ Payée</div>
      </div>
      <div id="pay-photo"><img src="assets/payment.webp" alt=""></div>
    </div></div>
    <div class="methods"><div class="m" id="pay-m1">Espèces</div><div class="m" id="pay-m2">Carte</div><div class="m" id="pay-m3">Mobile Money</div></div>
""", """
    tl.fromTo('#pay-step', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.05);
    wordsIn(tl, '#pay-title', 0.15);
    tl.fromTo('#pay-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.1);
    tl.fromTo('#pay-photo', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' }, 0.3);
    tl.fromTo(['#pay-m1', '#pay-m2', '#pay-m3'], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.07 }, 1.0);
    tl.fromTo('#pay-badge', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, 3.2);
    tl.to(['#pay-m1', '#pay-m2', '#pay-m3'], { opacity: 0, duration: 0.2 }, 5.6);
    capOut(tl, '#pay-cap', 5.75);
"""))

# ---------------------------------------------------------------- 9. End
scenes.append(('end', 5.5, """
  #end-flood { position: absolute; inset: 0; background: #E0A33E; }
  #end-wrap { position: absolute; left: 90px; right: 90px; top: 470px; text-align: center; color: #1A1512; }
  .end-mark { width: 124px; height: 124px; margin: 0 auto; border-radius: 34px; background: #151210; display: grid; place-items: center; }
  .end-word { font-family: 'Playfair Display'; font-weight: 700; font-size: 72px; margin-top: 26px; }
  #end-line { font-family: 'Playfair Display'; font-weight: 600; font-size: 92px; line-height: 1.04; margin-top: 56px; letter-spacing: -0.01em; }
  #end-line .w { display: inline-block; margin-right: 0.22em; }
  #end-sub { font-size: 40px; font-weight: 500; margin-top: 28px; color: #3A2E22; }
  #end-url { display: inline-block; margin-top: 50px; padding: 22px 36px; border-radius: 999px; background: #151210; color: #F4ECE0; font-size: 42px; font-weight: 600; }
""", """
    <div id="end-flood"></div>
    <div id="end-wrap">
      <div class="end-mark" id="end-mark"><svg width="64" height="64" viewBox="0 0 32 32"><path d="M5 7h22l-9 9.6V25h4v2H10v-2h4v-8.4z" fill="#E0A33E"/></svg></div>
      <div class="end-word" id="end-word">BarSafe</div>
      <div id="end-line">""" + emwords('Commandez sans attendre.') + """</div>
      <div id="end-sub">Sans compte, sans appli à installer.</div>
      <div id="end-url">bar-safe.codorah.com</div>
    </div>
""", """
    // Colour flood from the bottom, then the mark lands; the last line holds over 2 s
    tl.fromTo('#end-flood', { clipPath: 'circle(0% at 50% 100%)' }, { clipPath: 'circle(150% at 50% 100%)', duration: 0.5, ease: 'power2.inOut' }, 0);
    tl.fromTo('#end-mark', { opacity: 0, scale: 0.6, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.6)' }, 0.4);
    tl.fromTo('#end-word', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power4.out' }, 0.75);
    tl.fromTo('#end-line .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.16, ease: 'power4.out', stagger: 0.09 }, 1.1);
    tl.fromTo('#end-sub', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 1.7);
    tl.fromTo('#end-url', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 2.1);
"""))

# ---------------------------------------------------------------- write scenes + root
start = 0.0
hosts = []
for cid, dur, css, body, script in scenes:
    with open(os.path.join(COMP, f'{cid}.html'), 'w', encoding='utf-8') as f:
        f.write(scene(cid, css, body, script))
    hosts.append((cid, start, dur))
    start = round(start + dur, 3)
TOTAL = start

def t(cid, local):
    for c, s, d in hosts:
        if c == cid:
            return round(s + local, 3)
    raise KeyError(cid)

# Sounds land their PEAK one frame (0.033 s) after the picture event.
# Measured with `hyperframes audio`: click peaks at 0.045 s, pop at 0.221 s; the whoosh is a 5.5 s swell
# peaking at 2.45 s, so it is trimmed to start 0.55 s before its peak.
FRAME = 0.033
def click(i, ev, vol=0.7):   return (i, 'assets/sfx/click.mp3',  round(ev + FRAME - 0.045, 3), 0.35, vol, 0, 0)
def pop(i, ev, vol=0.55):    return (i, 'assets/sfx/pop.mp3',    round(ev + FRAME - 0.221, 3), 0.9, vol, 0, 0.3)
def whoosh(i, ev, vol=0.45): return (i, 'assets/sfx/whoosh.mp3', round(ev + FRAME - 0.55, 3), 1.1, vol, 1.9, 0.35)

SFX = [
    whoosh('sfx-whoosh-rise', t('scan', 1.95)),
    pop('sfx-pop-found', t('scan', 4.25)),
    click('sfx-tap-1', t('cart', 1.0)),
    click('sfx-tap-2', t('cart', 2.6), 0.6),
    click('sfx-tap-3', t('cart', 4.0)),
    click('sfx-tap-mm', t('checkout', 2.6), 0.6),
    click('sfx-tap-ok', t('checkout', 5.5), 0.75),
    whoosh('sfx-whoosh-zoom', t('checkout', 6.3)),
    pop('sfx-pop-served', t('track', 4.5), 0.5),
    click('sfx-tap-call', t('call', 1.4), 0.75),
    pop('sfx-pop-call', t('call', 1.8), 0.5),
    pop('sfx-pop-paid', t('pay', 3.25)),
    whoosh('sfx-whoosh-end', t('end', 0.25), 0.5),
]

host_html = '\n'.join(
    f'      <div id="{cid}" class="clip" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" '
    f'data-start="{s}" data-duration="{d}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>'
    for cid, s, d in hosts)
audio_html = '\n'.join(
    f'      <audio id="{i}" class="clip" src="{src}" data-start="{s}" data-duration="{d}" data-volume="{v}"'
    + (f' data-media-start="{ms}"' if ms else '') + (f' data-fade-out="{fo}"' if fo else '')
    + f' data-track-index="{2 + n % 2}"></audio>'
    for n, (i, src, s, d, v, ms, fo) in enumerate(SFX))

root = f"""<!doctype html>
<html lang="fr" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>BarSafe · Comment commander</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #151210; }}
      #root {{ position: relative; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <!-- BarSafe · guide client (9:16, 54 s). One scene per file in compositions/. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920">
{host_html}
{audio_html}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(root)
print('scenes:', ', '.join(f'{c}@{s}s' for c, s, _ in hosts), '| total', TOTAL, 's')
