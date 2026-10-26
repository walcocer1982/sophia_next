"""Imágenes de la lección «Aprender con una tutora de IA» (23 oct 2026).
Uso: python scripts/cetemin/cursos/aprender-con-sophia/generar-imagenes.py [captura-de-sophia.png]
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = Path(__file__).parent / 'img'
AZUL, AMARILLO, GRIS, TINTA = '#09222d', '#fbc50b', '#9aa5ab', '#1d2b33'

# 1. Pantalla de Sophia (ya no la usa la rutina; 23 oct 2026). Solo si se pasa una captura.
if len(sys.argv) > 1:
    im = Image.open(sys.argv[1]).convert('RGB')
    d = ImageDraw.Draw(im)
    d.rectangle([0, 700, 252, 768], fill=im.getpixel((5, 690)))
    d.rectangle([850, 8, 1175, 50], fill=im.getpixel((800, 28)))
    im.save(OUT / 'pantalla-sophia.png')

plt.rcParams['font.family'] = 'DejaVu Sans'

# 2. El estudio de Bastani et al. (PNAS, 2025)
fig, ax = plt.subplots(figsize=(10, 6.2), dpi=130)
grupos = ['IA que da la respuesta', 'IA tutora que da pistas']
practica = [48, 127]
examen = [-17, 0]
x = [0, 1]
w = 0.36
b1 = ax.bar([i - w / 2 for i in x], practica, w, color=GRIS, label='Practicando CON la IA')
b2 = ax.bar([i + w / 2 for i in x], examen, w, color=[AZUL, AZUL], label='Examen SIN la IA')
for r, t in zip(b1, ['+48 %', '+127 %']):
    ax.text(r.get_x() + r.get_width() / 2, r.get_height() + 3, t, ha='center', fontsize=15, color=TINTA, weight='bold')
ax.text(b2[0].get_x() + w / 2, -17 - 9, '−17 %', ha='center', fontsize=15, color='#b3261e', weight='bold')
ax.text(b2[1].get_x() + w / 2, 4, 'igual', ha='center', fontsize=15, color=TINTA, weight='bold')
ax.axhline(0, color=TINTA, lw=1)
ax.set_xticks(x, grupos, fontsize=14)
ax.set_ylim(-35, 145)
ax.set_yticks([])
for s in ['top', 'right', 'left']:
    ax.spines[s].set_visible(False)
ax.legend(fontsize=12, loc='upper left', frameon=False)
ax.set_title('Comparados con quienes estudiaron sin IA', fontsize=17, color=TINTA, pad=14, weight='bold')
fig.text(0.5, 0.015, 'Bastani y otros (2025), PNAS 122(26). Casi 1 000 escolares de Turquía practicando matemática.', ha='center', fontsize=10, color='#55636b')
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig(OUT / 'estudio-ia-respuesta-vs-pistas.png', facecolor='white')
plt.close(fig)

# 3. Releer frente a recordar sin mirar (Make It Stick)
fig, ax = plt.subplots(figsize=(10, 5.6), dpi=130)
ax.axis('off')
ax.set_xlim(0, 10); ax.set_ylim(0, 6)
def caja(x, titulo, filas, fondo, tinta):
    ax.add_patch(plt.Rectangle((x, 0.7), 4.4, 4.6, color=fondo, ec=AZUL, lw=2))
    ax.text(x + 2.2, 4.75, titulo, ha='center', va='center', fontsize=19, weight='bold', color=tinta)
    for i, f in enumerate(filas):
        ax.text(x + 2.2, 3.8 - i * 0.95, f, ha='center', va='center', fontsize=14, color=tinta)
caja(0.3, 'Releer', ['Se siente fácil', '«Ya lo sé»', 'En el examen no sale', 'No ves lo que te falta'], '#eef1f3', TINTA)
caja(5.3, 'Recordar sin mirar', ['Cuesta', 'Te equivocas y corriges', 'Lo aprendido se queda', 'Ves lo que te falta'], AMARILLO, AZUL)
ax.text(5, 0.25, 'Brown, Roediger y McDaniel, «Make It Stick» (2014), caps. 1 y 2.', ha='center', fontsize=10, color='#55636b')
fig.savefig(OUT / 'releer-vs-recordar.png', facecolor='white', bbox_inches='tight')
plt.close(fig)
print('listo')


# 4. Dos conversaciones (rutina de entrada, 23 oct 2026). Reemplaza la captura de
# la pantalla de Sophia: en la primera clase los alumnos no entendían una
# interfaz que todavía no conocían. Esto se parece a lo que ya hacen con un chat.
def conversacion(ax, x0, titulo, turnos):
    ax.add_patch(plt.Rectangle((x0, 0.15), 4.5, 8.1, color='#f6f7f8', ec='#c9d0d4', lw=2))
    ax.text(x0 + 2.25, 7.9, titulo, ha='center', va='center', fontsize=17, weight='bold', color=TINTA)
    y = 7.4
    for quien, lineas in turnos:
        alto = 0.32 * len(lineas) + 0.38
        alumno = quien == 'Alumno'
        bx = x0 + (0.75 if alumno else 0.15)
        ax.add_patch(plt.Rectangle((bx, y - alto), 3.6, alto, color=AMARILLO if alumno else 'white', ec='#c9d0d4' if not alumno else AMARILLO, lw=1.2))
        ax.text(bx + 0.12, y - 0.07, quien, ha='left', va='top', fontsize=9, color='#55636b', weight='bold')
        ax.text(bx + 0.12, y - 0.33, chr(10).join(lineas), ha='left', va='top', fontsize=11, color=TINTA, linespacing=1.35)
        y -= alto + 0.18

fig, ax = plt.subplots(figsize=(10, 8.2), dpi=130)
ax.axis('off')
ax.set_xlim(0, 10); ax.set_ylim(0, 8.4)
# La IA abre con la pregunta, como hace Sophia (23 oct 2026, Walther): en la
# primera versión el alumno preguntaba y eso no es lo que van a vivir.
pregunta = ['Un terreno mide 12 m por 8 m.', '¿Cuál es su área?']
pide = ['No sé, dame la respuesta.']
conversacion(ax, 0.25, 'Chat A', [
    ('IA', pregunta),
    ('Alumno', pide),
    ('IA', ['El área es 96 m².']),
    ('Alumno', ['Ok, listo.']),
])
conversacion(ax, 5.25, 'Chat B', [
    ('IA', pregunta),
    ('Alumno', pide),
    ('IA', ['Te ayudo: ¿qué dos medidas', 'tienes y qué operación', 'las junta?']),
    ('Alumno', ['12 y 8… ¿las multiplico?']),
    ('IA', ['Sí. Hazlo tú: ¿cuánto te da', 'y en qué unidad?']),
    ('Alumno', ['96 m²']),
])
fig.tight_layout()
fig.savefig(OUT / 'dos-conversaciones.png', facecolor='white')
plt.close(fig)
