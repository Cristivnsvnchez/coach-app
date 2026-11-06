# Outil Blender (pas chargé par l'app) : prépare un corps MPFB pour TrackMe.
# Le corps généré par MPFB (bras en A) est posé en T comme Y Bot / X Bot, puis lié à une copie de leur squelette dont les
# os sont recalés sur ses proportions : les animations Mixamo et js/poses.js marchent telles quelles.
# Short (et brassière pour le corps féminin) : maillages séparés, copiés du corps puis gonflés, mêmes poids de peau.
import bpy, bmesh
from mathutils import Matrix


# Os du rig « game_engine » de MPFB (bien calé sur le corps, bras en A) → noms Mixamo.
def mixamo_name(n):
    side = {'_l': 'Left', '_r': 'Right'}.get(n[-2:])
    base = n[:-2] if side else n
    if not side:
        return {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'head': 'Head'}.get(n) and 'mixamorig:' + {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'head': 'Head'}[n]
    limbs = {'clavicle': 'Shoulder', 'upperarm': 'Arm', 'lowerarm': 'ForeArm', 'hand': 'Hand', 'thigh': 'UpLeg', 'calf': 'Leg', 'foot': 'Foot', 'ball': 'ToeBase'}
    if base in limbs:
        return f'mixamorig:{side}{limbs[base]}'
    for f, m in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Pinky')):
        if base.startswith(f + '_'):
            return f'mixamorig:{side}Hand{m}{int(base.split("_")[1])}'
    return None


def rename_groups(body, rig):
    """Groupes de poids au nom Mixamo ; un os sans équivalent (torsion…) verse ses poids dans son parent."""
    parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    def target(n):
        while n and not mixamo_name(n):
            n = parent.get(n)
        return mixamo_name(n) if n else None
    for g in list(body.vertex_groups):
        if g.name not in parent:
            continue
        t = target(g.name)
        if t and t not in body.vertex_groups:
            g.name = t
        elif t:
            dst = body.vertex_groups[t]
            for v in body.data.vertices:
                for e in v.groups:
                    if e.group == g.index:
                        dst.add([v.index], e.weight, 'ADD')
            body.vertex_groups.remove(g)


def win_ctx():
    win = bpy.context.window_manager.windows[0]
    area = next((a for a in win.screen.areas if a.type == 'VIEW_3D'), win.screen.areas[0])
    return dict(window=win, area=area, screen=win.screen)


def activate(o):
    for x in bpy.context.view_layer.objects:
        x.select_set(False)
    o.hide_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def bake_and_clean(body):
    """Fige les morphs, retire les géométries d'aide et le masque."""
    me = body.data
    if me.shape_keys:
        mix = body.shape_key_add(name='mix', from_mix=True)
        co = [v.co.copy() for v in mix.data]
        body.shape_key_clear()
        for v, c in zip(me.vertices, co):
            v.co = c
    for m in list(body.modifiers):
        if m.type == 'MASK':
            body.modifiers.remove(m)
    drop = {body.vertex_groups[n].index for n in ('HelperGeometry', 'JointCubes') if n in body.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(me); dl = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if any(k in drop for k in v[dl].keys())], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()


def to_t_pose(rig, ref):
    """Tourne les os des bras du rig MPFB vers la direction du même os sur le squelette de référence."""
    order = [b.name for b in rig.data.bones]  # parents d'abord
    for name in order:
        mx = mixamo_name(name)
        # Seuls les bras passent de A en T : le reste du corps est déjà dans la bonne pose (et les conventions d'os du rig varient).
        if not mx or not mx.endswith(('Arm', 'ForeArm', 'Hand')) or mx not in ref.data.bones:
            continue
        rb = ref.data.bones[mx]
        d = (ref.matrix_world.to_3x3() @ (rb.tail_local - rb.head_local)).normalized()
        pb = rig.pose.bones[name]
        bpy.context.view_layer.update()
        cur = (pb.tail - pb.head).normalized()  # tout en espace armature (le rig MPFB est décalé dans le monde)
        delta = cur.rotation_difference((rig.matrix_world.to_3x3().inverted() @ d).normalized()).to_matrix().to_4x4()
        h = pb.head.copy()
        pb.matrix = Matrix.Translation(h) @ delta @ Matrix.Translation(-h) @ pb.matrix
    bpy.context.view_layer.update()


def bake_pose(body):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg).to_mesh()
    co = [v.co.copy() for v in ev.vertices]
    body.evaluated_get(dg).to_mesh_clear()
    for m in list(body.modifiers):
        if m.type == 'ARMATURE':
            body.modifiers.remove(m)
    for v, c in zip(body.data.vertices, co):
        v.co = c
    body.data.update()


