import sys
import cv2
import numpy as np

UP = '/root/.claude/uploads/9d252676-cffd-54be-97fa-9b78e64ae8f6/'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'montaje.png'

# --- 1. Rectificar la cara frontal de la barra ---
src_img = cv2.imread(UP + 'a2f07fd7-image.jpg')
W, H = 520, 1120
src = np.float32([(312, 230), (825, 212), (908, 1325), (395, 1343)])
M = cv2.getPerspectiveTransform(src, np.float32([(0, 0), (W, 0), (W, H), (0, H)]))
bar = cv2.warpPerspective(src_img, M, (W, H), flags=cv2.INTER_CUBIC).astype(np.float32)
bar = bar[4:H - 6, 7:W - 5]  # quitar bordes del fondo
H, W = bar.shape[:2]

# Rellenar la esquina tapada por los trozos de chocolate con textura de más arriba
x0, y0 = 300, 1015
patch = bar[y0 - 235:H - 235, x0:W].copy()
mask = np.ones(patch.shape[:2], np.float32)
f = 25
mask[:, :f] *= np.linspace(0, 1, f)[None, :]
mask[:f, :] *= np.linspace(0, 1, f)[:, None]
bar[y0:H, x0:W] = bar[y0:H, x0:W] * (1 - mask[..., None]) + patch * mask[..., None]

# Quitar el brillo cálido del estudio: bajar un poco saturación de reflejos naranjas
# y suavizar el resplandor de la parte baja
# (la iluminación nueva se aplica después)

# --- 2. Escena ---
scene = cv2.imread(UP + '6ea1270b-image.jpg').astype(np.float32)
SH, SW = scene.shape[:2]

# Tamaño y posición de la barra en la escena
bh = 410
bw = int(round(bh * W / H))
cx, base_y = 590, 872
lean = 0.035  # la parte de arriba un poco más angosta (perspectiva / ligera inclinación)
thick = 16    # grosor visible del lateral derecho
top_th = 5    # grosor visible del borde superior

fl = (cx - bw / 2, base_y)
fr = (cx + bw / 2, base_y)
tl = (cx - bw / 2 * (1 - lean) + 4, base_y - bh)
tr = (cx + bw / 2 * (1 - lean) + 4, base_y - bh)
# ligera inclinación (no perfectamente vertical) alrededor de la base
ang = np.deg2rad(-1.4)
def rot(p):
    dx, dy = p[0] - cx, p[1] - base_y
    return (cx + dx * np.cos(ang) - dy * np.sin(ang), base_y + dx * np.sin(ang) + dy * np.cos(ang))
tl, tr, fl, fr = rot(tl), rot(tr), rot(fl), rot(fr)

def warp_into(img, quad, size):
    h, w = img.shape[:2]
    Mx = cv2.getPerspectiveTransform(np.float32([(0, 0), (w, 0), (w, h), (0, h)]), np.float32(quad))
    out = cv2.warpPerspective(img, Mx, size, flags=cv2.INTER_AREA if w > 300 else cv2.INTER_CUBIC)
    a = cv2.warpPerspective(np.ones((h, w), np.float32), Mx, size, flags=cv2.INTER_LINEAR)
    return out, a

# Iluminación de la cara frontal: luz cálida desde la izquierda/atrás como en la escena
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
light = 1.0 - 0.28 * (xx / W) - 0.10 * (yy / H)
light += 0.10 * np.exp(-(((xx - W * 0.15) / (W * 0.35)) ** 2 + ((yy - H * 0.3) / (H * 0.5)) ** 2))
front = bar * light[..., None]
# Tinte cálido para que coincida con la luz de la escena
front *= np.array([0.88, 0.96, 1.07], np.float32)  # BGR
# oclusión ambiental cerca de la base y bordes un poco más oscuros (forma de empaque real)
ao = 1 - 0.22 * np.clip(1 - (H - yy) / 90, 0, 1) ** 2
edge = 1 - 0.10 * np.clip(1 - np.minimum(xx, W - xx) / 14, 0, 1)
front *= (ao * edge)[..., None]
# luz de borde cálida en el canto izquierdo (luz desde la izquierda)
rim = np.clip(1 - xx / 10, 0, 1) * (0.6 + 0.4 * (1 - yy / H))
front += rim[..., None] * np.array([30, 55, 85], np.float32)
# brillo suave en la arista superior
front += (np.clip(1 - yy / 8, 0, 1))[..., None] * np.array([18, 28, 40], np.float32)
front = np.clip(front * 0.97, 0, 255)

