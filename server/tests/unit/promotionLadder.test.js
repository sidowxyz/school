import { orderOf, nextClassFor } from '../../src/services/promotionService.js';

// orderOf/nextClassFor are pure — no database, so these run without Mongo.

const klass = (over) => ({ _id: over.cl_name, ...over });

const SCHOOL = [
  klass({ cl_no: 'C1', cl_name: 'Class 1' }),
  klass({ cl_no: 'C2', cl_name: 'Class 2' }),
  klass({ cl_no: 'C3', cl_name: 'Class 3' }),
  klass({ cl_no: 'C4', cl_name: 'Class 4' }),
  klass({ cl_no: 'C5', cl_name: 'Class 5' }),
  klass({ cl_no: 'C6', cl_name: 'Class 6' }),
];

const nameOfNext = (from, classes = SCHOOL) =>
  nextClassFor(classes.find((c) => c.cl_name === from), classes)?.cl_name ?? null;

describe('orderOf', () => {
  it('prefers an explicit promotion_order', () => {
    expect(orderOf(klass({ cl_name: 'Reception', promotion_order: 0 }))).toBe(0);
  });

  it('falls back to the number in the class name', () => {
    expect(orderOf(klass({ cl_name: 'Class 4', cl_no: 'X' }))).toBe(4);
    expect(orderOf(klass({ cl_name: 'Grade 10', cl_no: 'X' }))).toBe(10);
  });

  it('falls back to the number in the class code', () => {
    expect(orderOf(klass({ cl_name: 'Senior', cl_no: 'G10' }))).toBe(10);
  });

  it('returns null when there is nothing to order by', () => {
    expect(orderOf(klass({ cl_name: 'Senior', cl_no: 'SEN' }))).toBeNull();
  });
});

describe('consecutive promotion', () => {
  it('promotes each class to the next one in sequence', () => {
    expect(nameOfNext('Class 1')).toBe('Class 2');
    expect(nameOfNext('Class 2')).toBe('Class 3');
    expect(nameOfNext('Class 4')).toBe('Class 5');
    expect(nameOfNext('Class 5')).toBe('Class 6');
  });

  it('never skips a class, even when the list is unordered', () => {
    const shuffled = [SCHOOL[5], SCHOOL[0], SCHOOL[3], SCHOOL[2], SCHOOL[1], SCHOOL[4]];
    expect(nameOfNext('Class 4', shuffled)).toBe('Class 5');
  });

  it('graduates the top class', () => {
    expect(nameOfNext('Class 6')).toBeNull();
  });

  it('graduates a class explicitly flagged as final', () => {
    const withFinal = [...SCHOOL, klass({ cl_no: 'C7', cl_name: 'Class 7', is_final_class: true })];
    expect(nameOfNext('Class 7', withFinal)).toBeNull();
  });
});

describe('gaps in the ladder', () => {
  it('promotes to the next class that actually exists', () => {
    // A school running Classes 1, 2 and 5 only.
    const sparse = [SCHOOL[0], SCHOOL[1], SCHOOL[4]];
    expect(nameOfNext('Class 2', sparse)).toBe('Class 5');
  });

  it('ignores classes with no derivable order', () => {
    const withOddball = [...SCHOOL, klass({ cl_no: 'SEN', cl_name: 'Senior Wing' })];
    expect(nameOfNext('Class 6', withOddball)).toBeNull();
  });
});

describe('explicit next_class_id', () => {
  it('overrides the numeric sequence', () => {
    const primary6 = klass({ cl_no: 'P6', cl_name: 'Primary 6', promotion_order: 6, next_class_id: 'Form 1' });
    const form1 = klass({ cl_no: 'F1', cl_name: 'Form 1', promotion_order: 20 });
    const class7 = klass({ cl_no: 'C7', cl_name: 'Class 7', promotion_order: 7 });
    const classes = [primary6, class7, form1];
    expect(nextClassFor(primary6, classes)?.cl_name).toBe('Form 1');
  });

  it('falls back to the sequence when the referenced class is gone', () => {
    const c4 = klass({ cl_no: 'C4', cl_name: 'Class 4', next_class_id: 'deleted-class' });
    const classes = [c4, SCHOOL[4]];
    expect(nextClassFor(c4, classes)?.cl_name).toBe('Class 5');
  });
});
