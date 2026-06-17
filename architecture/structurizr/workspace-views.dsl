
        systemContext cdp "SystemContext" {
            title "System context — CDP v1"
            description "C4 Level 1: product users, CDP, runtime dependencies, and internal staff observability consumers."
            include *
            include operationalMetrics
            include onCallEngineer clinicalLead productManager infoSecTeam
        }

        container cdp "Containers" {
            title "Container diagram — CDP v1"
            description "C4 Level 2: deployable containers, primary dependencies, and product users. Service-mesh return paths are modelled separately."
            include patient clinician operator
            include cdpWebApp careEpisodeService chatService authService userService capabilitiesService notificationService
            include workOS groq resend
            exclude relationship.tag==Mesh
        }

        component cdpWebApp "CdpWebAppComponents" {
            title "CDP Web Application - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component careEpisodeService "CareEpisodeComponents" {
            title "Care Episode Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component chatService "ChatServiceComponents" {
            title "Chat Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component authService "AuthServiceComponents" {
            title "Authentication Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component userService "UserServiceComponents" {
            title "User Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component capabilitiesService "CapabilitiesServiceComponents" {
            title "Capabilities Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        component notificationService "NotificationServiceComponents" {
            title "Notification Service - Components"
            autolayout tb
            include *
            exclude relationship.tag==PlatformPattern
        }

        dynamic cdp "WorkOSLoginFlow" {
            title "Authentication - Process Flow"
            operator -> cdpWebApp "Click Log in"
            cdpWebApp -> authService "Start login and token exchange"
            authService -> workOS "AuthKit redirect and callback"
            workOS -> authService "Identity verified"
            authService -> cdpWebApp "Platform token issued"
            cdpWebApp -> capabilitiesService "Prefetch UI entitlements"
        }

        dynamic cdp "PatientChatFlow" {
            title "Patient Chat - Process Flow (v1)"
            patient -> cdpWebApp "Send message"
            cdpWebApp -> careEpisodeService "Create interaction and request completion"
            careEpisodeService -> chatService "Persist patient and assistant messages"
            careEpisodeService -> groq "Care assistant and risk evaluation"
            careEpisodeService -> notificationService "High risk: send alert email"
            notificationService -> resend "Deliver alert email"
            careEpisodeService -> cdpWebApp "Assistant reply and risk metadata"
        }

        dynamic cdp "ClinicianReviewFlow" {
            title "Clinician Review - Process Flow (v1)"
            clinician -> cdpWebApp "Open roster"
            cdpWebApp -> careEpisodeService "List recoveries and risk levels"
            clinician -> cdpWebApp "Open patient detail"
            cdpWebApp -> chatService "Load chat history"
            cdpWebApp -> careEpisodeService "Load recovery records"
            clinician -> cdpWebApp "Join thread as care team"
            cdpWebApp -> chatService "Send clinician message; pause assistant"
        }

        dynamic chatService "LocalAuthorizationFlow" {
            title "Authorization Process Flow (policy middleware)"
            interactionStore -> authzMiddleware "Authorize incoming request"
            authzMiddleware -> interactionStore "Allow"
        }

        dynamic cdp "ServiceTokenFlow" {
            title "Service Token and Registry Lookup"
            careEpisodeService -> authService "Obtain service token"
            authService -> careEpisodeService "Service token issued"
            careEpisodeService -> chatService "Call Chat with service token"
            careEpisodeService -> authService "Resolve notification service URL"
            authService -> careEpisodeService "Registry entry returned"
            careEpisodeService -> notificationService "Send escalation email"
        }

        styles {
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
            }
            element "WorkOS" {
                background #6363F1
                color #ffffff
            }
            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "App" {
                background #7EC8E3
                color #ffffff
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
            element "Observability" {
                background #FF9900
                color #000000
            }
            element "Component" {
                background #AACCEE
                color #000000
            }
            relationship "Relationship" {
                position 50
            }
        }
