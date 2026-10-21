// Genera las etiquetas MOR "Pruébame en X%" (3 x 3 cm, esquinas redondeadas).
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

// Cada estilo define colores por porcentaje: fondo, texto principal, texto secundario, corazón, filete
const ESTILOS = {
  crema: () => ({ bg: C.crema, main: C.malva, sub: C.cafe, heart: C.rosa, line: C.malva }),
  malva: () => ({ bg: C.malva, main: C.crema, sub: '#F6E9DD', heart: '#EBC0B3', line: C.crema }),
  intensidad: (p) => ({
    55: { bg: C.crema, main: C.malva, sub: C.cafe, heart: C.rosa, line: C.malva },
    66: { bg: C.blush, main: '#8A5A50', sub: C.cafe, heart: '#B97F72', line: '#8A5A50' },
    85: { bg: C.malva, main: C.crema, sub: '#F6E9DD', heart: '#EBC0B3', line: C.crema },
    100: { bg: C.cacao, main: C.crema, sub: '#EADBCB', heart: C.rosa, line: '#D9BFAF' },
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
`;

function etiqueta(p, k) {
  const s = ESTILOS[k](p);
  return `<div class="label" style="background:${s.bg}">
  <div class="frame" style="border-color:${s.line}"></div>
  <div class="prueba" style="color:${s.main}">Pruébame</div>
  <div class="en" style="color:${s.sub}">EN</div>
  <div class="num${p === 100 ? ' cien' : ''}" style="color:${s.main}">${p}<span class="pct">%</span></div>
  <div class="div" style="color:${s.line}"><i></i>${heart(s.heart, 1.6)}<i></i></div>
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
    for (const p of PORCENTAJES) {
      const nombre = `MOR-pruebame-${p}-${k}`;
      await page.setContent(pagina(etiqueta(p, k), '@page { size: 30mm 30mm; margin: 0; }'), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(OUT, 'pdf', nombre + '.pdf'), width: '30mm', height: '30mm', printBackground: true, pageRanges: '1' });
      await page.locator('.label').screenshot({ path: path.join(OUT, 'png', nombre + '.png'), omitBackground: true });

      await page.setContent(hoja(Array(35).fill(etiqueta(p, k)), `MOR · PRUÉBAME EN ${p}% · ${k.toUpperCase()} · 35 × (3 × 3 cm)`), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(OUT, 'hojas-a4', `A4-${nombre}.pdf`), width: '210mm', height: '297mm', printBackground: true });
    }
  }

  // Muestrario con todos los diseños (una fila por estilo)
  const filas = Object.keys(ESTILOS).map((k) => PORCENTAJES.map((p) => etiqueta(p, k)).join('') + '<div></div>');
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

  await browser.close();
})();
