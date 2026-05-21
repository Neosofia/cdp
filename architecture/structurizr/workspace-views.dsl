
        # ---------------------------------------------------------------------------
        # Workspace views — system context, containers, components, and dynamic flows.
        # Included into workspace.dsl inside the views { } block.
        # ---------------------------------------------------------------------------

        systemLandscape "Landscape" {
            title "CDP Platform - System Landscape"
            include *
            exclude apns
            exclude fcm
            exclude webPush
        }

        container cdp "PatientEngagementContainers" {
            title "Patient Engagement - Containers"
            autolayout tb
            include patientEngagement
            include patient
            include smsProvider
            include apns
            include fcm
            include webPush
        }

        container cdp "ClinicalWorkflowContainers" {
            title "Clinical Workflow - Containers"
            autolayout tb
            include clinicalWorkflow
            include clinician
            include emrSystems
            include corporateIdP
            include patient
        }

        container cdp "AiDataContainers" {
            title "AI & Data Platform - Containers"
            autolayout tb
            include aiDataPlatform
            include bedrockWorkbench
            include mlEngineer
        }

        container cdp "PlatformCoreContainers" {
            title "Platform Core - Containers"
            autolayout tb
            include platformCore
            include workOS
            include pagerDuty
        }

        component patientChatApp "PatientChatAppComponents" {
            title "Patient Chat App - Components"
            autolayout tb
            include *
        }

        component clinicianApp "ClinicianAppComponents" {
            title "Clinician App - Components"
            autolayout tb
            include *
        }

        component smsService "SMSServiceComponents" {
            title "SMS Service - Components"
            autolayout tb
            include *
        }

        component emrService "EMRServiceComponents" {
            title "EMR Service - Components"
            autolayout tb
            include *
        }

        component authService "AuthServiceComponents" {
            title "Auth Service - Components"
            autolayout tb
            include *
        }

        component patientService "PatientServiceComponents" {
            title "Patient Service - Components"
            autolayout tb
            include *
        }

        component careEpisodeService "CareEpisodeServiceComponents" {
            title "Care Episode Service - Components"
            autolayout tb
            include *
        }

        component devicesService "DevicesServiceComponents" {
            title "Devices Service - Components"
            autolayout tb
            include *
        }

        component notificationService "NotificationServiceComponents" {
            title "Notification Service - Components"
            autolayout tb
            include *
        }

        component chatService "ChatServiceComponents" {
            title "Chat Service - Components"
            autolayout tb
            include *
        }

        component aiRiskAgent "AIRiskAgentComponents" {
            title "AI Risk Agent - Components"
            autolayout tb
            include *
        }

        component deidentPipeline "DeidentPipelineComponents" {
            title "Deidentification Pipeline - Components"
            autolayout tb
            include *
        }

        component cleanChatService "CleanChatServiceComponents" {
            title "Clean Chat Service - Components"
            autolayout tb
            include *
        }

        dynamic chatService "LocalAuthorizationFlow" {
            title "Authorization Process Flow (Cedar & Middleware)"

            1: patientChatApp -> messageIngestionAPI "HTTP POST /api/v1/messages (Bearer JWT)"
            2: messageIngestionAPI -> authzMiddleware "Delegate access control check with requested action and resource"
            3: authzMiddleware -> localPolicies "Read Cedar policies (if not cached)"
            4: localPolicies -> authzMiddleware "Return policy bundle"
            5: authzMiddleware -> authzMiddleware "Evaluate request (principal, action, resource) via local Cedar engine"
            6: authzMiddleware -> messageIngestionAPI "Return Allow decision"
            7: messageIngestionAPI -> chatInteractionManager "Process request (Create or resume chat interaction)"
        }
        dynamic patientService "DatabaseAuditFlow" {
            title "Audit & Immutability Process Flow (PostgreSQL Templates)"

            1: clinicianApp -> patientRecordStore "HTTP PUT /api/v1/patients/{uuid} (Bearer JWT)"
            2: patientRecordStore -> patientDatabase "BEGIN TRANSACTION"
            3: patientRecordStore -> patientDatabase "UPDATE patient_records SET status = 'inactive', changed_by = 'clinician-uuid' WHERE patient_uuid = '...'
            3a: patientRecordStore -> patientDatabase "(optional) continue with more UPDATE clauses, e.g. updated_at = now(), notes = '...'"
            4: patientDatabase -> patientDatabase "Trigger: Update changed_at to now() and write before-image to _audit table (Who & When); uses SQL templates from https://github.com/Neosofia/templates/tree/main/sql/audit"
            5: patientRecordStore -> patientDatabase "COMMIT"
            6: patientDatabase -> patientRecordStore "Return success"
            7: patientRecordStore -> clinicianApp "Return 200 OK"
        }
        dynamic cdp "ClinicianAlertFlow" {
            title "Clinician Alert and Chat Intercept - Process Flow"

            aiRiskAgent -> notificationService "Escalate high-risk signal"
            clinicianApp -> notificationService "Subscribe to live escalation queue"
            clinicianApp -> chatService "Clinician self-assigns and opens transcript"
            chatService -> clinicianApp "Stream transcript and live patient messages"
            notificationService -> pagerDuty "Create incident if unclaimed after 60s"
            pagerDuty -> clinician "Page on-call clinician"
            clinician -> clinicianApp "Open escalated session"
            clinicianApp -> chatService "Read transcript and send clinician reply"
            chatService -> patientChatApp "Deliver clinician reply to patient"
        }

        dynamic cdp "WorkOSLoginFlow" {
            title "Authentication - Process Flow"

            clinician -> clinicianApp "Click Log in"
            clinicianApp -> authService "Start WorkOS login (GET /login)"
            authService -> workOS "Redirect browser to WorkOS AuthKit"
            workOS -> authService "Return authorization code and state to /callback"
            authService -> clinicianApp "Redirect browser back to the UI root with a sealed session cookie"
            clinicianApp -> authService "Exchange sealed session cookie for platform JWT (POST /api/token, grant_type=session)"
            authService -> clinicianApp "Return platform JWT to the UI"
        }

        dynamic cdp "PatientChatFlow" {
            title "Patient Chat - Process Flow"

            1: patient -> patientChatApp "Opens chat and sends message"
            1: patient -> smsProvider "Sends message via SMS"
            2: patientChatApp -> chatService "POST message"
            2: smsProvider -> smsService "Inbound SMS webhook"
            2: smsService -> chatService "POST message"
            3: chatService -> careEpisodeService "Lookup active care episode"
            4: careEpisodeService -> chatService "Return care episode ID"
            A5: chatService -> aiRiskAgent "Publish risk-eval event (async)"
            5: chatService -> patientChatApp "ACK + stream AI reply"
            5: chatService -> smsService "ACK + AI reply"
            6: smsService -> smsProvider "Deliver outbound SMS"

            7: smsProvider -> patient "message response stream"
            7: patientChatApp -> patient "message response stream"

            16: aiRiskAgent -> chatService "Fetch raw interaction context"
            17: aiRiskAgent -> bedrockService "Run risk model inference"
            18: bedrockService -> aiRiskAgent "Return risk score"
            19: aiRiskAgent -> notificationService "Escalate on high-risk outcome"
            20: notificationService -> pagerDuty "Create incident for unclaimed alert"
        }

        dynamic cdp "ServiceTokenFlow" {
            title "App (Service) Token Issuance and Validation"

            1: chatService -> authService "Request machine JWT (POST /api/token grant_type=client_credentials)"
            2: authService -> chatService "Return machine JWT"
            3: chatService -> devicesService "Call device registry API with Bearer JWT"
            4: devicesService -> authService "Validate JWT signature and decode claims via Auth Service JWKS"
        }

        styles {
            element "Element" {
            }
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "Patient" {
                background #1565C0
                color #ffffff
            }
            element "Clinician" {
                background #0D47A1
                color #ffffff
            }
            element "Internal" {
                background #37474F
                color #ffffff
            }

            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "External" {
                background #999999
                color #ffffff
                width 338
                height 225
            }
            element "PagerDuty" {
                background #06AC38
                color #ffffff
            }
            element "WorkOS" {
                background #6363F1
                color #ffffff
            }
            element "Bedrock" {
                background #FF9900
                color #000000
            }

            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "App" {
                background #7EC8E3
                color #ffffff
            }
            element "MobileApp" {
                shape MobileDeviceLandscape
            }
            element "WebApp" {
                shape WebBrowser
            }
            element "Service" {
                background #438DD5
                color #ffffff
            }
            element "Security" {
                background #455A64
                color #ffffff
            }
            element "Gateway" {
                background #006064
                color #ffffff
            }
            element "Observability" {
                background #FF9900
                color #000000
            }
            element "Queue" {
                shape Pipe
                background #EF6C00
                color #ffffff
            }
            element "Workbench" {
                background #6A1B9A
                color #ffffff
                width 450
                height 300
            }
            element "Component" {
                background #AACCEE
                color #000000
            }

            element "DeploymentNode" {
                background #F5F5F5
                color #000000
            }
            element "InfrastructureNode" {
                background #CFD8DC
                color #000000
            }

            relationship "Relationship" {
                position 50
            }
        }
