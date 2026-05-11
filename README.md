# MyWebsite

A full-stack application with a Next.js frontend, a Spring Boot backend, and a PostgreSQL database.

## Architecture & Deployment
The application is deployed on an **OpenShift** cluster using an industry-standard zero-trust architecture. 

### Kubernetes Manifests (`k8s/`)
- **`backend/`**: Contains the Spring Boot deployment and maps environment variables for database credentials and JWT tokens directly from Kubernetes Secrets.
- **`frontend/`**: Contains the Next.js deployment.
- **`postgresql/`**: Contains the `postgresql-deployment.yaml` (using `postgres:16-alpine`) and its associated secrets and persistent volume claims.

### CI/CD Workflow (`.github/workflows/deploy.yaml`)
We use GitHub Actions to automate the build and deployment process to OpenShift upon every push to the `main` branch.

**Workflow Steps:**
1. **Code Checkout**: Grabs the latest code.
2. **Java & Node Setup**: Prepares the environment.
3. **App Build**: Runs `mvn clean package` and `npm run build` to ensure the code compiles without errors.
4. **GHCR Login**: Authenticates seamlessly with the GitHub Container Registry using the built-in `${{ secrets.GITHUB_TOKEN }}`.
5. **Docker Build & Push**: 
   - Builds Docker images for both the frontend and backend.
   - Images are tagged with the exact Git Commit SHA (`${{ github.sha }}`) to ensure perfect traceability.
   - The frontend Docker build is injected with the OpenShift backend URL via the `--build-arg NEXT_PUBLIC_API_URL` to ensure it connects correctly in production.
6. **OpenShift CLI Install**: Downloads the `oc` binary into the GitHub runner.
7. **OpenShift Login**: Uses `redhat-actions/oc-login@v1` to authenticate with the OpenShift cluster using repository secrets.
8. **Dynamic Manifest Injection**: Uses `sed` to find the placeholder `IMAGE_TAG` in the Kubernetes YAML files and replaces it with the newly built `${{ github.sha }}`.
9. **Deployment**: Runs `oc apply -R -f k8s/`. OpenShift detects the new image SHA and performs a zero-downtime rolling update.
