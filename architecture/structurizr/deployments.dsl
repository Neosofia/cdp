
    # ---------------------------------------------------------------------------
    # Deployment model — staging on Railway (v1 operational truth)
    # Local Docker Compose documented in CDP OPERATIONS.md (not modeled here).
    # ---------------------------------------------------------------------------

    deploymentEnvironment "earth" {

        github = deploymentNode "GitHub" "Source control and CI" "SaaS" {
            tags "GitHub"
            actions = deploymentNode "GitHub Actions" "Per-service CI workflows" "GitHub Actions" {
                tags "GitHubActions"
                serviceCi = infrastructureNode "service-ci" "Unit tests, coverage, Trivy scan on push to main and tags" "GHA Workflow" "Workflow"
                imagePublish = infrastructureNode "build-push" "Build and push ghcr.io/neosofia/* on service tags" "GHA Workflow" "Workflow"
            }
            ghcr = infrastructureNode "GHCR" "ghcr.io/neosofia/{service}" "OCI Registry" "GitHubRegistry"
        }

        railway = deploymentNode "Railway" "Staging PaaS — auto-deploy when CI passes" "Railway" {
            tags "Railway"
            cdpProject = deploymentNode "CDP Project" "production environment = staging.neosofia.tech" "Railway Project" {
                tags "RailwayProject"
                authSvc = containerInstance authService
                userSvc = containerInstance userService
                capabilitiesSvc = containerInstance capabilitiesService
                chatSvc = containerInstance chatService
                careEpisodeSvc = containerInstance careEpisodeService
                notificationSvc = containerInstance notificationService
                cdpUi = containerInstance cdpWebApp
                authDb = infrastructureNode "authentication-db" "Postgres" "PostgreSQL" "Database"
                userDb = infrastructureNode "user-db" "Postgres" "PostgreSQL" "Database"
                chatDb = infrastructureNode "chat-db" "Postgres" "PostgreSQL" "Database"
                careEpisodeDb = infrastructureNode "care-episode-db" "Postgres" "PostgreSQL" "Database"
            }
        }

        wosNode = deploymentNode "WorkOS" "External identity provider" "SaaS" {
            tags "SaaSNode"
            wosSso = infrastructureNode "WorkOS AuthKit" "Human login for staging.neosofia.tech" "WorkOS" "SaaSService"
        }

        groqNode = deploymentNode "Groq" "Inference API" "SaaS" {
            tags "SaaSNode"
            groqApi = infrastructureNode "Groq Completions API" "Care assistant and risk evaluation" "HTTPS API" "SaaSService"
        }

        resendNode = deploymentNode "Resend" "Email provider" "SaaS" {
            tags "SaaSNode"
            resendApi = infrastructureNode "Resend API" "Clinical alert and contact email" "HTTPS API" "SaaSService"
        }

        serviceCi -> railway "CI pass triggers deploy" "Railway GitHub integration" {
            tags "CIDeploy"
        }
        imagePublish -> ghcr "Push release images" "OCI push"
        ghcr -> railway "Services pull pinned tags on deploy" "OCI pull" {
            tags "CIDeploy"
        }
        authSvc -> authDb "Reads/writes" "PostgreSQL"
        userSvc -> userDb "Reads/writes" "PostgreSQL"
        chatSvc -> chatDb "Reads/writes" "PostgreSQL"
        careEpisodeSvc -> careEpisodeDb "Reads/writes" "PostgreSQL"
        careEpisodeSvc -> groqApi "Risk evaluation" "HTTPS"
        chatSvc -> groqApi "Care assistant completions" "HTTPS"
        notificationSvc -> resendApi "Send email" "HTTPS"
    }
