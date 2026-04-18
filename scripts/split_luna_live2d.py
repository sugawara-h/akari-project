from __future__ import annotations

import csv
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter


SOURCE = Path("/Users/hiroto/Downloads/ChatGPT Image 2026年4月18日 23_14_05.png")
OUT_DIR = Path("/Users/hiroto/akari-project/output/luna_live2d_parts")
FULL_DIR = OUT_DIR / "full_canvas_png"
CROP_DIR = OUT_DIR / "cropped_png"
GUIDE_DIR = OUT_DIR / "guide"
W, H = 1024, 1536


@dataclass
class Part:
    name: str
    group: str
    status: str
    notes: str
    bbox: tuple[int, int, int, int] | None = None


def blank_mask() -> Image.Image:
    return Image.new("L", (W, H), 0)


def draw_poly(mask: Image.Image, points: Iterable[tuple[int, int]], fill: int = 255) -> Image.Image:
    ImageDraw.Draw(mask).polygon(list(points), fill=fill)
    return mask


def draw_ellipse(mask: Image.Image, bbox: tuple[int, int, int, int], fill: int = 255) -> Image.Image:
    ImageDraw.Draw(mask).ellipse(bbox, fill=fill)
    return mask


def draw_rect(mask: Image.Image, bbox: tuple[int, int, int, int], fill: int = 255) -> Image.Image:
    ImageDraw.Draw(mask).rectangle(bbox, fill=fill)
    return mask


def combine(*masks: Image.Image) -> Image.Image:
    out = blank_mask()
    for mask in masks:
        out = Image.composite(Image.new("L", (W, H), 255), out, mask)
    return out


def intersect(mask: Image.Image, clip: Image.Image) -> Image.Image:
    return ImageChops.multiply(mask, clip)


def subtract(mask: Image.Image, *cuts: Image.Image) -> Image.Image:
    out = mask.copy()
    for cut in cuts:
        out = Image.composite(Image.new("L", (W, H), 0), out, cut)
    return out


def soften(mask: Image.Image, radius: float = 1.2) -> Image.Image:
    return mask.filter(ImageFilter.GaussianBlur(radius))


def save_part(src: Image.Image, part: Part, mask: Image.Image | None) -> None:
    full_path = FULL_DIR / f"{part.name}.png"
    crop_path = CROP_DIR / f"{part.name}.png"

    if mask is None:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    else:
        alpha = soften(mask)
        layer = src.copy()
        layer.putalpha(alpha)
        part.bbox = alpha.getbbox()

    layer.save(full_path)
    if part.bbox:
        layer.crop(part.bbox).save(crop_path)
    else:
        Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(crop_path)


def mask_from_polys(polys: list[list[tuple[int, int]]]) -> Image.Image:
    mask = blank_mask()
    for poly in polys:
        draw_poly(mask, poly)
    return mask


def foreground_clip_mask() -> Image.Image:
    """Loose character silhouette used to keep broad hair/dress masks from carrying background."""
    clip = blank_mask()
    polys = [
        [
            (276, 224), (392, 88), (540, 58), (693, 107), (820, 216),
            (900, 402), (1002, 591), (1017, 944), (959, 1304),
            (864, 1536), (155, 1536), (107, 1326), (47, 1160),
            (72, 897), (157, 720), (187, 505),
        ],
        [(107, 760), (302, 671), (374, 1260), (125, 1374)],
        [(705, 676), (917, 753), (978, 1266), (729, 1360)],
        [(438, 647), (819, 710), (855, 1134), (500, 1264), (331, 1031)],
    ]
    for poly in polys:
        draw_poly(clip, poly)
    draw_ellipse(clip, (226, 126, 839, 860))
    draw_ellipse(clip, (113, 421, 469, 1470))
    draw_ellipse(clip, (658, 373, 1024, 1510))
    return clip.filter(ImageFilter.GaussianBlur(0.8))


