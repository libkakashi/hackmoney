env "local" {
  src = "file://src/db/schema.hcl"
  url = "postgres://postgres:postgres@localhost:5432/perps_operator?sslmode=disable"
  dev = "docker://postgres/15/dev?search_path=public"
}

env "dev" {
  src = "file://src/db/schema.hcl"
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev?search_path=public"
}

env "prod" {
  src = "file://src/db/schema.hcl"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://atlas/migrations"
  }
}