# Lateral derecho (más oscuro) y borde superior (más claro)
side_col = (front[:, -12:].mean(axis=(0, 1)) * 0.42)
side = np.ones((H, 40, 3), np.float32) * side_col
side *= ((1 - 0.30 * (yy[:, :40] / H)) * (1 - 0.25 * xx[:, :40] / 40))[..., None]
top_col = front[:15].mean(axis=(0, 1)) * 1.05
top = np.ones((20, W, 3), np.float32) * top_col

layer = np.zeros_like(scene)
alpha = np.zeros((SH, SW), np.float32)

def paste(img, quad):
    global layer, alpha
    o, a = warp_into(img, quad, (SW, SH))
    layer = layer * (1 - a[..., None]) + o * a[..., None]
    alpha = np.maximum(alpha, a)

paste(side, [tr, (tr[0] + thick, tr[1] + 3), (fr[0] + thick, fr[1] - 3), fr])
paste(top, [(tl[0] + thick * 0.6, tl[1] - top_th), (tr[0] + thick, tr[1] - top_th + 1), tr, tl])
paste(front, [tl, tr, fr, fl])

# Suavizar el borde (antialias) y un ligero desenfoque para igualar la nitidez de la foto
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)
layer = cv2.GaussianBlur(layer, (0, 0), 0.55)

# --- 3. Sombras sobre la mesa ---
shadow = np.zeros((SH, SW), np.float32)
# sombra de contacto
cv2.ellipse(shadow, (int(cx + 6), int(base_y + 1)), (int(bw / 2 + 12), 7), 0, 0, 360, 1.0, -1)
shadow = cv2.GaussianBlur(shadow, (0, 0), 4)
line = np.zeros((SH, SW), np.float32)
cv2.line(line, (int(fl[0]) - 2, int(fl[1]) + 1), (int(fr[0] + thick), int(fr[1]) + 1), 1.0, 3)
shadow = np.maximum(shadow, cv2.GaussianBlur(line, (0, 0), 1.5) * 1.2)
# sombra proyectada hacia la derecha y adelante (luz desde la izquierda-atrás)
cast = np.zeros((SH, SW), np.float32)
pts = np.int32([fl, (fr[0] + thick, fr[1]), (fr[0] + 150, fr[1] + 40), (fl[0] + 120, fl[1] + 45)])
cv2.fillPoly(cast, [pts], 0.85)
cast = cv2.GaussianBlur(cast, (0, 0), 14)
shadow = np.clip(shadow * 1.0 + cast * 0.7, 0, 0.9)
shadow *= (1 - alpha)
scene = scene * (1 - shadow[..., None] * 0.75)

# Reflejo cálido del ambiente en la base de la barra (rebote de la mesa)
bounce = np.zeros((SH, SW), np.float32)
cv2.rectangle(bounce, (int(fl[0]), int(base_y - 60)), (int(fr[0] + thick), int(base_y)), 1, -1)
bounce = cv2.GaussianBlur(bounce, (0, 0), 25) * alpha
layer = layer + bounce[..., None] * np.array([2, 10, 22], np.float32)

comp = scene * (1 - alpha[..., None]) + layer * alpha[..., None]

# Grano igual en toda la imagen para unificar
rng = np.random.default_rng(7)
noise = rng.normal(0, 1.4, comp.shape[:2]).astype(np.float32)
comp = np.clip(comp + noise[..., None], 0, 255)

# --- 4. Recorte cuadrado ---
top_crop = 130
sq = comp[top_crop:top_crop + SW, :]
sq = cv2.resize(sq, (1080, 1080), interpolation=cv2.INTER_CUBIC)
cv2.imwrite(OUT, np.clip(sq, 0, 255).round().astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 95] if OUT.endswith('.jpg') else [])
print('ok', OUT, sq.shape)
