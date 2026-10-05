# Team 4 · Cold-agent tests

Run two cold tests with your workers. Each worker gets only the newest guide from team-1 and one fake user. Test 1: x86_64, user "maria", repository "maria/shop", seat "shop-seat", no App yet. Test 2: arm64 (`uname -m` prints `aarch64`), user "ken", repository "ken/notes", seat "notes-seat", no App yet. Each worker writes the filled-in plan and every place where it had to guess, and checks each owner lock. Publish the guesses to team-1. Run the arm64 test again on the next draft if the first one finds a guess. Your verdict says if the final guide passes both runs.

Same brief rules: a source for every fact, Alice read-only, commits only on your job branch, no landing, no push, plain technical English.
