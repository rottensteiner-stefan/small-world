# Novotny — T-Pose Reference Prompts

`generate_image` prompts for producing four isolated reference views, used as 3D modeling
references: **FRONT**, **BACK**, **LEFT**, **RIGHT**. There are two source concept images — a
**MALE** hoodie concept and a **FEMALE** hoodie concept — and the prompts below apply identically
to both; substitute the source image matching the character's gender.

**Source images:**

- **Female:** `assets/novotny-female/hoodie.jpg`
- **Male:** `assets/novotny-male/hoodie.jpg`

## Shared base (applies to all 4 views, both genders)

> Reference image: the matching `novotny-female/hoodie.jpg` / `novotny-male/hoodie.jpg`. Full
> character reference, isolated on a pure white/transparent background — no environment, no
> tunnel, no props. Remove the lantern from the right hand; both arms empty. Keep identical: the
> waxed dark-grey loden trenchcoat, the dark hoodie underlayer, the loop scarf/snood worn loose
> around the neck, the utility belt with buckle, the cargo pants with bellows pockets, the
> strapped knee protectors, the rugged lace-up boots, the gas mask attached at the hip, and the
> character's facial features/likeness exactly as in the reference. Hood down, hair visible — the
> hood is **not** worn up. Flat, even studio lighting (no dramatic noir shadows); clean
> production-reference style, not moody illustration.

## FRONT

> Straight-on front view, character facing directly toward camera, perfectly upright, arms in
> T-pose.

## BACK

> Straight-on back view, character facing directly away from camera, perfectly upright, arms in
> T-pose — show backpack straps and coat back panel.

## RIGHT

> Exact right-side profile view (90°), character facing screen-right, standing straight and
> upright, arms relaxed naturally at the sides — full profile silhouette of coat, boots, and gear.

## LEFT

> Exact left-side profile view (-90°), character facing screen-left, standing straight and
> upright, arms relaxed naturally at the sides — full profile silhouette of coat, boots, and gear.

**Deviation from the original spec:** RIGHT and LEFT deliberately use relaxed arms instead of a
strict T-pose — a 90° side profile in T-pose reduces the extended arm to a thin line toward the
camera, making it useless as a modeling reference. Approved by the user (2026-08-25).

---

## Canonical equipment configuration (female & male)

1. **Hurricane lantern:** in the **right hand** (`RightHand` / `tripo::0_Right_Limb_2`).
2. **Respirator (gas mask):** attached to the belt, **front right**.
3. **Loop scarf (snood):** worn loosely around the neck as a warming collar; face and mouth always
   uncovered.
4. **Hood:** down for turnarounds (resting on the shoulders); hair and head shape fully visible.

---

## Gender-specific base concept prompts

> These two prompts regenerate each gender's tunnel concept art independently. They currently
> differ only in the gender-specific particulars (source image, character description) — art
> style, equipment, and pose are intentionally identical, so keep them in sync unless a real
> design difference is introduced for one gender.

### Female (`novotny-female/hoodie.jpg`) — regeneration prompt

> Reference image: `novotny-female/hoodie.jpg`. Full-body female character concept art in a dark,
> atmospheric flooded concrete bunker tunnel in post-apocalyptic Vienna, 2100.
> **Art style & lighting:** exact same Graphic Noir comic watercolor style and tunnel composition
> as `novotny-female/hoodie.jpg`, with heavy inked outlines and warm amber chiaroscuro lantern
> light.
> **Character:** young woman in her early twenties, lean and weathered, melancholic determined
> expression.
> **Face & head:** entire face fully visible and unmasked (mouth, nose, eyes, cheekbones visible —
> no scarf over mouth/nose). A thick knitted dark loop scarf/snood worn loosely around the neck as
> a collar warmer. Hood up over the head, dark messy hair framing forehead and face.
> **Equipment:** waxed dark-grey/olive loden trenchcoat open over a dark zip-up hoodie, leather
> utility belt with a vintage gas mask attached at the right-front hip, dark cargo trousers with
> bellows pockets, strapped knee armor guards, rugged lace-up work boots, fingerless gloves.
> **Pose:** standing in the flooded tunnel archway, holding an illuminated vintage brass hurricane
> lantern in the **right hand**, casting a warm directional glow onto the body and the wet stone
> floor with water reflections.

### Male (`novotny-male/hoodie.jpg`) — regeneration prompt

> Reference image: `novotny-male/hoodie.jpg`. Full-body male character concept art in a dark,
> atmospheric flooded concrete bunker tunnel in post-apocalyptic Vienna, 2100.
> **Art style & lighting:** exact same Graphic Noir comic watercolor style and tunnel composition
> as `novotny-male/hoodie.jpg`, with heavy inked outlines and warm amber chiaroscuro lantern
> light.
> **Character:** young man in his early twenties, lean and weathered, melancholic determined
> expression.
> **Face & head:** entire face fully visible and unmasked (mouth, nose, eyes, cheekbones visible —
> no scarf over mouth/nose). A thick knitted dark loop scarf/snood worn loosely around the neck as
> a collar warmer. Hood up over the head, dark messy hair framing forehead and face.
> **Equipment:** waxed dark-grey/olive loden trenchcoat open over a dark zip-up hoodie, leather
> utility belt with a vintage gas mask attached at the right-front hip, dark cargo trousers with
> bellows pockets, strapped knee armor guards, rugged lace-up work boots, fingerless gloves.
> **Pose:** standing in the flooded tunnel archway, holding an illuminated vintage brass hurricane
> lantern in the **right hand**, casting a warm directional glow onto the body and the wet stone
> floor with water reflections.
