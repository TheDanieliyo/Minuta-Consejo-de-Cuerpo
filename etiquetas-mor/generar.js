// Genera las etiquetas MOR "Pruébame en X%" y "Pruébame con café" (3 x 3 cm y 2 x 2 cm, esquinas redondeadas).
// Uso: node generar.js   (requiere playwright con Chromium)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'salida');
// Fuentes incrustadas en base64 (setContent no puede leer file://)
const font = (f) => 'data:font/ttf;base64,' + fs.readFileSync(path.join(__dirname, 'fonts', f)).toString('base64');

// Paleta tomada del logo MOR
const C = {
  crema: '#F0E0D1',
  malva: '#9C6A5F',
  rosa: '#CF9B8D',
  cafe: '#715F4B',
  blush: '#E6C7B8',
  cacao: '#5A3B33',
};

const PORCENTAJES = [55, 66, 85, 100];
const DISENOS = [...PORCENTAJES, 'cafe']; // 'cafe' = "Pruébame con café"

// Cada estilo define colores por porcentaje: fondo, texto principal, texto secundario, corazón, filete
const ESTILOS = {
  crema: () => ({ bg: C.crema, main: C.malva, sub: C.cafe, heart: C.rosa, line: C.malva }),
  malva: () => ({ bg: C.malva, main: C.crema, sub: '#F6E9DD', heart: '#EBC0B3', line: C.crema }),
  intensidad: (p) => ({
    55: { bg: C.crema, main: C.malva, sub: C.cafe, heart: C.rosa, line: C.malva },
    66: { bg: C.blush, main: '#8A5A50', sub: C.cafe, heart: '#B97F72', line: '#8A5A50' },
    85: { bg: C.malva, main: C.crema, sub: '#F6E9DD', heart: '#EBC0B3', line: C.crema },
    100: { bg: C.cacao, main: C.crema, sub: '#EADBCB', heart: C.rosa, line: '#D9BFAF' },
    cafe: { bg: C.cafe, main: C.crema, sub: '#EADBCB', heart: C.rosa, line: '#D9BFAF' },
  })[p],
};

const heart = (color, size) =>
  `<svg width="${size}mm" height="${size}mm" viewBox="0 0 24 22" style="display:block"><path fill="${color}" d="M12 21.5 10.3 19.9C4.2 14.4 0 10.6 0 6.2 0 2.7 2.7 0 6.2 0 8.2 0 10.1.9 12 2.6 13.9.9 15.8 0 17.8 0 21.3 0 24 2.7 24 6.2c0 4.4-4.2 8.2-10.3 13.7L12 21.5z"/></svg>`;

const css = `
@font-face { font-family: 'Cormorant'; src: url('${font('CormorantGaramond.ttf')}'); font-weight: 300 700; font-style: normal; }
@font-face { font-family: 'Cormorant'; src: url('${font('CormorantGaramond-Italic.ttf')}'); font-weight: 300 700; font-style: italic; }
@font-face { font-family: 'Montserrat'; src: url('${font('Montserrat.ttf')}'); font-weight: 100 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: transparent; }
.label {
  width: 30mm; height: 30mm; border-radius: 4mm; position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.frame { position: absolute; inset: 1.6mm; border: 0.2mm solid; border-radius: 2.6mm; opacity: .55; }
.prueba { font-family: 'Cormorant'; font-style: italic; font-weight: 600; font-size: 10.5pt; line-height: 1; margin-top: .6mm; }
.en { font-family: 'Montserrat'; font-weight: 500; font-size: 4.2pt; letter-spacing: .45em; margin: .9mm 0 .1mm .45em; }
.num { font-family: 'Cormorant'; font-weight: 700; font-variant-numeric: lining-nums; font-size: 27pt; line-height: .9; letter-spacing: -.01em; display: flex; align-items: flex-start; }
.num .pct { font-size: 13pt; margin-left: .3mm; margin-top: 1.4mm; }
.num.cien { font-size: 23pt; }
.num.cien .pct { font-size: 11pt; margin-top: 1.2mm; }
.div { display: flex; align-items: center; gap: .9mm; margin-top: 1mm; }
.div i { display: block; width: 4.2mm; height: 0; border-top: .15mm solid; }
.marca { font-family: 'Cormorant'; font-weight: 700; font-size: 6pt; letter-spacing: .28em; margin: .7mm 0 0 .28em; line-height: 1; }
.palabra { font-family: 'Cormorant'; font-weight: 700; font-size: 20pt; line-height: 1; letter-spacing: .06em; margin: 1.6mm 0 0 .06em; }
/* Versión 2 x 2 cm */
.label.s2 { width: 20mm; height: 20mm; border-radius: 3mm; }
.s2 .frame { inset: 1.1mm; border-width: .15mm; border-radius: 2mm; }
.s2 .prueba { font-size: 7.2pt; margin-top: .4mm; }
.s2 .en { font-size: 3.4pt; font-weight: 600; letter-spacing: .4em; margin: .5mm 0 0 .4em; }
.s2 .num { font-size: 18.5pt; }
.s2 .num .pct { font-size: 9pt; margin-left: .2mm; margin-top: 1mm; }
.s2 .num.cien { font-size: 15.5pt; }
.s2 .num.cien .pct { font-size: 7.5pt; margin-top: .8mm; }
.s2 .palabra { font-size: 13.5pt; margin-top: 1.1mm; }
.s2 .div { gap: .6mm; margin-top: .6mm; }
.s2 .div i { width: 2.8mm; border-top-width: .12mm; }
.s2 .marca { font-size: 4.2pt; margin-top: .45mm; }
`;

