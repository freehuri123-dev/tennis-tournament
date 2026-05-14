# Tennis Club Monthly Tournament Mobile Site Design

## Goal

Build a mobile-first web prototype for a tennis club monthly tournament. The first version is for the club president to review before deciding whether to use it in real events.

The site must run as a mobile website, not an installed app. Deployment can come later. The prototype can run locally first.

## Users

### Administrator

The administrator runs the tournament.

- Enters admin mode with one simple shared password.
- Manages members.
- Creates tournaments.
- Selects participants for each tournament.
- Manually assigns participants into groups.
- Chooses the match schedule format for each group.
- Generates an initial schedule.
- Edits the schedule at any time.
- Enters and updates match scores.

### Members

Members only view tournament information.

- No login.
- Open a shared link on a phone browser.
- View the match schedule.
- View group rankings.
- View overall rankings.

## Product Scope

### Included In The First Prototype

- Mobile web app.
- Simple admin password access.
- Public read-only tournament link.
- Member management.
- Tournament creation.
- Participant selection.
- Manual group assignment.
- Group-level schedule format selection.
- Initial schedule generation from `Hanul AA` and `KDK-V2010` reference formats.
- Match add, delete, reorder, participant swap, and score edit.
- Automatic ranking calculation.
- Group ranking as the default ranking view.
- Overall ranking as an optional view.
- Simple, direct UI for older users.

### Deferred Until Later

- Multi-admin accounts.
- Full authentication with user IDs.
- Online deployment and domain setup.
- Push notifications.
- Advanced real-time sync with websockets.
- Historical analytics.
- Payment or fee management.

## Tournament Flow

1. Admin opens the admin page.
2. Admin enters the simple password.
3. Admin creates a tournament with name and date.
4. Admin selects participating members.
5. Admin creates one or more groups.
6. Admin manually places participants into groups.
7. Admin chooses a schedule format for each group:
   - Hanul AA
   - KDK-V2010
8. Admin generates the initial schedule.
9. Admin edits matches as needed.
10. Admin enters scores during the event.
11. Members open the shared link to view schedule and rankings.

## Grouping Requirements

A tournament can have one group or multiple groups.

Example with 13 participants:

- One group of 13.
- Two groups: 7 and 6.
- Three groups: 4, 4, and 5.

The administrator must directly choose which player belongs to each group. Automatic grouping is not required for the first prototype.

Each group can have its own schedule format. For example:

- Group A: Hanul AA
- Group B: KDK-V2010

## Schedule Model

The schedule generator creates an initial list of matches. After generation, the schedule is fully editable.

The app should treat every match in the schedule as a normal ranking match.

Admin can:

- Add a match.
- Delete a match.
- Change match order.
- Change participants.
- Change score.

There is no separate exhibition match concept in the first prototype. If the admin adds a match, it is included in ranking calculations.

## Schedule Formats

The uploaded reference images are:

- `한울AA.png`
- `KDK-V2010.png`

These images should be used to understand the pairing patterns and expected table style. The app does not need to reproduce the exact spreadsheet layout internally.

The recommended internal model is a list of matches:

- Group ID
- Match order
- Team or player slots
- Score
- Completion state

This makes it easier to edit matches on mobile.

## Match Structure

Most games appear to be doubles-style pairings where a match has two sides and each side can contain one or more players.

For the first prototype, represent each match as:

- Group
- Match number
- Side A participants
- Side B participants
- Side A score
- Side B score

This keeps the model flexible enough for generated schedules and manually added matches.

## Ranking Rules

Rankings are calculated from all matches in the relevant scope.

Default order:

1. Wins.
2. Score difference.
3. Points scored.
4. Fewer points conceded.

Definitions:

- `Wins`: number of matches won.
- `Losses`: number of matches lost.
- `Points scored`: total points won by the player across completed matches.
- `Points conceded`: total points lost by the player across completed matches.
- `Score difference`: points scored minus points conceded.

If a doubles match is played, each participant on the winning side receives one win, and each participant on the losing side receives one loss. Points scored and conceded are applied to every participant on that side.

## Ranking Views

### Group Ranking

This is the default ranking view when a tournament has multiple groups.

Each group shows:

- Rank
- Name
- Wins
- Losses
- Points scored
- Points conceded
- Score difference

### Overall Ranking

The user can also view one combined ranking across all groups.

