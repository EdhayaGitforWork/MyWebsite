# OpenShift Deployment Troubleshooting Report

This document outlines all the deployment issues we encountered in the OpenShift cluster, their root causes, and the exact steps taken to resolve them and achieve a stable, accessible application.

---

## 1. GitHub Actions Authentication

**Issue:** 
You modified the OpenShift Service Account manifest (`k8s/github-sa.yaml`) to generate a new long-lived token for GitHub Actions but were unsure how to deploy it to re-authenticate your CI/CD pipeline.

**Resolution:**
I provided the exact workflow to deploy the new Service Account to the cluster and extract the generated token using the OpenShift CLI:
```bash
oc apply -f k8s/github-sa.yaml
oc get secret github-actions-token -o jsonpath="{.data.token}" | [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_))
```
*This token could then be safely added to the `OPENSHIFT_TOKEN` secret in GitHub.*

---

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

### Final Status
Following these changes, the end-to-end architecture is fully functional:
- ✅ OpenShift Service Account authentication established for CI/CD.
- ✅ PostgreSQL storage allocated and securely running under restricted SCC.
- ✅ Spring Boot backend connected to the database.
- ✅ Next.js frontend securely exposed to the public internet via HTTPS Edge Termination.