def make_masks() -> dict[str, Image.Image]:
    masks: dict[str, Image.Image] = {}

    face = draw_ellipse(blank_mask(), (368, 170, 668, 572))
    masks["face_base"] = face
    masks["face_contour"] = face
    masks["neck"] = mask_from_polys([[(448, 500), (583, 500), (617, 720), (414, 720)]])
    masks["neck_shadow"] = mask_from_polys([[(430, 600), (604, 602), (626, 725), (406, 722)]])
    masks["ear_L"] = mask_from_polys([[(332, 330), (386, 292), (390, 438), (339, 470)]])
    masks["ear_R"] = mask_from_polys([[(635, 316), (694, 300), (684, 443), (636, 455)]])

    masks["hair_front_center"] = mask_from_polys([[(395, 116), (533, 76), (622, 116), (638, 310), (552, 345), (473, 334), (385, 303)]])
    masks["hair_front_L"] = mask_from_polys([[(308, 172), (426, 95), (465, 334), (344, 448), (269, 388)]])
    masks["hair_front_R"] = mask_from_polys([[(585, 90), (735, 192), (689, 470), (579, 345)]])
    masks["hair_side_L_01"] = mask_from_polys([[(262, 355), (372, 342), (392, 957), (252, 1114), (190, 790)]])
    masks["hair_side_L_02"] = mask_from_polys([[(198, 455), (298, 386), (313, 1210), (132, 1371), (121, 760)]])
    masks["hair_side_L_03"] = mask_from_polys([[(144, 690), (226, 575), (215, 1452), (72, 1536), (89, 1008)]])
    masks["hair_side_R_01"] = mask_from_polys([[(633, 342), (775, 344), (850, 1006), (688, 1132), (612, 700)]])
    masks["hair_side_R_02"] = mask_from_polys([[(715, 324), (940, 474), (954, 1300), (777, 1504), (742, 764)]])
    masks["hair_side_R_03"] = mask_from_polys([[(842, 442), (1024, 542), (1024, 1536), (892, 1536), (828, 1070)]])
    masks["hair_back_L_01"] = mask_from_polys([[(254, 224), (370, 96), (390, 410), (248, 566), (177, 414)]])
    masks["hair_back_L_02"] = mask_from_polys([[(170, 535), (301, 387), (346, 1062), (160, 1216), (102, 866)]])
    masks["hair_back_L_03"] = mask_from_polys([[(83, 914), (204, 760), (222, 1536), (44, 1536)]])
    masks["hair_back_R_01"] = mask_from_polys([[(630, 110), (829, 205), (822, 580), (676, 426)]])
    masks["hair_back_R_02"] = mask_from_polys([[(760, 395), (1019, 522), (1024, 1196), (849, 1248), (737, 791)]])
    masks["hair_back_R_03"] = mask_from_polys([[(852, 920), (1024, 860), (1024, 1536), (824, 1536)]])
    masks["hair_tip_L_01"] = mask_from_polys([[(104, 972), (212, 947), (219, 1346), (79, 1517)]])
    masks["hair_tip_L_02"] = mask_from_polys([[(245, 957), (342, 975), (318, 1384), (180, 1485)]])
    masks["hair_tip_R_01"] = mask_from_polys([[(746, 914), (870, 936), (906, 1410), (746, 1536)]])
    masks["hair_tip_R_02"] = mask_from_polys([[(879, 820), (1024, 812), (1024, 1536), (908, 1432)]])
    masks["hair_ahoge_01"] = mask_from_polys([[(489, 63), (521, 20), (541, 87), (506, 110)]])
    masks["hair_ahoge_02"] = mask_from_polys([[(579, 75), (642, 36), (626, 115), (584, 129)]])

    masks["eyebrow_L"] = mask_from_polys([[(400, 323), (466, 307), (477, 321), (407, 344)]])
    masks["eyebrow_R"] = mask_from_polys([[(551, 307), (619, 313), (632, 331), (557, 323)]])

    masks["eye_L_white"] = draw_ellipse(blank_mask(), (389, 331, 487, 390))
    masks["eye_L_iris"] = draw_ellipse(blank_mask(), (422, 331, 480, 393))
    masks["eye_L_pupil"] = draw_ellipse(blank_mask(), (440, 348, 463, 379))
    masks["eye_L_highlight"] = combine(draw_ellipse(blank_mask(), (448, 337, 462, 351)), draw_ellipse(blank_mask(), (429, 354, 439, 364)))
    masks["eye_L_upper_lid"] = mask_from_polys([[(384, 328), (435, 303), (493, 329), (483, 347), (430, 326)]])
    masks["eye_L_lower_lid"] = mask_from_polys([[(398, 386), (452, 399), (486, 383), (484, 394), (445, 414), (396, 398)]])
    masks["eye_L_lash"] = combine(masks["eye_L_upper_lid"], mask_from_polys([[(388, 330), (359, 323), (386, 343)], [(488, 332), (515, 323), (492, 348)]]))
    masks["eye_L_sparkle_add"] = combine(draw_ellipse(blank_mask(), (416, 345, 430, 360)), draw_ellipse(blank_mask(), (468, 365, 479, 376)))

    masks["eye_R_white"] = draw_ellipse(blank_mask(), (532, 329, 633, 388))
    masks["eye_R_iris"] = draw_ellipse(blank_mask(), (546, 330, 608, 393))
    masks["eye_R_pupil"] = draw_ellipse(blank_mask(), (567, 348, 592, 379))
    masks["eye_R_highlight"] = combine(draw_ellipse(blank_mask(), (577, 337, 591, 351)), draw_ellipse(blank_mask(), (550, 356, 560, 366)))
    masks["eye_R_upper_lid"] = mask_from_polys([[(526, 329), (580, 303), (641, 331), (631, 348), (580, 327)]])
    masks["eye_R_lower_lid"] = mask_from_polys([[(538, 384), (589, 399), (630, 382), (630, 394), (590, 414), (535, 398)]])
    masks["eye_R_lash"] = combine(masks["eye_R_upper_lid"], mask_from_polys([[(530, 331), (505, 322), (528, 346)], [(636, 332), (660, 322), (640, 348)]]))
    masks["eye_R_sparkle_add"] = combine(draw_ellipse(blank_mask(), (539, 346, 553, 360)), draw_ellipse(blank_mask(), (601, 365, 613, 377)))

    masks["eye_L_smile"] = mask_from_polys([[(394, 360), (440, 337), (488, 361), (480, 377), (438, 357), (400, 378)]])
    masks["eye_R_smile"] = mask_from_polys([[(537, 358), (583, 336), (631, 360), (624, 376), (584, 357), (543, 377)]])
    masks["eye_L_closed"] = mask_from_polys([[(392, 361), (439, 344), (490, 360), (486, 374), (438, 362), (395, 376)]])
    masks["eye_R_closed"] = mask_from_polys([[(533, 360), (584, 344), (634, 361), (630, 375), (584, 363), (536, 377)]])

    masks["nose"] = mask_from_polys([[(511, 377), (528, 428), (506, 432), (499, 414)]])
    masks["mouth_base"] = mask_from_polys([[(487, 479), (525, 496), (561, 479), (555, 501), (525, 520), (491, 500)]])
    masks["mouth_upper_lip"] = mask_from_polys([[(486, 479), (525, 489), (562, 479), (525, 499)]])
    masks["mouth_lower_lip"] = mask_from_polys([[(492, 498), (526, 514), (555, 497), (527, 525)]])
    masks["mouth_inside"] = mask_from_polys([[(498, 488), (525, 499), (548, 488), (525, 508)]])
    masks["mouth_teeth"] = None
    masks["mouth_tongue"] = None
    masks["cheek_normal"] = combine(draw_ellipse(blank_mask(), (342, 417, 438, 494)), draw_ellipse(blank_mask(), (587, 413, 691, 493)))
    masks["cheek_blush_extra"] = masks["cheek_normal"]

    masks["accessory_moon_hair"] = mask_from_polys([[(303, 250), (347, 211), (384, 230), (374, 288), (320, 299)]])
    masks["accessory_star_hair"] = mask_from_polys([[(281, 259), (314, 235), (345, 259), (323, 293), (291, 290)]])
    masks["flower_hair_R"] = mask_from_polys([[(654, 181), (762, 149), (827, 243), (754, 322), (650, 292)]])
    masks["leaf_hair_R"] = mask_from_polys([[(724, 120), (875, 89), (848, 287), (731, 261)]])
    masks["earring_L"] = mask_from_polys([[(353, 433), (383, 427), (382, 516), (351, 520)]])
    masks["earring_R"] = mask_from_polys([[(646, 423), (676, 420), (680, 514), (650, 515)]])
    masks["necklace"] = mask_from_polys([[(384, 626), (507, 560), (644, 626), (618, 692), (505, 624), (405, 694)]])
    masks["chest_accessory"] = mask_from_polys([[(487, 672), (556, 667), (584, 829), (451, 832)]])

    masks["body_base"] = mask_from_polys([[(250, 625), (778, 622), (899, 1536), (140, 1536)]])
    masks["chest"] = mask_from_polys([[(342, 624), (678, 621), (720, 922), (298, 929)]])
    masks["shoulder_L"] = mask_from_polys([[(183, 658), (366, 604), (384, 785), (180, 860)]])
    masks["shoulder_R"] = mask_from_polys([[(639, 603), (839, 654), (852, 862), (629, 782)]])
    masks["arm_L_upper"] = mask_from_polys([[(130, 742), (282, 715), (312, 1115), (134, 1172)]])
    masks["arm_L_lower"] = mask_from_polys([[(161, 1010), (360, 972), (417, 1253), (191, 1300)]])
    masks["hand_L"] = mask_from_polys([[(367, 976), (524, 969), (547, 1051), (396, 1074)]])
    masks["arm_R_upper"] = mask_from_polys([[(720, 720), (882, 742), (859, 1145), (686, 1040)]])
    masks["arm_R_lower"] = mask_from_polys([[(568, 940), (817, 927), (852, 1066), (607, 1108)]])
    masks["hand_R"] = mask_from_polys([[(520, 1018), (684, 1027), (700, 1110), (529, 1114)]])

    masks["dress_body"] = mask_from_polys([[(277, 651), (744, 640), (873, 1536), (169, 1536)]])
    masks["dress_lace_chest"] = mask_from_polys([[(333, 628), (505, 676), (678, 628), (621, 771), (506, 713), (383, 782)]])
    masks["dress_ribbon_chest"] = mask_from_polys([[(434, 782), (544, 775), (593, 848), (491, 877), (403, 837)]])
    masks["sleeve_L"] = mask_from_polys([[(130, 722), (330, 705), (371, 1200), (116, 1328), (54, 898)]])
    masks["sleeve_R"] = mask_from_polys([[(710, 700), (910, 752), (965, 1260), (712, 1217)]])
    masks["sleeve_lace_L"] = mask_from_polys([[(61, 1008), (352, 1032), (377, 1312), (55, 1320)]])
    masks["sleeve_lace_R"] = mask_from_polys([[(716, 1007), (963, 1033), (981, 1328), (732, 1293)]])
    masks["leaf_decoration_L"] = mask_from_polys([[(235, 624), (396, 613), (387, 1312), (257, 1222)]])
    masks["leaf_decoration_R"] = mask_from_polys([[(643, 607), (790, 637), (773, 1296), (636, 1203)]])
    masks["flower_decoration"] = combine(
        draw_ellipse(blank_mask(), (255, 751, 321, 819)),
        draw_ellipse(blank_mask(), (703, 771, 758, 829)),
        draw_ellipse(blank_mask(), (315, 1011, 374, 1076)),
        draw_ellipse(blank_mask(), (673, 1125, 725, 1180)),
    )
    masks["swaying_ornament"] = mask_from_polys([[(499, 783), (538, 781), (548, 1330), (507, 1362), (470, 1327)]])
    masks["skirt_upper"] = mask_from_polys([[(228, 998), (826, 1000), (880, 1242), (180, 1245)]])
    masks["skirt_lower"] = mask_from_polys([[(178, 1210), (886, 1210), (937, 1536), (100, 1536)]])

    masks["baku_head"] = draw_ellipse(blank_mask(), (509, 682, 835, 942))
    masks["baku_body"] = mask_from_polys([[(474, 866), (781, 821), (856, 1120), (551, 1230), (396, 1048)]])
    masks["baku_ear_L"] = mask_from_polys([[(467, 716), (534, 651), (579, 730), (530, 789)]])
    masks["baku_ear_R"] = mask_from_polys([[(792, 700), (888, 686), (868, 794), (794, 795)]])
    masks["baku_hand_L"] = mask_from_polys([[(431, 1004), (525, 971), (548, 1112), (453, 1150)]])
    masks["baku_hand_R"] = mask_from_polys([[(725, 957), (833, 953), (839, 1090), (736, 1107)]])
    masks["baku_foot"] = mask_from_polys([[(483, 1110), (701, 1096), (747, 1244), (533, 1272)]])
    masks["baku_face"] = draw_ellipse(blank_mask(), (575, 745, 813, 905))
    masks["baku_cheek"] = combine(draw_ellipse(blank_mask(), (663, 840, 715, 883)), draw_ellipse(blank_mask(), (783, 827, 833, 870)))
    masks["baku_eye"] = combine(draw_ellipse(blank_mask(), (669, 787, 704, 824)), draw_ellipse(blank_mask(), (812, 767, 845, 804)))
    masks["baku_mouth"] = mask_from_polys([[(680, 874), (721, 894), (762, 874), (724, 914)]])

    clip = foreground_clip_mask()
    for name, mask in list(masks.items()):
        if mask is not None:
            masks[name] = intersect(mask, clip)

    return masks


