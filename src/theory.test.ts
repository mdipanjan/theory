import assert from "node:assert/strict";
import { test } from "node:test";
import { StopTest, TestCase, TestCaseStatus } from "./theory.js";

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