def refit_skeleton(rig, ref, name):
    """Copie du squelette de référence, os déplacés sur les articulations du corps ; orientations locales inchangées."""
    arm = ref.copy(); arm.data = ref.data.copy(); arm.name = name; arm.animation_data_clear()
    bpy.context.collection.objects.link(arm)
    arm.location = (0, 0, 0)
    bpy.context.view_layer.update()
    inv = arm.matrix_world.inverted()
    pts = {mixamo_name(b.name): (inv @ (rig.matrix_world @ b.head), inv @ (rig.matrix_world @ b.tail)) for b in rig.pose.bones if mixamo_name(b.name)}
    activate(arm)
    with bpy.context.temp_override(**win_ctx()):
        bpy.ops.object.mode_set(mode='EDIT')
        ebs = arm.data.edit_bones
        for e in ebs:
            e.use_connect = False
        for e in sorted(ebs, key=lambda x: len(x.parent_recursive)):
            d = e.tail - e.head
            if e.name in pts:
                head, tail = pts[e.name]
                ln = (tail - head).length or d.length
            else:  # extrémités absentes du rig MPFB (bout de tête, de doigt, d'orteil) : au bout de l'os parent
                head = e.parent.tail.copy() if e.parent else e.head
                ln = d.length
            roll = e.roll
            e.head = head
            e.tail = head + d.normalized() * ln
            e.roll = roll
        bpy.ops.object.mode_set(mode='OBJECT')
    arm.data.pose_position = 'POSE'
    return arm


def garment(body, mat, lo, hi, H, inflate, name, flare=0.0, xcut=None, hole_margin=0.012):
    """Vêtement : copie du corps coupée par des plans (bords droits et nets), gonflée le long des normales.
    Le corps caché dessous est retiré, sinon il traverse le tissu dans les flexions."""
    from mathutils import Vector
    o = body.copy(); o.data = body.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    o.data.materials.clear(); o.data.materials.append(mat)
    bm = bmesh.new(); bm.from_mesh(o.data)
    def slice_off(co, no):  # retire tout ce qui est du côté +no du plan
        r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True, clear_inner=False)
    slice_off(Vector((0, 0, hi * H)), Vector((0, 0, 1)))
    slice_off(Vector((0, 0, lo * H)), Vector((0, 0, -1)))
    if xcut:
        slice_off(Vector((xcut * H, 0, 0)), Vector((1, 0, 0)))
        slice_off(Vector((-xcut * H, 0, 0)), Vector((-1, 0, 0)))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        k = max(0.0, 1 - (v.co.z - lo * H) / (0.05 * H))  # évasé vers l'ourlet
        v.co += v.normal * (inflate + flare * k)
    bm.to_mesh(o.data); bm.free(); o.data.update()
    bm = bmesh.new(); bm.from_mesh(body.data)
    m = hole_margin
    inside = lambda f: all((lo * H + m) <= v.co.z <= (hi * H - m) and (not xcut or abs(v.co.x) <= xcut * H - m) for v in f.verts)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if inside(f)], context='FACES')
    bm.to_mesh(body.data); bm.free(); body.data.update()
    return o


def mat(name, col, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*col, 1); bs.inputs['Roughness'].default_value = rough
    return m


def align_rig(body, rig):
    """« Pieds au sol » de MPFB déplace le maillage et pas le rig : on remet le rig sur le corps (point de repère : les pieds)."""
    mw = body.matrix_world.copy()
    body.parent = None
    body.matrix_world = mw
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    ev = body.evaluated_get(dg).to_mesh()
    low = min((body.matrix_world @ v.co).z for v in ev.vertices)
    body.evaluated_get(dg).to_mesh_clear()
    rig.data.pose_position = 'POSE'
    foot = min((rig.matrix_world @ b.head_local).z for b in rig.data.bones if b.name.startswith(('ball_', 'foot_')))
    rig.location.z += low - foot + 0.02  # l'os est dans le pied, à ~2 cm au-dessus de la plante
    bpy.context.view_layer.update()


def build(body, rig, ref, tag, female=False):
    bake_and_clean(body)
    align_rig(body, rig)
    to_t_pose(rig, ref)
    bake_pose(body)
    arm = refit_skeleton(rig, ref, tag + '_Arm')
    rename_groups(body, rig)
    bpy.data.objects.remove(rig, do_unlink=True)
    body.parent = None
    body.matrix_world = Matrix.Identity(4)
    return dress(body, arm, tag, female)


def dress(body, arm, tag, female=False):
    H = max(v.co.z for v in body.data.vertices)
    body.data.materials.clear(); body.data.materials.append(mat('TM_Skin_' + tag, (0.78, 0.79, 0.82), 0.5))
    parts = [body]
    parts.append(garment(body, mat('TM_Shorts_' + tag, (0.03, 0.03, 0.035), 0.8), 0.385, 0.565, H, 0.012, tag + '_Shorts', flare=0.014))
    if female:
        parts.append(garment(body, mat('TM_Top_' + tag, (0.06, 0.07, 0.1), 0.75), 0.685, 0.80, H, 0.006, tag + '_Top', xcut=0.105))
    for o in parts:
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
        o.modifiers.new('Armature', 'ARMATURE').object = arm
    return arm, parts
