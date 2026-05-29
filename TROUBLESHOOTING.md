# OpenShift Deployment Troubleshooting Report

This document outlines all the deployment issues we encountered in the OpenShift cluster, their root causes, and the exact steps taken to resolve them and achieve a stable, accessible application.

---

## 1. A GitHub Actions Authentication

**Issue:** 
When GitHub Actions tries to run oc login using a token, the OpenShift API server won't recognize the token and will throw a 401 Unauthorized error.
Even if it managed to log in without RBAC permissions, the moment it tries to run oc apply -f k8s/, OpenShift will throw a 403 Forbidden error because the account doesn't have explicit permission to modify deployments.

**Resolution:**
I created a Service Account manifest (`k8s/github-sa.yaml`) to generate a new long-lived token for GitHub Actions 

I implemented the exact workflow to deploy the new Service Account to the cluster and extract the generated token using the OpenShift CLI:
```bash
oc apply -f k8s/github-sa.yaml
oc get secret github-actions-token -o jsonpath="{.data.token}" | [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_))
```
*This token could then be safely added to the `OPENSHIFT_TOKEN` secret in GitHub.*

---
## 1.B ImagePullBackOff 


**Issue:** 
The docker hub image for postgres could not be pulled by the open shift cluster. It was denied permission to pull from the docker hub

**Resolution:**
First I checked the logs of the postgres pod and found that it was not able to pull the image from the docker hub.
Then I checked the logs of the registry pod and found that it was not able to pull the image from the docker hub.
Finally, I found a way to pull the image from the quay.io registry.

## 2. Backend Pod CrashLoopBackOff

**Issue:** 
The `backend` pod was repeatedly failing to start, entering a `CrashLoopBackOff` state. 

**Investigation:** 
I checked the backend pod logs and discovered that Hibernate was throwing a fatal error: `Unable to determine Dialect without JDBC metadata`. This occurs when Spring Boot cannot reach the database to establish a connection pool. Checking the cluster via `oc get deployments` revealed that the `postgresql` pod was completely missing.

---

## 3. PostgreSQL SCC Violation (Security Context Constraints)

**Issue:**
The `postgresql` pod was failing to create. OpenShift ReplicaSet events showed the following error:
`unable to validate against any security context constraint: [...] fsGroup: Invalid value: [26]: 26 is not an allowed group`

**Root Cause:**
OpenShift operates on a zero-trust model using Security Context Constraints (SCC). By default, pods run under the `restricted` SCC, which forces containers to run under a randomly generated, namespace-specific User ID (UID) and Group ID (GID) range. Your `postgresql-deployment.yaml` explicitly requested `fsGroup: 26` (the default postgres group on CentOS/RHEL), which OpenShift blocked as a security violation.

**Resolution:**
I modified `k8s/postgresql/postgresql-deployment.yaml` to remove the hardcoded `fsGroup`, allowing OpenShift to dynamically assign the correct secure group.

```diff
     spec:
-      securityContext:
-        fsGroup: 26
-
       containers:
         - name: postgresql
```

> [!NOTE] 
> Removing this requirement allowed the `postgres:16-alpine` image to adhere to OpenShift's default secure container policies.

---

## 4. Missing Persistent Volume Claim (PVC)

**Issue:**
After fixing the SCC error, the `postgresql` pod was stuck in a `Pending` state. The scheduler emitted a warning:
`persistentvolumeclaim "postgres-pvc" not found`

**Root Cause:**
The database deployment was configured to mount a volume via a PersistentVolumeClaim named `postgres-pvc`, but the actual YAML definition file for this claim did not exist in the `k8s/postgresql/` directory.

**Resolution:**
I created and applied a new manifest file `k8s/postgresql/postgresql-pvc.yaml` allocating 1Gi of `ReadWriteOnce` storage:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

> [!TIP]
> **Result:** Once the PVC was created, the PostgreSQL pod started successfully. I then deleted the crash-looping backend pod to force a restart, and it seamlessly connected to the newly running database.

