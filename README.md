# MyWebsite (Full-Stack Portfolio)

A full-stack, event-driven portfolio website featuring a Next.js frontend, a Spring Boot backend, a PostgreSQL database, a Kafka event broker, and AWS DynamoDB persistence.

---

##System Architecture & Data Flow

The project is structured with an **Event-Driven Enquiry Flow** to handle user inquiries asynchronously:

```text
[ Next.js Frontend ] 
       │ (REST POST /api/enquiries with JWT)
       ▼
[ Spring Boot Backend (Producer) ]
       │ (Publishes JSON payload)
       ▼
[ Standalone Kafka Broker ] (Topic: enquiry-events)
       │ (Subscribed `@KafkaListener`)
       ▼
[ Spring Boot Backend (Consumer) ]
       │ (Filters for 'Banking' or 'Fintech' domains)
       ▼
[ AWS DynamoDB ] (Table: Enquiries-dev)
```

1. **Submission:** A logged-in user selects services and submits a project enquiry on the frontend.
2. **API Endpoint:** The request is sent to the backend `/api/enquiries` endpoint, secured with JWT authentication (`JwtAuthFilter`).
3. **Kafka Producer:** The backend receives the request and immediately pushes the payload to the `enquiry-events` Kafka topic.
4. **Kafka Consumer:** A background listener consumes the message, checks the client's industry domain, and validates if it matches **Banking** or **Fintech**.
5. **Database Storage:** If validated, the consumer writes the enquiry details into the AWS DynamoDB table (`Enquiries-dev`).

---

## Directory Structure & Resource Layout

### 1. Kubernetes/OpenShift Manifests (`k8s/`)
The deployment is designed for **Red Hat OpenShift** with security and observability configurations:
- **`frontend/`**: Contains the Next.js deployment. Exposes the routing externally via an HTTPS Route with Edge TLS termination.
- **`backend/`**: Contains the Spring Boot deployment. Injects DB credentials, JWT secrets, and the internal Kafka service URL (`KAFKA_BOOTSTRAP_SERVERS`). Includes HPAs, PDBs, and a Prometheus `ServiceMonitor`.
- **`postgresql/`**: PostgreSQL database deployment securely mounted with a Persistent Volume Claim (PVC) and running under OpenShift's default restricted SCC.
- **`kafka/`**: A lightweight standalone Kafka deployment running in **KRaft** mode mounted with `kafka-pvc` (storage persistence). Exposes `my-cluster-kafka-bootstrap:9092` internally.
- **`network-policies.yaml`**: Implements a zero-trust network boundary, locking down internal ingress between pods.

### 2. AWS Cloud Infrastructure (`terraform/`)
We use Terraform to manage the AWS resources programmatically:
- **`main.tf`**: Provisions the DynamoDB table, defines a write-only IAM policy restricted to that table, creates a service IAM user (`enquiry-backend-user-dev`), and generates programmatic API access keys.
- **`variables.tf`**: Sets default region configuration (`eu-west-2` London) and environment names.
- **`outputs.tf`**: Exposes the generated AWS Access and Secret Keys.

### 3. CI/CD Workflow (`.github/workflows/deploy.yaml`)
Automates the build and deployment on git push to the `main` branch.
- Compiles Maven code (`-DskipTests`) and builds Next.js assets.
- Tags container images with the Git Commit SHA (`${{ github.sha }}`) and pushes them to the GitHub Container Registry (GHCR).
- Authenticates with the OpenShift cluster using a long-lived Service Account token (`github-actions-token`).
- Injects the active Git SHA into the deployment manifests and triggers a rolling update (`oc apply -R -f k8s/`).

---

## Provisioning & Run Commands

### 1. Set up AWS Infrastructure
Navigate to the Terraform folder and run:
```bash
cd terraform
terraform init
terraform apply
```
After creation, capture the AWS Access and Secret keys using `terraform output` to inject them into your OpenShift secrets.

### 2. Deploy Applications to OpenShift
Apply all manifests recursively:
```bash
oc apply -R -f k8s/
```

### 3. Verify Kafka Events
To monitor messages passing through your Kafka topic in real time:
```bash
oc exec -it deployment/kafka -- /opt/bitnami/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic enquiry-events \
  --from-beginning
```
