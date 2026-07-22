describe('Sample Test Suite', () => {
  it('should verify basic environment setup works correctly', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