---

## 5. Inaccessible Frontend (503 Service Unavailable)

**Issue:**
Even with all pods reporting `1/1 Running`, attempting to access the frontend URL (`frontend-edhaya-anbalagan-dev.apps.rm1.0a51.p1.openshiftapps.com`) via a modern browser like Safari resulted in OpenShift's standard "Application is not available" (503) error page.

**Root Cause:**
Modern web browsers aggressively default to **HTTPS** connections. Your OpenShift Routes (`k8s/frontend/frontend-route.yaml` and `k8s/backend/backend-route.yaml`) were missing TLS configurations. When Safari attempted an HTTPS connection, the OpenShift Router dropped the traffic because it had no instructions on how to terminate the SSL connection for your domains.

**Resolution:**
I added Edge TLS termination to both routing manifests. This instructs the OpenShift Router to terminate the secure HTTPS connection at the edge of the cluster and forward standard HTTP traffic to your internal pods.

```diff
   port:
-    targetPort: 3000
+    targetPort: 3000
+
+  tls:
+    termination: edge
+    insecureEdgeTerminationPolicy: Redirect
```

> [!IMPORTANT]
> The `insecureEdgeTerminationPolicy: Redirect` setting is crucial as it automatically upgrades any accidental HTTP requests to secure HTTPS, ensuring a zero-trust external boundary.

---

## 6. Missing Prometheus Metrics for OpenShift Monitoring

**Issue:**
Although an OpenShift `ServiceMonitor` was created to scrape metrics from the Spring Boot backend (`/actuator/prometheus`), no metrics were appearing in the OpenShift console.

**Root Cause:**
While Spring Boot Actuator was installed, it only exposed `/health` by default, and it lacked the ability to format metrics into the specific Prometheus format required by OpenShift.

**Resolution:**
I added the `micrometer-registry-prometheus` dependency to `pom.xml` and explicitly exposed the endpoint in `application.properties`:

```properties
management.endpoints.web.exposure.include=health,prometheus
```

---

## 7. Missing Enterprise Security and Autoscaling Capabilities

**Issue:**
The initial deployments lacked resource boundaries, making them vulnerable to Node exhaustion (OOM kills) and preventing OpenShift from automatically scaling the application under load. Furthermore, the pods had no network isolation.

**Resolution:**
To elevate the cluster to an enterprise standard, I implemented the following:
- **Resource Requests/Limits**: Defined exact CPU/Memory boundaries in all deployments (`frontend`, `backend`, `postgresql`).
- **Horizontal Pod Autoscalers (HPA)**: Configured the frontend and backend to scale up to 5 replicas if CPU usage exceeds 70%.
- **Pod Disruption Budgets (PDB)**: Guaranteed at least 1 pod remains running during cluster upgrades.
- **Zero-Trust Network Policies**: Created a default-deny ingress policy, only allowing explicitly defined traffic flows (e.g., Frontend -> Backend -> Database).
- **ConfigMaps**: Abstracted the database connection string out of the deployment YAML into a dedicated `backend-configmap.yaml`.

---

---

## 8. Missing Strimzi Operator (no matches for kind "Kafka")

**Issue:**
When running `oc apply -R -f k8s/`, the command failed with the following errors:
`unable to recognize "k8s/kafka/kafka-cluster.yaml": no matches for kind "Kafka" in version "kafka.strimzi.io/v1beta2"`
`unable to recognize "k8s/kafka/kafka-topic.yaml": no matches for kind "KafkaTopic" in version "kafka.strimzi.io/v1beta2"`

**Root Cause:**
Deploying Custom Resources of kind `Kafka` and `KafkaTopic` requires the Strimzi Operator (or Red Hat AMQ Streams) to be installed in the cluster/namespace to register these Custom Resource Definitions (CRDs). Since we did not have cluster-wide OperatorHub admin privileges to install the operator, the Kubernetes API server rejected these custom resources.

