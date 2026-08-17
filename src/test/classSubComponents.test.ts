import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackerStore, isClassItemFullyCompleted } from '../store/useTrackerStore';
import { SyllabusItem } from '../types/tracker';

describe('Class Sub-Components Auto-Completion Logic', () => {
  beforeEach(async () => {
    // Reset store and load initial data before each test
    await useTrackerStore.getState().resetToSeed();
    await useTrackerStore.getState().loadData();
  });

  it('should evaluate isClassItemFullyCompleted correctly', () => {
    const sampleClass: SyllabusItem = {
      id: 'test_item_1',
      sequence: 1,
      moduleId: 'M4',
      type: 'Class',
      title: 'M4 Class 1/15: Relational DBs',
      estimatedHours: 2.5,
      completed: false,
      hasVideo: true,
      videoCompleted: false,
      hasAssignment: true,
      assignmentCompleted: false,
      hasAdditionalProblems: true,
      additionalProblemsCompleted: false,
    };

    expect(isClassItemFullyCompleted(sampleClass)).toBe(false);

    const videoDone = { ...sampleClass, videoCompleted: true };
    expect(isClassItemFullyCompleted(videoDone)).toBe(false);

    const twoDone = { ...videoDone, assignmentCompleted: true };
    expect(isClassItemFullyCompleted(twoDone)).toBe(false);

    const allDone = { ...twoDone, additionalProblemsCompleted: true };
    expect(isClassItemFullyCompleted(allDone)).toBe(true);
  });

  it('should auto-mark class item completed when all sub-components are checked', async () => {
    const store = useTrackerStore.getState();
    const classItem = store.syllabusItems.find((i) => i.type === 'Class')!;
    expect(classItem).toBeDefined();

    // Toggle video, assignment, and additional problems sub-components
    await store.toggleSubComponentCompletion(classItem.id, 'video');
    await store.toggleSubComponentCompletion(classItem.id, 'assignment');
    await store.toggleSubComponentCompletion(classItem.id, 'additional');

    const updatedItems = useTrackerStore.getState().syllabusItems;
    const updatedClass = updatedItems.find((i) => i.id === classItem.id)!;

    expect(updatedClass.videoCompleted).toBe(true);
    expect(updatedClass.assignmentCompleted).toBe(true);
    expect(updatedClass.additionalProblemsCompleted).toBe(true);
    expect(updatedClass.completed).toBe(true);
  });

  it('should auto-mark class item incomplete when any sub-component is unchecked', async () => {
    const store = useTrackerStore.getState();
    const classItem = store.syllabusItems.find((i) => i.type === 'Class')!;
    expect(classItem).toBeDefined();

    // Complete all sub-components first
    await store.toggleSubComponentCompletion(classItem.id, 'video');
    await store.toggleSubComponentCompletion(classItem.id, 'assignment');
    await store.toggleSubComponentCompletion(classItem.id, 'additional');

    let updatedClass = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(updatedClass.completed).toBe(true);

    // Uncheck additional problems
    await useTrackerStore.getState().toggleSubComponentCompletion(classItem.id, 'additional');

    updatedClass = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(updatedClass.additionalProblemsCompleted).toBe(false);
    expect(updatedClass.completed).toBe(false);
  });

  it('should synchronize main item toggle to set all sub-components', async () => {
    const store = useTrackerStore.getState();
    const classItem = store.syllabusItems.find((i) => i.type === 'Class')!;
    expect(classItem).toBeDefined();

    // Toggle main item to completed = true
    await store.toggleItemCompletion(classItem.id);

    let updatedClass = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(updatedClass.completed).toBe(true);
    expect(updatedClass.videoCompleted).toBe(true);
    expect(updatedClass.assignmentCompleted).toBe(true);
    expect(updatedClass.additionalProblemsCompleted).toBe(true);

    // Toggle main item to completed = false
    await useTrackerStore.getState().toggleItemCompletion(classItem.id);

    updatedClass = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(updatedClass.completed).toBe(false);
    expect(updatedClass.videoCompleted).toBe(false);
    expect(updatedClass.assignmentCompleted).toBe(false);
    expect(updatedClass.additionalProblemsCompleted).toBe(false);
  });

  it('should remove and restore sub-components correctly', async () => {
    const store = useTrackerStore.getState();
    const classItem = store.syllabusItems.find((i) => i.type === 'Class')!;
    expect(classItem).toBeDefined();

    // Remove assignment sub-component
    await store.removeSubComponent(classItem.id, 'assignment');
    let itemAfterRemove = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(itemAfterRemove.hasAssignment).toBe(false);

    // Restore assignment sub-component
    await store.restoreSubComponent(classItem.id, 'assignment');
    let itemAfterRestore = useTrackerStore.getState().syllabusItems.find((i) => i.id === classItem.id)!;
    expect(itemAfterRestore.hasAssignment).toBe(true);
  });

  it('should persist sleep log updates across page reloads', async () => {
    const store = useTrackerStore.getState();
    const firstAmBlock = store.scheduleBlocks.find((b) => b.block === 'AM')!;
    expect(firstAmBlock).toBeDefined();

    // Update sleep hours to 7.5
    await store.updateBlockLog(firstAmBlock.id, { sleepHours: 7.5 });

    // Verify in-memory state
    let updatedAmBlock = useTrackerStore.getState().scheduleBlocks.find((b) => b.id === firstAmBlock.id)!;
    expect(updatedAmBlock.sleepHours).toBe(7.5);

    // Reload data from IndexedDB to simulate page refresh
    await useTrackerStore.getState().loadData();

    const reloadedAmBlock = useTrackerStore.getState().scheduleBlocks.find((b) => b.id === firstAmBlock.id)!;
    expect(reloadedAmBlock.sleepHours).toBe(7.5);
  });
});
