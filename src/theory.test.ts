import assert from "node:assert/strict";
import { test } from "node:test";
import { runTest, shrink, StopTest, TestCase, TestCaseStatus } from "./theory.js";

test("fresh choices are integers within the inclusive bound and are recorded", () => {
  const tc = new TestCase();
  assert.equal(tc.choice(0), 0);
  for (const max of [1, 3, 10, 100]) {
    for (let i = 0; i < 25; i++) {
      const result = tc.choice(max);
      assert.ok(Number.isInteger(result));
      assert.ok(result >= 0 && result <= max);
      assert.equal(tc.record.at(-1), result);
    }
  }
  assert.equal(tc.record.length, 101);
  assert.equal(tc.status, TestCaseStatus.RUNNING);
});

test("prefix is consumed in order and only consumed entries are recorded", () => {
  const tc = new TestCase([7, 6, 2]);
  assert.deepEqual(tc.record, []);
  assert.equal(tc.choice(10), 7);
  assert.equal(tc.choice(8), 6);
  assert.deepEqual(tc.record, [7, 6]);
  assert.deepEqual(tc.prefix, [7, 6, 2]);
});

test("ordinary generation continues randomly after the prefix", () => {
  const tc = new TestCase([7]);
  assert.equal(tc.choice(10), 7);
  assert.equal(tc.choice(0), 0);
  assert.deepEqual(tc.record, [7, 0]);
});

test("strict replay stops at the prefix length without recording another choice", () => {
  const tc = TestCase.forChoices([7, 6]);
  assert.equal(tc.maxSize, 2);
  assert.equal(tc.choice(10), 7);
  assert.equal(tc.choice(8), 6);
  assert.throws(() => tc.choice(10), { name: "StopTest", message: "Test OVERRUN" });
  assert.equal(tc.status, TestCaseStatus.OVERRUN);
  assert.deepEqual(tc.record, [7, 6]);
  assert.throws(() => tc.choice(10));
  assert.deepEqual(tc.record, [7, 6]);
});

test("empty strict replay overruns immediately", () => {
  const tc = TestCase.forChoices([]);
  assert.throws(() => tc.choice(0), StopTest);
  assert.equal(tc.status, TestCaseStatus.OVERRUN);
  assert.deepEqual(tc.record, []);
});

test("out-of-bound prefix choice is recorded and stops the case as invalid", () => {
  const tc = TestCase.forChoices([7, 2]);
  assert.throws(() => tc.choice(3), {
    name: "StopTest",
    message: "Choice 7 exceeds maximum 3",
  });
  assert.equal(tc.status, TestCaseStatus.INVALID);
  assert.deepEqual(tc.record, [7]);
  assert.throws(() => tc.choice(10), /already stopped/);
  assert.deepEqual(tc.record, [7]);
});

test("separate test cases have independent records", () => {
  const first = TestCase.forChoices([7]);
  const second = TestCase.forChoices([6]);
  first.choice(10);
  assert.deepEqual(second.record, []);
  second.choice(10);
  assert.deepEqual(first.record, [7]);
  assert.deepEqual(second.record, [6]);
});

test("runner reaches the valid-example budget with fresh cases", () => {
  const cases = new Set<TestCase>();
  const result = runTest((tc) => {
    cases.add(tc);
    assert.deepEqual(tc.record, []);
    tc.choice(0);
  }, { maxExamples: 3 });
  assert.equal(cases.size, 3);
  assert.deepEqual(result, {
    status: "NO_FAILURE", reason: "EXAMPLE_LIMIT", attempts: 3, validExamples: 3,
  });
});

test("runner stops immediately on failure and preserves its error and record", () => {
  const error = new Error("Property failed");
  let calls = 0;
  const result = runTest((tc) => {
    calls += 1;
    tc.choice(0);
    throw error;
  }, { maxExamples: 100 });
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    status: TestCaseStatus.FAILED, record: [0], error, attempts: 1, validExamples: 1,
  });
});

test("runner caps unusable attempts without counting them as valid examples", () => {
  let calls = 0;
  const result = runTest((tc) => {
    calls += 1;
    tc.status = calls % 2 === 0 ? TestCaseStatus.INVALID : TestCaseStatus.OVERRUN;
    throw new StopTest("Unusable example");
  }, { maxExamples: 2 });
  assert.equal(calls, 20);
  assert.deepEqual(result, {
    status: "NO_FAILURE", reason: "ATTEMPT_LIMIT", attempts: 20, validExamples: 0,
  });
});

test("runner rejects invalid budgets before executing the test", () => {
  for (const maxExamples of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => runTest(() => assert.fail("Should not run"), { maxExamples }), RangeError);
  }
});

test("shrinking reduces the necessary choice and zeroes irrelevant choices", () => {
  const property = (tc: TestCase) => {
    const a = tc.choice(10);
    tc.choice(10);
    tc.choice(10);
    if (a > 0) throw new Error("First number is positive");
  };

  const original = [7, 6, 2];
  const tc = TestCase.forChoices(original);
  assert.throws(() => property(tc), /First number is positive/);

  const result = shrink(property, original);
  assert.deepEqual(original, [7, 6, 2]);
  assert.throws(() => property(TestCase.forChoices(result)), /First number is positive/);
  assert.deepEqual(result, [1, 0, 0]);
});

test("shrinking finds a smaller nonzero sum failure", () => {
  const property = (tc: TestCase) => {
    const a = tc.choice(10);
    const b = tc.choice(10);
    if (a + b > 10) throw new Error("Sum exceeded 10");
  };
  const original = [7, 6];
  const result = shrink(property, original);
  assert.deepEqual(result, [5, 6]);
  assert.deepEqual(original, [7, 6]);
  assert.throws(() => property(TestCase.forChoices(result)), /Sum exceeded/);
});

test("shrinking handles shorter consumed records and empty failures", () => {
  const property = (tc: TestCase) => {
    const a = tc.choice(10);
    if (a > 0) {
      tc.choice(10);
      tc.choice(10);
    }
    throw new Error("Failure");
  };
  assert.deepEqual(shrink(property, [7, 6, 2]), [0]);
  assert.deepEqual(shrink(() => { throw new Error("Failure"); }, []), []);
});
