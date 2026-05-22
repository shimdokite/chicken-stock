export function isPositiveIntegerString(value: string | undefined) {
  if (!value) {
    return false;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0;
}
