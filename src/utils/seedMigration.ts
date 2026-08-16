import { ScheduleBlock, SyllabusItem } from '../types/tracker';

/**
 * Clean display focus string by stripping part suffixes like " (part 1.2h of 2.8h)"
 */
export function cleanFocusTitle(focusItemStr: string): string {
  if (!focusItemStr) return '';
  return focusItemStr
    .replace(/\s*\(part\s+[\d.]+h\s+of\s+[\d.]+\s*h?\)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Calculates session-specific target hours and split state for an item in a block.
 */
export function getSessionHoursAndSplitState(
  item: SyllabusItem,
  block: ScheduleBlock,
  allScheduleBlocks: ScheduleBlock[]
): { sessionHours: number; isSplit: boolean } {
  // Find matching focus item string in block
  const matchedFocusStr =
    block.focusItems?.find((f) =>
      cleanFocusTitle(f).toLowerCase().includes(item.title.toLowerCase().trim()) ||
      item.title.toLowerCase().trim().includes(cleanFocusTitle(f).toLowerCase())
    ) || '';

  const explicitHours = parseFocusItemHours(matchedFocusStr, 0);

  // Find all schedule blocks containing this item
  const matchingBlocks = allScheduleBlocks.filter(
    (b) =>
      (b.itemIds && b.itemIds.includes(item.id)) ||
      (b.focusItems &&
        b.focusItems.some((f) => {
          const cleaned = cleanFocusTitle(f).toLowerCase();
          const itemTitle = item.title.toLowerCase().trim();
          return cleaned && (cleaned.includes(itemTitle) || itemTitle.includes(cleaned));
        }))
  );

  const isSplit = matchingBlocks.length > 1;

  if (!isSplit) {
    return {
      sessionHours: explicitHours > 0 ? explicitHours : (item.estimatedHours || 3.0),
      isSplit: false,
    };
  }

  // If explicit hours specified for this block, return it
  if (explicitHours > 0) {
    return {
      sessionHours: Math.round(explicitHours * 100) / 100,
      isSplit: true,
    };
  }

  // Item is split across multiple blocks, but this block lacks explicit (part X.Xh).
  // Sum explicit hours from other blocks.
  let otherExplicitSum = 0;
  let blocksWithoutExplicit = 0;

  for (const b of matchingBlocks) {
    const fStr =
      b.focusItems?.find((f) =>
        cleanFocusTitle(f).toLowerCase().includes(item.title.toLowerCase().trim()) ||
        item.title.toLowerCase().trim().includes(cleanFocusTitle(f).toLowerCase())
      ) || '';
    const h = parseFocusItemHours(fStr, 0);
    if (h > 0) {
      otherExplicitSum += h;
    } else {
      blocksWithoutExplicit += 1;
    }
  }

  const totalEst = item.estimatedHours || 3.0;
  const remaining = totalEst - otherExplicitSum;
  const sessionHours =
    remaining > 0
      ? Math.round((remaining / Math.max(1, blocksWithoutExplicit)) * 100) / 100
      : Math.round((totalEst / matchingBlocks.length) * 100) / 100;

  return {
    sessionHours,
    isSplit: true,
  };
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
  const totalHours = item.estimatedHours || 3.0;
  if (totalHours === 0) return { completedHours: 0, totalHours: 0, progressPct: 0 };

  if (item.completed) {
    return {
      completedHours: Math.round(totalHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      progressPct: 100,
    };
  }

  if (item.type === 'Class') {
    const hasAssignment = item.hasAssignment !== false;
    const hasHomeworks = item.hasAdditionalProblems !== false;

    const assignmentWeight = hasAssignment ? 20 : 0;
    const homeworkWeight = hasHomeworks ? 10 : 0;
    const recordingWeight = 70 + (hasAssignment ? 0 : 20) + (hasHomeworks ? 0 : 10);

    let pct = 0;
    if (item.videoCompleted) pct += recordingWeight;
    if (hasAssignment && item.assignmentCompleted) pct += assignmentWeight;
    if (hasHomeworks && item.additionalProblemsCompleted) pct += homeworkWeight;

    const progressPct = Math.min(100, pct);
    const completedHours = Math.round((totalHours * (progressPct / 100)) * 100) / 100;

    return {
      completedHours,
      totalHours: Math.round(totalHours * 100) / 100,
      progressPct,
    };
  }

  // Fallback for non-Class items (Papers, PSP, Skill Tests)
  const completedHours = item.completed ? totalHours : 0;
  const progressPct = item.completed ? 100 : 0;

  return {
    completedHours: Math.round(completedHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    progressPct,
  };
}

/**
 * Calculates actual hours achieved for a ScheduleBlock based on completion status of its items & sub-components
 */
export function calculateBlockActualHours(
  block: ScheduleBlock,
  syllabusItems: SyllabusItem[],
  allScheduleBlocks: ScheduleBlock[]
): number {
  if (block.completed) {
    return Math.round((block.targetHours || 3.0) * 100) / 100;
  }

  let itemsInBlock: SyllabusItem[] = [];

  if (block.itemIds && block.itemIds.length > 0) {
    itemsInBlock = block.itemIds
      .map((id) => syllabusItems.find((item) => item.id === id))
      .filter((item): item is SyllabusItem => Boolean(item));
  }

  if (itemsInBlock.length === 0 && block.focusItems && Array.isArray(block.focusItems)) {
    for (const focusStr of block.focusItems) {
      const cleaned = cleanFocusTitle(focusStr).toLowerCase();
      if (!cleaned) continue;
      const matched = syllabusItems.find((item) => {
        const titleLower = item.title.trim().toLowerCase();
        return titleLower === cleaned || titleLower.includes(cleaned) || cleaned.includes(titleLower);
      });
      if (matched && !itemsInBlock.some((i) => i.id === matched.id)) {
        itemsInBlock.push(matched);
      }
    }
  }

  if (itemsInBlock.length === 0) {
    return block.actualHours ?? 0;
  }

  let totalBlockHours = 0;
  for (const item of itemsInBlock) {
    const { sessionHours } = getSessionHoursAndSplitState(item, block, allScheduleBlocks);

    if (item.completed) {
      totalBlockHours += sessionHours;
    } else if (item.type === 'Class') {
      const hasAssignment = item.hasAssignment !== false;
      const hasHomeworks = item.hasAdditionalProblems !== false;

      const assignmentWeight = hasAssignment ? 20 : 0;
      const homeworkWeight = hasHomeworks ? 10 : 0;
      const recordingWeight = 70 + (hasAssignment ? 0 : 20) + (hasHomeworks ? 0 : 10);

      let pct = 0;
      if (item.videoCompleted) pct += recordingWeight;
      if (hasAssignment && item.assignmentCompleted) pct += assignmentWeight;
      if (hasHomeworks && item.additionalProblemsCompleted) pct += homeworkWeight;

      totalBlockHours += sessionHours * (pct / 100);
    }
  }

  return Math.round(totalBlockHours * 100) / 100;
}
