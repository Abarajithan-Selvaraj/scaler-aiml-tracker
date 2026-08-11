import { ScheduleBlock, SyllabusItem } from '../types/tracker';

/**
 * Clean display focus string by stripping part suffixes like " (part 1.2h of 2.8h)"
 */
export function cleanFocusTitle(focusItemStr: string): string {
  if (!focusItemStr) return '';
  return focusItemStr.replace(/\s*\(part\s+[\d.]+h\s+of\s+[\d.]+h\)/i, '').trim();
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
