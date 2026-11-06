# LiftCrew bugs

## B01 · S3 · Quote form won't allow "today" in the evening, and town pages freeze the date
- **Steps:** after about 7–8 pm New Jersey time, open liftcrewnj.com/#quote and open the move-date picker. Or open any `/moving-help/...` page on a later day than the last deploy.
- **Expected:** the earliest selectable date is today's date in New Jersey.
- **Actual:**
  - The landing page computed "today" in UTC on the server, so in NJ evenings it was already tomorrow and today couldn't be picked.
  - Town pages are pre-built, so "today" stayed frozen at the deploy date.
- **Evidence:** e2e `F02-E5` with the browser clock at 11:30 pm EDT on Mar 14 2027 expected `min="2027-03-14"` and got `2026-11-06`.
- **Fix:** the form now works out "today" in the browser, in America/New_York, using `todayInNewJersey()` with unit tests. F02-E5 now passes.
- **Fixed in:** the commit "Add end-to-end tests and fix the quote form's earliest date".

## To check (not reproduced)
- None open.
