---
title: "Scala 3 on Apache Flink: the Practical Path"
date: 2026-09-13T20:45:00+02:00
draft: false
tags: ["scala", "flink", "streaming", "data-engineering"]
summary: "How to write idiomatic Scala 3 Flink jobs with flink-scala-api, including type derivation, dependency setup, packaging, and the migration traps to avoid."
---

Apache Flink's built-in Scala APIs are deprecated. That does **not** mean Scala is a bad language for Flink, or that a Scala codebase needs to be rewritten in Java. It means the supported foundation is now Flink's Java API.

You can call that API directly from Scala, but it is not always pleasant. Java's functional interfaces add noise, Scala collections and algebraic data types need careful serialization, and the resulting code loses much of the reason for choosing Scala in the first place.

[`flink-scala-api`](https://github.com/flink-extended/flink-scala-api) offers a pragmatic middle ground: a community-maintained, Scala 2.13 and Scala 3 wrapper over Flink's Java APIs. The runtime remains Flink. Connectors remain Flink's Java connectors. What changes is the developer-facing API and the handling of Scala types.

This article uses Scala 3.3.8, Flink 1.20.2, and `flink-scala-api` 2.3.1. The same library also publishes a Flink 2 artifact; more on that distinction below.

## Why this library exists

The official Flink Scala API was tied to Scala 2.12 and depended on macros and collection abstractions which did not carry cleanly into Scala 2.13 and 3. [FLIP-265](https://cwiki.apache.org/confluence/display/FLINK/FLIP-265%3A+Deprecate+and+remove+Scala+API+support) therefore deprecated Flink's Scala APIs and recommends using the Java DataStream or Table API from Scala.

`flink-scala-api` takes another route. It keeps the familiar Scala-shaped DataStream API under a different namespace, `org.apache.flinkx.api`, while delegating to Flink's Java implementation. It also replaces the old type derivation machinery with a Magnolia-based serialization framework that supports Scala 3 case classes, sealed traits, collections, and case objects.

This is an important distinction: it is not a separate streaming engine or a fork of the Flink runtime. It is a thin compatibility and ergonomics layer. The trade-off is that it is community-maintained rather than an official Apache Flink API.

## Choose the artifact by Flink major version

The library version and your Flink version are independent. The artifact name chooses the Flink major line:

| Flink cluster | Dependency |
| --- | --- |
| Flink 1.x | `org.flinkextended %% flink-scala-api-1` |
| Flink 2.x | `org.flinkextended %% flink-scala-api-2` |

The `%%` matters: sbt appends the Scala binary version, producing an artifact such as `flink-scala-api-1_3` for Scala 3.

For a Flink 1.20 project, a minimal `build.sbt` looks like this:

```scala
ThisBuild / scalaVersion := "3.3.8"

lazy val flinkVersion         = "1.20.2"
lazy val flinkScalaApiVersion = "2.3.1"

libraryDependencies ++= Seq(
  "org.flinkextended" %% "flink-scala-api-1" % flinkScalaApiVersion,
  "org.apache.flink"   % "flink-streaming-java" % flinkVersion % Provided,
  "org.apache.flink"   % "flink-clients"        % flinkVersion % Provided
)

// Flink is provided by the cluster, but include it when running locally.
Compile / run := Defaults
  .runTask(
    Compile / fullClasspath,
    Compile / run / mainClass,
    Compile / run / runner
  )
  .evaluated

Compile / runMain := Defaults
  .runMainTask(
    Compile / fullClasspath,
    Compile / run / runner
  )
  .evaluated

Compile / run / fork := true
```

For Flink 2, switch the first dependency to `flink-scala-api-2` and align all Flink dependencies with the version running on your cluster. Check the project's [supported-version guidance](https://github.com/flink-extended/flink-scala-api/blob/master/api-docs/getting-started.md) rather than assuming the API library version maps to a Flink release.

## A small Scala 3 streaming job

The API feels close to the old Flink Scala API, but imports come from `org.apache.flinkx`:

```scala
package example

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flinkx.api.*
import org.apache.flinkx.api.semiauto.*

case class Payment(accountId: Long, amount: Double)

object Payment:
  given TypeInformation[Payment] = deriveTypeInformation[Payment]

@main def paymentTotals: Unit =
  val env = StreamExecutionEnvironment.getExecutionEnvironment

  env
    .fromElements(
      Payment(1001, 12.50),
      Payment(1002, 30.00),
      Payment(1001, 7.50)
    )
    .keyBy(_.accountId)
    .reduce((left, right) => left.copy(amount = left.amount + right.amount))
    .name("account-totals")
    .print()

  env.execute("payment-totals")
```

Run it locally with:

```shell
sbt "runMain example.paymentTotals"
```

There are three useful Scala 3 features hiding in this small example:

- `@main` gives us a concise entry point.
- Lambdas work naturally across the wrapper instead of being manually adapted to Java functional interfaces.
- `TypeInformation[Payment]` is derived at compile time and placed in the case class companion, where implicit search can find it.

The third point is the one to understand before putting this into production.

## Treat serialization as part of your data contract

Flink needs a serializer for every type that crosses an operator boundary or enters state. If it cannot resolve a specific serializer, it can fall back to Kryo. That fallback is convenient during development, but it hides type mistakes, can produce larger state, and is a poor basis for long-lived savepoints.

`flink-scala-api` offers two derivation modes:

```scala
import org.apache.flinkx.api.auto.*      // derive whenever required
import org.apache.flinkx.api.semiauto.*  // derive explicitly and cache
```

I recommend semi-automatic derivation for production jobs. Define a `given TypeInformation[T]` in the companion object of each domain type. This makes the serialization contract visible, derives it once, improves compile times for nested models, and turns missing type support into a compilation error.

Also test with Flink's generic serialization disabled:

```yaml
pipeline.generic-types: false
```

This makes accidental Kryo fallback fail early. Avoid wildcard imports from `org.apache.flink.api.scala.*` as well: they can introduce the deprecated API's type derivation and create a codebase where it is unclear which serializer won.

For Java types, provide Flink's own type information explicitly:

```scala
import java.time.Instant
import org.apache.flink.api.common.typeinfo.TypeInformation

given TypeInformation[Instant] = TypeInformation.of(classOf[Instant])
```

## Packaging is where most surprises appear

A stock Flink distribution does not provide your Scala 3 standard library, Magnolia, or `flink-scala-api`. Those must travel with the job, either inside its application JAR or as deliberately managed cluster libraries.

At the same time, do not bundle Flink itself into the job JAR. Keep Flink dependencies in the `Provided` scope and build an assembly containing your application plus its Scala-side runtime dependencies. This avoids classloader conflicts between the Flink version in your JAR and the one running the cluster.

The resulting rule is simple:

- **Provided by the cluster:** Flink runtime, clients, and connector dependencies already installed in the cluster.
- **Provided by the job:** Scala 3 library, `flink-scala-api`, Magnolia, and your other application dependencies.
- **Version-aligned:** any connector you package must match the Flink line you deploy to.

Before deployment, inspect the assembly rather than trusting it. It should contain Scala and `org/apache/flinkx` classes, but not a second copy of the Flink runtime.

## Migrating an existing Scala Flink job

The package rename makes incremental source migration straightforward:

```diff
- import org.apache.flink.streaming.api.scala.*
+ import org.apache.flinkx.api.*
+ import org.apache.flinkx.api.semiauto.*
```

The state migration is not equally transparent. `flink-scala-api` uses different serializers for Scala collections and ADTs, so savepoints written by the official Scala API are not generally compatible. For stateful production jobs, treat this as a data migration:

1. Inventory every type stored in keyed, operator, and broadcast state.
2. Add explicit `TypeInformation` instances and disable generic types in tests.
3. Decide whether the job can start from fresh state, be re-bootstrapped from an external source, or needs a staged state transformation.
4. Validate restore behaviour with a production-like savepoint before changing the deployed job.

The library can use Flink's POJO serialization when savepoint compatibility is more important than Scala-native serialization, but that is an explicit trade-off rather than a migration shortcut.

## When I would use it

I would choose `flink-scala-api` when the team already benefits from Scala's type system and wants idiomatic Scala 3 for non-trivial DataStream jobs, while remaining close to Flink's supported Java runtime and connector ecosystem.

I would stay directly on the Java API from Scala when the wrapper adds little value, the team wants the smallest possible dependency surface, or upstream API parity matters more than Scala ergonomics. For mostly relational transformations, I would still start with Flink SQL or the Table API before reaching for either DataStream API.

That is the practical position: Scala 3 still works well as a language for Flink. The official Scala API is what is going away. `flink-scala-api` fills the gap effectively, provided you treat its community ownership, serializer model, packaging, and state compatibility as architectural decisions rather than implementation details.

## References

- [`flink-scala-api` repository](https://github.com/flink-extended/flink-scala-api)
- [`flink-scala-api` getting started guide](https://github.com/flink-extended/flink-scala-api/blob/master/api-docs/getting-started.md)
- [`flink-scala-api` type-system guide](https://github.com/flink-extended/flink-scala-api/blob/master/api-docs/type-system.md)
- [FLIP-265: Deprecate and remove Scala API support](https://cwiki.apache.org/confluence/display/FLINK/FLIP-265%3A+Deprecate+and+remove+Scala+API+support)
- [Apache Flink 1.20 Scala API notice](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/dev/datastream/scala_api_extensions/)
