"""
Convertir FBX de Microsoft Rocketbox (_facial.fbx) a GLB con shape keys
preservados, texturas embebidas y rig listo para TalkingHead.

Uso:
  blender --background --python scripts/fbx-to-glb.py -- input.fbx output.glb

Lo que hace:
  1. Limpia la escena por defecto
  2. Importa el FBX (Rocketbox usa unidades en cm → scale 0.01 a metros)
  3. Verifica que tenga shape keys (blendshapes faciales — visemas/ARKit)
  4. Exporta como GLB binario con shape keys + texturas embebidas
"""

import bpy
import sys

# Parsear args después del separador "--"
if "--" not in sys.argv:
    print("ERROR: pasa los args así → -- input.fbx output.glb")
    sys.exit(1)

argv = sys.argv[sys.argv.index("--") + 1 :]
if len(argv) < 2:
    print(f"ERROR: necesito input + output, recibí {argv}")
    sys.exit(1)

input_fbx, output_glb = argv[0], argv[1]
print(f"[fbx-to-glb] input  = {input_fbx}")
print(f"[fbx-to-glb] output = {output_glb}")

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Importar FBX
# automatic_bone_orientation ayuda a que el rig quede más cerca de Mixamo standard
bpy.ops.import_scene.fbx(
    filepath=input_fbx,
    global_scale=0.01,                 # Rocketbox viene en cm
    use_anim=False,                    # No nos interesan animaciones por ahora
    automatic_bone_orientation=True,
    ignore_leaf_bones=False,
)

# 3. Verificar blendshapes
mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
total_shape_keys = 0
for o in mesh_objs:
    if o.data.shape_keys:
        n = len(o.data.shape_keys.key_blocks)
        total_shape_keys += n
        # listar primeros 5 para confirmar son visemas/ARKit
        names = [k.name for k in o.data.shape_keys.key_blocks][:8]
        print(f"[fbx-to-glb] mesh '{o.name}' tiene {n} shape keys. Primeras: {names}")

if total_shape_keys == 0:
    print("⚠️ WARNING: no se encontraron shape keys. El avatar no podrá animar boca.")
else:
    print(f"[fbx-to-glb] ✅ {total_shape_keys} shape keys totales")

# 4. Export GLB
bpy.ops.export_scene.gltf(
    filepath=output_glb,
    export_format="GLB",               # binario, todo en un archivo
    export_image_format="AUTO",        # mantiene PNG/JPG según corresponda
    export_texcoords=True,
    export_normals=True,
    export_morph=True,                 # ⭐ shape keys → morph targets
    export_morph_normal=True,
    export_skins=True,                 # rig de huesos
    export_animations=False,
    export_apply=False,                # no aplicar modifiers (rompe shape keys)
)
print(f"[fbx-to-glb] ✅ Exportado a {output_glb}")