def build_parts() -> list[Part]:
    extracted = "extracted_visible_pixels"
    placeholder = "transparent_placeholder"
    parts = [
        Part("hair_back_L_01", "A_hair_back", extracted, "後ろ髪左上。顔や前髪の裏に配置してください。"),
        Part("hair_back_L_02", "A_hair_back", extracted, "後ろ髪左中。揺れ用の親パーツ候補です。"),
        Part("hair_back_L_03", "A_hair_back", extracted, "後ろ髪左下。毛先揺れを強めに設定できます。"),
        Part("hair_back_R_01", "A_hair_back", extracted, "後ろ髪右上。"),
        Part("hair_back_R_02", "A_hair_back", extracted, "後ろ髪右中。"),
        Part("hair_back_R_03", "A_hair_back", extracted, "後ろ髪右下。"),
        Part("hair_tip_L_01", "A_hair_tips", extracted, "左毛先1。遅延揺れ向き。"),
        Part("hair_tip_L_02", "A_hair_tips", extracted, "左毛先2。"),
        Part("hair_tip_R_01", "A_hair_tips", extracted, "右毛先1。"),
        Part("hair_tip_R_02", "A_hair_tips", extracted, "右毛先2。"),
        Part("hair_ahoge_01", "A_hair_front", extracted, "浮き毛1。"),
        Part("hair_ahoge_02", "A_hair_front", extracted, "浮き毛2。"),
        Part("hair_side_L_03", "A_hair_side", extracted, "横髪左後。"),
        Part("hair_side_L_02", "A_hair_side", extracted, "横髪左中。"),
        Part("hair_side_L_01", "A_hair_side", extracted, "横髪左前。"),
        Part("hair_side_R_03", "A_hair_side", extracted, "横髪右後。"),
        Part("hair_side_R_02", "A_hair_side", extracted, "横髪右中。"),
        Part("hair_side_R_01", "A_hair_side", extracted, "横髪右前。"),
        Part("neck_shadow", "A_head_base", extracted, "首影。乗算調整推奨。"),
        Part("neck", "A_head_base", extracted, "首。隠れ部分の描き足しは別途推奨。"),
        Part("ear_L", "A_head_base", extracted, "左耳。髪下に配置。"),
        Part("ear_R", "A_head_base", extracted, "右耳。髪下に配置。"),
        Part("face_base", "A_head_base", extracted, "顔ベース。輪郭外は元絵依存なので、角度付け前に描き足し推奨。"),
        Part("face_contour", "A_head_base", extracted, "顔輪郭調整用の複製レイヤー。"),
        Part("cheek_normal", "A_face_detail", extracted, "通常チーク。"),
        Part("cheek_blush_extra", "A_face_detail", extracted, "照れ差分チーク。元絵から複製、必要に応じて彩度調整してください。"),
        Part("nose", "A_face_detail", extracted, "鼻。角度変化時に微調整しやすいよう独立。"),
        Part("eyebrow_L", "A_face_detail", extracted, "左眉。"),
        Part("eyebrow_R", "A_face_detail", extracted, "右眉。"),
        Part("eye_L_white", "A_eye_L", extracted, "左白目。"),
        Part("eye_L_iris", "A_eye_L", extracted, "左黒目・虹彩。"),
        Part("eye_L_pupil", "A_eye_L", extracted, "左瞳孔。"),
        Part("eye_L_highlight", "A_eye_L", extracted, "左ハイライト。"),
        Part("eye_L_sparkle_add", "A_eye_L", extracted, "左瞳きらめき用。加算推奨。"),
        Part("eye_L_upper_lid", "A_eye_L", extracted, "左上まぶた線。"),
        Part("eye_L_lower_lid", "A_eye_L", extracted, "左下まぶた線。"),
        Part("eye_L_lash", "A_eye_L", extracted, "左まつ毛。"),
        Part("eye_L_smile", "A_eye_L_diff", extracted, "左笑い目差分。元絵の目線から近似生成。"),
        Part("eye_L_closed", "A_eye_L_diff", extracted, "左閉じ目差分。元絵のまぶた線から近似生成。"),
        Part("eye_R_white", "A_eye_R", extracted, "右白目。"),
        Part("eye_R_iris", "A_eye_R", extracted, "右黒目・虹彩。"),
        Part("eye_R_pupil", "A_eye_R", extracted, "右瞳孔。"),
        Part("eye_R_highlight", "A_eye_R", extracted, "右ハイライト。"),
        Part("eye_R_sparkle_add", "A_eye_R", extracted, "右瞳きらめき用。加算推奨。"),
        Part("eye_R_upper_lid", "A_eye_R", extracted, "右上まぶた線。"),
        Part("eye_R_lower_lid", "A_eye_R", extracted, "右下まぶた線。"),
        Part("eye_R_lash", "A_eye_R", extracted, "右まつ毛。"),
        Part("eye_R_smile", "A_eye_R_diff", extracted, "右笑い目差分。"),
        Part("eye_R_closed", "A_eye_R_diff", extracted, "右閉じ目差分。"),
        Part("mouth_base", "A_mouth", extracted, "口ベース。"),
        Part("mouth_upper_lip", "A_mouth", extracted, "上唇。"),
        Part("mouth_lower_lip", "A_mouth", extracted, "下唇。"),
        Part("mouth_inside", "A_mouth", extracted, "口内。母音差分のベース。"),
        Part("mouth_teeth", "A_mouth", placeholder, "元絵に歯が見えないため透明。必要時に描き足し。"),
        Part("mouth_tongue", "A_mouth", placeholder, "元絵に舌が見えないため透明。必要時に描き足し。"),
        Part("hair_front_center", "A_hair_front", extracted, "前髪中央。顔より前。"),
        Part("hair_front_L", "A_hair_front", extracted, "前髪左。"),
        Part("hair_front_R", "A_hair_front", extracted, "前髪右。"),
        Part("accessory_moon_hair", "B_accessory", extracted, "月モチーフ髪飾り。"),
        Part("accessory_star_hair", "B_accessory", extracted, "星モチーフ髪飾り。"),
        Part("flower_hair_R", "B_accessory", extracted, "白花の髪飾り。"),
        Part("leaf_hair_R", "B_accessory", extracted, "葉飾り。"),
        Part("earring_L", "B_accessory", extracted, "左ピアス。揺れ物。"),
        Part("earring_R", "B_accessory", extracted, "右ピアス。揺れ物。"),
        Part("necklace", "B_accessory", extracted, "ネックレス。揺れ物。"),
        Part("chest_accessory", "B_accessory", extracted, "胸元アクセサリー。"),
        Part("body_base", "C_body", extracted, "上半身ベース。"),
        Part("chest", "C_body", extracted, "胸部。"),
        Part("shoulder_L", "C_body", extracted, "左肩。"),
        Part("shoulder_R", "C_body", extracted, "右肩。"),
        Part("arm_L_upper", "C_body", extracted, "左上腕。"),
        Part("arm_L_lower", "C_body", extracted, "左前腕。"),
        Part("hand_L", "C_body", extracted, "左手。バク前後関係に注意。"),
        Part("arm_R_upper", "C_body", extracted, "右上腕。"),
        Part("arm_R_lower", "C_body", extracted, "右前腕。"),
        Part("hand_R", "C_body", extracted, "右手。バク前後関係に注意。"),
        Part("dress_body", "D_dress", extracted, "身頃ベース。"),
        Part("dress_lace_chest", "D_dress", extracted, "胸元レース。"),
        Part("dress_ribbon_chest", "D_dress", extracted, "胸元リボン。"),
        Part("sleeve_L", "D_dress", extracted, "左袖。"),
        Part("sleeve_R", "D_dress", extracted, "右袖。"),
        Part("sleeve_lace_L", "D_dress", extracted, "左袖レース。"),
        Part("sleeve_lace_R", "D_dress", extracted, "右袖レース。"),
        Part("leaf_decoration_L", "D_dress", extracted, "装飾葉左。"),
        Part("leaf_decoration_R", "D_dress", extracted, "装飾葉右。"),
        Part("flower_decoration", "D_dress", extracted, "花装飾。"),
        Part("swaying_ornament", "D_dress", extracted, "揺れる先端装飾。"),
        Part("skirt_upper", "D_dress", extracted, "裾上段。"),
        Part("skirt_lower", "D_dress", extracted, "裾下段。"),
        Part("baku_body", "E_baku", extracted, "バク胴体。"),
        Part("baku_foot", "E_baku", extracted, "バク足。"),
        Part("baku_hand_L", "E_baku", extracted, "バク手左。"),
        Part("baku_hand_R", "E_baku", extracted, "バク手右。"),
        Part("baku_ear_L", "E_baku", extracted, "バク耳左。"),
        Part("baku_ear_R", "E_baku", extracted, "バク耳右。"),
        Part("baku_head", "E_baku", extracted, "バク頭。"),
        Part("baku_face", "E_baku", extracted, "バク顔。"),
        Part("baku_cheek", "E_baku", extracted, "バクほっぺ。"),
        Part("baku_eye", "E_baku", extracted, "バク目。"),
        Part("baku_mouth", "E_baku", extracted, "バク口。"),
    ]

    for expression in [
        "expr_normal_smile",
        "expr_soft_smile",
        "expr_mysterious_downcast",
        "expr_empathy_worried_brow",
        "expr_teary_healing",
        "expr_blush",
        "expr_serious_fortune",
        "mouth_A",
        "mouth_I",
        "mouth_U",
        "mouth_E",
        "mouth_O",
    ]:
        parts.append(Part(expression, "F_expression_placeholders", placeholder, "1枚絵からは生成せず透明プレースホルダー。描き足し・差分作画用。"))

    return parts


