## 📝 Summary

<!--
If this PR closes any issues, list them here by number (e.g., Closes #123).

Detail the specific changes made in this pull request. Explain the problem addressed and how it was resolved. If applicable, provide before and after comparisons, screenshots, or any relevant details to help reviewers understand the changes easily.
-->
Closes #

## 📋 Pre-Review Checklist
<!-- These checks need to be completed before a PR is reviewed -->

- [ ] For large changes, or changes that affect the public API of a package: this change was discussed or approved through an issue, on [Discord](https://marimo.io/discord?ref=pr), or the community [discussions](https://github.com/marimo-team/marimo/discussions) (please provide a link if applicable).
- [ ] Any AI generated code has been reviewed line-by-line by the human PR author, who stands by it.
- [ ] Screenshots or a screen recording are provided for any visual or in-page changes. <!-- PR is more likely to be merged if evidence is provided for changes made -->

## ✅ Merge Checklist

- [ ] I have read the [contributor guidelines](../CONTRIBUTING.md).
- [ ] `pnpm compile`, `pnpm lint`, and `pnpm test` pass locally.
- [ ] Tests have been added or updated for the changes made.
- [ ] The dependency direction is preserved (`notebook-core` imports nothing internal; hosts and runtime import only `notebook-core`).
