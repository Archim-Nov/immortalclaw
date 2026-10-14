# A favor repaid, and a person waited for

Two cultivators stand in the same city. One asks the other to stand watch with `ask-favor:<id>:guard-breakthrough`. After it is fulfilled, `state.owedFavors` carries the reason 替我守关. `call-favor:<id>` clears it, and both `state.digest` summaries mention the watch and the sentence 这次我来还这份人情.

The debtor can also repay by fulfilling a different favor, such as `fetch-herb`, for the creditor or for that creditor's 点头之交. The digest names the earlier reason. When the beneficiary is the friend, the sentence names all three.

A note left with `leave-note:<id>`, or a sect errand with `join-sect-task:<id>`, keeps the six-tick summary from saying 过得平常 and names the other person.

`wait-for:<id>` is absent for a stranger. After the favor partner travels away and comes back, both digests mention the reunion. A second wait inside twelve ticks is refused.

`say` and `reply-line` stay with the person being answered. A line that addresses someone else, such as 顾兄 when the listener is not 顾, is refused. A gift line names the item. Generated lines differ from tick to tick and do not reuse 近来可好, 权作照应, or 城中风平.
