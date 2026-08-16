import { ScheduleBlock, SyllabusItem } from '../types/tracker';

/**
 * Clean display focus string by stripping part suffixes like " (part 1.2h of 2.8h)"
 */
export function cleanFocusTitle(focusItemStr: string): string {
  if (!focusItemStr) return '';
  return focusItemStr.replace(/\s*\(part\s+[\d.]+h\s+of\s+[\d.]+h\)/i, '').trim();
}

/**
 * Extracts session-specific duration if split, e.g. "(part 1.4h of 2.8h)" -> 1.4
 */
export function parseFocusItemHours(focusStr: string, fallbackHours?: number): number {
  if (!focusStr) return fallbackHours || 0;
  const match = focusStr.match(/\(part\s+([\d.]+)h\s+of\s+[\d.]+\s*h?\)/i);
  if (match && match[1]) {
    return parseFloat(match[1]) || fallbackHours || 0;
  }
  return fallbackHours || 0;
}

/**
 * Performs Section 5.5 Seed-Linking Pass:
 * Maps each ScheduleBlock's focusItems strings to their corresponding SyllabusItem.id array.
 */
export function linkScheduleBlockItems(
  scheduleBlocks: ScheduleBlock[],
  syllabusItems: SyllabusItem[]
): ScheduleBlock[] {
  // Create a map from title (and cleaned title) to SyllabusItem.id
  const titleToIdMap = new Map<string, string>();
  for (const item of syllabusItems) {
    if (item.title) {
      titleToIdMap.set(item.title.trim().toLowerCase(), item.id);
    }
  }

  return scheduleBlocks.map((block) => {
    if (block.itemIds && block.itemIds.length > 0) {
      return block; // Already linked
    }

    const itemIds: string[] = [];
    if (block.focusItems && Array.isArray(block.focusItems)) {
      for (const focusStr of block.focusItems) {
        const cleanedStr = cleanFocusTitle(focusStr).toLowerCase();
        if (!cleanedStr) continue;

        // Try exact match first
        let matchedId = titleToIdMap.get(cleanedStr);

        // If not exact match, try prefix match (e.g. M4 Class 1/15:)
        if (!matchedId) {
          for (const item of syllabusItems) {
            const itemLower = item.title.trim().toLowerCase();
            if (itemLower === cleanedStr || itemLower.startsWith(cleanedStr) || cleanedStr.startsWith(itemLower)) {
              matchedId = item.id;
              break;
            }
          }
        }

        if (matchedId && !itemIds.includes(matchedId)) {
          itemIds.push(matchedId);
        }
      }
    }

    return {
      ...block,
      itemIds,
    };
  });
}

/**
 * Calculates hours coverage for a SyllabusItem based on split session blocks distribution
 */
export function getClassHoursCoverage(
  item: SyllabusItem,
  scheduleBlocks: ScheduleBlock[]
): { completedHours: number; totalHours: number; progressPct: number } {
  const totalHours = item.estimatedHours || 0;
  if (totalHours === 0) return { completedHours: 0, totalHours: 0, progressPct: 0 };

  const matchingBlocks = scheduleBlocks.filter((b) => b.itemIds && b.itemIds.includes(item.id));

  if (matchingBlocks.length === 0) {
    return {
      completedHours: item.completed ? totalHours : 0,
      totalHours,
      progressPct: item.completed ? 100 : 0,
    };
  }

  let completedHours = 0;
  for (const block of matchingBlocks) {
    const matchedFocusStr =
      block.focusItems?.find((f) => cleanFocusTitle(f).toLowerCase().includes(item.title.toLowerCase().trim())) ||
      block.focusItems?.[0] ||
      '';
    const sessionHours = parseFocusItemHours(matchedFocusStr, totalHours / matchingBlocks.length);

    if (block.completed) {
      completedHours += sessionHours;
    }
  }

  if (item.completed) {
    completedHours = totalHours;
  } else {
    completedHours = Math.min(completedHours, totalHours);
  }

  const progressPct = Math.min(100, Math.round((completedHours / totalHours) * 100));

  return {
    completedHours: Math.round(completedHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    progressPct,
  };
}