def write_docs(parts: list[Part]) -> None:
    manifest_path = OUT_DIR / "parts_manifest.json"
    csv_path = OUT_DIR / "parts_manifest.csv"
    readme_path = OUT_DIR / "README_live2d_parts.md"

    manifest_path.write_text(
        json.dumps([asdict(part) for part in parts], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["name", "group", "status", "bbox", "notes"])
        writer.writeheader()
        for part in parts:
            writer.writerow({
                "name": part.name,
                "group": part.group,
                "status": part.status,
                "bbox": part.bbox,
                "notes": part.notes,
            })

    readme_path.write_text(
        """# 星夢ルナ Live2D用パーツ分け

## 出力内容

- `full_canvas_png/`: 元キャンバスサイズ 1024x1536 の透明PNGレイヤーです。Live2DやPSD再構成ではこちらを重ねてください。
- `cropped_png/`: 各パーツの透明余白をトリミングした確認・編集用PNGです。
- `parts_manifest.json`: パーツ名、グループ、抽出状態、bbox、補足メモです。
- `parts_manifest.csv`: 制作者確認用の一覧です。
- `guide/composite_preview.png`: 書き出しパーツを重ねた確認プレビューです。
- `import_full_canvas_png_to_photoshop.jsx`: PhotoshopでPNG群をレイヤーとして読み込み、PSD保存するための補助スクリプトです。

## 注意

この分解は1枚絵からの自動・半手動マスク切り出しです。Live2Dモデルとして破綻しにくくするには、次の描き足しが必要です。

- 前髪下の額、横髪下の頬、首、肩、耳の隠れ部分。
- 目の白目周辺、まぶた差分、口の母音差分。
- バクや腕で隠れている服の下地。
- 髪束の境界線と毛先の透明抜きの手修正。

## 推奨レイヤー順

1. 後ろ髪
2. 首、耳、顔
3. 目、眉、鼻、口、チーク
4. 前髪、横髪前
5. 胴体、衣装
6. 腕、手、バク
7. アクセサリー、瞳きらめき、花、葉、ピアス

## モデリングメモ

- 髪は `hair_side_*` と `hair_tip_*` を遅延揺れに使うと、ゆるふわで静かな動きにしやすいです。
- 瞳の `*_sparkle_add` は加算またはスクリーン系で、控えめな星のきらめきとして使ってください。
- `baku_*` は独立した親デフォーマを作り、呼吸と少しだけズラした微揺れにすると相棒感が出ます。
- 口差分と表情差分は透明プレースホルダーです。元絵の雰囲気を保って追加作画してください。
""",
        encoding="utf-8",
    )


def write_preview(parts: list[Part]) -> None:
    preview = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for part in parts:
        full_path = FULL_DIR / f"{part.name}.png"
        if not full_path.exists() or part.status == "transparent_placeholder":
            continue
        preview.alpha_composite(Image.open(full_path).convert("RGBA"))
    preview.save(GUIDE_DIR / "composite_preview.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FULL_DIR.mkdir(parents=True, exist_ok=True)
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    GUIDE_DIR.mkdir(parents=True, exist_ok=True)

    src = Image.open(SOURCE).convert("RGBA")
    if src.size != (W, H):
        raise ValueError(f"Expected {(W, H)}, got {src.size}")

    masks = make_masks()
    parts = build_parts()
    for part in parts:
        save_part(src, part, masks.get(part.name))

    write_docs(parts)
    write_preview(parts)

    print(f"wrote {len(parts)} parts to {OUT_DIR}")
    print(f"full canvas PNG: {FULL_DIR}")
    print(f"cropped PNG: {CROP_DIR}")


if __name__ == "__main__":
    main()
