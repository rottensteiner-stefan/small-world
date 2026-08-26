# Novotny — T-Pose Referenzbilder (Prompts)

> Vorbereitete `generate_image`-Prompts, um aus `assets/novotny_hoodie_female.jpg` drei isolierte
> Referenzbilder für die 3D-Modellierung zu erzeugen (Front, Rücken, rechtes Profil). In dieser
> Session war kein `generate_image`-Tool angebunden — die Prompts sind bereit zur Ausführung,
> sobald ein Agent mit dieser Fähigkeit sie bekommt.

**Quellbild:** `assets/novotny_hoodie_female.jpg`

## Gemeinsame Basis (für alle 3 Versionen)

> Reference image: `novotny_hoodie_female.jpg`. Full character reference, isolated on a pure
> white/transparent background (no environment, no tunnel, no props in the scene). Remove the
> lantern from her right hand — both arms empty. Keep identical: the waxed dark-grey loden
> trenchcoat, the dark hoodie underlayer, the loop scarf/snood worn loose around the neck, the
> utility belt with buckle, the cargo pants with bellows pockets, the strapped knee protectors, the
> rugged lace-up boots, the gas mask attached at the hip, and her facial features/likeness exactly
> as in the reference. She is **not** wearing the hood up — hood down, hair visible. Flat, even
> studio lighting (no dramatic noir shadows), clean production-reference style, not moody
> illustration.

## Version 1 — Front

> Straight-on front view, character facing directly toward camera, perfectly upright, arms in
> T-pose.

## Version 2 — Rücken

> Straight-on back view, character facing directly away from camera, perfectly upright, arms in
> T-pose — show backpack straps and coat back panel.

## Version 3 — Rechtes Profil

> Exact right-side profile view (90°), character facing screen-right, standing straight and
> upright, arms relaxed naturally at the sides — full profile silhouette of coat, boots, and gear.

**Abweichung von der ursprünglichen Vorgabe:** Version 3 nutzt bewusst entspannte Arme statt
strikter T-Pose — ein 90°-Seitenprofil in T-Pose zeigt den ausgestreckten Arm nur als schmale
Linie zur Kamera und wäre als Modellierungsreferenz kaum auswertbar. Vom Nutzer abgesegnet
(2026-08-25).

---

## Kanonische Ausrüstungs-Konfiguration (Female & Male)

1. **Sturmlaterne:** In der **rechten Hand** (`RightHand` / `tripo::0_Right_Limb_2`).
2. **Atemschutzmaske (Gasmaske):** Am Gürtel **rechts vorne** befestigt.
3. **Schlauchschal (Snood):** Locker als wärmender Kragen **um den Hals** getragen (Gesicht und Mund stets unbedeckt).
4. **Kapuze:** Bei Turnarounds **abgesetzt** (hinten auf den Schultern), Haare und Kopfform voll sichtbar.

---

## Männliches Ur-Konzept (`novotny_hoodie_male.jpg`) — Re-Generation Prompt

> Reference image: `novotny_hoodie_female.jpg` and `novotny_male_tpose_front.jpg`. Full body male character concept art in a dark, atmospheric flooded concrete bunker tunnel in post-apocalyptic Vienna 2100.
> **Art Style & Lighting:** Exact same Graphic Noir comic watercolor style and tunnel composition as `novotny_hoodie_female.jpg` with heavy inked outlines and warm amber chiaroscuro lantern light.
> **Character:** Young man in early twenties, lean and weathered, melancholic determined expression.
> **Face & Head:** Entire face is fully visible and UNMASKED (mouth, nose, eyes, cheekbones visible, NO scarf over mouth/nose). A thick knitted dark loop scarf / snood is worn loosely around his neck as a collar warmer. Hood is up over his head with dark messy hair framing his forehead and face.
> **Equipment:** Waxed dark-grey/olive loden trenchcoat open over dark zip-up hoodie, leather utility belt with vintage gas mask attached at the RIGHT FRONT hip, dark cargo trousers with bellows pockets, strapped knee armor guards, rugged lace-up work boots, fingerless gloves.
> **Pose:** Standing in the flooded tunnel archway holding an illuminated vintage brass hurricane lantern in his **RIGHT HAND** casting warm directional glow onto his body and wet stone floor with water reflections.

