# Technical Presentation: Distributed Event Streaming & Cloud Architecture

This guide contains a slide-by-slide outline, visual design layout recommendations, and a presenter script designed to explain our architectural decisions, Kafka-specific operations, and cloud design to leadership.

---

## Slide 1: Introduction to MOMs & Apache Kafka
**Slide Title:** Decoupling Systems with Message-Oriented Middleware & Apache Kafka

### Slide Content:
*   **What is MOM (Message-Oriented Middleware)?**
    *   An infrastructure pattern that enables distributed applications to communicate by sending and receiving asynchronous messages.
    *   **The Problem it Solves:** Direct point-to-point HTTP/RPC calls create tight coupling. If System B goes down, System A crashes or drops data.
*   **What is Apache Kafka?**
    *   A distributed, partitioned, replicated commit-log service.
    *   Functions as an event-streaming platform rather than a traditional message broker (like RabbitMQ).
*   **Why MOMs are Critical:**
    *   **Temporal Decoupling:** Producers and consumers do not need to be active at the same time.
    *   **Backpressure Management:** Buffers sudden spikes in client traffic, protecting databases and downstream microservices.
    *   **High Throughput:** Sequential disk write access and zero-copy data transfer.

### Visual Layout:
*   **Left Side:** A diagram showing tightly coupled "spaghetti" API connections (System A -> System B, C, D) crossed out in red.
*   **Right Side:** A decoupled hub-and-spoke pattern showing Producers -> Kafka Log -> Consumers.

### Presenter Script:
> "Good morning. Today I want to walk you through our event-driven system architecture. Historically, connecting systems via direct REST APIs created a house of cards: if our database or downstream server experienced latency, the entire frontend blocked, resulting in a poor user experience. 
> 
> To solve this, we leverage Message-Oriented Middleware (MOM) through Apache Kafka. Kafka acts as a highly resilient, distributed append-only log. By placing Kafka between our Spring Boot API and AWS DynamoDB, we decouple our frontend ingest from our database write path. Our API accepts data, drops it into Kafka in microseconds, and returns a successful response to the user. This ensures 100% uptime and dynamic load-buffering during high-traffic events."

---

## Slide 2: Kafka Production Issue #1: KRaft Metadata Quorum Split-Brain
**Slide Title:** Kafka Production Challenges: KRaft Quorum Failures

### Slide Content:
*   **Issue:** `INCONSISTENT_CLUSTER_ID` and Quorum split-brain.
*   **Symptom:** Broker pods crash on startup, logs show controller election failure, and brokers cannot register metadata.
*   **Root Cause:**
    *   In ZooKeeperless (KRaft) mode, Kafka storage volumes must be formatted with a shared UUID.
    *   If left unconfigured, each pod's container generates a different random UUID on its empty volume during startup. The brokers reject votes from mismatched cluster IDs.
*   **Production Resolution:**
    *   Explicitly define `KAFKA_KRAFT_CLUSTER_ID` in the deployment env, delete the mismatched volumes, and restart.

### Visual Layout:
*   A timeline flowchart: Mismatched Cluster IDs (Crash) ➔ Wipe Volumes ➔ Configure Static Cluster ID ➔ Successful Raft Quorum.

### Presenter Script:
> "Operating Kafka in production—especially under Kubernetes without Zookeeper (using KRaft mode)—presents configuration challenges. In KRaft, nodes govern their metadata quorum. During deployment, we hit the `INCONSISTENT_CLUSTER_ID` bug. Because each container generated its own random cluster ID on startup, they refused to form a quorum. We resolved this by injecting a static UUID across all nodes and wiping the conflicting storage volumes."

---

## Slide 3: Kafka Production Issue #2: Network Boundary Crossing (Advertised Listeners)
**Slide Title:** Kafka Production Challenges: External Client Connection Timeouts

### Slide Content:
*   **Issue:** Clients resolve the bootstrap broker but timeout when trying to read or write data.
*   **Symptom:** Client connection timeouts or `TimeoutException` when publishing.
*   **Root Cause:**
    *   The broker returns the internal cluster pod IP or hostname (configured under `listeners`) which external clients cannot route to.
*   **Production Resolution:**
    *   Configure separate listener maps: internal cluster replication traffic (using internal ports/headless DNS) vs external client traffic (using external routing, ports, or LoadBalancers) mapped via `advertised.listeners`.

### Visual Layout:
*   A network diagram showing a client query to the Bootstrap Service (port 9092) and getting redirected to the Broker's advertised listener IP.

