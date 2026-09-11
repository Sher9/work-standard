import { describe, it, expect } from 'vitest';
import { DEFAULT_EMPLOYEE_ID } from '../../src/common/EmployeeConstant';

describe('默认员工常量', () => {
  it('DEFAULT_EMPLOYEE_ID 非空且固定', () => {
    expect(DEFAULT_EMPLOYEE_ID).toBeTruthy();
    expect(typeof DEFAULT_EMPLOYEE_ID).toBe('string');
    expect(DEFAULT_EMPLOYEE_ID).toBe('E10001');
  });
});