# limit-watch

Watches the five-hour rate-limit window of your Claude subscription.

- Shows the current percentage and reset time in the status line.
- Raises one toast at 75% and another at 90%. Each threshold alerts once per window, and a new reset time starts a new window.
- Only works on a subscription. On other plans the engine reports no rate-limit windows, so nothing shows.
- Updates only when the engine re-measures the session, which happens after each main-thread turn and when the window moves a whole point. It can lag your real usage.
