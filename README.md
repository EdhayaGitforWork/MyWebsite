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

## Under the Hood: DynamoDB Architecture & Latency Analysis

### Why does it take time to reach DynamoDB? (Latency Analysis)
In this event-driven system, when the user clicks "Submit Request", the database write is **asynchronous** and **decoupled**. This introduces some natural micro-latencies before the record lands in DynamoDB:
1. **Asynchronous Handshake (Kafka Decoupling):** The frontend receives an instant `200 OK` from the REST API because the API only writes the message to the Kafka topic and immediately returns. The frontend does not block or wait for the database write, resulting in a highly responsive user experience.
2. **Polling Frequency & Processing:** The backend Kafka listener group (`enquiry-group`) polls the broker for new messages. This polling frequency, along with Java JSON deserialization and validation checks (checking if the domain matches Banking/Fintech), takes a few milliseconds.
3. **Cross-Cloud Network Latency:** Your application runs on an OpenShift cluster, while DynamoDB runs in AWS London (`eu-west-2`). Executing a TLS HTTPS POST request across the public internet from OpenShift to AWS creates a network transit overhead of around 50ms - 150ms.
4. **Data Replication Overhead:** Once the write reaches DynamoDB, it replicates the data across three separate physical Availability Zones (data centers) within the region before acknowledging a successful write back to the Spring Boot client.

### How does DynamoDB work behind the scenes?
Amazon DynamoDB is a fully managed NoSQL key-value database designed to provide consistent, single-digit millisecond latency at any scale. Here is how it functions in this project:

#### 1. Partitioning and Hashing (Constant O(1) Time Complexity)
- **The Partition Key (`enquiryId`):** We defined `enquiryId` as the table's partition key. 
- **Under the hood:** When your backend makes a `PutItem` call, DynamoDB feeds the `enquiryId` string (e.g., `4fb3f6e4-5040-...`) into an internal cryptographic hash function. The output of this hash tells DynamoDB exactly which physical storage partition (SSD) holds that data. 
- **Result:** Because lookup is based on direct hashing rather than scanning index trees, reads and writes take the exact same amount of time ($O(1)$ time complexity), whether the table contains 10 rows or 10 billion rows.

#### 2. On-Demand Capacity Mode (`PAY_PER_REQUEST`)
- **Autoscaling:** We provisioned the table in on-demand mode. Rather than defining fixed read/write capacity units (which can throttle traffic if exceeded), DynamoDB instantly scales up or down its internal partitions to handle whatever throughput spikes your frontend submits.
- **Cost Efficiency:** You only pay for the exact read/write requests executed. For portfolio applications, this is highly cost-effective and remains inside the AWS free tier.

#### 3. Schema-less Attributes
- Unlike relational databases (SQL) that require a strict column layout, DynamoDB is schema-less.
- Each item is stored as an independent document of key-value attributes:
  - **Scalar Attributes:** `userName`, `email`, `mobileNo`, `domain`, and `companyName` are mapped as String (`S`) attributes. `projectDuration` is mapped as a Number (`N`) attribute.
  - **Document Attributes:** The services selected by the user are stored in a nested List (`L`) of String attributes (`selectedServices`), allowing rich data structures to be saved in a single write operation.

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
