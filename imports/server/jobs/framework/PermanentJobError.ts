// An error that indicates a job should not be retried, regardless of remaining
// attempts. Use this for cases where the input is invalid or the preconditions
// can never be satisfied (e.g., a referenced user doesn't exist).
export default class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}
