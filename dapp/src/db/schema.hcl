schema "public" {}

table "posts" {
  schema = schema.public

  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }

  column "token_address" {
    type = varchar(42)
    null = false
  }

  column "parent_id" {
    type = uuid
    null = true
  }

  column "author_address" {
    type = varchar(42)
    null = false
  }

  column "content" {
    type = text
    null = false
  }

  column "created_at" {
    type = timestamptz
    default = sql("now()")
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "fk_parent" {
    columns     = [column.parent_id]
    ref_columns = [table.posts.column.id]
    on_delete   = CASCADE
  }

  index "idx_posts_token_address" {
    columns = [column.token_address]
  }

  index "idx_posts_parent_id" {
    columns = [column.parent_id]
  }

  index "idx_posts_author_address" {
    columns = [column.author_address]
  }

  index "idx_posts_created_at" {
    columns = [column.created_at]
  }
}

table "post_votes" {
  schema = schema.public

  column "post_id" {
    type = uuid
    null = false
  }

  column "voter_address" {
    type = varchar(42)
    null = false
  }

  column "value" {
    type = smallint
    null = false
    comment = "1 for upvote, -1 for downvote"
  }

  column "created_at" {
    type = timestamptz
    default = sql("now()")
    null = false
  }

  primary_key {
    columns = [column.post_id, column.voter_address]
  }

  foreign_key "fk_post" {
    columns     = [column.post_id]
    ref_columns = [table.posts.column.id]
    on_delete   = CASCADE
  }

  check "valid_vote_value" {
    expr = "value IN (-1, 1)"
  }
}
