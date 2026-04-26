
        # ---------------------------------------------------------------------------
        # Deployment views
        # Included into workspace.dsl inside the views { } block.
        # ---------------------------------------------------------------------------

        deployment platformCore "earth" "DevDeployment" {
            title "Authentication Service — Dev Deployment (Proxmox on-prem)"
            include github wosNode cloudflare netbird pve
        }

        deployment platformCore "earth" "ProdDeployment" {
            title "Authentication Service — Production Deployment (AWS, planned)"
            include github wosNode aws
        }

        styles {
            # --- GitHub / CI ---
            element "GitHub" {
                background #24292E
                color #ffffff
            }
            element "GitHubRegistry" {
                background #30363D
                color #ffffff
                shape Cylinder
            }
            element "GitHubActions" {
                background #2C6FAD
                color #ffffff
            }
            element "Workflow" {
                background #2188FF
                color #ffffff
                shape RoundedBox
            }
            element "Registry" {
                background #6F42C1
                color #ffffff
            }
            element "OciImage" {
                background #8A63D2
                color #ffffff
                shape RoundedBox
            }

            # --- On-prem / Proxmox ---
            element "OnPrem" {
                background #37474F
                color #ffffff
            }
            element "LXC" {
                background #455A64
                color #ffffff
            }
            element "ComposeStack" {
                background #546E7A
                color #ffffff
            }
            element "OpsNode" {
                background #13BEF9
                color #000000
                shape RoundedBox
            }
            element "Database" {
                background #336791
                color #ffffff
                shape Cylinder
            }
            element "SecretsNode" {
                background #4A235A
                color #ffffff
                shape RoundedBox
            }

            # --- Cloudflare ---
            element "Edge" {
                background #F6821F
                color #ffffff
            }
            element "Proxy" {
                background #FBAD41
                color #000000
                shape RoundedBox
            }

            # --- AWS (containers dark like Proxmox; brand colours on leaf nodes only) ---
            element "Cloud" {
                background #232F3E
                color #ffffff
            }
            element "AwsVpc" {
                background #37474F
                color #ffffff
            }
            element "AwsCompute" {
                background #455A64
                color #ffffff
            }
            element "AwsDatabase" {
                background #455A64
                color #ffffff
            }
            element "AwsCdn" {
                background #455A64
                color #ffffff
            }
            element "AwsCdnNode" {
                background #8C4FFF
                color #ffffff
                shape RoundedBox
            }
            element "AwsGateway" {
                background #455A64
                color #ffffff
            }
            element "AwsService" {
                background #455A64
                color #ffffff
            }
            element "AwsSecurityNode" {
                background #FF9900
                color #000000
                shape RoundedBox
            }
            element "Database" {
                background #336791
                color #ffffff
                shape Cylinder
            }

            # --- SaaS external (NetBird node / WorkOS node share this; services override below) ---
            element "SaaSNode" {
                background #3D3D3D
                color #ffffff
            }
            element "SaaSService" {
                background #6363F1
                color #ffffff
                shape RoundedBox
            }
            # NetBird brand colour overrides — applied via tag on devNetBird node
            element "NetBirdNode" {
                background #FF6B35
                color #ffffff
            }
            element "NetBirdService" {
                background #FF8C5A
                color #000000
                shape RoundedBox
            }
        }
