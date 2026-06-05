# OpenShift Deployment & CI/CD Guide

This document describes how the entire portfolio website stack—Next.js frontend, Spring Boot backend, PostgreSQL, and the 5-replica KRaft Kafka cluster—is deployed to Red Hat OpenShift, bypassed Docker Hub limits, integrated with AWS DynamoDB via Terraform, and automated using GitHub Actions.

---

## 1. Architecture Overview

Rather than deploying the Next.js app to Vercel (which does not support the backend services) or using the Strimzi Operator (which requires cluster-admin rights), the application is deployed as native Kubernetes manifests on **Red Hat OpenShift (Developer Sandbox)**.

```
                  ┌────────────────────────────────────────┐
                  │          OpenShift Cluster             │
                  │                                        │
                  │   ┌──────────────┐                     │
                  │   │   Next.js    │                     │
                  │   │   Frontend   │                     │
                  │   └──────┬───────┘                     │
                  │          │ (REST API)                  │
                  │   ┌──────▼───────┐      ┌──────────┐   │
                  │   │ Spring Boot  ├─────►│Postgres  │   │
                  │   │   Backend    │      │ Database │   │
                  │   └──────┬───────┘      └──────────┘   │
                  │          │ (Produce)                   │
                  │   ┌──────▼───────┐                     │
                  │   │  5-Replica   │                     │
                  │   │ KRaft Kafka  │                     │
                  │   └──────┬───────┘                     │
                  └──────────┼─────────────────────────────┘
                             │ (Consume & Filter)
                             ▼ (AWS SDK v2 over TLS)
                      ┌──────────────┐
                      │ AWS DynamoDB │
                      │ (eu-west-2)  │
                      └──────────────┘
```

---

## 2. Infrastructure Setup (AWS & Terraform)

Before applying the manifests to OpenShift, the AWS DynamoDB table and security credentials must be provisioned.

1. **Initialize Terraform**:
   Navigate to the `terraform/` directory:
   ```bash
   cd terraform
   terraform init
   ```
2. **Apply Configuration**:
   ```bash
   terraform apply
   ```
   This provisions:
   *   The DynamoDB table named `Enquiries-dev` in the `eu-west-2` (London) region.
   *   An IAM programmatic user `enquiry-service-dev` with specific read/write access to that table.
3. **Register AWS Secrets in OpenShift**:
   Extract the Terraform outputs for AWS credentials and map them to a Kubernetes secret in the OpenShift namespace:
   ```bash
   oc create secret generic aws-credentials \
     --from-literal=aws_access_key_id="<TERRAFORM_OUTPUT_AWS_ACCESS_KEY_ID>" \
     --from-literal=aws_secret_access_key="<TERRAFORM_OUTPUT_AWS_SECRET_ACCESS_KEY>"
   ```

---

## 3. Deploying the Kubernetes manifests

All manifests are located in the `k8s/` directory and can be manually applied using `oc apply -R -f k8s/` or updated automatically via GitHub Actions.

### A. Database (PostgreSQL)
Exposes a single instance of PostgreSQL using a persistent volume:
*   **PersistentVolumeClaim**: `postgres-pvc` (claims 1Gi of `gp3` storage).
*   **Service**: `postgresql` on port 5432.
*   **Deployment**: Runs `postgres:15-alpine` referencing `postgres-secret` for credential injection.

### B. Distributed Event Broker (Kafka)
Deploys a 5-replica StatefulSet using **KRaft** mode (no ZooKeeper required):
*   **Headless Service (`kafka`)**: Provides stable internal DNS resolution for replicas:
    *   `kafka-0.kafka.edhaya-anbalagan-dev.svc.cluster.local:9092`
    *   `kafka-1.kafka.edhaya-anbalagan-dev.svc.cluster.local:9092`
    *   ...up to `kafka-4`.
*   **Client Service (`kafka-client`)**: Standard ClusterIP routing client traffic to port 9092.
*   **StatefulSet (`kafka`)**:
    *   Runs `public.ecr.aws/bitnami/kafka:3.6.0` to bypass Docker Hub anonymous pull limits.
    *   Uses a dynamic container command startup block to extract the broker `NODE_ID` and format the advertised listeners using hostnames.
    *   Enforces a static `KAFKA_KRAFT_CLUSTER_ID` (`4L62xdtTRt2RPMw3s3tzzg`) to avoid split-brain controller votes.
    *   Mounts 5 separate PVCs (`kafka-data-kafka-0` to `kafka-data-kafka-4`) for partition persistence.

### C. Backend (Spring Boot)
Deploys the REST API:
*   **Deployment**: Injects database, JWT, and AWS credentials. Connects to Kafka via environment variable:
    ```yaml
    - name: KAFKA_BOOTSTRAP_SERVERS
      value: "kafka-client:9092"
    ```
*   **Service & Route**: Exposes port 8080.
*   **Autoscaler**: Configured with Horizontal Pod Autoscaler (HPA) to scale between 1 and 5 pods.

### D. Frontend (Next.js)
Deploys the client application:
*   **Deployment**: Pulls the custom Next.js image pointing to the backend API endpoint.
*   **Route**: OpenShift route configuration with **Edge TLS Termination** to expose the website securely to the public internet via HTTPS.

---

## 4. Automated CI/CD (GitHub Actions)

Any commit pushed to the `main` branch triggers the deployment workflow located in `.github/workflows/deploy.yaml`.

### Workflow Steps:
1.  **Checkout Code**: Pulls the repository.
2.  **Build Codebases**:
    *   Compiles backend Java code using Maven: `mvn clean package -DskipTests`.
    *   Builds Next.js static production bundle: `npm run build`.
3.  **Build and Push Docker Images**:
    *   Authenticates with GitHub Container Registry (GHCR).
    *   Builds and pushes Next.js (`mywebsite-frontend`) and Spring Boot (`mywebsite-backend`) images tagged with the commit SHA:
        ```bash
        docker build -t ghcr.io/edhayagitforwork/mywebsite-backend:${{ github.sha }} ./mywebsite-backend
        ```
4.  **Log in to OpenShift**:
    *   Authenticates using a service account token (`OPENSHIFT_TOKEN`) and cluster server endpoint URL (`OPENSHIFT_SERVER`) stored in GitHub Secrets.
5.  **Manifest Processing & Deployment**:
    *   Dynamically substitutes placeholder strings (`IMAGE_OWNER` and `IMAGE_TAG`) in the YAML files with the current repository owner and Git commit SHA:
        ```bash
        sed -i "s|ghcr.io/IMAGE_OWNER/mywebsite-backend:IMAGE_TAG|ghcr.io/${{ env.REPO_OWNER }}/mywebsite-backend:${{ github.sha }}|g" k8s/backend/backend-deployment.yaml
        ```
    *   Applies all configurations recursively:
        ```bash
        oc apply -R -f k8s/
        ```

---

## 5. Verification Commands

Verify the status of the deployment using these CLI commands:

```bash
# 1. Check if all pods are running (should show 5/5 Kafka pods and 1/1 Backend/Frontend/Postgres)
oc get pods

# 2. Check the logs of the Spring Boot consumer to confirm it connected to the Kafka cluster
oc logs deployment/backend | grep "enquiry-group"

# 3. Stream real-time events passing through the Kafka broker
oc exec -it kafka-0 -- /opt/bitnami/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic enquiry-events \
  --from-beginning
```
