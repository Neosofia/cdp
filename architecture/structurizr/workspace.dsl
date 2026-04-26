workspace "Clinical Data Platform (CDP)" "HIPAA-compliant clinical data platform for AI-assisted care coordination, patient engagement, risk detection, and clinician escalation" {

    model {

        patient = person "Patient" "Patient receiving coordinated care via app, web, or SMS" "Patient"
        clinician = person "Clinician" "Clinician handling escalations and patient follow-up" "Clinician"
        mlEngineer = person "ML Engineer / Data Scientist" "Internal engineer using Bedrock AI Workbench" "Internal"
        onCallEngineer = person "On-call Engineer" "Engineer responding to operational incidents" "Internal"
        clinicalLead = person "Clinical Lead" "Reviews AI quality metrics and clinician feedback" "Internal"
        productManager = person "Product Manager" "Reviews engagement and satisfaction trends" "Internal"
        infoSecTeam = person "InfoSec Team" "Runs independent SIEM checks for PHI/PII leakage" "Internal"

        pagerDuty = softwareSystem "PagerDuty" "On-call incident management and escalation routing" "External,PagerDuty"
        smsProvider = softwareSystem "SMS Provider" "Twilio or AWS Pinpoint for inbound/outbound SMS" "External"
        apns = softwareSystem "APNS" "Apple Push Notification service" "External"
        fcm = softwareSystem "FCM" "Firebase Cloud Messaging for Android" "External"
        webPush = softwareSystem "Web Push API" "Browser push service endpoints" "External"
        emrSystems = softwareSystem "EMR / EHR Systems" "Upstream EMR vendors via FHIR R4" "External"
        corporateIdP = softwareSystem "Corporate IdP" "Okta or equivalent enterprise identity provider" "External"
        workOS = softwareSystem "WorkOS" "External identity/auth provider used by Auth Service" "External,WorkOS"
        thirdPartySiem = softwareSystem "Third-party SIEM" "Independent InfoSec scanning of platform logs" "External"
        bedrockWorkbench = softwareSystem "Bedrock AI Workbench" "Isolated AWS account for ML experimentation on approved de-identified datasets; not in production runtime path." "External,Workbench"
        operationalMetrics = softwareSystem "Operational Metrics" "Platform observability, SLIs/SLOs, dashboards, and alert rules." "External,Observability"

        # ---------------------------------------------------------------------------
        # Patient Engagement — channel adapters, push notifications, alerting
        # ---------------------------------------------------------------------------

        patientEngagement = softwareSystem "Patient Engagement" "Channel adapters (app, web, SMS) and push notification dispatch." {
            patientChatApp = container "Patient Chat App" "Flutter app for iOS, Android, and web. Patient chat, auth, and notifications." "Flutter" "App,MobileApp" {
                authOnboarding = component "Auth & Onboarding" "Invite-link registration, identity verification, biometric/PIN login, and session token management." "Flutter / Dart" "Component"
                chatThreadUI = component "Chat Thread UI" "Renders message thread, optimistic send, typing indicator, and streamed AI/clinician replies." "Flutter / Dart" "Component"
                pushHandler = component "Push Notification Handler" "Registers device token with Devices Service and handles incoming push notifications and deep links." "Flutter / Dart" "Component"
                patientProfileClient = component "Patient Profile Client" "Reads and caches the patient's own profile from Patient Service." "Flutter / Dart" "Component"
            }
            smsService = container "SMS Service" "Inbound/outbound SMS adapter, session continuity, OTP gate, and TCPA STOP/START handling." "Python / FastAPI" "Service" {
                smsWebhookHandler = component "Inbound Webhook Handler" "Receives HTTPS webhooks from the SMS provider and normalises inbound messages." "Python" "Component"
                smsSessionResolver = component "Session Resolver" "Resolves phone number to patient identity and creates or resumes a chat session." "Python" "Component"
                smsOutboundSender = component "Outbound SMS Sender" "Delivers AI and clinician reply messages via the SMS provider API." "Python" "Component"
                tcpaHandler = component "TCPA Compliance Handler" "Enforces STOP/START opt-out rules and suppresses outbound SMS for opted-out numbers." "Python" "Component"
            }
            devicesService = container "Devices Service" "Encrypted device token registry and push dispatch proxy for APNS/FCM/Web Push." "Python / FastAPI" "Service" {
                deviceRegistry = component "Device Registry" "Stores encrypted push tokens keyed by opaque device UUIDs with idempotent upsert." "Python" "Component"
                pushDispatcher = component "Push Dispatcher" "Decrypts token, selects provider (APNS/FCM/Web Push), calls provider, and returns outcome." "Python" "Component"
                tokenLifecycleManager = component "Token Lifecycle Manager" "Handles stale-token feedback from providers and hard-deletes tokens on account deactivation." "Python" "Component"
            }
        }

        # ---------------------------------------------------------------------------
        # Clinical Workflow — clinician tools, patient records, care episodes, EMR
        # ---------------------------------------------------------------------------

        clinicalWorkflow = softwareSystem "Clinical Workflow" "Clinician-facing tools, PII/PHI patient records, care episode management, and EMR integration." {
            clinicianApp = container "Clinician App" "Web app for escalation handling, transcript review, patient record review, and quality feedback." "React SPA" "App,WebApp" {
                clinicianAuth = component "Auth & SSO" "OAuth2 PKCE login with deep-link state preservation, delegating to Auth Service via WorkOS." "React / TypeScript" "Component"
                alertQueuePanel = component "Alert Queue Panel" "Live queue of high-risk sessions with 60-second countdown and self-assign action." "React / TypeScript" "Component"
                alertDetail = component "Two-Panel Alert Detail" "Left: live streaming chat transcript. Right: patient EMR records since discharge." "React / TypeScript" "Component"
                clinicianChatInterface = component "Clinician Chat Interface" "Send clinician replies, stop-AI-and-take-over, and request-consent-to-call actions." "React / TypeScript" "Component"
                qualityReview = component "Quality Review" "Browse closed sessions and submit thumbs-up/down ratings with optional free-text comments." "React / TypeScript" "Component"
            }
            patientService = container "Patient Service" "PII/PHI patient records with invite-based registration and duplicate detection." "Python / FastAPI" "Service" {
                registrationHandler = component "Registration Handler" "Processes invite-gated patient registration with duplicate detection and care episode association." "Python" "Component"
                patientRecordStore = component "Patient Record Store" "Create and read PII/PHI patient records with atomic audit logging." "Python" "Component"
                patientSearch = component "Patient Search" "Name and identifier search for authenticated clinicians." "Python" "Component"
            }
            careEpisodeService = container "Care Episode Service" "Creates and manages procedure-scoped care episodes and active episode lookup." "Python / FastAPI" "Service" {
                inviteCreator = component "Invite & Episode Creator" "Atomically creates a care episode and an invite token on clinician request." "Python" "Component"
                activeEpisodeLookup = component "Active Episode Lookup" "Returns the current active care episode for a given patient ID." "Python" "Component"
                episodeLifecycleManager = component "Episode Lifecycle Manager" "Scheduled auto-closure job and manual clinician-close endpoint with event emission." "Python" "Component"
            }
            emrService = container "EMR Service" "Vendor-agnostic FHIR facade for patient records and procedure context." "Python / FastAPI" "Service" {
                fhirFacade = component "FHIR Facade" "Unified FHIR R4 API surface consumed by all platform services." "Python" "Component"
                tenantRouter = component "Tenant Router" "Routes requests to the correct upstream EMR endpoint based on tenant configuration." "Python" "Component"
                schemaNormaliser = component "Schema Normaliser" "Transforms vendor-specific FHIR responses into the platform's canonical internal schema." "Python" "Component"
                emrConnectionRegistry = component "EMR Connection Registry" "Stores per-tenant EMR endpoint URLs, credentials, and integration configuration." "Python" "Component"
            }
        }

        # ---------------------------------------------------------------------------
        # AI & Data Platform — risk evaluation, deidentification, clean chat store
        # ---------------------------------------------------------------------------

        aiDataPlatform = softwareSystem "AI & Data Platform" "Asynchronous risk evaluation, PHI deidentification pipeline, and de-identified chat storage for ML workflows." {
            aiRiskAgent = container "AI Risk Agent Service" "Asynchronous risk-evaluation worker consuming message events and producing binary escalation decisions." "AWS Lambda + SQS" "Service" {
                riskEvalQueue = component "Risk Eval Queue" "SQS queue carrying per-message risk-evaluation events." "AWS SQS" "Component,Queue"
                sqsConsumer = component "SQS Consumer" "Consumes risk-evaluation events from the Risk Eval Queue." "Python / Lambda" "Component"
                riskEvaluator = component "Risk Evaluator" "Calls Bedrock inference with message context and returns a binary yes/no intervention signal." "Python / Lambda" "Component"
                escalationDispatcher = component "Escalation Dispatcher" "Calls the Notification Service when the risk outcome is yes." "Python / Lambda" "Component"
                riskAuditLogger = component "Audit Logger" "Persists binary evaluation outcome and model version for every message for audit purposes." "Python / Lambda" "Component"
            }
            deidentPipeline = container "Deidentification Pipeline" "Session-end PHI/PII stripping pipeline writing de-identified records to clean store." "AWS Lambda" "Service" {
                sessionCloseQueue = component "Session Close Queue" "SQS queue carrying chat-session-end events for deidentification." "AWS SQS" "Component,Queue"
                sessionEventConsumer = component "Session Event Consumer" "Consumes session-end events from the Session Close Queue." "Python / Lambda" "Component"
                phiDetector = component "PHI Detector" "Runs Bedrock NER to detect and replace PII/PHI tokens with placeholders." "Python / Lambda" "Component"
                cleanWriter = component "Clean Writer" "Forwards de-identified messages to the Clean Chat Service." "Python / Lambda" "Component"
                quarantineHandler = component "Quarantine Handler" "Routes failed or unprocessable messages to the quarantine queue for human review." "Python / Lambda" "Component"
            }
            cleanChatService = container "Clean Chat Service" "De-identified chat store for internal analysis and model workflows." "Python / FastAPI + PostgreSQL" "Service" {
                cleanWriteAPI = component "Write API" "Accepts de-identified message batches from the Deidentification Pipeline with deduplication." "Python" "Component"
                cleanQueryAPI = component "Query API" "Exposes interaction and message queries for ML training jobs, data scientists, and engineers." "Python" "Component"
            }
            bedrockService = container "Bedrock Inference" "Managed AWS Bedrock inference dependency used by internal AI workloads." "AWS Bedrock API" "Service,Bedrock"
        }

        # ---------------------------------------------------------------------------
        # Platform Core — chat ingestion, authentication, API gateway
        # ---------------------------------------------------------------------------

        platformCore = softwareSystem "Platform Core" "Real-time chat ingestion, platform authentication, clinical alert escalation, and the unified API gateway." {
            !docs docs
            !decisions decisions
            chatService = container "Chat Service" "Raw chat ingestion and storage, chat interactions, and care-episode linkage." "Python / FastAPI + PostgreSQL" "Service" {
                messageIngestionAPI = component "Message Ingestion API" "Accepts inbound messages from app, web, and SMS channels with durable persistence." "Python" "Component"
                chatInteractionManager = component "Chat Interaction Manager" "Creates and manages ChatInteraction sessions linked to care episodes." "Python" "Component"
                messageStreaming = component "Message Streaming" "Streams AI and clinician replies to patients via WebSocket/SSE." "Python" "Component"
                riskEventPublisher = component "Risk Event Publisher" "Publishes per-message risk-evaluation events to the Risk Eval Queue." "Python" "Component"
                sessionClosePublisher = component "Session Close Publisher" "Publishes session-end events to the Session Close Queue for deidentification." "Python" "Component"
            }
            authService = container "Authentication Service" "Issues platform JWTs for human (via WorkOS) and machine authentication. Publishes public signing keys. Delegates session lifecycle to WorkOS." "Python / FastAPI" "Service,Security" {
                oauthCallbackHandler = component "OAuth2 Callback Handler" "Processes WorkOS OAuth callback, validates assertion, seals session in httponly cookie." "Python" "Component"
                workOSBridge = component "WorkOS Claims Extractor" "Extracts identity, user type, roles, and tenant from WorkOS assertion; validates session authenticity." "Python" "Component"
                tokenIssuer = component "Token Issuer" "Issues short-lived RS256 platform JWTs with identity, user type, roles, and tenant claims (15min default TTL for humans, 5min for services)." "Python" "Component"
                tokenValidator = component "Token Validator" "Validates bearer token JWT, verifies RS256 signature, returns decoded claims." "Python" "Component"
                machineCredentialIssuer = component "Machine Credential Issuer" "Issues short-lived service-to-service JWTs via OAuth2 client_credentials grant with bcrypt secret verification (5min TTL)." "Python" "Component"
                jwksPublisher = component "JWKS Publisher" "Publishes RSA public key in JWK Set format (RFC 7517); 1-hour cache enables distributed JWT validation without Auth Service in critical path." "Python" "Component"
            }
            apiGateway = container "API Gateway" "Unified API entry point. Included in view, but per-service routing links are omitted for clarity." "AWS API Gateway" "Gateway"
            notificationService = container "Notification Service" "Receives high-risk alerts, runs early-intervention window, escalates unclaimed alerts." "Python / FastAPI" "Service" {
                alertReceiver = component "Alert Receiver" "Accepts structured escalation events from the AI Risk Agent and validates payloads." "Python" "Component"
                earlyInterventionWindow = component "Early Intervention Window" "Holds alert for 60 seconds, publishes to clinician alert queue, and tracks self-assignment." "Python" "Component"
                pagerDutyDispatcher = component "PagerDuty Dispatcher" "Calls PagerDuty Events API for alerts unclaimed after the intervention window expires." "Python" "Component"
                clinicianAlertQueue = component "Clinician Alert Queue" "SQS/PubSub queue for the early-intervention self-assign window before PagerDuty escalation." "SQS / PubSub" "Component,Queue"
            }
        }

        # ---------------------------------------------------------------------------
        # Relationships — all at model level (cross-system and external)
        # ---------------------------------------------------------------------------

        # External AI / ML
        bedrockWorkbench -> cleanQueryAPI "Read-only de-identified chat data" "RDS read replica"
        bedrockWorkbench -> deidentPipeline "Read anonymized medical records dataset output" "S3 cross-account"

        # Patient Chat App component relationships
        authOnboarding -> oauthCallbackHandler "Receive OAuth callback (POST /auth/callback)" "HTTPS"
        authOnboarding -> tokenIssuer "Request platform JWT (POST /api/token with session grant)" "HTTPS"
        chatThreadUI -> messageIngestionAPI "Send messages" "HTTPS"
        chatThreadUI -> messageStreaming "Receive streamed AI and clinician replies" "WebSocket/SSE"
        pushHandler -> deviceRegistry "Register device token" "HTTPS"
        pushHandler -> webPush "Register web push subscription" "Web Push"
        patientProfileClient -> patientRecordStore "Read own patient profile" "HTTPS"

        # Clinician App component relationships
        clinicianAuth -> oauthCallbackHandler "Authenticate via OAuth2 PKCE callback (POST /auth/callback)" "HTTPS"
        clinicianAuth -> tokenIssuer "Request platform JWT (POST /api/token with session grant)" "HTTPS"
        alertQueuePanel -> clinicianAlertQueue "Subscribe to live escalation queue" "WebSocket/SSE"
        alertQueuePanel -> activeEpisodeLookup "List active care episodes" "HTTPS"
        alertQueuePanel -> inviteCreator "Create care episode and patient invite" "HTTPS"
        alertDetail -> messageStreaming "Stream live chat transcript" "WebSocket/SSE"
        alertDetail -> chatInteractionManager "Fetch transcript history" "HTTPS"
        alertDetail -> fhirFacade "Read patient EMR records" "HTTPS"
        alertDetail -> episodeLifecycleManager "Close care episode" "HTTPS"
        clinicianChatInterface -> messageIngestionAPI "Send clinician messages and stop-AI signal" "HTTPS"
        clinicianChatInterface -> webPush "Register clinician web push subscription" "Web Push"
        qualityReview -> chatInteractionManager "Read closed session transcripts" "HTTPS"

        # SMS Service component relationships
        smsWebhookHandler -> tcpaHandler "Check TCPA opt-out status before processing" "Internal"
        smsWebhookHandler -> smsSessionResolver "Pass normalised inbound message" "Internal"
        smsSessionResolver -> patientRecordStore "Resolve phone number to patient identity" "HTTPS"
        smsSessionResolver -> messageIngestionAPI "Forward inbound SMS as chat message" "HTTPS"
        smsOutboundSender -> smsProvider "Deliver outbound SMS" "Provider API"

        # EMR Service component relationships
        fhirFacade -> tenantRouter "Route request by tenant" "Internal"
        tenantRouter -> emrConnectionRegistry "Lookup tenant EMR endpoint" "Internal"
        tenantRouter -> emrSystems "FHIR read operations" "FHIR R4 / HTTPS"
        tenantRouter -> schemaNormaliser "Normalise vendor response" "Internal"

        # Auth Service component relationships
        oauthCallbackHandler -> workOS "Receive OAuth callback assertion" "OIDC/OAuth2"
        oauthCallbackHandler -> workOSBridge "Extract identity claims from assertion" "Internal"
        workOSBridge -> tokenIssuer "Pass validated claims for JWT issuance" "Internal"
        tokenIssuer -> jwksPublisher "Sign token with private key (public key cached by JWKS)" "Internal"
        machineCredentialIssuer -> tokenIssuer "Verify bcrypt secret, issue machine JWT" "Internal"
        apiGateway -> tokenValidator "Validate inbound bearer token (GET /api/me)" "HTTPS"
        apiGateway -> jwksPublisher "Fetch public key for local JWT validation (GET /.well-known/jwks.json, 1h cache)" "HTTPS"

        # Patient Service component relationships
        registrationHandler -> activeEpisodeLookup "Confirm patient-to-episode association on registration" "HTTPS"
        alertDetail -> patientSearch "Search patients by name or identifier" "HTTPS"
        alertDetail -> patientRecordStore "Read patient record" "HTTPS"

        # Care Episode Service component relationships
        inviteCreator -> patientRecordStore "Verify patient record exists before creating invite" "HTTPS"

        # Devices Service component relationships
        deviceRegistry -> tokenValidator "Validate caller credentials" "HTTPS"
        pushDispatcher -> apns "Deliver iOS push" "APNS"
        pushDispatcher -> fcm "Deliver Android push" "FCM"
        pushDispatcher -> webPush "Deliver browser push" "Web Push"
        apns -> tokenLifecycleManager "Stale token feedback" "APNS Feedback"
        fcm -> tokenLifecycleManager "Stale token feedback" "FCM Feedback"

        # Notification Service component relationships
        alertReceiver -> earlyInterventionWindow "Pass validated alert" "Internal"
        earlyInterventionWindow -> clinicianAlertQueue "Publish alert to portal queue" "Queue Publish"
        pagerDutyDispatcher -> pagerDuty "Create incident for unclaimed alert" "PagerDuty Events API"

        # Chat Service component relationships
        messageIngestionAPI -> chatInteractionManager "Create or resume chat interaction" "Internal"
        messageIngestionAPI -> riskEventPublisher "Trigger risk evaluation" "Internal"
        chatInteractionManager -> activeEpisodeLookup "Lookup active care episode" "HTTPS"
        chatInteractionManager -> bedrockService "Generate inline AI response" "Bedrock API"
        messageStreaming -> chatThreadUI "Stream AI and clinician replies" "WebSocket/SSE"
        riskEventPublisher -> riskEvalQueue "Publish risk-eval event" "SQS Publish"
        sessionClosePublisher -> sessionCloseQueue "Publish session-end event" "SQS Publish"

        # AI Risk Agent component relationships
        sqsConsumer -> riskEvaluator "Pass event for evaluation" "Internal"
        riskEvaluator -> chatInteractionManager "Fetch raw interaction context" "HTTPS"
        riskEvaluator -> bedrockService "Run risk model inference" "Bedrock API"
        riskEvaluator -> escalationDispatcher "Trigger escalation on yes outcome" "Internal"
        escalationDispatcher -> alertReceiver "Escalate when risk outcome is yes" "HTTPS"
        riskEvaluator -> riskAuditLogger "Log evaluation outcome and model version" "Internal"

        # Deidentification Pipeline component relationships
        sessionEventConsumer -> phiDetector "Pass raw messages for redaction" "Internal"
        phiDetector -> bedrockService "PHI detection assist" "Bedrock API"
        phiDetector -> cleanWriter "Pass de-identified messages" "Internal"
        cleanWriter -> cleanWriteAPI "Write de-identified messages" "HTTPS"
        phiDetector -> quarantineHandler "Route on failure" "Internal"

        # Person -> system/container relationships
        patient -> patientChatApp "Chat via app or web" "HTTPS"
        patient -> authOnboarding "Register and log in via invite link" "HTTPS"
        patient -> chatThreadUI "Chat with care team" "HTTPS + WebSocket/SSE"
        patient -> smsProvider "Send and receive SMS" "SMS"

        smsProvider -> smsWebhookHandler "Inbound SMS webhook" "HTTPS Webhook"

        clinician -> clinicianApp "Handle escalations and patient follow-up" "HTTPS"
        clinician -> clinicianAuth "Log in via SSO" "HTTPS"
        clinician -> alertQueuePanel "View and claim escalation alerts" "HTTPS"
        clinician -> alertDetail "Review transcript and EMR context" "HTTPS"
        clinician -> clinicianChatInterface "Send replies and manage care session" "HTTPS"
        clinician -> qualityReview "Rate closed sessions" "HTTPS"
        clinician -> pagerDuty "Receive and acknowledge incidents" "PagerDuty UI"
        clinician -> patient "Initiate phone/video call after consent" "Phone/Video"

        mlEngineer -> bedrockWorkbench "Run EDA and model workflows" "AWS Console / SDK"
        mlEngineer -> corporateIdP "SSO authentication" "OIDC/SAML"
        corporateIdP -> bedrockWorkbench "Federated SSO" "OIDC/SAML"

        onCallEngineer -> pagerDuty "Respond to incidents" "PagerDuty UI"
        onCallEngineer -> operationalMetrics "Monitor SLIs/SLOs and investigate incidents" "Dashboards/Alerts"
        infoSecTeam -> thirdPartySiem "Run independent PHI/PII leak scans" "SIEM UI"
        infoSecTeam -> operationalMetrics "Review automated PHI-pattern scan alerts" "Dashboards/Alerts"
        productManager -> operationalMetrics "Review engagement, channel, and satisfaction metrics" "Dashboards"
        clinicalLead -> operationalMetrics "Review AI response quality ratings and clinician feedback trends" "Dashboards"

        !include deployments.dsl
    }

    views {

        !include workspace-views.dsl

        !include deployment-views.dsl

    }

    configuration {
        scope none
    }
}