function etiqueta(p, k, tam = 3) {
  const s = ESTILOS[k](p);
  const centro = p === 'cafe'
    ? `<div class="en" style="color:${s.sub}">CON</div>
  <div class="palabra" style="color:${s.main}">café</div>`
    : `<div class="en" style="color:${s.sub}">EN</div>
  <div class="num${p === 100 ? ' cien' : ''}" style="color:${s.main}">${p}<span class="pct">%</span></div>`;
  return `<div class="label${tam === 2 ? ' s2' : ''}" style="background:${s.bg}">
  <div class="frame" style="border-color:${s.line}"></div>
  <div class="prueba" style="color:${s.main}">Pruébame</div>
  ${centro}
  <div class="div" style="color:${s.line}"><i></i>${heart(s.heart, tam === 2 ? 1.1 : 1.6)}<i></i></div>
  <div class="marca" style="color:${s.main}">MOR</div>
</div>`;
}

const pagina = (body, extra = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}${extra}</style></head><body>${body}</body></html>`;

// Hoja A4: 5 x 7 = 35 etiquetas con 4 mm de separación
function hoja(items, titulo) {
  const extra = `
  @page { size: 210mm 297mm; margin: 0; }
  body { width: 210mm; height: 297mm; padding: 14mm 20mm; background: #fff; }
  h1 { font-family: 'Montserrat'; font-weight: 500; font-size: 7pt; letter-spacing: .2em; color: #999; margin-bottom: 5mm; }
  .grid { display: grid; grid-template-columns: repeat(5, 30mm); gap: 4mm; }`;
  return pagina(`<h1>${titulo}</h1><div class="grid">${items.join('')}</div>`, extra);
}

(async () => {
  for (const d of ['pdf', 'png', 'hojas-a4']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 600 / 96 }); // PNG a 600 dpi

  for (const k of Object.keys(ESTILOS)) {
    for (const p of DISENOS) {
      const nombre = `MOR-pruebame-${p === 'cafe' ? 'con-cafe' : p}-${k}`;
      for (const tam of [3, 2]) {
        const mm = tam * 10 + 'mm';
        const archivo = `${nombre}-${tam}x${tam}cm`;
        await page.setContent(pagina(etiqueta(p, k, tam), `@page { size: ${mm} ${mm}; margin: 0; }`), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.pdf({ path: path.join(OUT, 'pdf', archivo + '.pdf'), width: mm, height: mm, printBackground: true, pageRanges: '1' });
        await page.locator('.label').screenshot({ path: path.join(OUT, 'png', archivo + '.png'), omitBackground: true });
      }

      await page.setContent(hoja(Array(35).fill(etiqueta(p, k)), `MOR · PRUÉBAME ${p === 'cafe' ? 'CON CAFÉ' : `EN ${p}%`} · ${k.toUpperCase()} · 35 × (3 × 3 cm)`), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(OUT, 'hojas-a4', `A4-${nombre}.pdf`), width: '210mm', height: '297mm', printBackground: true });
    }
  }

  // Muestrario con todos los diseños (una fila por estilo)
  const filas = Object.keys(ESTILOS).map((k) => DISENOS.map((p) => etiqueta(p, k)).join(''));
  await page.setContent(hoja(filas, 'MOR · MUESTRARIO PRUÉBAME · CREMA / MALVA / INTENSIDAD'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, 'MOR-muestrario.pdf'), width: '210mm', height: '297mm', printBackground: true });
  await page.setViewportSize({ width: 794, height: 520 });
  await page.screenshot({ path: path.join(OUT, 'MOR-muestrario.png'), clip: { x: 0, y: 0, width: 794, height: 500 } });

  // Hoja A4 compacta: 6 x 9 = 54 etiquetas, 2 mm entre ellas, todos los diseños
  // (3 filas por estilo; los porcentajes se van alternando 55 → 66 → 85 → 100)
  const compacta = Object.keys(ESTILOS).flatMap((k) =>
    Array.from({ length: 18 }, (_, i) => etiqueta(PORCENTAJES[i % 4], k)));
  await page.setContent(pagina(`<div class="grid">${compacta.join('')}</div>`, `
  @page { size: 210mm 297mm; margin: 0; }
  body { width: 210mm; height: 297mm; background: #fff; display: flex; align-items: center; justify-content: center; }
  .grid { display: grid; grid-template-columns: repeat(6, 30mm); gap: 2mm; }`), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, 'MOR-hoja-A4-54-etiquetas.pdf'), width: '210mm', height: '297mm', printBackground: true });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: path.join(OUT, 'MOR-hoja-A4-54-etiquetas.png'), fullPage: false });

  // Hoja A4 compacta 2 x 2 cm: 9 x 13 = 117 etiquetas, 2 mm entre ellas
  // (4 filas Crema, 4 Malva, 5 Intensidad; se alternan 55 → 66 → 85 → 100 → con café)
  const filasPorEstilo = { crema: 4, malva: 4, intensidad: 5 };
  const compacta2 = Object.keys(ESTILOS).flatMap((k) =>
    Array.from({ length: filasPorEstilo[k] * 9 }, (_, i) => etiqueta(DISENOS[i % 5], k, 2)));
  await page.setContent(pagina(`<div class="grid">${compacta2.join('')}</div>`, `
  @page { size: 210mm 297mm; margin: 0; }
  body { width: 210mm; height: 297mm; background: #fff; display: flex; align-items: center; justify-content: center; }
  .grid { display: grid; grid-template-columns: repeat(9, 20mm); gap: 2mm; }`), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, 'MOR-hoja-A4-117-etiquetas-2x2.pdf'), width: '210mm', height: '297mm', printBackground: true });
  await page.screenshot({ path: path.join(OUT, 'MOR-hoja-A4-117-etiquetas-2x2.png'), fullPage: false });

  await browser.close();
})();
