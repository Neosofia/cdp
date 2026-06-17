
        deployment cdp "earth" "StagingDeployment" {
            title "CDP Staging Runtime (Railway + externals)"
            description "Railway project, databases, and external SaaS dependencies. CI/CD is in StagingCIPipeline — deployment-node edges break Structurizr auto-layout."
            include railway wosNode groqNode resendNode
            exclude relationship.tag==CIDeploy
            exclude relationship.tag==Mesh
        }

        deployment cdp "earth" "StagingCIPipeline" {
            title "CDP Staging CI/CD (GitHub Actions → GHCR)"
            description "Per-service CI on push to main and tags; release images to GHCR. Railway auto-deploy when checks pass (not drawn here)."
            include github
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
            element "Railway" {
                background #0B0D0E
                color #ffffff
            }
            element "RailwayProject" {
                background #131517
                color #ffffff
            }
            element "Database" {
                background #336791
                color #ffffff
                shape Cylinder
            }
            element "SaaSService" {
                background #6363F1
                color #ffffff
                shape RoundedBox
            }
            element "SaaSNode" {
                background #455A64
                color #ffffff
            }
        }
