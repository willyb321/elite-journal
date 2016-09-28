# How to deploy
1. Make a new draft release with the "Tag version" to the value of version in your application package.json, and prefix it with v. "Release title" can be anything you want.
For example, if your application package.json version is 1.0, your draft's "Tag version" would be v1.0.
2. Push some commits. Every CI build will update the artifacts attached to this draft.
3. Once you are done, publish the release. GitHub will tag the latest commit for you.

Disregard this if you aren't a collaborator of willyb321/elite-journal.
