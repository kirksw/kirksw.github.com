---
title: "sbt 2 Is Here. Why Consider Mill?"
date: 2026-09-13T21:00:00+02:00
draft: false
tags: ["scala", "jvm", "flink", "build-tools", "mill"]
summary: "sbt 2 improves how builds execute. Mill offers a reason to reconsider how we understand them, especially when a Flink application needs more than compilation and tests."
---

After building Flink pipelines with sbt, and with most of my build-tool experience coming from Gradle, I decided to try a different path for my latest project: Mill.

The appeal was not just a different configuration syntax.
I wanted a build I could understand and maintain as the project grew: what runs, what it depends on, and what ends up in the artifact I deploy.

That becomes particularly important with Apache Flink applications.
Compiling the code is only part of the job.
The deployment JAR must include application dependencies, exclude libraries supplied by the cluster, and sometimes relocate classes to avoid runtime conflicts.
Tests need to exercise that artifact, not just a more forgiving development classpath.

sbt has long been the default choice for Scala projects.
It has a substantial plugin ecosystem and can express sophisticated builds.
It also asks developers to learn a substantial model of its own.

[sbt 2 is now available](https://scala-lang.org/blog/2026/06/29/sbt2.html), bringing meaningful improvements.
That makes this a good time to assess the alternatives, not because sbt has stopped improving, but because upgrading is already an opportunity to ask what we need from a build tool.

For Scala-heavy JVM projects, Mill looks like a compelling middle ground: more structure than Scala CLI, more direct programmability than Maven, and a smaller conceptual gap between application code and build code than sbt or Gradle often require.

## First, give sbt 2 its due

An argument against sbt should not be an argument against a version that no longer represents it.

sbt 2 changes several things that matter in everyday development:

| Area | sbt 1.x | sbt 2.x |
| --- | --- | --- |
| Build definitions | Scala 2.12 | Scala 3, with JDK 17 required to run sbt |
| Task caching | Incremental compilation and task-specific caches; general caching needs explicit implementation | Tasks cached by default, subject to serialization and correctness requirements |
| Remote reuse | Remote compilation caching exists | Integrated local and remote task caching with Bazel-compatible cache infrastructure |
| Command-line workflow | Persistent shell/server and thin-client capabilities | Native `sbtn` client and client-server operation by default |
| Tests | `test` runs tests; `testQuick` supports selective reruns | `test` becomes incremental/cacheable; `testFull` requests full testing |
| Cross-building | Project matrix supplied through a plugin | Project matrix integrated into sbt |

The Scala version used to write a build is separate from the Scala version of the application.
Both sbt generations can build Scala 2 and Scala 3 applications.

The caching changes are especially significant.
It would now be misleading to argue that Mill caches tasks while sbt does not.
The [sbt 2 change summary](https://www.scala-sbt.org/2.x/docs/en/changes/sbt-2.0-change-summary.html) describes a substantial modernization of execution and reuse.

There is migration work, too.
Plugins need compatible releases, build definitions move to Scala 3, and custom tasks need review.
The [migration guide](https://www.scala-sbt.org/2.x/docs/en/changes/migrating-from-sbt-1.x.html) explicitly warns that restoring a cached result does not repeat the task body's side effects.
Some tasks need `Def.uncached`, rather than an assumption that every invocation runs their body.

These are real improvements, with real engineering behind them.
But improving execution is not the same as simplifying the model developers must understand.

## The build language is not the whole story

Both sbt and Mill use Scala.
The difference is what sits between that language and the build you are trying to describe.

In sbt, developers encounter settings, tasks, keys, scopes, delegation, `.value`, plugin activation, and the distinction between aggregation and project dependencies.
Those mechanisms solve real composition problems.
They also mean that knowing Scala is not enough to understand a nontrivial sbt build.

Mill organizes programmable builds around modules, methods, traits, and overrides.
Tasks form a dependency graph, and the evaluator uses that graph to decide what needs to run.
Shared behavior can live in a trait; a module can override the behavior it needs to change.

This is not a claim that Mill is "just Scala."
It still has task macros, dependency rules, caching semantics, and APIs to learn.
The more useful claim is that more of the build can be explained using concepts a Scala developer already knows.

That matters when a build stops being a standard template and starts becoming software maintained by the team.

## Introspection should be an everyday workflow

sbt is not a black box without inspection tools.
Its [`inspect`, `inspect actual`, and `inspect tree` commands](https://www.scala-sbt.org/2.x/docs/en/reference/sbt-inspect.html) expose definitions and dependencies.

The harder question is how much you need to understand before the output helps.
Finding a key is one step; understanding its scope and delegation can be another.

Mill provides a direct workflow for exploring a build:

```sh
mill resolve __.compile
mill inspect app.job.deploymentAssembly
mill plan app.job.deploymentAssembly
mill show app.job.deploymentAssembly
```

Here, `app.job` is an illustrative application module, and `deploymentAssembly` is a custom task, not a built-in Mill task.

- `resolve` discovers tasks matching a selector.
- `inspect` describes a task and its dependencies.
- `plan` lists its planned upstream tasks.
- `show` evaluates the task and prints its result.

A plan is not a promise that every listed task body will execute: some results can come from cache.
And `show` is not a read-only inspection command; it can run build work.

Mill also exposes task metadata and output directories under `out/`.
For this example, the assembly task's output directory is `out/app/job/deploymentAssembly.dest/`.
That makes it easier to connect a named task to the files it produces.

The [evaluation model](https://mill-build.org/mill/1.0.x/depth/evaluation-model.html) explains the sequence: compile the build definition, resolve task selectors, plan the graph, and execute the required work.
The [built-in command reference](https://mill-build.org/mill/cli/builtin-commands.html) gives the corresponding exploration tools.

Introspection is not just whether a tool can print its internals.
It is how much of a second language you need to interpret the answer.

## A Flink build is an artifact problem

Consider a Scala application deployed to an existing Flink cluster.
The following examples are adapted from a real build, with project identifiers removed and details simplified.
They describe building a Flink application, not building Apache Flink itself.

The deployment has two different classpath requirements:

- Development and tests need access to Flink APIs and supporting libraries.
- The deployed application must not bundle another copy of runtime libraries already supplied by its target cluster.

Flink's [packaging guidance](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/dev/configuration/maven/) describes using `provided` scope for core dependencies and assembling the remaining application dependencies into a job JAR.
The exact boundary depends on the cluster and deployment arrangement.
It is not safe to exclude every dependency whose name contains `flink`: application connectors and other required libraries may need to travel with the job.

In this example, the build defines a custom deployment assembly with explicit filtering and selective relocation.
Its conceptual flow is:

```text
Resolved dependency JARs
          |
          v
Remove runtime JARs supplied by the cluster
          |
          v
Relocate only the dependencies that need isolation
          |
          v
Merge remaining dependencies and upstream module outputs
          |
          v
Add application classes and resources
          |
          v
Deployment JAR --> Runtime smoke tests
```

This is where programmability earns its place.
The build needs a targeted transformation, not merely a generic "make a fat JAR" switch.
Applying relocation to every input can also affect resources that were not meant to be transformed.
Keeping that operation narrow makes the packaging policy easier to reason about and test.

Mill does not eliminate these classloading problems.
Maven, Gradle, and sbt can all implement this workflow.
The attraction is being able to express the policy as build code, inspect its dependencies, and follow the resulting files without moving into an entirely different extension model.

### Tests should depend on the artifact they test

The same build has distinct unit, integration, and end-to-end test commands.
The end-to-end command requests the deployment assembly as a task dependency.

An adapted excerpt, using the Mill 1.1-style API, looks like this:

```scala
// Inside app.job.test, a ScalaTest-based test module.
// Requires the enclosing job module and the TestResult import.
def testE2E(): Task.Command[(msg: String, results: Seq[TestResult])] =
  Task.Command {
    job.deploymentAssembly()
    testOnly("--", "-n", "example.tags.E2ETest")()
  }
```

This is an excerpt, not a standalone build definition.
The actual tests must also be configured to consume the produced JAR; requesting an assembly alone does not make a test an artifact-level test.

The important relationship is explicit: the test command needs the deployment artifact.
It should not rely on someone remembering to run an assembly command first.

That is the kind of custom workflow I want to remain understandable as a project grows.

## The middle ground

These tools do not form a simple ladder from bad to good.
They make different trade-offs.

| Tool | A strong fit when... | Why consider Mill instead? |
| --- | --- | --- |
| Maven | The project fits conventional JVM lifecycles and benefits from familiar integrations | Custom work is becoming more awkward to express through plugin configuration than through typed code |
| Gradle | The ecosystem, Kotlin/Groovy familiarity, or existing organizational tooling is decisive | The project needs programmability but would benefit from a more constrained task-oriented model |
| sbt 2 | Scala plugins, cross-building, and existing build investment are valuable | The main pain is understanding and maintaining the build model, not only execution speed |
| Scala CLI | Scripts, examples, and single-module applications need minimal ceremony | The project needs an extensible task graph or multi-module structure |
| Bazel | Hermeticity, polyglot scale, and remote execution justify substantial build infrastructure | The team needs a programmable JVM build without taking on that infrastructure and modeling effort |

Maven's conventions are a strength, not a defect.
Gradle's flexibility and ecosystem are strengths, too.
And sbt 2 may be the most sensible choice for a team whose current build works well and whose plugins are ready.

Scala CLI is particularly useful for identifying the other boundary.
Its [documented scope](https://scala-cli.virtuslab.org/projects/) deliberately excludes an extensible task system and multi-module builds.
It is not a failed substitute for Mill or sbt; it solves a smaller problem with less ceremony.
A single-module project can still outgrow that scope when its packaging and verification workflow becomes sufficiently specialized.

Mill's opportunity is the space between minimal tooling and a build ecosystem whose machinery dominates the work.
For a Scala-heavy application with custom packaging, that can be exactly the right space.
For a Java team already comfortable with Maven, Scala build definitions may instead be another language to maintain.

## What about speed?

Speed matters, but "Mill is faster" needs a workload attached to it.

Mill's evaluator caches task results and can parallelize independent work.
Custom cached tasks participate in the same execution model as built-in tasks.
That is useful architecture, not proof of a universal benchmark result.

sbt 2 now has first-class task caching.
Gradle has [build caching](https://docs.gradle.org/current/userguide/build_cache.html) and [configuration caching](https://docs.gradle.org/current/userguide/configuration_cache.html).
Maven has a [build-cache extension](https://maven.apache.org/extensions/maven-build-cache-extension/index.html).
None should be compared as if it had no reuse mechanism.

A meaningful comparison for a Flink project would measure:

- A cold build, with dependency downloads identified separately.
- A warm no-op build.
- A small application-code change followed by tests and assembly.
- A build-definition change.
- A CI run with the intended shared-cache configuration.

The JDK, resources, tests, and artifact requirements must match.
A cached result is not comparable to a full test run unless both satisfy the same acceptance criteria.

There are no project-specific benchmark results here yet.
The argument for Mill does not depend on inventing them.

## A smaller model still needs discipline

A programmable build can read undeclared files, consult the environment, or invoke tools whose behavior changes outside the task graph.
Caching cannot make those dependencies disappear.

Mill's [sandboxing documentation](https://mill-build.org/mill/depth/sandboxing.html) explicitly says its guardrails are not full hermetic isolation.
Correct inputs, controlled tool versions, appropriate command/task boundaries, and artifact-level tests still matter.

The ecosystem also matters.
Before migrating, check the publishing, shading, code-generation, coverage, IDE, and CI integrations your project actually uses.
Replacing a mature plugin with custom code transfers maintenance to your team, even if writing that code is pleasant.

Finally, pin the Mill version and use its matching documentation.
Build APIs evolve; mixing examples from different releases is an avoidable source of confusion.

## Choose the build you want to maintain

sbt 2 is a good reason to revisit an old assessment of sbt.
It modernizes build definitions and makes substantial improvements to caching and command-line use.

It is also a good moment to ask a different question: do we want a better version of our current build model, or a different model?

For Scala-heavy JVM applications that need custom tasks, careful packaging, and tests against the deployed artifact, Mill deserves a serious evaluation.
It offers more room to grow than Scala CLI without requiring the same conceptual investment that sbt or Gradle can demand, and more direct customization than Maven's declarative configuration.

Not the perfect build tool for every project.
Potentially the right middle ground for this kind of project.

The test is straightforward: when the job JAR fails in the cluster, can the next developer explain how it was built?
