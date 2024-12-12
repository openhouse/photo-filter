Project Guidelines

Table of Contents

- Project Philosophy
- Keeping Up with Dependencies
- Data Formats
- Data Synchronization and Caching
- Ensuring Complete Project Overviews
- Coding Standards
- Naming Conventions
- Directory Structure
- Documentation Practices
- Privacy and Data Handling
- Project State and Continuity
- Issue Tracking and Debugging
- Collaboration Guidelines
- Environment and Dependency Management
- Error Handling and Logging
- Security Best Practices
- Testing
- Deployment and Operations
- Performance Optimization

---

## Project Philosophy

- User-Centric Design, Interactivity, Clarity, Modularity, Consistency.
- Ember.js Conventions: Follow Ember.js patterns.
- Privacy, Security, Performance, Scalability.
- Embrace Iterative Understanding: Treat solutions as provisional and open to revision.

## Keeping Up with Dependencies

- Stay informed of the latest versions and updates.
- Test thoroughly after upgrading dependencies.
- Document changes and version notes.

## Data Formats

- Use JSON:API for backend/frontend integration.
- Utilize `jsonapi-serializer` on the backend.

## Data Synchronization and Caching

- Implement cache invalidation using timestamps.
- Balance data freshness with performance.

## Ensuring Complete Project Overviews

- Include all relevant files in generated overviews.
- Update `generate-overview.sh` as the project evolves.
- Regularly review project-overview.txt for accuracy.

## Coding Standards

- Consistent indentation (2 spaces).
- camelCase for variables/functions, PascalCase for classes, UPPER_SNAKE_CASE for constants.
- Avoid globals; use modules.
- Follow Ember.js coding conventions where applicable.

## Naming Conventions

- Dasherized filenames (e.g., `photo-controller.js`).
- Descriptive and concise filenames.

## Directory Structure

- `backend/`: Express.js server and APIs
- `frontend/`: Ember.js app
- `data/`, `exports/`, `scripts/`, `utils/`, `tests/`
- Keep structure organized and consistent.

## Documentation Practices

- Update `README.md`, `DEVELOPMENT_PLAN.md`, `ISSUES.md`, `project-guidelines.md`.
- Use inline code comments and JSDoc.
- Maintain a changelog and consider `ARCHITECTURE.md` for big-picture decisions.
- Include “Questions to Consider” to highlight uncertainties.

## Privacy and Data Handling

- Do not store personal data in git.
- Be transparent about data processing.

## Project State and Continuity

- Self-contained documentation.
- Reflect current state, pending tasks, and future plans within the project files.

## Issue Tracking and Debugging

- Log issues in `ISSUES.md`.
- Document steps taken and current status.
- **Do Not Mark Issues as Resolved Until Verified**:  
  **No issue should be marked as "Resolved" until the fix is actually applied by the real person managing the system, and tested to confirm it works in reality.**
- Use "Uncertain" tags if needed to highlight unresolved aspects.
- Treat resolutions as provisional truths.

## Collaboration Guidelines

- Communicate clearly and concisely.
- Provide full file replacements for verifiable changes.
- Keep project composed of smaller files for easy copy-paste integration.
- Include clear commit messages.

## Environment and Dependency Management

- Use `.nvmrc` for Node.js versions.
- Keep dependencies updated and tested.
- Store config in environment variables.
- Adhere to JSON:API specs to ensure frontend-backend compatibility.

## Error Handling and Logging

- Implement robust error handling in async code.
- Provide meaningful error messages.
- Use logging for debugging and monitoring.

## Security Best Practices

- No sensitive info in version control.
- Validate/sanitize user inputs.
- Use environment variables for credentials.

## Testing

- Comprehensive test coverage: unit, integration, acceptance.
- Use Jest (backend) and Ember CLI testing tools (frontend).
- Mock external dependencies.
- Write tests alongside code changes.
- Keep tests reliable and maintainable.

## Deployment and Operations

- Document deployment processes.
- Use environment-specific configs.
- Monitor performance and errors in production.

## Performance Optimization

- Optimize large dataset handling.
- Use caching and lazy loading.
- Profile resource usage.

---
