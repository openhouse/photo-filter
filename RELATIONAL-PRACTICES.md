# RELATIONAL-PRACTICES.md

This document outlines the cultural and mindful norms for collaboration—among humans, AI systems, or any other stakeholders. It expands on our Compassion Software Principles and clarifies how disclaimers in [MINDFUL-DISCLAIMERS.md](./MINDFUL-DISCLAIMERS.md) are woven into daily operations.

---

## 1. Guiding Principles

1. **User Ownership of Memories**

   - Acknowledge that photos can be precious or vulnerable data.
   - If an update (e.g., to the filtering UI) might inadvertently surface sensitive imagery, we must carefully label the change and tie it to disclaimers.

2. **Shared Authorship**

   - All contributors—team members, open-source participants, advisors, AI assistants—co-create the code, docs, and user experience.
   - This means we also _share responsibility_ for ensuring disclaimers stay current and that the code remains mindful.

3. **Transparent Communication**

   - Propose new disclaimers or feature updates openly.
   - Use “emotional check” markers in issue threads to highlight potential triggers or emotional complexities.

4. **Mindful Interactions**
   - **AI Involvement**: Whenever AI helps generate code, note it in commit messages or comments. This fosters trust and traceability.
   - **Conflict Mediation**: If a design choice might be emotionally charged—like defaulting to AI-based face identification—take a short reflection period. Possibly label the pull request as “Mindful Review Requested.”

---

## 2. Recommended Practices

- **Code Reviews**

  - Evaluate PRs with an eye toward how disclaimers or mindful language might be updated.
  - Encourage short, gentle feedback rather than abrupt rejections.

- **Issue Discussions**

  - Mark potential sensitive tasks with `[Emotional Load]` or `[Trigger Warning]`.
  - If uncertain about user impact, reference [MINDFUL-DISCLAIMERS.md](./MINDFUL-DISCLAIMERS.md) or ask another contributor to do a relational check.

- **Documentation Updates**
  - Where possible, embed short disclaimers or notes directly in relevant doc sections.
  - Link to broader disclaimers in [MINDFUL-DISCLAIMERS.md](./MINDFUL-DISCLAIMERS.md) so readers can easily find more detail.

---

## 3. Integrations with `COMPASSION.md`

- **Emotional Mapping**: If we add or change how the user can label photos with emotional markers, we reflect that in the disclaimers and ensure contributors realize the potential sensitivity in triaging emotional data.
- **Self-Compassion Toolkit**: Encourage devs and testers to notice if they’re pushing themselves too hard. Use or adapt “Take a mindful pause” prompts in the code review template.

---

## 4. Practical Examples

### Example A: Submitting a PR That Adds a New Person-Recognition Feature

1. Update `MINDFUL-DISCLAIMERS.md` with a short note that recognition may reveal old or painful memories.
2. In your PR, mention potential emotional triggers from unexpectedly seeing certain faces.

### Example B: Changing Default Sort Behavior

1. If you default to “score.overall,” clarify that photos with high aesthetic scores might overshadow meaningful but less “perfect” pictures.
2. Consider how disclaimers in the UI can remind the user that aesthetic scoring is subjective and not a measure of personal value.

### Example C: Renaming an Album or Photo Key

1. If the name has cultural or personal significance, note the reason for renaming in your commit.
2. Flag it for mindful review if the rename might distress certain user groups.

---

## 5. Respectful Off-Ramps

- **When a Collaborator Needs a Break**

  - They can take a “mindful pause” from tasks, ensuring someone else can temporarily cover or postpone.
  - Avoid penalizing or stigmatizing these breaks; we assume best intentions and protect each other’s well-being.

- **User Data and Boundaries**
  - If a user decides to _not_ see certain content, we respect that choice.
  - In code or design discussions, never override user-set preferences for the sake of a “cool new feature” without a thorough relational check.

---

## 6. Encouraging a Broad Community Dialogue

- **Periodic Check-Ins**
  - Host short “town halls” or Slack threads for feedback on disclaimers or emotional features.
- **Educational Materials**
  - Provide short tutorials on “emotional filtering” or “mindful cinematic transitions” so new devs see how we combine technical and relational awareness.

---

## 7. Looking Ahead

1. **Multi-Language Disclaimers**:
   - As the user base diversifies, consider translations or culturally specific disclaimers.
2. **Audio-Visual Sensitivities**:
   - If the app starts offering audio or video, disclaimers should expand accordingly.
3. **Continuous Adaptation**:
   - Keep an open channel for refining disclaimers, especially if new emotional scenarios or expansions arise.

---

**Last Updated**: 2025-01-12
