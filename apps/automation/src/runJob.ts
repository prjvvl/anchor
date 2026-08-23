import { notifyFailure } from "./alert.js";

// Shared lifecycle wrapper for every job's entry point (channel-driven and
// plain alike) — one place for the exit-on-success/notify-and-exit-on-
// failure policy instead of each job re-implementing it, so a future fix to
// this policy (like the stdout-flush one below) only needs to happen once.
//
// Exits explicitly on success rather than letting the event loop drain —
// a 3rd-party lib leaving a dangling open handle behind (e.g. rss-parser's
// per-feed request timeout rejects on timeout but never destroys the
// underlying request) can otherwise keep the process alive indefinitely
// even after the job's actual work is done. setImmediate defers the exit
// by one tick first: stdout is a pipe (not a TTY) on GitHub Actions
// runners, and Node's writes to a piped stdout are asynchronous there —
// exiting synchronously right after the last console.log risks cutting
// off whatever hadn't flushed yet.
export function runJob(jobName: string, fn: () => Promise<void>): void {
  fn()
    .then(() => setImmediate(() => process.exit(0)))
    .catch(async (err) => {
      console.error(err);
      await notifyFailure(jobName, err);
      process.exit(1);
    });
}
