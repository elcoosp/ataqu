# SeaORM 2.0 – Complete Skill Guide

> This guide is self‑contained. All essential patterns for entities, ActiveModels, queries, and migrations are included.

---

## Table of Contents

1. [Entity Definition (2.0 Format)](#entity-definition-20-format)
2. [Strongly‑Typed Columns](#stronglytyped-columns)
3. [ActiveModel Builder Pattern](#activemodel-builder-pattern)
4. [Entity Loader API](#entity-loader-api)
5. [Query Patterns](#query-patterns)
6. [Migration Guide (1.0 → 2.0)](#migration-guide-10--20)
7. [Anti‑Patterns to Avoid](#antipatterns-to-avoid)
8. [Feature Flags & Common Operations](#feature-flags--common-operations)

---

## Entity Definition (2.0 Format)

SeaORM 2.0 uses `#[sea_orm::model]` with relations defined directly on the `Model` struct, eliminating the separate `Relation` enum and `Related` trait impls.

### Basic Entity

```rust
mod user {
    use sea_orm::entity::prelude::*;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "user")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i32,
        pub name: String,
        #[sea_orm(unique)]
        pub email: String,
    }

    impl ActiveModelBehavior for ActiveModel {}
}
```

### Entity with Relations

```rust
mod user {
    use sea_orm::entity::prelude::*;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "user")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i32,
        pub name: String,
        #[sea_orm(unique)]
        pub email: String,
        #[sea_orm(has_one)]
        pub profile: HasOne<super::profile::Entity>,
        #[sea_orm(has_many)]
        pub posts: HasMany<super::post::Entity>,
    }
}
```

### Relation Types

- **Has‑One** – one‑to‑one
- **Has‑Many** – one‑to‑many
- **Belongs‑To** – explicit foreign key mapping
- **Many‑to‑Many** – via junction table
- **Self‑referential** – recursive relations

```rust
#[sea_orm(has_one)]
pub profile: HasOne<super::profile::Entity>,

#[sea_orm(has_many)]
pub posts: HasMany<super::post::Entity>,

#[sea_orm(belongs_to, from = "user_id", to = "id")]
pub user: HasOne<super::user::Entity>,

#[sea_orm(has_many, via = "post_tag")]
pub tags: HasMany<super::tag::Entity>,

#[sea_orm(self_ref, via = "user_follower", from = "User", to = "Follower")]
pub followers: HasMany<Entity>,
```

### Junction Table (Composite Primary Key)

```rust
#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "post_tag")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub post_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub tag_id: i32,
    #[sea_orm(belongs_to, from = "post_id", to = "id")]
    pub post: Option<super::post::Entity>,
    #[sea_orm(belongs_to, from = "tag_id", to = "id")]
    pub tag: Option<super::tag::Entity>,
}
```

### Custom Types with `DeriveValueType`

```rust
#[derive(Clone, Debug, PartialEq, DeriveValueType)]
pub struct Speed(Decimal);

// In the entity
pub speed: Speed,   // SeaORM infers the DB type from the inner type
```

### Column Attributes

| Attribute | Usage |
|-----------|-------|
| `#[sea_orm(primary_key)]` | Single column PK |
| `#[sea_orm(primary_key, auto_increment = false)]` | Non‑auto PK |
| `#[sea_orm(unique)]` | Unique constraint |
| `#[sea_orm(column_type = "Text")]` | Override column type |
| `#[sea_orm(default_value = "active")]` | Default value |
| `#[sea_orm(index)]` | Create index |

---

## Strongly‑Typed Columns

Use `COLUMN` (typed) instead of `Column` (untyped) for compile‑time safety:

```rust
// ✅ Preferred – typed, better IDE support
user::Entity::find().filter(user::COLUMN.name.contains("Bob"))

// ⚠️ Still works but outdated
user::Entity::find().filter(user::Column::Name.contains("Bob"))
```

---

## ActiveModel Builder Pattern

### Basic Creation

```rust
let user = user::ActiveModel::builder()
    .set_name("Bob")
    .set_email("bob@sea-ql.org")
    .insert(db)
    .await?;
```

### With Nested Relations

```rust
let user = user::ActiveModel::builder()
    .set_name("Bob")
    .set_email("bob@sea-ql.org")
    .set_profile(profile::ActiveModel::builder().set_picture("avatar.png"))
    .insert(db)
    .await?;
```

### Adding Has‑Many Children

```rust
let mut bob = bob.into_active_model();
bob.posts.push(
    post::ActiveModel::builder().set_title("First post")
);
bob.save(db).await?;
```

### Many‑to‑Many

```rust
let post = post::ActiveModel::builder()
    .set_title("A sunny day")
    .set_user_id(bob.id)
    .add_tag(existing_tag)   // existing tag model
    .add_tag(tag::ActiveModel::builder().set_tag("outdoor"))
    .save(db)
    .await?;
```

### ActiveValue States

- `Set(value)` – field is modified, will be included in INSERT/UPDATE
- `Unchanged(value)` – field is loaded from DB, not updated unless later changed
- `NotSet` – field is excluded from INSERT/UPDATE

### Insert vs Save

- `.insert()` – always creates a new row (PK must be `NotSet`)
- `.save()` – creates if PK is `NotSet`, otherwise updates

```rust
// Insert
let apple = fruit::ActiveModel {
    name: Set("Apple".to_owned()),
    ..Default::default()
}.insert(db).await?;

// Save (create or update)
let mut banana = fruit::ActiveModel {
    id: NotSet,
    name: Set("Banana".to_owned()),
    ..Default::default()
}.save(db).await?;

banana.name = Set("Banana Mongo".to_owned());
let banana = banana.save(db).await?;
```

### Nested Persistence Order

SeaORM automatically orders operations:

1. INSERT parent (user)
2. INSERT 1‑1 relations (profile) with FK
3. INSERT 1‑N relations (posts) with FK
4. INSERT M‑N junction (tags) after both sides exist

---

## Entity Loader API

Eliminates N+1 queries by intelligently using JOIN for 1‑1 and data loader for 1‑N.

```rust
// Load user with profile and posts
let bob = user::Entity::load()
    .filter_by_email("bob@sea-ql.org")
    .with(profile::Entity)
    .with(post::Entity)
    .one(db)
    .await?
    .expect("Not found");
```

### Nested Relations

```rust
// user → posts → comments
let user = user::Entity::load()
    .filter_by_id(12)
    .with(profile::Entity)
    .with((post::Entity, comment::Entity))
    .one(db)
    .await?;
```

### Many‑to‑Many via Junction

```rust
let post = post::Entity::load()
    .filter_by_id(1)
    .with(tag::Entity)   // via post_tag junction
    .one(db)
    .await?;
```

---

## Query Patterns

### Find All / One

```rust
let cakes: Vec<cake::Model> = Cake::find().all(db).await?;
let cheese: Option<cake::Model> = Cake::find_by_id(1).one(db).await?;
```

### Filtering (Strongly‑Typed Columns)

```rust
let chocolate = Cake::find()
    .filter(Cake::COLUMN.name.contains("chocolate"))
    .all(db)
    .await?;

// Compound conditions
let cakes = Cake::find()
    .filter(
        Condition::all()
            .add(Cake::COLUMN.name.contains("chocolate"))
            .add(Cake::COLUMN.price.gt(10))
    )
    .all(db)
    .await?;
```

### Comparison Operators

| Method | Purpose |
|--------|---------|
| `.eq(val)`, `.ne(val)` | Equality / inequality |
| `.gt(val)`, `.gte(val)` | Greater than / >= |
| `.lt(val)`, `.lte(val)` | Less than / <= |
| `.is_null()`, `.is_not_null()` | Null checks |
| `.between(a, b)` | Range |
| `.is_in(vec)`, `.is_not_in(vec)` | IN / NOT IN |
| `.contains(s)`, `.starts_with(s)`, `.ends_with(s)` | String matching |

### Joins

```rust
// Inner join
Cake::find()
    .inner_join(fruit::Entity)
    .all(db)
    .await?;

// Left join
Cake::find()
    .left_join(fruit::Entity)
    .all(db)
    .await?;

// Find with related (returns tuples)
let cake_with_fruit: Vec<(cake::Model, Option<fruit::Model>)> =
    Cake::find().find_also_related(Fruit).all(db).await?;
```

### Pagination

```rust
let paginator = Cake::find().paginate(db, 10);
let page = paginator.fetch_page(2).await?;   // third page (0‑indexed)
let total = paginator.num_items().await?;
```

### Aggregation

```rust
let count = Cake::find()
    .filter(Cake::COLUMN.name.contains("chocolate"))
    .count(db)
    .await?;
```

### Raw SQL

Use `raw_sql!` with parameter binding and custom result types.

```rust
use sea_orm::raw_sql;

#[derive(FromQueryResult)]
struct CakeWithBakery {
    name: String,
    bakery_name: String,
}

let cake = CakeWithBakery::find_by_statement(raw_sql!(
    Postgres,
    r#"SELECT c.name, b.name AS bakery_name
       FROM cake c
       LEFT JOIN bakery b ON c.bakery_id = b.id
       WHERE c.id = $1"#,
    1
))
.one(db)
.await?;
```

### Partial Models (Select Only Some Columns)

```rust
#[derive(DerivePartialModel)]
#[sea_orm(entity = "cake::Entity")]
struct CakeName {
    id: i32,
    name: String,
}
let cakes: Vec<CakeName> = Cake::find()
    .into_partial_model()
    .all(db)
    .await?;
```

### Nested Partial Models

```rust
#[derive(DerivePartialModel)]
#[sea_orm(entity = "cake::Entity")]
struct CakeWithFruit {
    id: i32,
    name: String,
    #[sea_orm(nested)]
    fruit: Option<fruit::Model>,
}
```

---

## Migration Guide (1.0 → 2.0)

### Breaking Changes

| 1.0 | 2.0 |
|-----|-----|
| `.into_condition()` | `.into()` |
| `db.execute(Statement::from_sql_and_values(..))` | `db.execute_raw(Statement::from_sql_and_values(..))` |
| `db.query_all(backend.build(&query))` | `db.query_all(&query)` |
| `Alias::new("col")` for static strings | `Expr::col("col")` directly |
| `insert_many(..).on_empty_do_nothing()` | `insert_many([])` returns `None` safely |

### Entity Definition Changes

- Add `#[sea_orm::model]` to your entity struct.
- Remove the old `Relation` enum and `Related` trait impls.
- Add relation fields directly to `Model`.
- Use `COLUMN` constant (typed) instead of `Column` enum.

### Migration Steps

1. Update `Cargo.toml` to SeaORM 2.0.
2. Add `#[sea_orm::model]` to each entity.
3. Move relations into the `Model` struct.
4. Replace `.into_condition()` with `.into()`.
5. Update `db.execute` → `db.execute_raw`.
6. Use `Expr::col("col")` instead of `Alias::new`.
7. Use `insert_many([])` for empty lists (returns `None` safely).

### Feature Changes

- PostgreSQL: auto‑increment now uses `GENERATED BY DEFAULT AS IDENTITY` (use `postgres-use-serial-pk` for legacy `serial`).
- SQLite: both `Integer` and `BigInteger` map to `integer` (use `--big-integer-type=i32` if needed).

---

## Anti‑Patterns to Avoid

### 1. Do Not Specify `column_type` on Custom Wrapper Types

```rust
// ❌ WRONG
#[sea_orm(column_type = "Decimal(Some((10, 4)))")]
pub speed: Speed,

// ✅ CORRECT – SeaORM infers from DeriveValueType
pub speed: Speed,
```

### 2. Use `Text` for Long Strings (MySQL/MSSQL)

```rust
// ❌ On MySQL/MSSQL this truncates at 255 chars
pub description: String,

// ✅ Use Text
#[sea_orm(column_type = "Text")]
pub description: String,

// ✅ Or explicit max length
#[sea_orm(column_type = "String(StringLen::Max)")]
pub long_text: String,
```

### 3. Missing `ExprTrait` Import

```rust
// In 2.0, methods like .eq(), .like() on Expr require the trait
use sea_orm::ExprTrait;
Expr::col((user::Entity, user::Column::Id)).eq(42)
```

### 4. Do Not Use Removed/Renamed APIs

Check the migration table above for correct replacements.

### 5. Do Not Manually impl Traits for Custom Types

`DeriveValueType` auto‑generates `NotU8`, `IntoActiveValue`, and `TryFromU64`. Remove manual implementations.

### 6. PostgreSQL `serial` is No Longer Default

Use `postgres-use-serial-pk` if you need legacy behavior.

### 7. SQLite Integer Mapping

Both `Integer` and `BigInteger` map to `integer` in 2.0. Adjust accordingly.

---

## Feature Flags & Common Operations

### Key Feature Flags

- `sqlx-postgres` / `sqlx-mysql` / `sqlx-sqlite`
- `runtime-tokio-native-tls` or `runtime-tokio-rustls`
- `with-chrono` / `with-time`
- `with-json`
- `entity-registry`, `schema-sync` (entity‑first workflow)
- `postgres-use-serial-pk` (legacy)

### Quick Operations Reference

**Select**

```rust
Cake::find().all(db).await?
Cake::find_by_id(1).one(db).await?
Cake::find().filter(Cake::COLUMN.name.contains("choc")).all(db).await?
Cake::find().find_also_related(Fruit).all(db).await?
```

**Insert**

```rust
fruit::ActiveModel { name: Set("Apple".into()), ..Default::default() }.insert(db).await?
Fruit::insert_many([apple, pear]).exec(db).await?
```

**Update**

```rust
let mut pear = pear_model.into_active_model();
pear.name = Set("Sweet pear".into());
pear.update(db).await?
```

**Delete**

```rust
orange.delete(db).await?
fruit::Entity::delete_many()
    .filter(fruit::COLUMN.name.contains("Orange"))
    .exec(db)
    .await?
```

---

## Summary

- Use **`#[sea_orm::model]`** and embed relations directly in the struct.
- Prefer **`COLUMN`** (typed) over `Column` (untyped).
- Use the **ActiveModel builder** for nested creation.
- Use **`Entity::load()`** to avoid N+1 queries.
- Check the **Migration Guide** for 1.0 → 2.0 changes.
- Avoid the **anti‑patterns** listed above.

For any additional details, refer to the official SeaORM 2.0 documentation and blog posts.