### Presenter Script:
> "A common networking mistake in Kafka deployments is listener misconfiguration. Clients connect to a bootstrap address, which returns metadata telling the client which broker hosts the partition. If the broker advertises an unroutable IP (like `localhost` or an internal cluster IP to an external consumer), writes fail immediately. We configured dynamic DNS advertised listeners for our StatefulSet."

---

## Slide 4: Kafka Production Issue #3: Log Directory & Index File Corruption
**Slide Title:** Kafka Production Challenges: Log Segment Corruption

### Slide Content:
*   **Issue:** Broker crashes on startup during segment loading.
*   **Symptom:** Logs show `CorruptIndexException` or `IOException` during log recovery.
*   **Root Cause:**
    *   Sudden, dirty broker shutdowns (e.g. host crash, Kubernetes OOM kill) occur while the broker is writing active log segments or index files to disk.
*   **Production Resolution:**
    *   Configure `num.recovery.threads.per.data.dir` to parallelize recovery scans.
    *   If index files are corrupted, Kafka will automatically rebuild `.index` and `.timeindex` files from the base `.log` segment files, but this can cause slow startup times if partition counts are high.

### Visual Layout:
*   A diagram illustrating the active writing of segment files and the automated rebuilding of `.index` files from `.log` segment data.

### Presenter Script:
> "In production, dirty shutdowns (like a host power failure or a hard OOM kill) can corrupt Kafka's active log segments or index files. Upon restarting, the broker has to rebuild these indexes from the raw log files, which can delay startup. We parallelize this recovery by tuning the directory recovery threads."

---

## Slide 5: Kafka Production Issue #4: Consumer Poison Pills (Serialization Exceptions)
**Slide Title:** Kafka Production Challenges: Consumer Thread Deadlocks

### Slide Content:
*   **Issue:** Consumer thread stops processing, gets stuck in an infinite retry loop, or crashes.
*   **Symptom:** Consumer group lag climbs to infinity for a specific partition; logs are filled with deserialization errors.
*   **Root Cause:**
    *   A producer publishes a message to a topic with a schema or format that the consumer's deserializer cannot parse (e.g. a null value, corrupted string, or missing fields).
