## How to deploy (AWS Academy sandbox)

**Prerequisites:** Terraform ≥ 1.5, an AWS Academy sandbox session (region
`us-east-1`), and Docker (only if rebuilding the image).

**Depending on how Terraform is installed, step 3 might be different.**

1. Start the AWS Academy lab (sandbox) and copy the credentials from *AWS Details* into
   example: `C:\Users\Shinya\.aws\credentials`. (create .aws and credentials text file if they dont exist, and the file must have no extension (no .txt))
2. In `iac/`, copy the example vars and fill them in:
   ```
   cp terraform.tfvars.example terraform.tfvars
   ```
   Fill in terraform.tfvars: app_image is already set (shinyaaaa/mmu-alumni:latest); choose any long random string for jwt_secret and any strong password for db_password. **Never commit `terraform.tfvars`.**
3. Deploy:
   ```
   terraform init
   terraform plan
   terraform apply
   ```
   After apply, the app needs around 3 to 5 min for instances to pull and start the container, so the URL returns 502 at first. Check progress: reload after 5 min, or check EC2 → Target Groups → mmu-cloudsec-tg → Targets for "healthy". To test directly: curl -i http://<your-alb_dns_name>/health → 200 ok means it's up.

4. Open the `alb_dns_name`, copy the link and write it again in a browser but with **http://** .
   Demo login (mock mode): `admin@demo.mmu` / `Demo1234!`
5. Tear down when finished:
   ```
   terraform destroy
   ```

## Application
To run it locally:
```
cd app
docker build -t mmu-alumni .
docker run -p 3000:3000 -e NODE_ENV=production -e JWT_SECRET=changeme mmu-alumni
```

## Sandbox limitations

The AWS Academy `voclabs` role enforces Service Control Policies that block
several actions, so the following are present in the Terraform as **design /
Infrastructure-as-Code evidence** but cannot be deployed live in the sandbox:

- **Amazon RDS** – `rds:CreateDBInstance` is denied. The app therefore runs in
  **mock-data mode**. The full database
  network tier (isolated subnets, DB security group, subnet group) is still
  deployed.
- **AWS WAFv2** – `wafv2:CreateWebACL` is denied.
- **S3** – an object-lock read is explicitly denied, so the bucket is kept in
  code but excluded from live apply.
- **HTTPS** – the ALB uses an HTTP:80 listener. A public ACM certificate
  requires a validatable domain, unavailable in the sandbox, so HTTPS is
  documented as the production design rather than deployed.

These limitations are analysed in the report's Part E reflection.

## Security note

No secrets are committed to this repository. Database passwords, the JWT
secret, and Terraform state are supplied at runtime and excluded via
`.gitignore`. The committed `db.json` contains only fabricated demo data.


