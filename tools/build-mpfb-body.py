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


# ───── Brassière de sport ajustée (remplace la bande découpée par des plans) ─────
# La première version (garment() avec xcut) coupait en travers de l'aisselle : des sommets liés au bras tiraient le
# tissu (plis sur les épaules), 6 mm d'épaisseur laissaient ressortir le relief de la poitrine, sans bretelles.
# Ici : bande du dessous de poitrine jusqu'au haut du buste (elle couvre le trou laissé dans le corps par l'ancienne),
# coupée le long du pli de l'aisselle (rien qui appartienne au bras), larges bretelles par-dessus les trapèzes, creux
# entre les seins comblé (le tissu passe d'un sein à l'autre), surface lissée puis gonflée, poids du bras retirés.
def sports_bra(body, old_top, arm, tag, strap_x=0.088, strap_w=0.036, strap_c=1.27, strap_lo=1.27, arm_cut=0.3, inflate=0.005):
    """`old_top` : l'ancienne bande (elle couvre le trou du corps sous la brassière) ; les bretelles viennent du corps."""
    from mathutils import Vector
    mw = body.matrix_world; inv = mw.inverted()
    # 1. Bretelles : rubans de 3,6 cm plaqués sur la peau (lancer de rayons vers le corps), du haut de la bande devant,
    #    par-dessus le trapèze, jusqu'au haut de la bande dans le dos. Poids : ceux du sommet du corps le plus proche.
    import math
    from mathutils.bvhtree import BVHTree
    from mathutils.kdtree import KDTree
    dg = bpy.context.evaluated_depsgraph_get()
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    tree = BVHTree.FromObject(body, dg)  # repère objet du corps
    kd = KDTree(len(body.data.vertices))
    for v in body.data.vertices: kd.insert(v.co, v.index)
    kd.balance()
    inv_b = mw.inverted()
    me = bpy.data.meshes.new(tag + '_Straps'); verts, faces, src = [], [], []
    for sx in (-1, 1):
        x = sx * strap_x
        rows = []
        for k in range(25):
            th = math.radians(-100 + 200 * k / 24)  # -100° : devant, 0° : au-dessus, +100° : derrière
            d = Vector((0, -math.cos(th), math.sin(th)))  # Blender : l'avant du corps est -Y
            ctr = Vector((x, -0.02, strap_c))
            hit = tree.ray_cast(inv_b @ (ctr + d * 0.4), (inv_b.to_3x3() @ -d).normalized())
            if hit[0] is None: continue
            p = mw @ hit[0]; n = (mw.to_3x3() @ hit[1]).normalized()
            if p.z < strap_lo: continue  # sous le haut de la bande : la bande couvre déjà
            rows.append((p, n, hit[0]))
        for i, (p, n, pl) in enumerate(rows):
            t = (rows[min(i + 1, len(rows) - 1)][0] - rows[max(i - 1, 0)][0]).normalized()
            w = t.cross(n).normalized() * (strap_w / 2)
            base = len(verts)
            for off in (-1, 0, 1):
                verts.append(inv @ (p + w * off + n * inflate * 1.4)); src.append(kd.find(pl + (inv_b.to_3x3() @ (w * off)))[1])
            if i: faces += [(base - 3, base - 2, base + 1, base), (base - 2, base - 1, base + 2, base + 1)]
    arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    me.from_pydata([v for v in verts], [], faces); me.update()
    st = bpy.data.objects.new(tag + '_Straps', me)
    for c in body.users_collection: c.objects.link(st)
    st.matrix_world = mw.copy()
    for g in body.vertex_groups: st.vertex_groups.new(name=g.name)
    for vi, bi in enumerate(src):
        for e in body.data.vertices[bi].groups: st.vertex_groups[e.group].add([vi], e.weight, 'REPLACE')
    # 2. Bande : copie de l'ancienne, puis réunion avec les bretelles.
    o = old_top.copy(); o.data = old_top.data.copy(); o.name = tag + '_Top2'
    for c in old_top.users_collection: c.objects.link(o)
    for m in list(o.modifiers): o.modifiers.remove(m)
    [st.data.materials.append(m) for m in o.data.materials]
    win = bpy.context.window_manager.windows[0]; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D')
    for x in bpy.context.view_layer.objects: x.select_set(False)
    o.hide_set(False); st.hide_set(False); o.select_set(True); st.select_set(True); bpy.context.view_layer.objects.active = o
    with bpy.context.temp_override(window=win, area=area, screen=win.screen, active_object=o, selected_editable_objects=[o, st]):
        bpy.ops.object.join()
    mwo = o.matrix_world; inv = mwo.inverted()
    arm_groups = {g.index for g in o.vertex_groups if g.name.split(':')[-1].startswith(('LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'))}
    bm = bmesh.new(); bm.from_mesh(o.data); dl = bm.verts.layers.deform.verify()
    # Rien du bras lui-même au-delà du pli de l'aisselle (la bande, elle, couvre tout le trou du corps : on ne la coupe pas).
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(sum(w for g, w in v[dl].items() if g in arm_groups) > arm_cut and abs((mwo @ v.co).x) > 0.17 for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.004)  # soude bretelles et bande là où elles se touchent
    # 3. Creux entre les seins comblé : par tranches de 1,5 cm, la face avant poussée jusqu'à l'enveloppe convexe.
    front = [v for v in bm.verts if (mwo @ v.co).y < -0.02 and (mwo @ v.co).z < 1.27]
    bins = {}
    for v in front: bins.setdefault(int((mwo @ v.co).z / 0.015), []).append(v)
    for vs in bins.values():
        pts = sorted(((mwo @ v.co).x, (mwo @ v.co).y) for v in vs)
        hull = []
        for p in pts:
            while len(hull) >= 2 and (hull[-1][0] - hull[-2][0]) * (p[1] - hull[-2][1]) - (hull[-1][1] - hull[-2][1]) * (p[0] - hull[-2][0]) <= 0: hull.pop()
            hull.append(p)
        for v in vs:
            p = mwo @ v.co
            for a, b in zip(hull, hull[1:]):
                if a[0] <= p.x <= b[0]:
                    y = a[1] + (b[1] - a[1]) * ((p.x - a[0]) / ((b[0] - a[0]) or 1))
                    if y < p.y: v.co = inv @ Vector((p.x, y, p.z))
                    break
    bm.normal_update()
    # 4. Lissage (efface le relief anatomique sous le tissu), bords gardés en place, puis épaisseur.
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(14): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * inflate
    bm.to_mesh(o.data); bm.free(); o.data.update()
    for p in o.data.polygons: p.use_smooth = True
    # 5. Poids : ni bras ni main (le tissu suit le thorax et les clavicules), normalisés.
    for g in [g for g in o.vertex_groups if g.index in arm_groups]: o.vertex_groups.remove(g)
    for v in o.data.vertices:
        tot = sum(e.weight for e in v.groups)
        if tot > 0:
            for e in v.groups: e.weight /= tot
    o.modifiers.new('Armature', 'ARMATURE').object = arm
    return o


