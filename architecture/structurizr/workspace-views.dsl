
        # ---------------------------------------------------------------------------
        # Workspace views — system context, containers, components, and dynamic flows.
        # Included into workspace.dsl inside the views { } block.
        # ---------------------------------------------------------------------------

        systemLandscape "Landscape" {
            title "CDP Platform - System Landscape"
            include *
            exclude corporateIdP
            exclude thirdPartySiem
            exclude apns
            exclude fcm
            exclude webPush
        }

        container patientEngagement "PatientEngagementContainers" {
            title "Patient Engagement - Containers"
            include *
            exclude apns
            exclude fcm
            exclude webPush
        }

        container clinicalWorkflow "ClinicalWorkflowContainers" {
            title "Clinical Workflow - Containers"
            include *
            exclude corporateIdP
        }

        container aiDataPlatform "AiDataContainers" {
            title "AI & Data Platform - Containers"
            include *
        }

        container platformCore "PlatformCoreContainers" {
            title "Platform Core - Containers"
            include *
            exclude apns
            exclude fcm
            exclude webPush
            exclude corporateIdP
            exclude thirdPartySiem
            exclude bedrockWorkbench
            exclude operationalMetrics
        }

        component patientChatApp "PatientChatAppComponents" {
            title "Patient Chat App - Components"
            include *
        }

        component clinicianApp "ClinicianAppComponents" {
            title "Clinician App - Components"
            include *
        }

        component smsService "SMSServiceComponents" {
            title "SMS Service - Components"
            include *
        }

        component emrService "EMRServiceComponents" {
            title "EMR Service - Components"
            include *
        }

        component authService "AuthServiceComponents" {
            title "Auth Service - Components"
            include *
        }

        component patientService "PatientServiceComponents" {
            title "Patient Service - Components"
            include *
        }

        component careEpisodeService "CareEpisodeServiceComponents" {
            title "Care Episode Service - Components"
            include *
        }

        component devicesService "DevicesServiceComponents" {
            title "Devices Service - Components"
            include *
        }

        component notificationService "NotificationServiceComponents" {
            title "Notification Service - Components"
            include *
        }

        component chatService "ChatServiceComponents" {
            title "Chat Service - Components"
            include *
        }

        component aiRiskAgent "AIRiskAgentComponents" {
            title "AI Risk Agent - Components"
            include *
        }

        component deidentPipeline "DeidentPipelineComponents" {
            title "Deidentification Pipeline - Components"
            include *
        }

        component cleanChatService "CleanChatServiceComponents" {
            title "Clean Chat Service - Components"
            include *
        }

        dynamic platformCore "ClinicianAlertFlow" {
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

        dynamic platformCore "PatientChatFlow" {
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
        }
