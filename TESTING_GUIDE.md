# TESTING_GUIDE.md

## Purpose

This document serves as a comprehensive guide to writing tests for the Photo Filter Application, integrating the lessons we’ve learned during development and test automation. It covers **acceptance**, **unit**, and **integration** test approaches; strategies for handling uncertain data sets; and how to ensure that tests accurately reflect real-world user flows.

---

## Table of Contents

1. [Overview of Testing Approaches](#overview-of-testing-approaches)
2. [Acceptance Tests](#acceptance-tests)
   - [Query Params and Faceted Filtering](#query-params-and-faceted-filtering)
   - [Robustness with Large or Uncertain Data](#robustness-with-large-or-uncertain-data)
   - [UI Navigation and Edge Cases](#ui-navigation-and-edge-cases)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [Performance Considerations](#performance-considerations)
6. [Stubbing, Mocking, and Fixture Data](#stubbing-mocking-and-fixture-data)
7. [Guidelines and Best Practices](#guidelines-and-best-practices)
8. [Further Directions](#further-directions)

---

## 1. Overview of Testing Approaches

- **Acceptance Tests**: Verify end-to-end user stories, ensuring that a user can navigate the application, toggle features, and see expected outcomes.
- **Unit Tests**: Verify isolated functionality in models, helpers, or services without external dependencies.
- **Integration Tests**: Check interactions between components or modules in partial isolation, ensuring rendering or data flows work as intended in the Ember context.

Because this project has both a **frontend (Ember)** and a **backend (Express)**, we also rely on:

- **Backend Tests (e.g., Jest)**: For controllers, utilities, data exporting, or other Node/Express logic.
- **Full-Stack Validation**: Light acceptance tests that exercise real data to confirm the entire pipeline is stable (optional, depending on your CI environment).

---

## 2. Acceptance Tests

### Query Params and Faceted Filtering

1. **Multi-Person Selection**

   - **Why**: Ensures that toggling multiple individuals in an album updates the URL’s query parameters, filters the displayed photos accordingly, and persists state on refresh.
   - **How**:
     - Use `visit('/albums')` to load the album listing.
     - Click each album link in turn until you find one that actually has recognized people.
     - Toggle the first person, confirm the URL now contains `persons=...`.
     - Toggle additional persons and check the query string for multiple values.

2. **Sorting and Ordering**
   - **Why**: Guarantee that changing `sort` and `order` modifies the photo list accordingly.
   - **How**:
     - Programmatically select from a `<select>` menu or directly manipulate query params.
     - Confirm that the displayed items re-sort, and that the final URL includes correct query param values, e.g. `sort=score.overall&order=asc`.

### Robustness with Large or Uncertain Data

- **Don’t assume the first album has data**: A key takeaway was that your test logic can’t just pick “the first album” to test person toggles. Instead, loop through albums until you find one with recognized faces.
- **Fallback**: If you never find an album with persons, gracefully skip or assert “no persons found.” This ensures tests remain robust against real-world data that might be sparse or inconsistent.

### UI Navigation and Edge Cases

1. **Navigation**

   - Check that transitions are correct (e.g., after clicking an album link, you land on `/albums/:album_id`).
   - Confirm elements like the `.grid` or `.card` appear in the DOM to validate that photos are actually rendered.

2. **Edge Cases**
   - If some albums have zero photos or zero recognized persons, ensure your test doesn’t blow up.
   - If you rely on ephemeral data, consider whether to stub or mock for truly deterministic runs.

---

## 3. Unit Tests

- **Models** (e.g., `album-test.js`, `photo-test.js`): Confirm that each model can be created and that key relationships or computed properties work as intended.
- **Helpers**: Small, pure JavaScript transformations (e.g., `capitalize`, `replace`, `contains`) can be tested quickly.
- **Services**: Check that your “current-album” or “selection” services manage state as expected.

**Key Lessons**:

- Keep unit tests narrow in scope; they should fail only if their logic changes, not if external data or routes shift.

---

## 4. Integration Tests

- Typically used to test how Ember components (and their templates) interact with one another in partial isolation.
- Great for validating that a component properly renders a list of photos, or that toggling a local state affects CSS or child components.

**Considerations**:

- If your components heavily rely on the store or route data, weigh whether an acceptance test might be more suitable.
- For purely presentational logic (e.g., show/hide states), integration tests are ideal.

---

## 5. Performance Considerations

- **Large Albums**

  - Ember acceptance tests can cause timeouts or memory usage issues if you load thousands of photos.
  - Use pagination or a limit query param if necessary, or rely on specialized acceptance tests for smaller sample data.

- **Server-Side**
  - Jest tests for Express code should also consider performance. For instance, if you’re exporting thousands of images, ensure you only test the logic in a controlled scenario (or mock the file system calls).

---

## 6. Stubbing, Mocking, and Fixture Data

- **Why**: Real data can be unpredictable (some albums might have no recognized persons).
- **How**:
  - Use **fixtures** or **mocks** in acceptance tests for deterministic coverage when possible.
  - For example, Ember can intercept server requests with Pretender or Mirage (though this project hasn’t fully integrated them yet).
  - On the backend, you can temporarily mock `fs-extra` or `osxphotos` calls to test edge cases.

**Balance**: Keep some acceptance tests fully “live” with real data to confirm production usage, but rely on mocks or fixtures for consistent local coverage.

---

## 7. Guidelines and Best Practices

1. **Write Tests Alongside Features**

   - As soon as you add a new route or feature, create acceptance or integration tests.
   - Keep tests passing at each commit to maintain momentum.

2. **Small, Focused Assertions**

   - Each test should have a clear “Given, When, Then” structure. Avoid overloading a single test with too many steps.

3. **Don’t Overly Depend on Data Hard-Coded Indices**

   - Instead of “click the first album,” try to filter or search for an album with the property you need.
   - This approach is more robust if data changes in the future.

4. **Observe and Log**

   - Pepper your acceptance tests with small console logs or debug steps (like your “Found X album links…”). This helps diagnose data-based issues.

5. **Check the URL**

   - Ember’s query params are crucial for your filtering. Confirm the final `currentURL()` includes the expected param changes.

6. **Clean Up After**
   - If your test scripts alter data, ensure you restore or reset state (if relevant).
   - Typically, acceptance tests revert to default by reloading the page or using `visit()` again.

---

## 8. Further Directions

1. **Automated Mocking**

   - Tools like [Ember Mirage](https://github.com/miragejs/ember-cli-mirage) can generate a fake API for acceptance tests, ensuring consistent datasets.

2. **Advanced Performance Testing**

   - Investigate tests that specifically measure how the app handles large volumes of photos (time to render, memory usage).
   - Could be part of your CI pipeline with a special “stress test” mode.

3. **Visual Regression Testing**

   - For a photo-centric application, consider snapshot or visual-diff testing to catch unexpected UI changes.

4. **CI Integration**
   - Ensure all tests run in your GitHub Actions or other CI. If you have a large test suite, parallelize or selectively skip certain large-data tests by default.

---

## Conclusion

The overarching goal is to keep your tests realistic, robust to changes in data, and short enough to remain maintainable. By following these guidelines—writing acceptance tests that adapt to dynamic data, layering in unit tests for smaller logic, and employing integration tests for component interactions—you’ll maintain confidence in your system as it grows.

Feel free to add, modify, or refine these sections to match your team’s specific workflow. When in doubt, **test early** and **test often**.

---

**Last Updated**: 2025-01-12  
**Maintainer**: [Your Name or Team]

---

**How to Use**

1. Place this file in the root of your monorepo as `TESTING_GUIDE.md` (or adapt the file name as you wish).
2. Keep it updated whenever you refine test strategies or introduce new complexities.
3. Reference it in your pull requests or issue templates so everyone can stay aligned on test-writing best practices.

---

_End of `TESTING_GUIDE.md`_
