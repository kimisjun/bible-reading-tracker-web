export function combineStorageErrors(
  readingError: Error | null,
  planError: Error | null,
): readonly string[] {
  return [...new Set(
    [readingError, planError]
      .filter((error): error is Error => error !== null)
      .map((error) => error.message),
  )]
}
