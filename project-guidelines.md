Project Guidelines

Table of Contents

    •	Project Philosophy
    •	Keeping Up with Dependencies
    •	Data Formats
    •	Data Synchronization and Caching
    •	Ensuring Complete Project Overviews
    •	Coding Standards
    •	Naming Conventions
    •	Directory Structure
    •	Documentation Practices
    •	Privacy and Data Handling
    •	Project State and Continuity
    •	Issue Tracking and Debugging
    •	Collaboration Guidelines
    •	Environment and Dependency Management
    •	Error Handling and Logging
    •	Security Best Practices
    •	Testing
    •	Deployment and Operations
    •	Performance Optimization

Project Philosophy

    •	User-Centric Design: Develop features that meet the specific needs of photographers working with large photo libraries.
    •	Interactivity and Engagement: Create an intuitive and engaging user experience, especially for complex tasks like photo selection and management.
    •	Clarity and Readability: Code should be easy to read and understand by humans and AI alike.
    •	Modularity: Break down the application into small, manageable modules.
    •	Consistency: Follow established conventions throughout the project.
    •	Ember.js Conventions: Default to current Ember.js conventions and standards across the frontend and backend unless there is a strong reason to do otherwise in the backend.
    •	Privacy and Security: Handle sensitive user data responsibly, ensuring personal data remains private.
    •	Performance: Optimize for handling large datasets efficiently.
    •	Scalability: Design the application architecture to accommodate future growth and additional features.
    •	Embrace Iterative Understanding: Recognize that solutions are provisional and open to revision. Document and revisit solutions over time, framing them as hypotheses effective under current understanding but adaptable as new insights emerge.

Keeping Up with Dependencies

    •	Awareness of Rapid Changes: Acknowledge that open-source projects and dependencies, such as Ember.js, are rapidly evolving. Stay informed about the latest versions and updates.
    •	Proactive Research: Regularly check for updates and changes in the dependencies used in the project. Utilize tools, AI assistants with web access, and official documentation to stay current.
    •	Compatibility Checks: Ensure that updates to dependencies do not break existing functionality. Test thoroughly when upgrading to new versions.
    •	Document Changes: Keep a log of dependency versions and update notes in the project’s documentation, including any migration steps or deprecated features.
    •	Community Engagement: Participate in the communities of key dependencies to stay ahead of upcoming changes and contribute when possible.

Data Formats

    •	JSON:API Format: Use the JSON:API specification for data exchange between the frontend and backend to ensure consistency and compatibility, especially with Ember Data.
    •	JSON:API Serializer: Utilize packages like jsonapi-serializer on the backend to format responses according to the JSON:API specification, enhancing maintainability and compliance.

Data Synchronization and Caching

    •	Cache Invalidation: Implement cache invalidation strategies to ensure the application reflects the most recent data from the Apple Photos library.
    •	Timestamp Comparison: Use the last modified timestamps of the Photos library and cached data to determine when to refresh the cache.
    •	Performance Balance: Strive for a balance between data freshness and application performance.

Ensuring Complete Project Overviews

Including all relevant files in the project overview helps maintain transparency and aids in collaboration, especially when multiple contributors are involved. The generate-overview.sh script should be kept up to date to include all necessary files, such as root-level markdown files (DEVELOPMENT_PLAN.md, ISSUES.md, project-guidelines.md, README.md), and any other files critical to the project’s understanding. The script should balance the need for completeness with the practicality of input constraints in collaborative tools.
• Updating generate-overview.sh: When new important files are added to the project, or when the inclusion criteria change, update generate-overview.sh to reflect these changes.
• Reviewing Project Overviews: Regularly generate and review project-overview.txt to ensure it accurately represents the project’s current state.

Coding Standards

    •	Use consistent indentation (2 spaces).
    •	Follow naming conventions:
    •	Variables and Functions: camelCase
    •	Classes and Constructors: PascalCase
    •	Constants: UPPER_SNAKE_CASE
    •	Write comments for complex code blocks.
    •	Avoid global variables; use modules and closures.
    •	Use ES6+ features where appropriate.
    •	Ember.js Standards: Follow Ember.js coding conventions and best practices in both the frontend and backend where applicable. This includes file naming, directory structure, and coding styles recommended by Ember.js.