Overall ranking uses the same calculation rules. Because different groups may play different numbers of matches, this view is useful as a reference ranking, while group ranking remains the primary view.

Each overall ranking row should include the group name.

## Admin Screens

### Admin Password Screen

Purpose: enter admin mode quickly.

UI:

- Large password input.
- Large confirm button.
- Minimal text.

### Admin Home

Purpose: choose what to manage.

Main actions:

- Current tournament.
- Create tournament.
- Member management.

### Member Management

Purpose: maintain the player list.

Fields:

- Name.
- Level.
- Notes.

Optional later fields:

- Phone number.
- Gender.
- Active/inactive status.

### Tournament Setup

Purpose: create a tournament and choose participants.

Fields:

- Tournament name.
- Date.
- Participant list.

### Group Assignment

Purpose: manually place participants into groups.

UI:

- Selected participants list.
- Group list.
- Add group button.
- Add/remove participant from group controls.
- Clear indication if a selected participant has not been assigned.

### Schedule Generation

Purpose: create an initial match list for each group.

Controls:

- Schedule format selector per group.
- Generate schedule button.

### Schedule Editor

Purpose: handle real tournament changes.

Actions:

- Add match.
- Delete match.
- Move match up/down.
- Change participants.
- Enter or edit score.

The editor should use large touch targets and avoid dense spreadsheet-style editing on mobile.

### Result Entry

Purpose: quickly enter scores during the event.

UI:

- Match cards.
- Big score fields.
- Save button.
- Clear completed/incomplete state.

## Member Screens

### Public Tournament View

Purpose: give members a simple read-only page.

Tabs:

- Schedule.
- Group ranking.
- Overall ranking.

The shared link should open directly to the current tournament or a specific tournament.

### Schedule View

Purpose: show who plays when.

Display:

- Group sections.
- Match number.
- Participants.
- Score if entered.

### Ranking View

Purpose: show current standings.

Display:

- Large readable rows.
- Rank and name emphasized.
- Wins, score difference, points scored, points conceded.

## Design Direction

The users include older club members, so the design should be simple and direct.

Principles:

- Mobile-first.
- Large fonts.
- Large buttons.
- High contrast.
- Few navigation choices.
- Clear labels.
- Avoid decorative layouts.
- Avoid tiny spreadsheet cells for mobile interaction.

The public member view should be even simpler than the admin view.

## Data Model

### Member

- `id`
- `name`
- `level`
- `notes`

### Tournament

- `id`
- `name`
- `date`
- `publicSlug`
- `status`

### TournamentParticipant

- `tournamentId`
- `memberId`

### Group

- `id`
- `tournamentId`
- `name`
- `scheduleFormat`
- `sortOrder`

### GroupParticipant

- `groupId`
- `memberId`
- `sortOrder`

### Match

- `id`
- `tournamentId`
- `groupId`
- `matchNumber`
- `sideAPlayerIds`
- `sideBPlayerIds`
- `sideAScore`
- `sideBScore`
- `status`
- `sortOrder`

## Data Flow

1. Admin creates or edits data.
2. Data is saved locally in the app database.
3. Public pages read the same tournament data.
4. Ranking is recalculated from completed matches whenever scores change.

For the local prototype, automatic refresh or manual refresh is enough. Later deployment can add stronger real-time updates.

## Recommended Technical Approach

Use a web app structure that can start locally and later be deployed.

Recommended stack:

- Next.js or React-based app.
- Local database for prototype, such as SQLite.
- Later deployment path to a hosted database.

Reasoning:

- Good mobile web support.
- Easy admin and public page routing.
- Can run locally for review.
- Can later be deployed without rewriting the whole app.

## Testing Strategy

Test the core logic separately from the UI.

Important tests:

- Ranking calculation.
- Match add/delete affects ranking.
- Score edit updates ranking.
- Group ranking and overall ranking.
- Generated schedule creates valid editable matches.
- Participant swap updates match display and ranking.

Manual browser checks:

- Admin flow works on mobile width.
- Public schedule is readable on mobile.
- Public rankings are readable on mobile.
- Large buttons are easy to tap.

## Open Implementation Notes

The exact Hanul AA and KDK-V2010 pairing tables should be transcribed into schedule generator data during implementation. The uploaded images are the source references for the first version.

If any image pattern is ambiguous, the app should allow manual correction through the schedule editor rather than blocking tournament operation.
