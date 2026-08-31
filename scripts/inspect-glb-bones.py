"""Listar los huesos de un GLB para mappear a Mixamo/TalkingHead.

Uso: blender --background --python scripts/inspect-glb-bones.py -- input.glb
"""

import bpy
import sys

if "--" not in sys.argv:
    sys.exit(1)
argv = sys.argv[sys.argv.index("--") + 1:]
glb_path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

print("\n========== ARMATURES + BONES ==========")
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE':
        print(f"\nArmature: '{obj.name}' ({len(obj.data.bones)} bones)")
        for bone in obj.data.bones:
            indent = "  " * (len(bone.parent_recursive) if bone.parent else 0)
            print(f"{indent}{bone.name}")
