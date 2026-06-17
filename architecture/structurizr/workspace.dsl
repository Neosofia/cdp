workspace "Clinical Data Platform (CDP)" "Post-discharge care platform: responsive web SPA, Care Episode orchestration, Groq inference, synchronous risk evaluation, email escalation." {

    model {

        patient = person "Patient" "Uses patient chat and profile in the CDP web application." "Patient"
        clinician = person "Clinician" "Reviews roster, chat, and records in the CDP web application." "Clinician"
        operator = person "Platform Operator" "Administers users, services, and health in the CDP web application." "Internal"
        onCallEngineer = person "On-call Engineer" "Responds to operational incidents." "Internal"
        clinicalLead = person "Clinical Lead" "Reviews risk trends and escalation outcomes." "Internal"
        productManager = person "Product Manager" "Reviews engagement and platform health trends." "Internal"
        infoSecTeam = person "InfoSec Team" "Runs independent SIEM checks for PHI/PII leakage." "Internal"

        workOS = softwareSystem "WorkOS" "External identity provider (AuthKit) used by Authentication Service." "External,WorkOS"
        groq = softwareSystem "Groq" "Managed inference API (OpenAI-compatible completions) for care assistant and risk evaluation." "External"
        resend = softwareSystem "Resend" "Transactional email provider used by Notification Service." "External"
        operationalMetrics = softwareSystem "Operational Metrics" "Platform observability, SLIs/SLOs, dashboards, and alert rules." "External,Observability"

        cdp = softwareSystem "Clinical Data Platform" "Post-discharge care platform for AI-assisted chat, synchronous risk evaluation, and clinician review." {
            !docs content/README.md
            !docs content/constitution.md
            !docs content/specs
            !docs images
            !adrs adrs

            experience = group "Experience" {
                cdpWebApp = container "CDP Web Application" "Single responsive SPA: patient chat, clinician roster, operator admin; role switching via profile menu." "React / TypeScript" "App,WebApp" {
                    authSession = component "Auth Session Client" "WorkOS login, platform JWT exchange, token refresh." "React / TypeScript" "Component"
                    termsOfServiceGate = component "Terms of Service Gate" "Corporate/demo terms acceptance before onboarding routes." "React / TypeScript" "Component"
                    demoBootstrap = component "Demo Bootstrap" "Seeds demo tenant, roles, and sample recoveries after terms accept." "React / TypeScript" "Component"
                    rolePicker = component "Role Picker" "Single active tier-1 actor selection; sends X-Active-Actor on API calls." "React / TypeScript" "Component"
                    patientChatUI = component "Patient Chat UI" "Threads, send, assistant replies via Care Episode completions." "React / TypeScript" "Component"
                    patientProfile = component "Patient Profile UI" "Self-service profile fields permitted by User registry policy." "React / TypeScript" "Component"
                    clinicianWorkspace = component "Clinician Workspace" "Roster by risk, patient detail, chat + records, care team join." "React / TypeScript" "Component"
                    platformHealthPanel = component "Platform Health Panel" "Operator service reachability and latency from configured endpoints." "React / TypeScript" "Component"
                    serviceRegistryAdmin = component "Service Registry Admin" "Operator CRUD for mesh service registry entries." "React / TypeScript" "Component"
                    userAdministration = component "User Administration" "Operator search, role assignment, and registry audit history." "React / TypeScript" "Component"
                    capabilitiesClient = component "Capabilities Client" "Prefetches Cedar UI entitlements per actor from Capabilities Service." "React / TypeScript" "Component"
                }
            }

            clinical = group "Clinical" {
                careEpisodeService = container "Care Episode Service" "Recovery lifecycle, chat orchestration proxy, synchronous risk evaluation, escalation handoff." "Python / Flask + PostgreSQL" "Service" {
                    recoveryLifecycle = component "Recovery Lifecycle" "Invites, active recovery lookup, scheduled closure, audit history." "Python" "Component"
                    chatOrchestrator = component "Chat Orchestrator" "Creates interactions with context; proxies completions to Chat + Groq path." "Python" "Component"
                    riskEvaluator = component "Risk Evaluator" "Synchronous Groq risk inference; rolling summaries; recovery risk_level." "Python" "Component"
                    escalationClient = component "Escalation Client" "Resolves Notification via service registry; sends clinical alert email on high risk." "Python" "Component"
                    medicalRecords = component "Medical Records" "Recovery-scoped records displayed beside chat in clinician views." "Python" "Component"
                }
                chatService = container "Chat Service" "Authoritative PHI message store; user-scoped interaction threads." "Python / Flask + PostgreSQL" "Service" {
                    authzMiddleware = component "Authorization Middleware" "JWT validation and Cedar enforcement via SDK middleware." "Python" "Component"
                    interactionStore = component "Interaction Store" "Creates interactions, lists threads, stores inbound/outbound messages." "Python" "Component"
                    inferenceBridge = component "Inference Bridge" "Calls Groq completions URL for care assistant turns when invoked by orchestrator." "Python" "Component"
                }
            }

            platform = group "Platform" {
                authService = container "Authentication Service" "WorkOS login, platform JWT issuance, service registry, machine credentials." "Python / Flask" "Service,Security" {
                    oauthCallbackHandler = component "OAuth Callback Handler" "WorkOS callback, sealed session cookie, JWT exchange." "Python" "Component"
                    identityProvisioner = component "Identity Provisioner" "Best-effort User registry upsert after successful human login." "Python" "Component"
                    tokenIssuer = component "Token Issuer" "Issues RS256 platform JWTs for humans and services." "Python" "Component"
                    serviceRegistry = component "Service Registry" "Registers mesh services; Cedar-gated lookup by slug." "Python" "Component"
                    tenantRegistry = component "Tenant Registry" "Tenant metadata for operator administration." "Python" "Component"
                    jwksPublisher = component "JWKS Publisher" "Publishes public signing keys for distributed JWT validation." "Python" "Component"
                }
                userService = container "User Service" "Human role registry, profile fields, deploy-time role catalog overlay." "Python / Flask + PostgreSQL" "Service" {
                    userRegistry = component "User Registry" "Tenant-scoped humans, role assignments, search and admin APIs." "Python" "Component"
                    roleCatalog = component "Role Catalog" "Generic + product overlay vocabulary for assignment pickers." "Python" "Component"
                }
                capabilitiesService = container "Capabilities Service" "Cedar UI entitlement evaluation from injected cdp-policies bundle." "Python / Flask" "Service" {
                    policyLoader = component "Policy Loader" "Loads Cedar bundle at startup from injected image content." "Python" "Component"
                    entitlementEvaluator = component "Entitlement Evaluator" "Evaluates View permits; returns ui:: entity keys." "Python" "Component"
                }
                notificationService = container "Notification Service" "Email relay for clinical alerts and corporate contact form." "Python / Flask" "Service" {
                    clinicalAlertRelay = component "Clinical Alert Relay" "Validates escalation email from Care Episode; sends via Resend." "Python" "Component"
                    contactFormRelay = component "Contact Form Relay" "Rate-limited corporate contact form submissions via Resend." "Python" "Component"
                    healthEndpoint = component "Health Endpoint" "Liveness and version; CORS for operator dashboard probes." "Python" "Component"
                }
            }
        }

        # Component-level relationships (Level 3 diagrams). Omit platform-wide patterns
        # (JWT/Cedar middleware on every service) — those stay in dynamic/container views.

        # CDP Web Application — actor menu, terms/demo onboarding, entitlement prefetch
        authSession -> termsOfServiceGate "Evaluate terms acceptance after login" "Internal"
        termsOfServiceGate -> demoBootstrap "Seed demo workspace after accept" "Internal"
        authSession -> capabilitiesClient "Prefetch ui:: keys after login" "Internal"
        rolePicker -> capabilitiesClient "Re-evaluate menu on actor switch" "Internal"
        rolePicker -> patientChatUI "Active patient actor for chat APIs" "Internal"
        rolePicker -> patientProfile "Active patient actor for profile APIs" "Internal"
        rolePicker -> clinicianWorkspace "Active clinician actor for roster APIs" "Internal"

        # Care Episode — post-discharge orchestration
        recoveryLifecycle -> chatOrchestrator "Recovery context for interaction" "Internal"
        chatOrchestrator -> riskEvaluator "Synchronous risk after patient turn" "Internal"
        riskEvaluator -> escalationClient "Clinical alert on high risk" "Internal"
        recoveryLifecycle -> medicalRecords "Recovery-scoped record set" "Internal"
        chatOrchestrator -> medicalRecords "Records beside chat in clinician view" "Internal"

        # Chat Service — assistant inference path (authz middleware is platform-wide; see LocalAuthorizationFlow)
        interactionStore -> inferenceBridge "Assistant completion request" "Internal"
        inferenceBridge -> interactionStore "Persist assistant message" "Internal"
        interactionStore -> authzMiddleware "Authorize incoming request" "Internal" {
            tags "PlatformPattern"
        }
        authzMiddleware -> interactionStore "Allow" "Internal" {
            tags "PlatformPattern"
        }

        # Authentication — login, provisioning, and signing infrastructure
        oauthCallbackHandler -> tokenIssuer "Mint platform JWT after WorkOS callback" "Internal"
        oauthCallbackHandler -> identityProvisioner "Upsert User registry row after login" "Internal"
        tokenIssuer -> jwksPublisher "Publish signing keys" "Internal"

        # User — role assignment vocabulary
        userRegistry -> roleCatalog "Validate role slug against catalog" "Internal"

        # Capabilities — Cedar bundle to UI entitlements
        policyLoader -> entitlementEvaluator "Policies loaded at startup" "Internal"

        # Container-level relationships (Level 2 container diagram + deployment views)
        cdpWebApp -> authService "Login and API calls" "HTTPS"
        cdpWebApp -> careEpisodeService "Patient chat and clinician views" "HTTPS"
        cdpWebApp -> capabilitiesService "Prefetch UI entitlements" "HTTPS"
        cdpWebApp -> chatService "Clinician chat read/send" "HTTPS"
        cdpWebApp -> notificationService "Operator health probes" "HTTPS"
        careEpisodeService -> chatService "Message storage and inference bridge" "HTTPS"
        careEpisodeService -> notificationService "Escalation email" "HTTPS"
        careEpisodeService -> groq "Care assistant and risk inference" "HTTPS"
        notificationService -> resend "Send email" "HTTPS"
        authService -> workOS "OAuth callback" "HTTPS"
        authService -> userService "Identity sync on login" "HTTPS"

        # Service-mesh paths (modelled, omitted from the primary container diagram)
        authService -> cdpWebApp "Platform token issued" "HTTPS" {
            tags "Mesh"
        }
        careEpisodeService -> cdpWebApp "Assistant reply and risk metadata" "HTTPS" {
            tags "Mesh"
        }
        careEpisodeService -> authService "Service token and registry" "HTTPS" {
            tags "Mesh"
        }
        authService -> careEpisodeService "Service token and registry response" "HTTPS" {
            tags "Mesh"
        }
        chatService -> groq "Care assistant completions" "HTTPS" {
            tags "Mesh"
        }
        chatService -> authService "Service token and JWKS" "HTTPS" {
            tags "Mesh"
        }
        workOS -> authService "Identity verified" "HTTPS" {
            tags "Mesh"
        }

        cdp -> operationalMetrics "Emits structured logs and SLI telemetry" "Telemetry"

        # People
        patient -> cdpWebApp "Patient chat and profile" "HTTPS"
        clinician -> cdpWebApp "Roster and patient review" "HTTPS"
        operator -> cdpWebApp "Platform administration" "HTTPS"
        onCallEngineer -> operationalMetrics "Monitor SLIs and incidents" "Dashboards"
        infoSecTeam -> operationalMetrics "Independent PHI classification and audit" "Dashboards/SIEM"
        clinicalLead -> operationalMetrics "Review risk and escalation trends" "Dashboards"
        productManager -> operationalMetrics "Review engagement metrics" "Dashboards"

        !include deployments.dsl
    }

    views {
        properties {
            "structurizr.metadata" "false"
        }
        !include workspace-views.dsl
        !include deployment-views.dsl
    }

    configuration {
        scope SoftwareSystem
    }
}
