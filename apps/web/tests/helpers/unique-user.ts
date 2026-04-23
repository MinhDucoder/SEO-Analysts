export function uniqueUser() {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    fullName: `Smoke ${stamp}`,
    email: `smoke-${stamp}-${rand}@example.com`,
    password: 'Smoke12345!',
  };
}