def bra_ring(body, old_top, arm, tag, rows=10, cols=72, z_lo=1.09, z_front=1.302, z_side=1.25, inflate=0.006,
             strap_x=0.088, strap_w=0.042):
    """Brassière en anneau régulier : pour chaque hauteur et chaque angle autour du buste, un rayon tiré de l'extérieur
    vers l'axe du corps trouve la surface (corps, ou ancienne bande là où le corps est troué). Chaque rangée est
    remplacée par son enveloppe convexe (le tissu ne suit ni le creux entre les seins ni le sillon du dos), puis gonflée.
    Bord haut à hauteur constante, au-dessus du trou laissé dans le corps par l'ancienne bande. Bretelles en rubans."""
    import math
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    from mathutils.kdtree import KDTree
    dg = bpy.context.evaluated_depsgraph_get()
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    trees = []
    for ob in (body, old_top):
        trees.append((ob, BVHTree.FromObject(ob, dg)))
    def cast(p0, d):  # premier contact (le plus proche de l'origine du rayon) sur le corps ou l'ancienne bande
        best = None
        for ob, tr in trees:
            mw = ob.matrix_world; inv = mw.inverted()
            hit = tr.ray_cast(inv @ p0, (inv.to_3x3() @ d).normalized())
            if hit[0] is not None:
                w = mw @ hit[0]
                if best is None or (w - p0).length < (best - p0).length: best = w
        return best
    # Poids : sommet le plus proche du corps ou de l'ancienne bande (qui a les poids du thorax là où le corps est troué).
    src = []
    for ob in (body, old_top):
        for v in ob.data.vertices: src.append((ob.matrix_world @ v.co, ob, v.index))
    kd = KDTree(len(src))
    for i, (p, _, _) in enumerate(src): kd.insert(p, i)
    kd.balance()
    armish = lambda n: n.split(':')[-1].startswith(('LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'))
    def top_z(a):  # devant / derrière haut, sous les bras plus bas
        return z_side if abs(math.sin(a)) > 0.93 else z_front  # plus bas seulement sous les bras (hors du trou du corps)
    grid = []
    for r in range(rows):
        row = []
        for c in range(cols):
            a = 2 * math.pi * c / cols  # 0 : devant (-Y), π/2 : côté gauche (+X)
            z = z_lo + (top_z(a) - z_lo) * r / (rows - 1)
            d = Vector((math.sin(a), -math.cos(a), 0))
            ctr = Vector((0, -0.015, z))
            p = cast(ctr, d)  # de l'axe vers l'extérieur : le premier contact est le torse, jamais le bras
            row.append(p if p is not None and (p - ctr).length < 0.2 else None)  # plus loin : le rayon est passé sous l'aisselle
        for c in range(cols):  # trous : moyenne des voisins valides de la rangée (rayon interpolé)
            if row[c] is None:
                k1 = next(k for k in range(1, cols) if row[(c - k) % cols] is not None); k2 = next(k for k in range(1, cols) if row[(c + k) % cols] is not None)
                a_, b_ = row[(c - k1) % cols], row[(c + k2) % cols]; ang = 2 * math.pi * c / cols
                rad = ((a_.xy - Vector((0, -0.015))).length * k2 + (b_.xy - Vector((0, -0.015))).length * k1) / (k1 + k2)
                row[c] = Vector((math.sin(ang) * rad, -0.015 - math.cos(ang) * rad, a_.z))
        # Enveloppe convexe de la rangée (vue de dessus), chaque point repoussé radialement sur elle.
        pts = [(q.x, q.y) for q in row]
        hull = sorted(set(pts))
        def cross(o, a_, b_): return (a_[0] - o[0]) * (b_[1] - o[1]) - (a_[1] - o[1]) * (b_[0] - o[0])
        lo_, hi_ = [], []
        for q in hull:
            while len(lo_) >= 2 and cross(lo_[-2], lo_[-1], q) <= 0: lo_.pop()
            lo_.append(q)
        for q in reversed(hull):
            while len(hi_) >= 2 and cross(hi_[-2], hi_[-1], q) <= 0: hi_.pop()
            hi_.append(q)
        poly = lo_[:-1] + hi_[:-1]
        cx, cy = 0.0, -0.015
        for c, q in enumerate(row):
            dx, dy = q.x - cx, q.y - cy; L = math.hypot(dx, dy) or 1; ux, uy = dx / L, dy / L
            best = L
            for i in range(len(poly)):  # intersection du rayon avec le polygone convexe
                (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
                ex, ey = x2 - x1, y2 - y1; den = ux * ey - uy * ex
                if abs(den) < 1e-9: continue
                t = ((x1 - cx) * ey - (y1 - cy) * ex) / den; s = ((x1 - cx) * uy - (y1 - cy) * ux) / den
                if t > 0 and -1e-6 <= s <= 1 + 1e-6: best = max(best, t)
            hem = inflate + 0.012 * max(0.0, (r - (rows - 3)) / 2) * (1 - abs(math.sin(2 * math.pi * c / cols)))  # ourlet épais devant/derrière
            row[c] = Vector((cx + ux * (best + hem), cy + uy * (best + hem), q.z))
        grid.append(row)
    arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    verts = [p for row in grid for p in row]
    faces = [(r * cols + c, r * cols + (c + 1) % cols, (r + 1) * cols + (c + 1) % cols, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols)]
    # Bretelles : rubans du haut de la bande devant, par-dessus le trapèze, jusqu'au haut de la bande derrière.
    for sx in (-1, 1):
        x = sx * strap_x; ribbon = []
        for k in range(29):
            th = math.radians(-105 + 210 * k / 28)
            d = Vector((0, -math.cos(th), math.sin(th)))
            p = cast(Vector((x, -0.02, 1.27)) + d * 0.4, -d)
            if p is not None and p.z >= 1.306: ribbon.append(p)  # départ au bord de la bande (pas dessous)
        for i, p in enumerate(ribbon):
            t = (ribbon[min(i + 1, len(ribbon) - 1)] - ribbon[max(i - 1, 0)]).normalized()
            n = Vector((0, p.y + 0.02, p.z - 1.27)).normalized()
            w = t.cross(n).normalized() * (strap_w / 2)
            base = len(verts)
            verts += [p + w + n * inflate * 3.2, p + n * inflate * 3.8, p - w + n * inflate * 3.2]  # assez loin de la peau pour l'épaule levée
            if i: faces += [(base - 3, base - 2, base + 1, base), (base - 2, base - 1, base + 2, base + 1)]
    me = bpy.data.meshes.new(tag + '_Bra'); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(tag + '_Bra', me)
    for c in old_top.users_collection: c.objects.link(o)
    o.data.materials.append(old_top.data.materials[0])
    groups = {}
    for i, p in enumerate(verts):
        acc = {}
        for (q, j, dist) in kd.find_n(p, 4):
            _, ob, vi = src[j]; wt = 1 / (dist + 1e-4)
            for e in ob.data.vertices[vi].groups:
                nm = ob.vertex_groups[e.group].name
                if armish(nm): continue
                acc[nm] = acc.get(nm, 0) + e.weight * wt
        tot = sum(acc.values()) or 1
        for nm, w in acc.items():
            if nm not in groups: groups[nm] = o.vertex_groups.new(name=nm)
            groups[nm].add([i], w / tot, 'REPLACE')
    o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()  # sommets donnés en coordonnées monde
    o.modifiers.new('Armature', 'ARMATURE').object = arm
    return o
