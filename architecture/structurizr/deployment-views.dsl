
        # ---------------------------------------------------------------------------
        # Deployment views
        # Included into workspace.dsl inside the views { } block.
        # ---------------------------------------------------------------------------

        deployment cdp "earth" "DevDeployment" {
            title "Authentication Service — Dev Deployment (Proxmox on-prem)"
            include github wosNode cloudflare netbird pve
        }

        deployment cdp "earth" "ProdDeployment" {
            title "Authentication Service — Production Deployment (AWS, planned)"
            include github wosNode aws
        }

        styles {
            element "GitHubRegistry" {
                background #30363D
                color #ffffff
                shape Cylinder
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
            element "Proxy" {
                background #FBAD41
                color #000000
                shape RoundedBox
            }
            element "AwsCdnNode" {
                background #8C4FFF
                color #ffffff
                shape RoundedBox
            }
            element "AwsSecurityNode" {
                background #FF9900
                color #000000
                shape RoundedBox
            }
            element "SaaSService" {
                background #6363F1
                color #ffffff
                shape RoundedBox
            }
            element "NetBirdService" {
                background #FF8C5A
                color #000000
                shape RoundedBox
            }
        }
