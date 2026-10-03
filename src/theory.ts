export enum TestCaseStatus {
  PASSED = "PASSED",
  FAILED = "FAILED",
  INVALID = "INVALID",
  OVERRUN = "OVERRUN",
  RUNNING = "RUNNING",
}

type ExecutionResult =
  | {
      status: TestCaseStatus.FAILED;
      record: number[];
      error?: unknown;
    }
  | {
      status: TestCaseStatus.PASSED;
      record: number[];
    }
  | {
      status: TestCaseStatus.INVALID | TestCaseStatus.OVERRUN;
      record: number[];
    };

export class StopTest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StopTest";
  }
}

export class TestCase {
  static forChoices(choices: number[]): TestCase {
    return new TestCase(choices, choices.length);
  }

  record: number[];
  prefix: number[];
  status: TestCaseStatus = TestCaseStatus.RUNNING;
  maxSize: number;

  constructor(prefix: number[] = [], maxSize: number = Infinity) {
    this.prefix = prefix;
    this.record = [];
    this.maxSize = maxSize;
  }

  choice(max: number) {
    if (this.status !== TestCaseStatus.RUNNING) {
      throw new Error("This test case has already stopped");
    }
    if (this.record.length >= this.maxSize) {
      this.status = TestCaseStatus.OVERRUN;
      throw new StopTest("Test OVERRUN");
    }

    const index = this.record.length;
    const result =
      index < this.prefix.length
        ? this.prefix[index]!
        : Math.floor(Math.random() * (max + 1));

    this.record.push(result);
    if (result > max) {
      this.status = TestCaseStatus.INVALID;
      throw new StopTest(`Choice ${result} exceeds maximum ${max}`);
    }
    return result;
  }
}

function execute(test: (tc: TestCase) => void, tc: TestCase): ExecutionResult {
  try {
    test(tc);
    tc.status = TestCaseStatus.PASSED;
    return {
      status: TestCaseStatus.PASSED,
      record: [...tc.record],
    };
  } catch (error) {
    if (
      error instanceof StopTest &&
      (tc.status === TestCaseStatus.INVALID ||
        tc.status === TestCaseStatus.OVERRUN)
    ) {
      return {
        status: tc.status,
        record: [...tc.record],
      };
    }

    tc.status = TestCaseStatus.FAILED;

    return {
      status: TestCaseStatus.FAILED,
      record: [...tc.record],
      error,
    };
  }
}

function testSum(tc: TestCase): void {
  const a = tc.choice(10);
  const b = tc.choice(10);

  if (a + b > 10) {
    throw new Error(`Sum exceeded 10: ${a} + ${b}`);
  }
}
const tc = new TestCase();
const result = execute(testSum, TestCase.forChoices([4, 6]));

console.log(result);
