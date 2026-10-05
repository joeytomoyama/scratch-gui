# Student courses

Open `courses.html` from the editor's **Courses** link. Sign in with the existing
account menu to fetch the backend catalog. Cards show the imported title,
description, difficulty, thumbnail (or placeholder), and completion status.
Search matches titles/descriptions locally; sorting orders difficulty or title.
There is no search provider or paid API.

Selecting a card opens `courses.html#<course-id>` with concepts, difficulty,
description, a playable demo, and **Start course**. The demo uses the existing
TurboWarp player in `course-player.html?course=<course-id>`, with green flag,
stop and fullscreen. It fetches the completed primary SB3 in the background and
does not create a student save controller, tutor request, editor or download UI.
Demo source is still retrievable with browser tools; alternatives are never sent.

**Start course** opens `editor.html?course=<course-id>` and downloads the starter
through the existing project-fetcher/VM loader. It begins a new student project;
normal private saving applies. The course query parameter remains when the first
save adopts a private UUID, so reloading that URL restores saved work rather than
the starter. The tutor menu receives `{course: <course-id>}` as context on manual
Ask. A **Courses** link returns from the editor; the existing unsaved-work warning
still applies.

Once a course project is saved, its card and detail page offer **Continue course**.
This opens `editor.html?course=<course-id>#<saved-project-uuid>` through the existing
authenticated private-project loader, restoring the saved blocks and assets.
The backend chooses the account's latest usable save, not a browser-local cache.
**Start again** on the detail page still opens a fresh starter; it does not overwrite
the previous project. A new project's first successful save makes it the latest
course save. Completion remains an independent manual flag.

Saves now include `courseId` alongside the project snapshot. Projects saved before
this association was introduced need one more save from their course editor URL
before they appear as resumable; arbitrary existing projects are not guessed.

**Mark completed** persists a manual flag for the signed-in account. It can be
reversed and survives reloads. It does not compare projects or grade milestones.

Course data is operator-managed in the backend. See that repository's
`docs/COURSES.md` for the format, import command and student endpoint contract.
No course identity or title is hardcoded into this frontend.
