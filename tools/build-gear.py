# Matériel 3D de TrackMe (haltère, barre chargée, kettlebell, banc plat, banc incliné) → models/gear.glb.
# À lancer dans Blender (addon MCP ou console) : exec(open('<repo>/tools/build-gear.py').read())
# Dimensions réelles en mètres. Chaque objet a son origine au point d'accroche utilisé par js/viewer3d.js :
# - TM_Dumbbell, TM_Barbell : centre de la prise, axe de la barre le long de X ;
# - TM_Kettlebell : milieu de la poignée, poignée le long de X, boule en dessous ;
# - TM_Bench : au sol sous le milieu du coussin, longueur le long de l'axe avant/arrière (Z du glTF) ;
# - TM_BenchIncline : au sol sous le bord arrière de l'assise ; le dossier monte vers l'arrière (−Z du glTF).
# Repère glTF (Y en haut) : X Blender → X, Z Blender → Y, −Y Blender → Z (avant du personnage).
import bpy, bmesh, math, os
from mathutils import Matrix

REPO = os.path.expanduser('~/coach-app-preview')
col = bpy.data.collections.get('TM_Gear') or bpy.data.collections.new('TM_Gear')
if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)


def mat(name, color, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m


RUBBER = mat('TM_GearRubber', (0.018, 0.018, 0.02), 0, 0.62)
STEEL = mat('TM_GearSteel', (0.62, 0.63, 0.65), 1.0, 0.32)
PAD = mat('TM_GearPad', (0.022, 0.022, 0.025), 0, 0.5)
FRAME = mat('TM_GearFrame', (0.10, 0.10, 0.11), 0.85, 0.42)


def cyl(bm, r, x0, x1, seg=32):
    """Cylindre le long de X, de x0 à x1."""
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=abs(x1 - x0),
                          matrix=Matrix.Translation(((x0 + x1) / 2, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))


def box(bm, sx, sy, sz, cx, cy, cz, bevel=0.0, rot=None):
    m = Matrix.Translation((cx, cy, cz))
    if rot is not None: m = m @ Matrix.Rotation(rot, 4, 'X')
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((sx, sy, sz, 1)))
    if bevel:
        edges = list({e for v in r['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=3, affect='EDGES', profile=0.5)


def sym(fn):
    def f(bm): fn(bm, 1); fn(bm, -1)
    return f


def make(name, parts, flat_axis=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); mats = []
    for fn, m in parts:
        before = set(bm.faces); fn(bm)
        if m not in mats: mats.append(m)
        for f in bm.faces:
            if f not in before: f.material_index = mats.index(m)
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); col.objects.link(o)
    for p in me.polygons:  # surfaces courbes lisses, faces planes nettes
        p.use_smooth = not (flat_axis is not None and abs(p.normal[flat_axis]) > 0.95)
    return o


# ── Haltère (≈ 12 kg) ──
def db_handle(bm): cyl(bm, 0.0165, -0.19, 0.19, 24)
def db_side(bm, s):
    for r, a, b in [(0.026, 0.072, 0.092), (0.108, 0.092, 0.124), (0.094, 0.124, 0.150), (0.026, 0.150, 0.166)]:
        cyl(bm, r, s * a, s * b, 40 if r > 0.05 else 24)
def db_hub(bm, s): cyl(bm, 0.03, s * 0.0915, s * 0.1505, 24); cyl(bm, 0.022, s * 0.166, s * 0.178, 24)
make('TM_Dumbbell', [(db_handle, STEEL), (sym(db_side), RUBBER), (sym(db_hub), STEEL)], flat_axis=0)

# ── Barre olympique chargée (disques Ø 45 cm) ──
def bb_shaft(bm): cyl(bm, 0.0145, -0.66, 0.66, 24)
def bb_side(bm, s): cyl(bm, 0.027, s * 0.66, s * 0.69, 24); cyl(bm, 0.025, s * 0.69, s * 0.98, 24)
def bb_plates(bm, s): cyl(bm, 0.225, s * 0.695, s * 0.752, 56); cyl(bm, 0.165, s * 0.754, s * 0.79, 48); cyl(bm, 0.038, s * 0.792, s * 0.815, 24)
def bb_hubs(bm, s): cyl(bm, 0.07, s * 0.6925, s * 0.7545, 32); cyl(bm, 0.06, s * 0.7535, s * 0.7925, 32)
make('TM_Barbell', [(bb_shaft, STEEL), (sym(bb_side), STEEL), (sym(bb_plates), RUBBER), (sym(bb_hubs), STEEL)], flat_axis=0)

# ── Kettlebell (≈ 16 kg) : poignée en arc au-dessus d'une boule ──
def kb_body(bm):
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=0.105, matrix=Matrix.Translation((0, 0, -0.165)) @ Matrix.Diagonal((1, 1, 0.95, 1)))
    box(bm, 0.12, 0.12, 0.012, 0, 0, -0.264, 0.004)  # base plate
def kb_handle(bm):
    seg = 20
    pts = []
    for i in range(seg + 1):  # arc : deux montants + barre de prise
        a = math.pi * i / seg
        pts.append((0.075 * math.cos(a), 0, -0.10 + 0.105 * math.sin(a) ** 0.6))
    for (x0, _, z0), (x1, _, z1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, z1 - z0); ang = math.atan2(z1 - z0, x1 - x0)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.016, radius2=0.016, depth=L * 1.15,
                              matrix=Matrix.Translation(((x0 + x1) / 2, 0, (z0 + z1) / 2)) @ Matrix.Rotation(-ang, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
make('TM_Kettlebell', [(kb_body, RUBBER), (kb_handle, RUBBER)])

# ── Banc plat : coussin 1,18 m × 0,28 m, dessus à 0,44 m ──
def bench_pad(bm): box(bm, 0.28, 1.18, 0.075, 0, 0, 0.4025, 0.025)
def bench_frame(bm):
    box(bm, 0.06, 1.0, 0.05, 0, 0, 0.34, 0.006)
    for y in (-0.46, 0.46):
        box(bm, 0.055, 0.055, 0.31, 0, y, 0.175, 0.006)
        box(bm, 0.46, 0.065, 0.04, 0, y, 0.02, 0.008)
make('TM_Bench', [(bench_pad, PAD), (bench_frame, FRAME)])

# ── Banc incliné (dossier à 40°) : assise 0,34 m, dessus à 0,45 m ; dossier 0,85 m vers l'arrière (+Y Blender) ──
INC = math.radians(40)
def inc_pads(bm):
    box(bm, 0.30, 0.34, 0.075, 0, -0.17, 0.4125, 0.025)  # assise devant l'origine (vers l'avant = −Y Blender)
    L = 0.85; cy = 0.02 + math.cos(INC) * L / 2; cz = 0.45 + math.sin(INC) * L / 2 - 0.03
    box(bm, 0.28, L, 0.075, 0, cy, cz, 0.025, rot=INC)
def inc_frame(bm):
    box(bm, 0.06, 0.95, 0.05, 0, 0.12, 0.30, 0.006)
    for y in (-0.30, 0.55):
        box(bm, 0.055, 0.055, 0.29, 0, y, 0.165, 0.006); box(bm, 0.46, 0.065, 0.04, 0, y, 0.02, 0.008)
    # montant qui soutient le dossier
    box(bm, 0.05, 0.05, 0.55, 0, 0.42, 0.55, 0.006, rot=-0.35)
make('TM_BenchIncline', [(inc_pads, PAD), (inc_frame, FRAME)])

# ───── Machines ─────
# Repère des poses (js/poses.js) : [côté, hauteur, avant] → Blender (x, -avant, hauteur). Origine de chaque machine : au sol
# sous le bassin du pratiquant (placée par `gear.machine.at`). Parties mobiles : objets séparés, animés par js/gear3d.js.
def P(x, y, z): return (x, -z, y)

def tube(bm, a, b, r, seg=16):
    """Tube entre deux points Blender."""
    from mathutils import Vector
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=L,
                          matrix=Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())

def pad(bm, sx, sy, sz, c, rot_x=0.0):
    box(bm, sx, sy, sz, c[0], c[1], c[2], 0.025, rot=rot_x if rot_x else None)

LP_ANG = math.radians(45)  # rail de la presse
# Presse à cuisses inclinée : assise, dossier incliné, rails à 45° ; le chariot (plateau + disques) est un objet à part.
def lp_pads(bm):
    pad(bm, 0.42, 0.40, 0.07, P(0, 0.295, 0.0))                           # assise (dessus à 0,33 m)
    L = 0.78; ang = math.radians(52)                                        # dossier, buste couché à ~52° de la verticale
    c = (0, 0.20 + math.sin(ang) * L / 2, 0.33 + math.cos(ang) * L / 2 - 0.02)
    pad(bm, 0.40, L, 0.07, c, rot_x=(math.pi / 2 - ang))  # monte vers l'arrière
def lp_frame(bm):
    for sx in (-0.26, 0.26):
        tube(bm, P(sx, 0.03, -0.75), P(sx, 0.03, 1.55), 0.035)              # longerons au sol
        tube(bm, P(sx, 0.03, 0.2), P(sx, 0.28, 0.2), 0.03)                  # pieds de l'assise
        tube(bm, P(sx, 0.03, -0.6), P(sx, 0.62, -0.6), 0.03)                # montant du dossier
        tube(bm, P(sx * 1.25, 0.55, 0.15), P(sx * 1.25, 1.75, 1.35), 0.04)  # rails à 45°
        tube(bm, P(sx * 1.25, 1.75, 1.35), P(sx * 1.25, 0.03, 1.35), 0.04)  # montant avant
        tube(bm, P(sx, 0.3, -0.05), P(sx * 1.25, 0.3, -0.05), 0.02)         # poignées
        tube(bm, P(sx * 1.25, 0.3, -0.05), P(sx * 1.25, 0.3, 0.12), 0.017)
make('TM_LegPress', [(lp_pads, PAD), (lp_frame, FRAME)])
# Chariot : plateau (surface à l'origine, face vers le pratiquant = +Y Blender), glissières et disques derrière.
def sled_plate(bm): box(bm, 0.62, 0.03, 0.48, 0, -0.015, 0, 0.008)
def sled_frame(bm):
    for sx in (-0.33, 0.33):
        box(bm, 0.05, 0.22, 0.05, sx, -0.12, 0.0, 0.006)
        cyl(bm, 0.025, sx, sx * 1.6, 16)
def sled_plates(bm):
    for sx in (-1, 1):
        bm_m = Matrix.Translation((0, -0.14, 0.0))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=0.2, radius2=0.2, depth=0.05,
                              matrix=Matrix.Translation((sx * 0.43, -0.12, 0.0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
make('TM_LegPressSled', [(sled_plate, RUBBER), (sled_frame, FRAME), (sled_plates, RUBBER)])

# Leg extension : siège, dossier presque droit, poignées ; le bras à rouleau pivote à hauteur du genou (objet à part).
def le_pads(bm):
    pad(bm, 0.42, 0.50, 0.08, P(0, 0.46, 0.05))                             # assise (dessus à 0,50 m)
    pad(bm, 0.40, 0.08, 0.62, P(0, 0.86, -0.26), rot_x=math.radians(-8))    # dossier
def le_frame(bm):
    tube(bm, P(0, 0.03, -0.45), P(0, 0.03, 0.55), 0.035)
    for sx in (-0.2, 0.2):
        tube(bm, P(sx, 0.03, -0.45), P(sx * 1.4, 0.03, -0.45), 0.03); tube(bm, P(sx, 0.03, 0.45), P(sx * 1.4, 0.03, 0.45), 0.03)
    tube(bm, P(0, 0.03, -0.05), P(0, 0.42, -0.05), 0.035)
    tube(bm, P(0, 0.42, -0.3), P(0, 0.42, 0.3), 0.03)
    tube(bm, P(0, 0.5, -0.3), P(0, 1.2, -0.36), 0.03)                       # montant du dossier
    tube(bm, P(0.27, 0.42, 0.36), P(0.27, 0.62, 0.36), 0.03)                # support de l'axe
    tube(bm, P(0.27, 0.42, 0.36), P(0.1, 0.42, 0.36), 0.025)
    for sx in (-0.27, 0.27):
        tube(bm, P(sx * 0.8, 0.45, -0.05), P(sx, 0.45, -0.05), 0.02); tube(bm, P(sx, 0.45, -0.05), P(sx, 0.45, 0.1), 0.017)
make('TM_LegExt', [(le_pads, PAD), (le_frame, FRAME)])
# Bras : axe à l'origine (côté gauche du siège, x = +0,27), levier vers le bas (-Z Blender), rouleau à 0,42 m.
def lea_metal(bm):
    tube(bm, (0.27, 0, 0), (0.27, 0, -0.42), 0.022); tube(bm, (0.27, 0, -0.42), (-0.2, 0, -0.42), 0.014)
    cyl(bm, 0.035, 0.24, 0.31, 20)
def lea_roller(bm):
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.055, radius2=0.055, depth=0.3, matrix=Matrix.Translation((0.02, 0, -0.42)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
make('TM_LegExtArm', [(lea_metal, FRAME), (lea_roller, PAD)])

# Rangés côte à côte pour la vérification visuelle (l'origine de chaque objet est remise à 0 avant l'export).
layout = {'TM_Dumbbell': (-1.2, -1.2, 0.11), 'TM_Barbell': (0, -1.4, 0.225), 'TM_Kettlebell': (1.2, -1.2, 0.27), 'TM_Bench': (-0.6, 0.4, 0), 'TM_BenchIncline': (0.8, 0.4, 0),
          'TM_LegPress': (-2.6, 1.5, 0), 'TM_LegPressSled': (-2.6, -0.1, 1.2), 'TM_LegExt': (2.4, 1.5, 0), 'TM_LegExtArm': (2.4, 1.14, 0.58)}
for n, p in layout.items(): col.objects[n].location = p

def export(path):
    saved = {o.name: o.location.copy() for o in col.objects}
    for o in col.objects: o.location = (0, 0, 0)
    for o in bpy.context.scene.objects:
        if o is not None: o.select_set(o.name in col.objects)
    win = bpy.context.window_manager.windows[0]; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D')
    with bpy.context.temp_override(window=win, area=area, screen=win.screen):  # opérateur lancé depuis l'addon MCP
      bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=False, export_animations=False, export_skins=False, export_morph=False)
    for o in col.objects: o.location = saved[o.name]

if globals().get('TM_EXPORT', False):
    export(os.path.join(REPO, 'models', 'gear.glb'))
print({o.name: tuple(round(x, 3) for x in o.dimensions) for o in col.objects})