Naming Conventions

    •	Use dasherized filenames for files (e.g., photo-controller.js).
    •	Directories and files should be lowercase with hyphens.
    •	Keep filenames descriptive and concise.

Directory Structure

    •	backend/: Express.js server and API endpoints.
    •	frontend/: Ember.js application.
    •	config/: Configuration files.
    •	controllers/: Application logic and request handlers.
    •	models/: Database models and data structures.
    •	routes/: Route definitions and middleware.
    •	views/: Template files (if any remain).
    •	public/: Static assets (CSS, JavaScript, images).
    •	data/: Data files and temporary caches (excluded from git).
    •	exports/: Exported photos (excluded from git).
    •	scripts/: Utility scripts (e.g., generate-overview.sh).
    •	utils/: Utility functions and helpers.
    •	tests/: Automated tests.

Documentation Practices

    •	Update README.md with project information, setup instructions, and usage examples.
    •	Use generate-overview.sh to generate project overviews automatically.
    •	Include All Relevant Files: Ensure that the project overview includes the contents of all relevant files, excluding personal data and photos.
    •	Include inline documentation in code files using JSDoc comments where appropriate.
    •	Maintain a changelog (CHANGELOG.md) to track changes over time.
    •	Document any architectural decisions in an ARCHITECTURE.md file.
    •	Incorporate “Questions to Consider”: In documentation and code comments, include open-ended questions that highlight potential uncertainties or areas for further exploration. This invites contributors to approach the project with a proactive, questioning mindset.

Privacy and Data Handling

    •	Data Exclusion: Do not include personal data or photos in the git repository.
    •	Local Storage: Store temporary caches and exported data securely on the user’s local machine.
    •	User Consent: Ensure any data processing is transparent to the user.

Project State and Continuity

    •	Portability: Ensure the project’s state is fully contained within the project files for new collaborators or assistants.
    •	Agile State Documentation: Include the current project state, pending tasks, and future plans within the project files.
    •	Self-Containment: The project should be self-contained, requiring no external context to understand its current state and next steps.

Issue Tracking and Debugging

    •	Use ISSUES.md to log open issues, steps taken to resolve them, and their eventual resolutions.
    •	Introduce an Uncertainty Tag: For issues with aspects that remain unclear or unresolved, add an “Uncertain” status or tag. This encourages documenting both what’s known and unknown, creating a rich context that invites collective problem-solving.
    •	When an issue is identified:
    •	Describe the problem clearly.
    •	Document the steps you’ve taken to diagnose and attempt to fix it.
    •	Collaborate by inviting input from others, including role-playing as experts or utilizing AI assistants.
    •	Reflect on the solution by asking, “What assumptions did we rely on?” or “What could still be unclear?”
    •	Update the issue log with any new findings or solutions.
    •	Resolutions as Provisional Truths: Frame issue resolutions as effective under current tests but open to improvement. This perspective respects the unknown and encourages team members to share doubts or questions.
    •	This practice ensures transparency and helps prevent redundant work.

Collaboration Guidelines

    •	Communication:
    •	Provide clear and concise messages when collaborating.
    •	Use full file contents for any file to be modified or created to ensure verifiability.
    •	Include all necessary information in the project overview for effective collaboration.
    •	Code Provisioning:
    •	Full File Replacements: Always provide full files for any code changes to facilitate copy-paste replacement.
    •	Project Organization: Organize the project into smaller, manageable files to support this method.
    •	Include Git Commit Messages: When making changes to project files, always include a clear and descriptive git commit message in replies.
    •	Version Control:
    •	Commit small, logical changes with clear commit messages.
    •	Use branches for new features or bug fixes.
    •	Code Review:
    •	Review and test contributions thoroughly before merging.
    •	Encourage collaborative problem-solving.
    •	Problem-Solving Approach:
    •	Identify the issue and document it in ISSUES.md.
    •	Brainstorm potential solutions, possibly involving role-play or consulting experts.
    •	Test each solution systematically, noting outcomes.
    •	Reflect on the process to improve future problem-solving efforts.
    •	Embrace Iteration and Learning: Recognize that being unsure is a natural part of the process and an opportunity for growth.
    •	Best Practices:
    •	Keep the project composed of many small files to facilitate full file replacement via copy-paste from collaboration outputs.

