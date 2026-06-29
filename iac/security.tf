# =========================================================================
# SCP-BLOCKED RESOURCES — COMMENTED OUT (kept as design evidence)
# -------------------------------------------------------------------------
# In the AWS Academy sandbox the voclabs role cannot create these:
#   - aws_db_instance  -> rds:CreateDBInstance is denied
#   - aws_s3_bucket    -> s3:GetBucketObjectLockConfiguration is explicitly
#                         denied, which poisons the bucket resource
# The application runs in MOCK MODE (no live DB), so they are not required to
# deploy. The full hardened definitions are preserved below (storage_encrypted,
# multi_az, TLS-only bucket policy, KMS default encryption) as Part B/D design
# evidence. Re-enable by removing the /* */ wrappers in an account that allows
# RDS/S3.
# =========================================================================

/*
# =========================================================================
# 1. SECURE FILE STORAGE BUCKET (With Unique Naming & Default KMS Encryption)
# =========================================================================
resource "aws_s3_bucket" "app_bucket" {
  # Added your student ID string to guarantee global naming uniqueness
  bucket        = "mmu-assignment2-storage-251uc25143"
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_encrypt" {
  bucket = aws_s3_bucket.app_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms" # Safely uses standard default aws/s3 managed KMS key
    }
  }
}

resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.app_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.app_bucket.arn,
          "${aws_s3_bucket.app_bucket.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}

# =========================================================================
# 2. SECURE, ENCRYPTED RDS MYSQL DATABASE (Multi-AZ, private, encrypted)
# =========================================================================
resource "aws_db_instance" "mysql_db" {
  allocated_storage     = 20
  max_allocated_storage = 30
  engine                = "mysql"
  engine_version        = "8.0"
  instance_class        = "db.t3.micro" # Free-tier lab friendly
  identifier            = "app-primary-db"

  db_name  = "app_database"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  publicly_accessible    = false

  storage_encrypted   = true
  multi_az            = true
  skip_final_snapshot = true
}
*/