**Resolution:**
Instead of using Strimzi Custom Resources, we shifted to a standalone, operator-free single-pod Kafka architecture.
1. Deleted the Strimzi operator YAML files: `k8s/kafka/kafka-cluster.yaml` and `k8s/kafka/kafka-topic.yaml`.
2. Created a standard Kubernetes deployment manifest `k8s/kafka/kafka-single-pod.yaml` which defines a standard `Deployment`, `Service`, and `PersistentVolumeClaim`. This does not require any operators or special admin privileges.

---

## 9. Kafka ImagePullBackOff (Docker Hub Access Blocked)

**Issue:**
The newly deployed Kafka pod was stuck in `ImagePullBackOff` or `ErrImagePull`, showing:
`trying and failing to pull image "bitnami/kafka:3.6.0"`

**Root Cause:**
Many enterprise OpenShift environments block or heavily rate-limit anonymous pulls from Docker Hub (`docker.io`), causing image downloads for `bitnami/kafka:3.6.0` to fail.

**Resolution:**
Updated the image source in `k8s/kafka/kafka-single-pod.yaml` to pull from the AWS ECR Public Gallery, which bypasses Docker Hub rate limits and is widely whitelisted in OpenShift:
- Changed `image: bitnami/kafka:3.6.0` to `image: public.ecr.aws/bitnami/kafka:3.6.0`.

---

## 10. Backend CrashLoopBackOff (Missing Kafka Bootstrap Servers Env Var)

**Issue:**
The `backend` pod was repeatedly failing and entering a `CrashLoopBackOff` state.

**Root Cause:**
In `application.properties`, the Kafka bootstrap server defaults to `localhost:9092` if the `KAFKA_BOOTSTRAP_SERVERS` environment variable is not defined. Inside the OpenShift cluster, `localhost` points to the backend container itself (where no Kafka broker is running), rather than our standalone Kafka pod. This caused the Spring Boot application's Kafka client to fail to connect, causing startup failure.

**Resolution:**
I added the `KAFKA_BOOTSTRAP_SERVERS` environment variable to `k8s/backend/backend-deployment.yaml` and set it to the cluster-internal DNS address of our Kafka bootstrap service:
```yaml
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "my-cluster-kafka-bootstrap:9092"
```

---

## 11. Missing `KafkaTemplate` Bean (Unsatisfied Dependency in KafkaProducerService)

**Issue:**
The backend application failed to start, throwing `UnsatisfiedDependencyException`:
`No qualifying bean of type 'org.springframework.kafka.core.KafkaTemplate<java.lang.String, java.lang.Object>' available: expected at least 1 bean which qualifies as autowire candidate.`

**Root Cause:**
In `pom.xml`, the core library `org.springframework.kafka:spring-kafka` was declared directly instead of the Spring Boot starter `org.springframework.boot:spring-boot-starter-kafka`. While `spring-kafka` provides the class definitions, it does not trigger Spring Boot's auto-configuration. Consequently, Spring Boot did not register the default `KafkaTemplate` and `KafkaListenerContainerFactory` beans.

**Resolution:**
Replaced the `spring-kafka` dependency with `spring-boot-starter-kafka` in `pom.xml`. This enables Spring Boot's auto-configuration mechanisms to dynamically set up and register the Kafka template and listener factory beans based on properties defined in `application.properties`.

---

### Final Status
Following these changes, the end-to-end architecture is fully functional and enterprise-ready:
- ✅ OpenShift Service Account authentication established for CI/CD.
- ✅ PostgreSQL storage allocated and securely running under restricted SCC.
- ✅ Spring Boot backend connected to the database.
- ✅ Next.js frontend securely exposed to the public internet via HTTPS Edge Termination.
- ✅ Prometheus metrics fully integrated with OpenShift User Workload Monitoring.
- ✅ Standalone single-pod Kafka deployed inside developer namespace without operator requirements.
- ✅ AWS DynamoDB integration and credentials configured using DefaultCredentialsProvider.