Environment and Dependency Management

    •	Use .nvmrc to specify Node.js versions.
    •	Keep dependencies up to date; use yarn or npm consistently.
    •	Regular Updates:
    •	Schedule regular intervals to check for updates to dependencies.
    •	Use tools like npm-check-updates to identify outdated packages.
    •	Testing After Updates:
    •	After updating dependencies, run the full test suite to catch any compatibility issues.
    •	Be cautious with major version updates that may introduce breaking changes.
    •	Documentation of Versions:
    •	Document the versions of critical dependencies in the README.md or a dedicated VERSIONS.md file.
    •	Include notes on any significant changes or migration steps required.
    •	Exclude unnecessary files and directories using .gitignore (e.g., node_modules/, public/images/, data/, exports/).
    •	Integrate External Tools: Manage calls to external tools (like osxphotos) within the Node.js application.
    •	Ember.js Integration: Ensure that Ember.js and its dependencies are properly managed and documented.
    •	JSON:API Compliance: Ensure that the backend APIs conform to the JSON:API specification to facilitate seamless integration with Ember Data.

Error Handling and Logging

    •	Implement robust error handling in all asynchronous code.
    •	Provide meaningful error messages.
    •	Use logging to aid in debugging and monitoring application health.

Security Best Practices

    •	Do not commit sensitive information to version control.
    •	Use environment variables for configuration where necessary.
    •	Sanitize and validate all user inputs to prevent injection attacks.

Testing

    •	Importance of Testing: Testing is crucial to ensure that our application functions correctly now and in the future. It helps us catch bugs early and provides confidence when making changes.
    •	Test Coverage: Aim for comprehensive test coverage, including unit tests, integration tests, and acceptance tests for both the backend and frontend.
    •	Testing Frameworks:
    •	Backend: Use Jest for testing Node.js code in the backend.
    •	Configuration: Ensure Jest is configured to work with ES modules.
    •	Test Files: Place test files under backend/tests/ with a structure mirroring the source code.
    •	Mocking: Use mocks to isolate tests from external dependencies like file systems or network requests.
    •	Frontend: Use Ember CLI’s built-in testing tools.
    •	Test Types:
    •	Unit Tests: Test individual functions, helpers, and components.
    •	Integration Tests: Test interactions between components.
    •	Acceptance Tests: Test user flows and interactions with the app.
    •	Test Files: Place test files under frontend/photo-filter-frontend/tests/.
    •	Best Practices:
    •	Write Tests Alongside Code: Whenever new code is added, corresponding tests should be written.
    •	Automate Testing: Use scripts (npm test or yarn test) to automate running tests.
    •	Continuous Integration: Set up CI/CD pipelines to run tests automatically on commits and pull requests.
    •	Mock External Dependencies: Avoid relying on real external services or data in tests. Use mocking to simulate responses.
    •	Clear Test Descriptions: Test names should clearly describe the functionality being tested.
    •	Avoid Flaky Tests: Ensure tests are reliable and do not fail intermittently.
    •	Maintaining Tests:
    •	Update Tests with Code Changes: When modifying code, update the tests to reflect the changes.
    •	Review Test Coverage: Regularly review test coverage reports to identify untested parts of the codebase.
    •	Refactor Tests: Keep test code clean and maintainable, applying the same coding standards as production code.
    •	Tools and Libraries:
    •	Code Coverage Tools: Use tools like Istanbul or nyc for backend and built-in coverage tools in Ember CLI for frontend to measure code coverage.
    •	Linting: Lint test code as rigorously as production code.

Deployment and Operations

    •	Document deployment processes.
    •	Use environment-specific configurations.
    •	Monitor application performance and errors in production environments.

Performance Optimization

    •	Optimize code for performance when handling large datasets.
    •	Use caching strategies where appropriate.
    •	Profile and monitor resource usage.
    •	Implement lazy loading and other performance enhancements in the frontend.

Note: These guidelines should be reviewed and updated regularly as the project evolves, embracing uncertainty and adapting to new insights. Staying current with the latest versions of dependencies and being proactive in managing updates is crucial for the project’s long-term success.