*   **Production Resolution:**
    *   Implement an **Error Handling Deserializer** (e.g. Spring's `ErrorHandlingDeserializer`).
    *   Route the corrupted record to a **Dead Letter Topic (DLT)** for asynchronous inspection rather than blocking the consumer thread.

### Visual Layout:
*   A flowchart: Incoming Kafka Event ➔ Deserializer fails ➔ Captured by Error Handler ➔ Diverted to Dead Letter Queue (DLQ) ➔ Main processing loop continues uninterrupted.

### Presenter Script:
> "A classic Kafka bug is the 'Poison Pill'. A producer writes a message with a corrupted schema or payload. When the consumer's deserializer tries to parse it, it throws an exception. If unhandled, the consumer keeps retrying the exact same offset forever, blocking all subsequent messages. We resolve this by using error-handling deserializers that automatically route corrupted events to a Dead Letter Topic."

---

## Slide 6: Kafka Production Issue #5 & #6: Consumer Rebalance Storms & Consumer Lag
**Slide Title:** Kafka Production Challenges: Processing Latency & Consumer Scaling

### Slide Content:
*   **Issue 5: Consumer Group Rebalance Storms**
    *   *Symptom:* Consumer processing stops completely; high CPU spikes on brokers.
    *   *Cause:* A consumer takes longer to process a batch of records than `max.poll.interval.ms`. The coordinator assumes the consumer has died, removes it, and triggers a cluster-wide rebalance.
    *   *Solution:* Tune `max.poll.records` down or increase `max.poll.interval.ms`.
*   **Issue 6: Consumer Group Lag Accumulation**
    *   *Symptom:* Real-time data displays stale values; databases lag behind event triggers.
    *   *Cause:* Downstream systems (like database writes) process messages slower than the producer ingests them.
    *   *Solution:* Increase partition count to parallelize work across more consumer instances.

### Visual Layout:
*   A diagram showing a single lagging consumer causing the broker coordinator to trigger partition reassignment across the group.

### Presenter Script:
> "In high-throughput environments, we must prevent Consumer Rebalance Storms. A rebalance storm occurs when a consumer takes too long to process data. Kafka assumes the consumer has died, removes it, and shifts partitions to another pod. This triggers a cascading loop of rebalances. 
> 
> We tune our poll batch limits to avoid this. If lag still builds up, we scale the partitions and run multiple consumer instances in parallel."

---

## Slide 7: Kafka Production Issue #7 & #8: Quorum Failures & Data Loss
**Slide Title:** Kafka Production Challenges: Replication & Durability Settings

### Slide Content:
*   **Issue 7: Silent Message Loss**
    *   *Symptom:* Message writes are acknowledged but disappear during broker failover.
    *   *Cause:* Producer writes with `acks=1` (only checks leader receipt) or `acks=0` (no confirmation). If the leader dies before replicating data, the message is lost.
    *   *Solution:* Force `acks=all` (enforces replication to all in-sync replicas before acknowledging).
*   **Issue 8: Unclean Leader Election**
    *   *Symptom:* Out-of-sync broker becomes leader, overwriting historical data.
    *   *Cause:* `unclean.leader.election.enable` is set to `true`.
    *   *Solution:* Enforce `unclean.leader.election.enable=false` to prioritize data durability over availability.

### Visual Layout:
*   A comparative graphic showing a leader node crashing and losing data with `acks=1` vs successfully recovering data with `acks=all`.

### Presenter Script:
> "To prevent data loss, we enforce `acks=all`. The broker doesn't send a success token back to our API until the message is safely replicated to multiple brokers. We also disable unclean leader elections so that a lagged node can never take over as partition leader, ensuring data integrity over raw availability."

---

## Slide 8: Kafka Production Issue #9 & #10: JVM Heap & Operating System Limits
**Slide Title:** Kafka Production Challenges: Heap Sizing & OS Page Caching

### Slide Content:
*   **Issue 9: Garbage Collection (GC) Quorum Timeouts**
    *   *Symptom:* Nodes are periodically marked offline by the cluster metadata manager.
    *   *Cause:* Large JVM heap sizes lead to long Stop-the-World GC pauses, causing brokers to miss heartbeats.
    *   *Solution:* Keep JVM heap size small (4GB-6GB) and utilize the G1GC garbage collector.
*   **Issue 10: OS Page Cache Thrashing**
    *   *Symptom:* High disk read utilization and message read latencies.
    *   *Cause:* Allocating too much RAM to the JVM heap, leaving insufficient memory for the OS page cache. Kafka relies on zero-copy reads from OS memory.
    *   *Solution:* Dedicate remaining host memory (often 50% or more) to the OS page cache.

### Visual Layout:
*   A bar chart illustrating memory allocation: a small slice for JVM heap and a large slice for the Linux Page Cache.

### Presenter Script:
> "Many teams make the mistake of assigning massive 32GB JVM heaps to Kafka brokers. This leads to long Garbage Collection pauses, which kick the broker out of the active quorum. In reality, Kafka's engine uses the OS page cache for physical memory storage, so we keep JVM heaps small and let the Linux kernel handle disk caching."

---

## Slide 9: Kafka Production Issue #11 & #12: Key Selection & Over-Partitioning
**Slide Title:** Kafka Production Challenges: Hot Partitions & Open Files

### Slide Content:
*   **Issue 11: Partition Skew (Hot Partitions)**
    *   *Symptom:* One broker shows 100% resource utilization, while other brokers remain idle.
    *   *Cause:* Poor choice of routing keys (low cardinality), sending all messages to a single partition.
    *   *Solution:* Use high-cardinality keys (like UUIDs) to distribute data evenly.
*   **Issue 12: File Descriptor Exhaustion**
    *   *Symptom:* Broker crashes, logging `java.io.IOException: Too many open files`.
    *   *Cause:* Over-partitioning. Each partition requires multiple open file descriptors for active index and log segment files.
    *   *Solution:* Tune OS limits (`ulimit -n 65536`) and keep partition counts within reasonable limits (max 4,000 per broker).

### Visual Layout:
*   An illustration showing a key hash routing messages to Broker 0 (overloaded) vs Broker 1 and 2 (empty).

### Presenter Script:
> "Partitioning is the key to scaling Kafka, but it must be managed carefully. If we pick a routing key with poor distribution—like a country code or a static status—one single partition becomes a 'hot spot', overloading one broker while others sit idle. We use high-cardinality keys like random UUIDs to ensure balanced traffic.
> 
> Also, because Kafka keeps open file descriptors for indexes and data files for every active partition, the standard Linux limit of 1,024 files is easily exceeded in production. We configure our container templates with a file descriptor limit of 65,536."

---

## Slide 10: This Project's Architecture
**Slide Title:** Event-Driven Portfolio Pipeline: End-to-End Flow

### Slide Content:
*   **Client Interface:** Next.js Frontend (React)
    *   Collects portfolio inquiries.
    *   Restricted dropdown: "Banking", "Fintech", "Others".
*   **API Ingest Layer:** Spring Boot Backend
    *   Receives requests, validates inputs, and publishes to Kafka.
    *   Returns immediate `200 OK` (takes < 10ms).
*   **Event Broker:** **5-Replica Kafka Cluster**
    *   StatefulSet in KRaft mode, deployed on OpenShift (No Zookeeper, No Operator required).
    *   Persistent storage on `gp3` storage class.
*   **Consumer & Router:** Spring Kafka Listener
    *   Asynchronously consumes events from the `enquiry-events` topic.
    *   Applies a business rule: **Only Banking or Fintech domains are routed to AWS DynamoDB.**
*   **Data Lake / Analytics:** AWS DynamoDB (`eu-west-2`)
    *   On-Demand pricing mode, active multi-AZ replication.

### Visual Layout:
*   A workflow diagram: 
    `Next.js Frontend` ➔ (HTTP POST) ➔ `Spring Boot API` ➔ (Produce) ➔ `Kafka Cluster (5 Nodes)` ➔ (Consume/Filter) ➔ `AWS DynamoDB`

### Presenter Script:
> "Here is how we applied these concepts to our portfolio website project. The frontend is built on Next.js, and the backend is a Spring Boot application running on OpenShift. When a user submits an enquiry, the API writes it immediately to our 5-replica Kafka cluster and returns a success response to the browser in under 10 milliseconds. 
> 
> In the background, a Spring Kafka listener consumes this event, processes it, and applies our routing rules: if the domain is 'Banking' or 'Fintech', it persists the record to AWS DynamoDB in London over TLS. If the user selected 'Others', it is processed by Kafka but skipped for DynamoDB persistence. This gives us a highly decoupled, responsive architecture."

---

## Slide 11: Infrastructure as Code: Terraform
**Slide Title:** Standardizing Cloud Resources with Terraform

### Slide Content:
*   **What is Terraform?**
    *   An open-source Infrastructure as Code (IaC) tool that allows developers to define cloud resources using declarative configurations.
*   **How We Used It in This Project:**
    *   **AWS Provider Integration:** Configured to target the `eu-west-2` (London) region.
    *   **DynamoDB Provisioning:** Created the `Enquiries-dev` table with the partition key `enquiryId` using on-demand billing.
    *   **Security & IAM:** Provisioned a programmatic IAM user with targeted DynamoDB read/write privileges.
    *   **OpenShift Credentials Secret:** Exported the IAM access keys as Terraform outputs, which were then injected securely into the OpenShift namespace as a Kubernetes Secret (`aws-credentials`).
*   **Safety Boundaries:**
    *   Configured Git safety barriers (excluding `.tfstate` and `.terraform` providers) to prevent credentials leakage.

### Visual Layout:
*   A diagram showing a Terraform Configuration file (`main.tf`) executing to provision AWS resources (IAM User & DynamoDB Table) and exporting the credentials as a Kubernetes Secret to OpenShift.

### Presenter Script:
> "To prevent manual configuration ('ClickOps') in the AWS Web Console, we manage our cloud footprint using Infrastructure as Code via Terraform. Our Terraform script targets the AWS London region to provision our DynamoDB database table and creates a dedicated IAM service account with strict read/write permissions. 
> 
> The access keys generated by Terraform are outputted directly and injected into our OpenShift cluster as a secure Kubernetes secret, which our backend container references on startup. This workflow is completely repeatable and version-controlled."

---

## Slide 12: AWS DynamoDB Architecture & Consistency
**Slide Title:** DynamoDB Under the Hood: Scalability & Eventual Consistency

### Slide Content:
*   **Partition Key Hashing (Constant $O(1)$ Time Complexity)**
    *   When writing, DynamoDB runs the partition key (`enquiryId`) through an internal hash function.
    *   The hash value points directly to a specific physical storage partition (SSD).
    *   *Result:* Performance is identical whether the table contains 10 records or 10 billion records.
*   **Active Replication (Multi-AZ)**
    *   Every write is automatically replicated to three separate physical Availability Zones (data centers) within the region.
*   **Why DynamoDB is Eventually Consistent by Default**
    *   A write is acknowledged as soon as at least two of the three physical replicas commit the data.
    *   If a client queries the database immediately after a write, the query might hit the third replica before it has finished syncing the change, returning stale data.
    *   *Trade-off:* Eventual consistency provides double the read throughput at half the cost compared to Strongly Consistent reads.

### Visual Layout:
*   A diagram showing a client write hitting the DynamoDB coordinator, which writes to Partition Replica A & B (acknowledging success) while Partition Replica C is updated asynchronously.

### Presenter Script:
> "Now let's look at how our database, AWS DynamoDB, handles this data. DynamoDB is a managed NoSQL database built on consistent performance. It achieves this using hash-based partitioning. When we write an enquiry using its UUID, DynamoDB hashes the ID to locate the physical storage partition. This lookup is $O(1)$, meaning it takes the same fraction of a millisecond regardless of table size.
> 
> By default, DynamoDB reads are eventually consistent. When we write data, it replicates across three separate availability zones. To maximize speed, DynamoDB responds with a success status as soon as two zones commit the data. If a client reads the data a millisecond later, they might hit the third replica before it finishes syncing. This eventual consistency trade-off gives us double the read performance and lower costs."

---

## Slide 13: DynamoDB Production Issues
**Slide Title:** DynamoDB Production Challenges: Hot Keys & Throttling

### Slide Content:
*   **Issue 1: Hot Partitions & Key Skew**
    *   *Symptom:* Requests fail with `ProvisionedThroughputExceededException`, even though the total table capacity limits are not reached.
    *   *Cause:* Traffic targets a single partition key, exceeding the physical partition throughput limit (1000 WCU / 3000 RCU).
    *   *Solution:* Use high-cardinality keys (like UUIDs) and avoid using dates or status flags as partition keys.
*   **Issue 2: Spiky Ingest Throttling**
    *   *Symptom:* API writes fail with throttling exceptions.
    *   *Cause:* Table is in Provisioned mode with fixed capacity limits.
    *   *Solution:* Switch to **On-Demand Capacity Mode (`PAY_PER_REQUEST`)** for unpredictable workloads.
*   **Issue 3: Large Item Sizes & Scan Overhead**
    *   *Symptom:* High latency and ballooning AWS bills.
    *   *Cause:* Performing Table Scans instead of target Queries.
    *   *Solution:* Design proper primary/secondary indexes and restrict return fields using projection expressions.

### Visual Layout:
*   A comparative graphic showing a bad partition key (Date, causing all traffic to hit one node) vs a good partition key (UUID, distributing traffic evenly across all nodes).

### Presenter Script:
> "While DynamoDB is highly scalable, it has production pitfalls. The most common is the 'Hot Partition' issue. A single physical partition is capped at 1,000 writes per second. If we use a low-cardinality partition key (like a status code or country), all traffic hits one partition, causing throttling. We prevent this by using a high-cardinality UUID.
> 
> We also configure our tables in On-Demand mode, allowing the table to auto-scale immediately during traffic spikes. Lastly, we avoid 'Scan' operations, which read the entire table, and instead use 'Query' lookups on index keys to minimize database load."

---

## Slide 14: Terraform Production Issues
**Slide Title:** Terraform Production Challenges: State Conflicts & Drift

### Slide Content:
*   **Issue 1: State File Locking Conflicts**
    *   *Symptom:* `Error: Error locking state` during deployment runs.
    *   *Cause:* Two developers or CI/CD pipelines attempt to run `terraform apply` concurrently.
    *   *Solution:* Configure a remote backend (like AWS S3) with state locking enabled via DynamoDB.
*   **Issue 2: Configuration Drift**
    *   *Symptom:* Terraform tries to destroy and recreate resources that look correct.
    *   *Cause:* Developers made manual changes directly in the AWS Console, causing the real state to drift from the codebase.
    *   *Solution:* Enforce strict read-only console access and use `terraform plan` to audit drift periodically.
*   **Issue 3: Plaintext Credentials in State Files**
    *   *Symptom:* Sensitive passwords or IAM access keys exposed in git history.
    *   *Cause:* Terraform state files (`.tfstate`) store output values and variable definitions in plaintext.
    *   *Solution:* Never commit state files to Git. Configure `.gitignore` rules, store state files in encrypted remote buckets, and use KMS for secrets management.

### Visual Layout:
*   A workflow diagram: Code Change ➔ CI/CD pipeline ➔ State Lock requested in DynamoDB ➔ Apply changes to AWS ➔ State unlocked.

### Presenter Script:
> "Finally, let's address Terraform operations. A key production issue is concurrent executions. If two developers run an update at the same time, it can corrupt the state file. We address this by using remote state files with locking enabled via a DynamoDB lock table.
> 
> We also prevent 'Configuration Drift' by disabling manual configuration changes in the AWS Console. Everything must go through code. Lastly, because Terraform state files contain plain-text outputs (including keys and passwords), committing state files to Git is a major security risk. We enforce strict gitignore rules and keep state files encrypted in secure remote storage."
