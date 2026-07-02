---
name: Tomorrow-exam flyer template (LOCKED)
description: The one-and-only flyer format for daily "Tomorrow · COURSE test" promo images. User uploaded reference on 2026-07-02.
type: design
---
ALWAYS use this exact template style for daily exam flyers. Never invent a new layout.

Reference image (locked format): src/assets/flyer-template-reference.png.asset.json
URL: /__l5e/assets-v1/565587dc-1f8b-4d46-a951-8a4709d65fad/flyer-template-reference.png

Locked visual elements (must appear on every flyer):
1. Ivory/cream background, portrait 4:5 (1024x1350).
2. Top-left "OverraPrep AI" wordmark with shield-P logo + tagline "Study Smarter. Succeed Faster."
3. Small gold pill "TOMORROW • {COURSE CODE} TEST" with thin dash flourishes.
4. GIANT metallic gold 3D serif headline of the course code with a tiny contextual emoji floating on it (flag for languages, flask for chemistry, calculator for math, etc.).
5. Gold serif + handwritten script sub-headline: "{Course Title} — Practice Tonight".
6. Two topic columns with emoji + ALL-CAPS headers and bullet lists.
7. Small handwritten script accent ("Auf geht's!", "Let's ace it!", etc.) near the columns.
8. Curved metallic gold FUTA arc on the right containing the BGS portrait (bgs.jpg or bgs-futa-ambassador asset), face crisp & natural, with "BGS.FUTA — PROUDLY PART OF THE MISSION" black script signature over his chest.
9. Black + gold CTA bar with shield-P logo: "Open OverraPrep AI → Practice {COURSE}   Study Smart, Not Hard."
10. Three-icon row: brain "Understand Deeply" | target "Practice Intelligently" | trophy "Succeed Confidently".
11. Bottom gold bar: phone icon + "ALL THESE AND MORE INSIDE OVERRAPREP AI" and "www.overraprepai.com".

How to generate: call imagegen--edit_image with image_paths=[reference flyer, BGS portrait], describe only the CONTENT changes (course code, title, bullet topics, emoji), and demand "match the reference template pixel-for-pixel in style". Save to src/assets/{course}-tomorrow-flyer.png and copy to /mnt/documents for download.
