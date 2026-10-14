# A favor, a note, and a rumor

Two cultivators stand in the same city. One asks the other to fetch 云心草 with `ask-favor:<id>:fetch-herb`. The other accepts and, once the herb is in hand, fulfills it. Both travelogues and both `state.digest` summaries name the errand and the 人情. `call-favor:<id>` repays that 人情.

The same asker can leave `leave-note:<id>` while the other person is in another city. That person's `pendingNotes` shows the line. `reply-note:<id>` with a `line` puts the reply into both digests.

A third cultivator in the city hears when the first two become 知己. `state.gossip` has the sentence, and the next generated `say` can repeat it.

A sect pair can `post-sect-notice`, `join-sect-task:<id>`, and `guide-junior:<id>`. A second open favor past the cap, or a second note inside three ticks, is refused.
