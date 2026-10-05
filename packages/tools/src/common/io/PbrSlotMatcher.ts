import type { PbrSetMatch } from "./UniversalIngestTypes.js";

/**
 * Common PBR map suffix / keyword patterns.
 */
const MAP_PATTERNS = {
  albedo: /(?:_|\b)(?:albedo|alb|basecolor|base_color|color|col|diffuse|diff|d)(?:_|\.|$)/i,
  normal: /(?:_|\b)(?:normal|norm|nor|nrm|normalgl|normaldx|n)(?:_|\.|$)/i,
  roughness: /(?:_|\b)(?:roughness|rough|rgh|r)(?:_|\.|$)/i,
  metallic: /(?:_|\b)(?:metallic|metalness|metal|met|m)(?:_|\.|$)/i,
  ao: /(?:_|\b)(?:ao|ambientocclusion|ambient_occlusion|occlusion|occ)(?:_|\.|$)/i,
  height: /(?:_|\b)(?:height|displacement|disp|depth|bump|h)(?:_|\.|$)/i,
  emissive: /(?:_|\b)(?:emissive|emission|emit|glow|e)(?:_|\.|$)/i,
};

export interface MatchableFile {
  name: string;
  blob: Blob | File;
}

/**
 * Matches a list of files to PBR texture slots by inspecting filenames.
 */
export function matchPbrSlots(files: MatchableFile[]): PbrSetMatch | null {
  const [firstFile] = files;
  if (undefined === firstFile) return null;

  const result: PbrSetMatch = {
    name: extractBaseSetname(firstFile.name),
  };

  let matchedSlotsCount = 0;

  for (const file of files) {
    const filename = file.name.toLowerCase();

    // Check if it's an image file
    if (!/\.(?:png|jpe?g|webp|bmp|tga|dds|exr|hdr)$/i.test(filename)) {
      continue;
    }

    if (!result.normal && MAP_PATTERNS.normal.test(filename)) {
      result.normal = file.blob;
      matchedSlotsCount++;
    } else if (!result.roughness && MAP_PATTERNS.roughness.test(filename)) {
      result.roughness = file.blob;
      matchedSlotsCount++;
    } else if (!result.metallic && MAP_PATTERNS.metallic.test(filename)) {
      result.metallic = file.blob;
      matchedSlotsCount++;
    } else if (!result.ao && MAP_PATTERNS.ao.test(filename)) {
      result.ao = file.blob;
      matchedSlotsCount++;
    } else if (!result.height && MAP_PATTERNS.height.test(filename)) {
      result.height = file.blob;
      matchedSlotsCount++;
    } else if (!result.emissive && MAP_PATTERNS.emissive.test(filename)) {
      result.emissive = file.blob;
      matchedSlotsCount++;
    } else if (!result.albedo && MAP_PATTERNS.albedo.test(filename)) {
      result.albedo = file.blob;
      matchedSlotsCount++;
    } else if (!result.albedo) {
      // Fallback: first unassigned image becomes albedo if no explicit pattern matched
      result.albedo = file.blob;
      matchedSlotsCount++;
    }
  }

  // If at least 2 distinct slots or albedo + normal was found, it's a valid PBR set
  if (matchedSlotsCount >= 2 || (result.albedo && (result.normal || result.roughness))) {
    return result;
  }

  return null;
}

/**
 * Cleans map suffixes to find the base texture set name (e.g. 'brick_wall_01_normal.png' -> 'brick_wall_01').
 */
function extractBaseSetname(filename: string): string {
  return (
    filename
      .replace(/\.[^/.]+$/, "")
      .replace(
        /(?:_|\b)(?:albedo|alb|basecolor|color|diffuse|normal|norm|roughness|rough|metallic|metal|ao|height|disp|emissive|specular)$/i,
        "",
      )
      .replace(/_+$/, "") || "pbr_material"
  );
}
